import { Router } from 'express'

// Importamos todos los controllers
import {
  register,
  verifyEmail,
  login,
  updatePersonalData,
  updateCompany,
  uploadLogo,
  getUser,
  refreshToken,
  logout,
  deleteUser,
  changePassword,
  inviteUser
} from '../controllers/user.controller.js'

// Importamos los middlewares
import authMiddleware from '../middleware/auth.middleware.js'
import checkRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.js'
import upload from '../middleware/upload.js'

// Importamos los schemas de validación Zod
import {
  registerSchema,
  loginSchema,
  verificationSchema,
  personalDataSchema,
  companySchema,
  changePasswordSchema,
  inviteSchema
} from '../validators/user.validator.js'

const router = Router()

// -----------------------------------------------
// RUTAS PÚBLICAS — no requieren token JWT
// -----------------------------------------------

// POST /api/user/register → valida body con Zod → llama al controller
// validate(registerSchema) comprueba email y password antes de llegar
// al controller. Si falla devuelve 400 automáticamente
router.post('/register', validate(registerSchema), register)

// POST /api/user/login
router.post('/login', validate(loginSchema), login)

// POST /api/user/refresh — no necesita auth porque el token expiró
router.post('/refresh', refreshToken)

// -----------------------------------------------
// RUTAS PROTEGIDAS — requieren token JWT
// authMiddleware verifica el token y añade req.user
// -----------------------------------------------

// PUT /api/user/validation — verificar email con código 6 dígitos
router.put(
  '/validation',
  authMiddleware,
  validate(verificationSchema),
  verifyEmail
)

// PUT /api/user/register — onboarding datos personales
// Mismo endpoint PUT pero con datos diferentes al POST
router.put(
  '/register',
  authMiddleware,
  validate(personalDataSchema),
  updatePersonalData
)

// PATCH /api/user/company — onboarding compañía
router.patch(
  '/company',
  authMiddleware,
  validate(companySchema),
  updateCompany
)

// PATCH /api/user/logo — subir logo con Multer
// upload.single('logo') procesa el archivo con campo "logo"
router.patch(
  '/logo',
  authMiddleware,
  upload.single('logo'),
  uploadLogo
)

// GET /api/user — obtener usuario con populate
router.get('/', authMiddleware, getUser)

// POST /api/user/logout
router.post('/logout', authMiddleware, logout)

// DELETE /api/user — soporta ?soft=true
router.delete('/', authMiddleware, deleteUser)

// PUT /api/user/password — cambiar contraseña (BONUS)
router.put(
  '/password',
  authMiddleware,
  validate(changePasswordSchema),
  changePassword
)

// POST /api/user/invite — solo admins pueden invitar
// checkRole('admin') comprueba que req.user.role === 'admin'
router.post(
  '/invite',
  authMiddleware,
  checkRole('admin'),
  validate(inviteSchema),
  inviteUser
)

export default router