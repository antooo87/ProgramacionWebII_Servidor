import express from 'express'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'
import { rateLimit } from 'express-rate-limit'
import errorHandler from './middleware/error-handler.js'
import userRoutes from './routes/user.routes.js'

const app = express()

app.use(helmet())
//app.use(mongoSanitize())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas peticiones, intenta más tarde'
})
//app.use(limiter)

app.use(express.json())

app.use((req, res, next) => {
  console.log('🔥 MIDDLEWARE CHECK')
  console.log('req.query:', req.query)
  next()
})


// Servir la carpeta uploads como archivos estáticos
// Así los logos son accesibles desde http://localhost:3000/uploads/logo.jpg
app.use('/uploads', express.static('uploads'))

// Rutas de la API — todas empiezan por /api/user
app.use('/api/user', userRoutes)

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'BildyApp API funcionando' })
})

// El error handler SIEMPRE va al final
app.use(errorHandler)

export default app