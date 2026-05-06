import multer from 'multer'
import path from 'path'
import AppError from '../utils/AppError.js'

// Configuramos dónde y cómo se guardan los archivos
const storage = multer.diskStorage({

  // Carpeta donde se guardan los archivos
  destination: (req, file, cb) => {
    // cb es un callback — cb(error, destino)
    // null significa que no hay error
    cb(null, 'uploads/')
  },

  // Nombre del archivo guardado
  // Usamos Date.now() para que sea único y no se sobreescriban
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)  // .jpg, .png, etc.
    cb(null, `logo-${Date.now()}${ext}`)
  }
})

// Filtro — solo aceptamos imágenes
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  if (allowed.includes(file.mimetype)) {
    cb(null, true)   // aceptar el archivo
  } else {
    cb(AppError.badRequest('Solo se permiten imágenes (jpg, png, webp, gif)'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024  // 5 MB máximo (en bytes)
  }
})

export default upload