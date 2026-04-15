class AppError extends Error {

  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error'
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404)
  }

  static badRequest(message = 'Petición incorrecta') {
    return new AppError(message, 400)
  }

  static unauthorized(message = 'No autorizado') {
    return new AppError(message, 401)
  }

  static forbidden(message = 'Acceso denegado') {
    return new AppError(message, 403)
  }

  static conflict(message = 'Conflicto con el estado actual') {
    return new AppError(message, 409)
  }

  static tooManyRequests(message = 'Demasiadas peticiones') {
    return new AppError(message, 429)
  }
}

export default AppError