import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import mongoose from 'mongoose'

import errorHandler       from './middleware/error-handler.js'
import userRoutes         from './routes/user.routes.js'
import clientRoutes       from './routes/client.routes.js'
import projectRoutes      from './routes/project.routes.js'
import deliveryNoteRoutes from './routes/deliverynote.routes.js'
import swaggerUi          from 'swagger-ui-express'
import swaggerSpec        from './config/swagger.js'

const app = express()

// ─── Seguridad ────────────────────────────────────────
app.use(helmet())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas peticiones, intenta más tarde'
})
// app.use(limiter) // actívalo cuando vayas a producción

// ─── Body parser ──────────────────────────────────────
app.use(express.json())

// ─── Archivos estáticos ───────────────────────────────
app.use('/uploads', express.static('uploads'))

// ─── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  res.status(200).json({
    status:    'ok',
    db:        dbState,
    uptime:    process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// ─── Ruta de prueba ───────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'BildyApp API funcionando' })
})

// ─── Swagger UI ───────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// ─── Rutas de la API ──────────────────────────────────
app.use('/api/user',         userRoutes)
app.use('/api/client',       clientRoutes)
app.use('/api/project',      projectRoutes)
app.use('/api/deliverynote', deliveryNoteRoutes)

// ─── Error handler — SIEMPRE AL FINAL ─────────────────
// Express lo reconoce como error handler porque tiene 4 parámetros (err, req, res, next)
// Si va antes de las rutas, los errores de esas rutas no llegan aquí
app.use(errorHandler)

export default app