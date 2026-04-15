import AppError from '../utils/AppError.js' 

const errorHandler = (err, req, res, next) => {

  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'   

if (err.name === 'ValidationError' && err.errors) {
  const message = Object.values(err.errors)
    .map(e => e?.message || 'Error de validación')
    .join(', ')

  err = AppError.badRequest(message)
}

  if (err.code === 11000){   
    const field = Object.keys(err.keyValue)[0]
    err = new AppError(`El valor para el campo ${field} ya existe.`, 409)
  }

  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Token inválido', 401)
  }

  if (err.name === 'TokenExpiredError'){
    err = new AppError('Token expirado, vuelve a iniciar sesión', 401)
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  })
}   

export default errorHandler