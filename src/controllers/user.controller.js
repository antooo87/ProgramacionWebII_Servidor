import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Company from '../models/Company.js'
import AppError from '../utils/AppError.js'
import config from '../config/index.js'
import notificationEmitter from '../services/notification.service.js'

// Función auxiliar para generar tokens JWT
// La usamos en registro, login y refresh
// Así no repetimos el mismo código en 3 sitios
const generateTokens = (userId) => {
  // El payload es la información que guardamos dentro del token
  // Solo guardamos el id — nunca datos sensibles como la contraseña
  const accessToken = jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }  // 15 minutos
  )

  const refreshToken = jwt.sign(
    { id: userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }  // 7 días
  )

  return { accessToken, refreshToken }
}
// POST /api/user/register
export const register = async (req, res, next) => {
  try {
    // req.body ya viene validado por Zod gracias al middleware validate
    // email ya está en minúsculas por el .transform() del schema
    const { email, password } = req.body

    // Comprobamos si ya existe un usuario verificado con ese email
    // Solo bloqueamos si está verificado — si está pending dejamos
    // registrarse de nuevo (podría ser un intento fallido anterior)
    const existingUser = await User.findOne({
      email,
      status: 'verified',
      deleted: false
    })

    if (existingUser) {
      throw AppError.conflict('Ya existe una cuenta verificada con este email')
    }

    // Ciframos la contraseña con bcrypt
    // El 10 es el "salt rounds" — cuántas veces se aplica el algoritmo
    // Más alto = más seguro pero más lento. 10 es el estándar
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generamos el código de verificación de 6 dígitos
    // Math.random() da un número entre 0 y 1
    // Multiplicamos por 900000 y sumamos 100000 para que siempre
    // tenga 6 dígitos (entre 100000 y 999999)
    const verificationCode = String(
      Math.floor(Math.random() * 900000) + 100000
    )

    // Creamos el usuario en la base de datos
    const user = await User.create({
      email,
      password: hashedPassword,
      verificationCode,
      verificationAttempts: 3,
      role: 'admin',
      status: 'pending'
    })

    // Generamos los tokens JWT
    const { accessToken, refreshToken } = generateTokens(user._id)

    // Guardamos el refresh token en la base de datos
    // Así podemos invalidarlo cuando el usuario haga logout
    user.refreshToken = refreshToken
    await user.save()

    // Emitimos el evento para el EventEmitter
    // El listener en notification.service.js hará console.log
    notificationEmitter.emit('user:registered', user)

    // Respondemos con 201 Created
    // Solo devolvemos los datos necesarios, nunca la contraseña
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          email: user.email,
          status: user.status,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    })

  } catch (error) {
    next(error)  // pasamos el error al middleware centralizado
  }
}
// PUT /api/user/validation
export const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body
    // req.user lo añadió el authMiddleware leyendo el JWT
    const userId = req.user._id

    // Buscamos el usuario incluyendo verificationCode
    // que tiene select: false en el modelo
    // Por eso necesitamos .select('+verificationCode') explícitamente
    const user = await User.findById(userId)
      .select('+verificationCode')

    if (!user) {
      throw AppError.notFound('Usuario no encontrado')
    }

    if (user.status === 'verified') {
      throw AppError.badRequest('El email ya está verificado')
    }

    // Comprobamos si quedan intentos
    if (user.verificationAttempts <= 0) {
      throw AppError.tooManyRequests(
        'Has agotado los intentos de verificación'
      )
    }

    // Comprobamos si el código es correcto
    if (user.verificationCode !== code) {
      // Decrementamos los intentos restantes
      user.verificationAttempts -= 1
      await user.save()

      // Si se acabaron los intentos devolvemos 429
      if (user.verificationAttempts <= 0) {
        throw AppError.tooManyRequests(
          'Has agotado los intentos de verificación'
        )
      }

      throw AppError.badRequest(
        `Código incorrecto. Te quedan ${user.verificationAttempts} intentos`
      )
    }

    // Código correcto — actualizamos el status a verified
    user.status = 'verified'
    user.verificationCode = undefined  // ya no lo necesitamos
    await user.save()

    notificationEmitter.emit('user:verified', user)

    res.json({
      status: 'success',
      message: 'Email verificado correctamente'
    })

  } catch (error) {
    next(error)
  }
}
// POST /api/user/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Buscamos el usuario incluyendo la contraseña
    // (tiene select: false en el modelo, hay que pedirla explícitamente)
    const user = await User.findOne({ email, deleted: false })
      .select('+password')

    if (!user) {
      // Usamos el mismo mensaje para email y contraseña incorrectos
      // Si diéramos mensajes distintos, daríamos pistas a atacantes
      throw AppError.unauthorized('Credenciales incorrectas')
    }

    // bcrypt.compare compara la contraseña en texto plano
    // con el hash guardado en la base de datos
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw AppError.unauthorized('Credenciales incorrectas')
    }

    // Generamos nuevos tokens
    const { accessToken, refreshToken } = generateTokens(user._id)

    // Actualizamos el refresh token en la base de datos
    user.refreshToken = refreshToken
    await user.save()

    res.json({
      status: 'success',
      data: {
        user: {
          email: user.email,
          status: user.status,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    })

  } catch (error) {
    next(error)
  }
}
// PUT /api/user/register (con token JWT)
export const updatePersonalData = async (req, res, next) => {
  try {
    const { name, lastName, nif } = req.body

    // Actualizamos el usuario identificado por el token
    // { new: true } devuelve el documento actualizado, no el anterior
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
// PATCH /api/user/company
export const updateCompany = async (req, res, next) => {
  try {
    const { name, cif, address, isFreelance } = req.body
    const user = await User.findById(req.user._id)

    let companyData = { name, cif, address, isFreelance }

    // Si es autónomo, los datos de la empresa son sus datos personales
    if (isFreelance) {
      companyData = {
        name: user.name,
        cif: user.nif,      // el CIF es su NIF personal
        address: user.address,
        isFreelance: true
      }
    }

    // Buscamos si ya existe una empresa con ese CIF
    const existingCompany = await Company.findOne({ cif: companyData.cif })

    let company

    if (existingCompany) {
      // Ya existe — el usuario se une como guest
      company = existingCompany
      user.role = 'guest'
    } else {
      // No existe — creamos la empresa y el usuario es owner admin
      company = await Company.create({
        ...companyData,
        owner: user._id
      })
    }

    // Asignamos la compañía al usuario
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
// PATCH /api/user/logo
export const uploadLogo = async (req, res, next) => {
  try {
    // req.file lo añade Multer automáticamente
    if (!req.file) {
      throw AppError.badRequest('No se proporcionó ninguna imagen')
    }

    if (!req.user.company) {
      throw AppError.badRequest('El usuario no tiene compañía asignada')
    }

    // Construimos la URL donde se puede acceder al logo
    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`

    // Actualizamos el logo en la compañía del usuario
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
// GET /api/user — obtener usuario con populate
export const getUser = async (req, res, next) => {
  try {
    // populate sustituye el ObjectId de company por el documento completo
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

// POST /api/user/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw AppError.badRequest('Refresh token no proporcionado')
    }

    // Verificamos el refresh token con su clave secreta específica
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret)

    // Buscamos el usuario y comprobamos que el refresh token coincide
    const user = await User.findById(decoded.id).select('+refreshToken')

    if (!user || user.refreshToken !== refreshToken) {
      throw AppError.unauthorized('Refresh token inválido')
    }

    // Generamos nuevos tokens (rotación del refresh token)
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

// POST /api/user/logout
export const logout = async (req, res, next) => {
  try {
    // Eliminamos el refresh token de la base de datos
    // Así aunque alguien lo tenga no podrá usarlo
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null })

    res.json({
      status: 'success',
      message: 'Sesión cerrada correctamente'
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/user
export const deleteUser = async (req, res, next) => {
  try {
    // ?soft=true en la URL → borrado lógico
    // Sin el parámetro → borrado físico
    const softDelete = req.query.soft === 'true'

    if (softDelete) {
      // Soft delete — marcamos deleted: true pero el documento sigue
      await User.findByIdAndUpdate(req.user._id, { deleted: true })
    } else {
      // Hard delete — eliminamos el documento completamente
      await User.findByIdAndDelete(req.user._id)
    }

    notificationEmitter.emit('user:deleted', req.user)

    res.json({
      status: 'success',
      message: `Usuario eliminado ${softDelete ? '(soft delete)' : '(hard delete)'}`
    })
  } catch (error) {
    next(error)
  }
}

// PUT /api/user/password (BONUS)
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
      status: 'success',
      message: 'Contraseña actualizada correctamente'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/user/invite
export const inviteUser = async (req, res, next) => {
  try {
    const { email, name, lastName } = req.body

    // Generamos una contraseña temporal para el invitado
    const tempPassword = await bcrypt.hash('Temporal123!', 10)
    const verificationCode = String(
      Math.floor(Math.random() * 900000) + 100000
    )

    const newUser = await User.create({
      email,
      name,
      lastName,
      password: tempPassword,
      role: 'guest',
      status: 'pending',
      company: req.user.company,  // misma compañía que el admin
      verificationCode,
      verificationAttempts: 3
    })

    notificationEmitter.emit('user:invited', newUser)

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          email: newUser.email,
          role: newUser.role,
          company: newUser.company
        }
      }
    })
  } catch (error) {
    next(error)
  }
}