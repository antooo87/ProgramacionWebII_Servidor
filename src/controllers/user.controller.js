import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Company from '../models/Company.js'
import AppError from '../utils/AppError.js'
import config from '../config/index.js'
import notificationEmitter from '../services/notification.service.js'
import { sendVerificationEmail } from '../services/email.service.js'
import { getIO } from '../config/socket.js'

// ─────────────────────────────────────────────────────────────
// FUNCIÓN AUXILIAR: generar access token + refresh token
// La usamos en register, login y refreshToken para no repetir código
// ─────────────────────────────────────────────────────────────
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }       // 15 minutos
  )

  const refreshToken = jwt.sign(
    { id: userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } // 7 días
  )

  return { accessToken, refreshToken }
}

// ─────────────────────────────────────────────────────────────
// POST /api/user/register
// ─────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Solo bloqueamos si hay cuenta verificada — si está pending
    // dejamos registrarse de nuevo (podría ser intento fallido anterior)
    const existingUser = await User.findOne({
      email,
      status: 'verified',
      deleted: false
    })

    if (existingUser) {
      throw AppError.conflict('Ya existe una cuenta verificada con este email')
    }

    // bcrypt.hash cifra la contraseña — el 10 es cuántas veces
    // se aplica el algoritmo (más alto = más seguro pero más lento)
    const hashedPassword = await bcrypt.hash(password, 10)

    // Código de 6 dígitos: entre 100000 y 999999
    const verificationCode = String(
      Math.floor(Math.random() * 900000) + 100000
    )

    const user = await User.create({
      email,
      password: hashedPassword,
      verificationCode,
      verificationAttempts: 3,
      role:   'admin',
      status: 'pending'
    })

    const { accessToken, refreshToken } = generateTokens(user._id)

    // Guardamos el refresh token en BD para poder invalidarlo en logout
    user.refreshToken = refreshToken
    await user.save()

    // Enviamos email de verificación con el código
    // Si falla el email no bloqueamos el registro — avisamos en consola
    try {
      await sendVerificationEmail(email, verificationCode)
    } catch (emailErr) {
      console.error('Error enviando email de verificación:', emailErr.message)
    }

    // Evento para el EventEmitter interno (logs, notificaciones)
    notificationEmitter.emit('user:registered', user)

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          email:  user.email,
          status: user.status,
          role:   user.role
        },
        accessToken,
        refreshToken
      }
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/user/validation — verificar email con código
// ─────────────────────────────────────────────────────────────
export const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body
    const userId   = req.user._id

    // verificationCode tiene select:false en el modelo
    // hay que pedirlo explícitamente con .select('+verificationCode')
    const user = await User.findById(userId)
      .select('+verificationCode')

    if (!user) {
      throw AppError.notFound('Usuario no encontrado')
    }

    if (user.status === 'verified') {
      throw AppError.badRequest('El email ya está verificado')
    }

    if (user.verificationAttempts <= 0) {
      throw AppError.tooManyRequests('Has agotado los intentos de verificación')
    }

    if (user.verificationCode !== code) {
      user.verificationAttempts -= 1
      await user.save()

      if (user.verificationAttempts <= 0) {
        throw AppError.tooManyRequests('Has agotado los intentos de verificación')
      }

      throw AppError.badRequest(
        `Código incorrecto. Te quedan ${user.verificationAttempts} intentos`
      )
    }

    // Código correcto — verificamos y limpiamos el código
    user.status           = 'verified'
    user.verificationCode = undefined
    await user.save()

    notificationEmitter.emit('user:verified', user)

    res.json({
      status:  'success',
      message: 'Email verificado correctamente'
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/user/login
// ─────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // .select('+password') porque password tiene select:false en el modelo
    const user = await User.findOne({ email, deleted: false })
      .select('+password')

    // Mismo mensaje para email y contraseña incorrectos
    // Si diéramos mensajes distintos daríamos pistas a atacantes
    if (!user) {
      throw AppError.unauthorized('Credenciales incorrectas')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw AppError.unauthorized('Credenciales incorrectas')
    }

    const { accessToken, refreshToken } = generateTokens(user._id)

    user.refreshToken = refreshToken
    await user.save()

    res.json({
      status: 'success',
      data: {
        user: {
          email:  user.email,
          status: user.status,
          role:   user.role
        },
        accessToken,
        refreshToken
      }
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/user/register — actualizar datos personales (con JWT)
// ─────────────────────────────────────────────────────────────
export const updatePersonalData = async (req, res, next) => {
  try {
    const { name, lastName, nif } = req.body

    // { new: true } devuelve el documento DESPUÉS de actualizar
    // runValidators aplica las validaciones del schema de Mongoose
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, lastName, nif },
      { new: true, runValidators: true }
    )

    res.json({
      status: 'success',
      data: { user }
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/user/company — crear o unirse a una empresa
// ─────────────────────────────────────────────────────────────
export const updateCompany = async (req, res, next) => {
  try {
    const { name, cif, address, isFreelance } = req.body
    const user = await User.findById(req.user._id)

    let companyData = { name, cif, address, isFreelance }

    // Si es autónomo, los datos de la empresa son sus propios datos
    if (isFreelance) {
      companyData = {
        name:        user.name,
        cif:         user.nif,
        address:     user.address,
        isFreelance: true
      }
    }

    // Si ya existe una empresa con ese CIF, el usuario se une como guest
    const existingCompany = await Company.findOne({ cif: companyData.cif })

    let company

    if (existingCompany) {
      company   = existingCompany
      user.role = 'guest'    // se une como invitado, no como admin
    } else {
      // No existe — la creamos y el usuario es el owner (admin)
      company = await Company.create({
        ...companyData,
        owner: user._id
      })
    }

    user.company = company._id
    await user.save()

    res.json({
      status: 'success',
      data: { company, role: user.role }
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/user/logo — subir logo de la empresa
// ─────────────────────────────────────────────────────────────
export const uploadLogo = async (req, res, next) => {
  try {
    // req.file lo añade Multer automáticamente al procesar el multipart/form-data
    if (!req.file) {
      throw AppError.badRequest('No se proporcionó ninguna imagen')
    }

    if (!req.user.company) {
      throw AppError.badRequest('El usuario no tiene compañía asignada')
    }

    // Construimos la URL pública del logo subido
    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`

    const company = await Company.findByIdAndUpdate(
      req.user.company,
      { logo: logoUrl },
      { new: true }
    )

    res.json({
      status: 'success',
      data: { logo: company.logo }
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/user — obtener perfil del usuario autenticado
// ─────────────────────────────────────────────────────────────
export const getUser = async (req, res, next) => {
  try {
    // populate sustituye el ObjectId de company por el documento completo
    // En vez de { company: "64abc123" } tienes { company: { name: "...", cif: "..." } }
    const user = await User.findById(req.user._id)
      .populate('company')

    res.json({
      status: 'success',
      data: { user }
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/user/refresh — renovar tokens con el refresh token
// ─────────────────────────────────────────────────────────────
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw AppError.badRequest('Refresh token no proporcionado')
    }

    // Verificamos con la clave ESPECÍFICA del refresh token
    // (distinta a la del access token)
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret)

    // Comprobamos que el token coincide con el guardado en BD
    // Así si el usuario hizo logout, ese token ya no sirve
    const user = await User.findById(decoded.id).select('+refreshToken')

    if (!user || user.refreshToken !== refreshToken) {
      throw AppError.unauthorized('Refresh token inválido')
    }

    // Rotación: generamos nuevos tokens y descartamos el anterior
    const tokens = generateTokens(user._id)
    user.refreshToken = tokens.refreshToken
    await user.save()

    res.json({
      status: 'success',
      data: tokens
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/user/logout
// ─────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    // Borramos el refresh token de BD — aunque alguien lo tenga no sirve
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null })

    res.json({
      status:  'success',
      message: 'Sesión cerrada correctamente'
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/user — borrar cuenta
// ─────────────────────────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    // ?soft=true → borrado lógico (deleted: true, sigue en BD)
    // sin parámetro → borrado físico (se elimina de la BD)
    const softDelete = req.query.soft === 'true'

    if (softDelete) {
      await User.findByIdAndUpdate(req.user._id, { deleted: true })
    } else {
      await User.findByIdAndDelete(req.user._id)
    }

    notificationEmitter.emit('user:deleted', req.user)

    res.json({
      status:  'success',
      message: `Usuario eliminado ${softDelete ? '(soft delete)' : '(hard delete)'}`
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/user/password — cambiar contraseña
// ─────────────────────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user._id).select('+password')

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      throw AppError.unauthorized('La contraseña actual es incorrecta')
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.json({
      status:  'success',
      message: 'Contraseña actualizada correctamente'
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/user/invite — invitar a un usuario a la empresa
// ─────────────────────────────────────────────────────────────
export const inviteUser = async (req, res, next) => {
  try {
    const { email, name, lastName } = req.body

    // Solo admins pueden invitar — esto también lo podrías controlar
    // con el roleMiddleware en la ruta
    if (req.user.role !== 'admin') {
      throw AppError.forbidden('Solo los administradores pueden invitar usuarios')
    }

    const tempPassword = await bcrypt.hash('Temporal123!', 10)
    const verificationCode = String(
      Math.floor(Math.random() * 900000) + 100000
    )

    const newUser = await User.create({
      email,
      name,
      lastName,
      password:             tempPassword,
      role:                 'guest',
      status:               'pending',
      company:              req.user.company, // misma empresa que el admin
      verificationCode,
      verificationAttempts: 3
    })

    // Enviamos email al invitado con su código de verificación
    try {
      await sendVerificationEmail(email, verificationCode)
    } catch (emailErr) {
      console.error('Error enviando email de invitación:', emailErr.message)
    }

    notificationEmitter.emit('user:invited', newUser)

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          email:   newUser.email,
          role:    newUser.role,
          company: newUser.company
        }
      }
    })

  } catch (error) {
    next(error)
  }
}