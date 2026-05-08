import jwt      from 'jsonwebtoken'
import mongoose from 'mongoose'

// Genera un token JWT falso para los tests
// No necesitas hacer login real — generas el token directamente
export const generateTestToken = (overrides = {}) => {
  const payload = {
    id:     new mongoose.Types.ObjectId().toString(),
    company: new mongoose.Types.ObjectId().toString(),
    role:    'admin',
    ...overrides  // permite sobreescribir campos: generateTestToken({ role: 'guest' })
  }

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )

  // Devolvemos tanto el token como el payload
  // porque en los tests necesitamos los IDs para crear datos en la BD
  return { token, payload }
}