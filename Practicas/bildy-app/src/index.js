import { config } from 'dotenv'
config()

import http           from 'http'
import mongoose       from 'mongoose'
import app            from './app.js'
import { initSocket } from './config/socket.js'

const PORT = process.env.PORT || 3001

const httpServer = http.createServer(app)
const io = initSocket(httpServer)

const gracefulShutdown = async (signal) => {
  console.log(`\nRecibida señal ${signal}. Cerrando servidor...`)

  httpServer.close(async () => {
    io.close(() => console.log('Socket.IO cerrado'))
    await mongoose.connection.close()
    console.log('MongoDB desconectado')
    process.exit(0)
  })

  setTimeout(() => {
    console.error('Timeout: forzando cierre')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Conectado a MongoDB')
    httpServer.listen(PORT, () => {
      console.log(`Servidor en http://localhost:${PORT}`)
      console.log(`Swagger en  http://localhost:${PORT}/api-docs`)
    })
  })
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message)
    process.exit(1)
  })