import AppError from '../utils/AppError.js'

// Función que devuelve un middleware — recibe los roles permitidos
// Uso: router.post('/invite', auth, checkRole('admin'), controller)
// Solo los usuarios con role 'admin' podrán acceder
const checkRole = (...roles) => (req, res, next) => {
  // req.user lo puso el authMiddleware justo antes
  if (!req.user) {
    return next(AppError.unauthorized('No autenticado'))
  }

  // includes() comprueba si el rol del usuario está en la lista
  if (!roles.includes(req.user.role)) {
    return next(
      AppError.forbidden('No tienes permisos para realizar esta acción')
    )
  }

  next()
}

export default checkRole