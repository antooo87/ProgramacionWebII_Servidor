import express         from 'express'
import helmet          from 'helmet'
import mongoSanitize   from 'express-mongo-sanitize'
import { rateLimit }   from 'express-rate-limit'
import mongoose        from 'mongoose'
import errorHandler    from './middleware/error-handler.js'
import userRoutes      from './routes/user.routes.js'
import clientRoutes    from './routes/client.routes.js'
import projectRoutes   from './routes/project.routes.js'
import deliveryNoteRoutes from './routes/deliverynote.routes.js'
import swaggerUi       from 'swagger-ui-express'
import swaggerSpec     from './config/swagger.js'

const app = express()

app.use(helmet())

// mongoSanitize elimina caracteres $ y . de los datos de entrada
// Protege contra ataques de inyección NoSQL
// Ejemplo de ataque sin esto: { "email": { "$gt": "" } } podría bypassear login
app.use(mongoSanitize())

// Rate limiter: máximo 100 peticiones por IP cada 15 minutos
// Protege contra ataques de fuerza bruta en login/register
// Sin esto alguien puede probar millones de contraseñas automáticamente
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Demasiadas peticiones, intenta más tarde' }
})
app.use(limiter)

app.use(express.json())
app.use('/uploads', express.static('uploads'))

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  res.status(200).json({
    status:    'ok',
    db:        dbState,
    uptime:    process.uptime(),
    timestamp: new Date().toISOString()
  })
})

app.get('/', (req, res) => {
  res.json({ message: 'BildyApp API funcionando' })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use('/api/user',         userRoutes)
app.use('/api/client',       clientRoutes)
app.use('/api/project',      projectRoutes)
app.use('/api/deliverynote', deliveryNoteRoutes)

app.use(errorHandler)

export default apps