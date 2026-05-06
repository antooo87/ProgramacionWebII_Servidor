import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// MongoMemoryServer arranca un MongoDB real en memoria RAM
// No necesitas tener MongoDB instalado ni conexión a Atlas
let mongoServer

export const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri   = mongoServer.getUri()
  await mongoose.connect(uri)
}

// Limpia TODAS las colecciones entre tests
// Así cada test empieza con la BD vacía y no interfieren entre sí
export const clearTestDB = async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}

// Para el servidor de MongoDB y cierra la conexión al terminar todos los tests
export const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongoServer.stop()
}