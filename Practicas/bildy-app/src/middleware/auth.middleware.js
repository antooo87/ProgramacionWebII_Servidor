import jwt from 'jsonwebtoken'
import AppError from '../utils/AppError.js'
import User from '../models/User.js'
import config from '../config/index.js'

// Este middleware se ejecuta ANTES del controller en las rutas protegidas
// Si el token es válido, añade el usuario a req.user y llama a next()
// Si no, lanza un error 401
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Leer el token de la cabecera Authorization
    // El formato es: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('No se proporcionó token de autenticación')
    }

    // Separamos "Bearer" del token real
    // split(' ') divide por el espacio → ['Bearer', 'eltoken...']
    // [1] coge el segundo elemento
    const token = authHeader.split(' ')[1]

    // 2. Verificar que el token es válido y no ha expirado
    // jwt.verify lanza una excepción si el token es inválido
    // Devuelve el payload que guardamos cuando lo creamos
    const decoded = jwt.verify(token, config.jwt.secret)

    // 3. Buscar el usuario en la base de datos
    // decoded.id es el _id del usuario que guardamos en el token
    const user = await User.findById(decoded.id)

    if (!user) {
      throw AppError.unauthorized('El usuario del token no existe')
    }

    if (user.deleted) {
      throw AppError.unauthorized('Esta cuenta ha sido eliminada')
    }

    // 4. Añadir el usuario al objeto req para que los controllers lo usen
    // Así en cualquier controller puedes acceder a req.user
    req.user = user

    // 5. Pasar al siguiente middleware o controller
    next()

  } catch (error) {
    // Si jwt.verify falla lanza JsonWebTokenError o TokenExpiredError
    // El error-handler los convierte en respuestas 401 automáticamente
    next(error)
  }
}

export default authMiddleware