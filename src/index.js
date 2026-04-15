console.log('🔥 EJECUTANDO ARCHIVO:', import.meta.url)

console.log('URI:', process.env.MONGODB_URI)

import app from './app.js'  
import mongoose from 'mongoose'
const PORT = process.env.PORT || 3001


mongoose.connect(process.env.MONGODB_URI)
  .then(() => {

    console.log('Conectado a MongoDB')

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
   
    console.error('Error conectando a MongoDB:', err.message)
    process.exit(1) 
})