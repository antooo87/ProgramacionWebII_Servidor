import { Server } from 'socket.io'
import jwt        from 'jsonwebtoken'

let io // instancia global para usarla desde los controladores

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' } // en producción pon tu dominio
  })

  // Middleware de autenticación — se ejecuta antes de cada conexión
  io.use((socket, next) => {
    // El cliente manda el token al conectarse:
    // socket = io('http://...', { auth: { token: 'Bearer eyJ...' } })
    const token = socket.handshake.auth?.token?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Token requerido'))
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = decoded // guardamos los datos del usuario en el socket
      next()               // conexión aceptada
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const companyId = socket.user.company?.toString()

    if (companyId) {
      // Unimos al socket a la room de su empresa
      // Room = grupo de sockets. Solo los de esa room reciben los eventos
      socket.join(companyId)
    }

    socket.on('disconnect', () => {
      // limpieza automática al desconectarse
    })
  })

  return io
}

// Esta función la usamos desde los controladores para emitir eventos
export const getIO = () => {
  if (!io) throw new Error('Socket.IO no inicializado')
  return io
}