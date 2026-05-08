import request  from 'supertest'
import mongoose from 'mongoose'
import app      from '../src/app.js'
import { connectTestDB, clearTestDB, disconnectTestDB } from './helpers/db.js'
import { generateTestToken } from './helpers/auth.js'
import User         from '../src/models/User.js'
import Company      from '../src/models/Company.js'
import Client       from '../src/models/Client.js'
import Project      from '../src/models/Project.js'
import DeliveryNote from '../src/models/DeliveryNote.js'

let token, userId, companyId, clientId, projectId

// Segunda empresa para tests de aislamiento
let tokenEmpresaB, companyIdB

beforeAll(async () => {
  await connectTestDB()

  companyId = new mongoose.Types.ObjectId()
  userId    = new mongoose.Types.ObjectId()

  await Company.create({ _id: companyId, owner: userId, name: 'Empresa A', cif: 'A11111111' })
  await User.create({
    _id: userId, email: 'a@test.com', password: 'hash',
    name: 'User A', company: companyId, status: 'verified', role: 'admin'
  })

  const clientDoc = await Client.create({
    user: userId, company: companyId, name: 'Cliente A', cif: 'B11111111'
  })
  clientId = clientDoc._id

  const projectDoc = await Project.create({
    user: userId, company: companyId, client: clientId,
    name: 'Proyecto A', code: 'PRY-001'
  })
  projectId = projectDoc._id

  const { token: t } = generateTestToken({
    id:      userId.toString(),      // id, no _id — fix del bug
    company: companyId.toString()
  })
  token = t

  // Empresa B para tests de aislamiento multi-empresa
  companyIdB        = new mongoose.Types.ObjectId()
  const userIdB     = new mongoose.Types.ObjectId()
  await Company.create({ _id: companyIdB, owner: userIdB, name: 'Empresa B', cif: 'B99999999' })
  await User.create({
    _id: userIdB, email: 'b@test.com', password: 'hash',
    name: 'User B', company: companyIdB, status: 'verified', role: 'admin'
  })
  const { token: tb } = generateTestToken({
    id:      userIdB.toString(),
    company: companyIdB.toString()
  })
  tokenEmpresaB = tb
})

afterEach(async () => {
  await DeliveryNote.deleteMany({})
})

afterAll(async () => {
  await disconnectTestDB()
})

// ─── Test 1: crear albarán correctamente ─────────────────
describe('POST /api/deliverynote', () => {

  it('1. crea un albarán de horas correctamente', async () => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project:      projectId.toString(),
        format:       'hours',
        hoursEntries: [{ worker: 'Juan', hours: 8 }]
      })

    expect(res.status).toBe(201)
    expect(res.body.data.format).toBe('hours')
    expect(res.body.data.signed).toBe(false)
  })

  // ─── Test 2: proyecto no existe ─────────────────────────
  it('2. devuelve 404 si el proyecto no existe', async () => {
    const idFalso = new mongoose.Types.ObjectId()

    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project:      idFalso.toString(),
        format:       'hours',
        hoursEntries: [{ worker: 'Juan', hours: 8 }]
      })

    expect(res.status).toBe(404)
  })

  // ─── Test 3: formato inválido ────────────────────────────
  it('3. devuelve 400 si el formato es inválido', async () => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project: projectId.toString(),
        format:  'invalido'
      })

    expect(res.status).toBe(400)
  })
})

// ─── Test 4: no se puede borrar si está firmado ──────────
describe('DELETE /api/deliverynote/:id', () => {

  it('4. devuelve 403 al intentar borrar un albarán firmado', async () => {
    const albaran = await DeliveryNote.create({
      user: userId, company: companyId, project: projectId, client: clientId,
      format: 'hours', hoursEntries: [{ worker: 'Juan', hours: 8 }],
      signed: true, signatureUrl: 'https://cloudinary.com/firma.png', signedAt: new Date()
    })

    const res = await request(app)
      .delete(`/api/deliverynote/${albaran._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('5. permite borrar un albarán no firmado', async () => {
    const albaran = await DeliveryNote.create({
      user: userId, company: companyId, project: projectId, client: clientId,
      format: 'hours', hoursEntries: [{ worker: 'Juan', hours: 8 }],
      signed: false
    })

    const res = await request(app)
      .delete(`/api/deliverynote/${albaran._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const enBD = await DeliveryNote.findById(albaran._id)
    expect(enBD).toBeNull()
  })
})

// ─── Test 6: descarga PDF ────────────────────────────────
describe('GET /api/deliverynote/pdf/:id', () => {

  it('6. genera PDF con status 200 para albarán no firmado', async () => {
    const albaran = await DeliveryNote.create({
      user: userId, company: companyId, project: projectId, client: clientId,
      format: 'hours', hoursEntries: [{ worker: 'Ana', hours: 6 }],
      signed: false
    })

    const res = await request(app)
      .get(`/api/deliverynote/pdf/${albaran._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
  })
})

// ─── Test 7 y 8: aislamiento multi-empresa ───────────────
describe('Aislamiento multi-empresa', () => {

  it('7. empresa B no puede ver albaranes de empresa A', async () => {
    const albaran = await DeliveryNote.create({
      user: userId, company: companyId, project: projectId, client: clientId,
      format: 'hours', hoursEntries: [{ worker: 'Juan', hours: 8 }]
    })

    // Empresa B intenta ver el albarán de empresa A
    const res = await request(app)
      .get(`/api/deliverynote/${albaran._id}`)
      .set('Authorization', `Bearer ${tokenEmpresaB}`)

    expect(res.status).toBe(404) // no lo encuentra porque filtramos por company
  })

  it('8. empresa B no puede borrar albarán firmado de empresa A', async () => {
    const albaran = await DeliveryNote.create({
      user: userId, company: companyId, project: projectId, client: clientId,
      format: 'hours', hoursEntries: [{ worker: 'Juan', hours: 8 }],
      signed: true, signatureUrl: 'https://cloudinary.com/firma.png', signedAt: new Date()
    })

    const res = await request(app)
      .delete(`/api/deliverynote/${albaran._id}`)
      .set('Authorization', `Bearer ${tokenEmpresaB}`)

    // 404 porque empresa B no ve el albarán de empresa A (filtro por company)
    expect(res.status).toBe(404)
  })
})