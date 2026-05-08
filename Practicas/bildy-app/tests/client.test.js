import request  from 'supertest'
import mongoose from 'mongoose'
import app      from '../src/app.js'
import { connectTestDB, clearTestDB, disconnectTestDB } from './helpers/db.js'
import { generateTestToken } from './helpers/auth.js'
import User    from '../src/models/User.js'
import Company from '../src/models/Company.js'
import Client  from '../src/models/Client.js'

let token, userId, companyId

// beforeAll: se ejecuta UNA VEZ antes de todos los tests del archivo
beforeAll(async () => {
  await connectTestDB()

  // Creamos IDs reales de MongoDB para usarlos en la BD de test
  companyId = new mongoose.Types.ObjectId()
  userId    = new mongoose.Types.ObjectId()

  // Creamos empresa y usuario en la BD en memoria
  await Company.create({
    _id:   companyId,
    owner: userId,
    name:  'Empresa Test',
    cif:   'A00000000'
  })

  await User.create({
    _id:      userId,
    email:    'test@test.com',
    password: 'hashedpassword123',
    name:     'Test',
    lastName: 'User',
    company:  companyId,
    status:   'verified',
    role:     'admin'
  })

  // Generamos el token con los IDs reales de la BD de test
  const { token: t } = generateTestToken({
    id:     userId.toString(),
    company: companyId.toString()
  })
  token = t
})

// afterEach: limpia solo los clientes entre tests
// No limpiamos usuario/empresa porque los necesitamos en todos los tests
afterEach(async () => {
  await Client.deleteMany({})
})

// afterAll: apaga la BD en memoria al terminar
afterAll(async () => {
  await disconnectTestDB()
})

// ─────────────────────────────────────────────────────────────
// describe agrupa tests relacionados — aparece en el output de Jest
// ─────────────────────────────────────────────────────────────

describe('POST /api/client — Crear cliente', () => {

  it('crea un cliente correctamente', async () => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Test', cif: 'B11111111' })

    // expect() comprueba que el resultado es el esperado
    // Si falla, Jest te dice exactamente qué esperabas y qué obtuviste
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Cliente Test')
    expect(res.body.data.cif).toBe('B11111111')
  })

  it('falla si falta el nombre (campo obligatorio)', async () => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ cif: 'B22222222' }) // sin name

    expect(res.status).toBe(400)
  })

  it('falla si el CIF ya existe en la empresa', async () => {
    // Creamos uno primero directamente en la BD
    await Client.create({
      user: userId, company: companyId,
      name: 'Primero', cif: 'B33333333'
    })

    // Intentamos crear otro con el mismo CIF
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Segundo', cif: 'B33333333' })

    expect(res.status).toBe(409)
  })

  it('falla si no hay token', async () => {
    const res = await request(app)
      .post('/api/client')
      .send({ name: 'Sin token', cif: 'B44444444' })
      // sin .set('Authorization', ...)

    expect(res.status).toBe(401)
  })
})

describe('GET /api/client — Listar clientes', () => {

  it('devuelve lista vacía si no hay clientes', async () => {
    const res = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
    expect(res.body.totalItems).toBe(0)
  })

  it('devuelve los clientes de la empresa', async () => {
    await Client.create([
      { user: userId, company: companyId, name: 'Cliente A', cif: 'B55555555' },
      { user: userId, company: companyId, name: 'Cliente B', cif: 'B66666666' }
    ])

    const res = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.totalItems).toBe(2)
  })

  it('filtra por nombre parcial', async () => {
    await Client.create([
      { user: userId, company: companyId, name: 'García SL',  cif: 'B77777777' },
      { user: userId, company: companyId, name: 'López SA',   cif: 'B88888888' }
    ])

    const res = await request(app)
      .get('/api/client?name=garcía')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('García SL')
  })

  it('devuelve metadatos de paginación correctos', async () => {
    // Creamos 15 clientes para tener más de una página
    const clientes = Array.from({ length: 15 }, (_, i) => ({
      user: userId, company: companyId,
      name: `Cliente ${i}`,
      cif:  `B0000000${String(i).padStart(2, '0')}`
    }))
    await Client.create(clientes)

    const res = await request(app)
      .get('/api/client?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(10)      // solo 10 en esta página
    expect(res.body.totalItems).toBe(15)         // pero hay 15 en total
    expect(res.body.totalPages).toBe(2)          // 2 páginas
    expect(res.body.currentPage).toBe(1)
  })
})

describe('GET /api/client/:id — Obtener cliente', () => {

  it('devuelve un cliente concreto', async () => {
    const cliente = await Client.create({
      user: userId, company: companyId,
      name: 'Cliente Concreto', cif: 'B12312312'
    })

    const res = await request(app)
      .get(`/api/client/${cliente._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Cliente Concreto')
  })

  it('devuelve 404 si el cliente no existe', async () => {
    const idFalso = new mongoose.Types.ObjectId()

    const res = await request(app)
      .get(`/api/client/${idFalso}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('PUT /api/client/:id — Actualizar cliente', () => {

  it('actualiza el nombre del cliente', async () => {
    const cliente = await Client.create({
      user: userId, company: companyId,
      name: 'Nombre Viejo', cif: 'B99988877'
    })

    const res = await request(app)
      .put(`/api/client/${cliente._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nombre Nuevo' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Nombre Nuevo')
  })
})

describe('DELETE /api/client/:id — Borrar cliente', () => {

  it('soft delete marca deleted: true', async () => {
    const cliente = await Client.create({
      user: userId, company: companyId,
      name: 'Para archivar', cif: 'B99999991'
    })

    const res = await request(app)
      .delete(`/api/client/${cliente._id}?soft=true`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    // Comprobamos directamente en la BD que se marcó deleted: true
    const enBD = await Client.findById(cliente._id)
    expect(enBD.deleted).toBe(true)
  })

  it('hard delete elimina el documento de la BD', async () => {
    const cliente = await Client.create({
      user: userId, company: companyId,
      name: 'Para borrar', cif: 'B99999992'
    })

    await request(app)
      .delete(`/api/client/${cliente._id}`)
      .set('Authorization', `Bearer ${token}`)

    // findById devuelve null si no existe
    const enBD = await Client.findById(cliente._id)
    expect(enBD).toBeNull()
  })
})

describe('GET /api/client/archived — Clientes archivados', () => {

  it('devuelve solo los clientes archivados', async () => {
    await Client.create([
      { user: userId, company: companyId, name: 'Activo',   cif: 'B11122233', deleted: false },
      { user: userId, company: companyId, name: 'Archivado', cif: 'B11122244', deleted: true  }
    ])

    const res = await request(app)
      .get('/api/client/archived')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('Archivado')
  })
})

describe('PATCH /api/client/:id/restore — Restaurar cliente', () => {

  it('restaura un cliente archivado', async () => {
    const cliente = await Client.create({
      user: userId, company: companyId,
      name: 'Para restaurar', cif: 'B55566677',
      deleted: true  // está archivado
    })

    const res = await request(app)
      .patch(`/api/client/${cliente._id}/restore`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    // Verificamos en BD que deleted volvió a false
    const enBD = await Client.findById(cliente._id)
    expect(enBD.deleted).toBe(false)
  })
})