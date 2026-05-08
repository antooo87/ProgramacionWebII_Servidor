import multer from 'multer'

// memoryStorage guarda el archivo en RAM como Buffer
// Así req.file.buffer tiene el contenido y podemos subirlo a Cloudinary
// diskStorage lo guardaría en disco y req.file.buffer sería undefined
const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5MB
  fileFilter: (req, file, cb) => {
    // Solo aceptamos imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes'), false)
    }
  }
})

export default upload