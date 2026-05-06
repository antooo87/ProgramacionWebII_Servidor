import AppError from '../utils/AppError.js'
import { sendSlackError } from '../services/slack.service.js'

const errorHandler = async (err, req, res, next) => {

  // ─── Normalizamos el error ────────────────────────────────────
  // Si el error no tiene statusCode lo ponemos a 500 por defecto
  err.statusCode = err.statusCode || 500
  err.status     = err.status     || 'error'

  // ─── Errores de Mongoose: validación de campos ────────────────
  // Ocurre cuando un campo required no viene o un enum no es válido
  if (err.name === 'ValidationError' && err.errors) {
    const message = Object.values(err.errors)
      .map(e => e?.message || 'Error de validación')
      .join(', ')
    err = AppError.badRequest(message)
  }

  // ─── Error de MongoDB: clave duplicada (unique) ───────────────
  // Ocurre cuando intentas guardar un documento con un valor
  // que ya existe en un campo con índice unique
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    err = new AppError(`El valor para el campo '${field}' ya existe`, 409)
  }

  // ─── Errores de JWT ───────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Token inválido', 401)
  }

  if (err.name === 'TokenExpiredError') {
    err = new AppError('Token expirado, vuelve a iniciar sesión', 401)
  }

  // ─── CastError: ID de MongoDB con formato incorrecto ─────────
  // Ocurre cuando mandas un id como "abc" en vez de un ObjectId válido
  if (err.name === 'CastError') {
    err = new AppError(`ID inválido: ${err.value}`, 400)
  }

  // ─── Errores 5XX → notificar a Slack ─────────────────────────
  // Solo errores nuestros (del servidor), no errores del cliente (4XX)
  if (err.statusCode >= 500) {
    // No esperamos a Slack para responder — lo mandamos en paralelo
    sendSlackError(err, req).catch(slackErr => {
      console.error('Fallo al notificar Slack:', slackErr.message)
    })
  }

  // ─── Log en consola durante desarrollo ───────────────────────
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err.message)
    console.error(err.stack)
  }

  // ─── Respuesta al cliente ─────────────────────────────────────
  res.status(err.statusCode).json({
    status:  err.status,
    message: err.message,
    // Solo mostramos el stack en desarrollo — nunca en producción
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export default errorHandler