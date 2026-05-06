import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.js'
import upload             from '../middleware/upload.js' // tu Multer ya configurado
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js'
import {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  downloadPDF,
  signDeliveryNote,
  deleteDeliveryNote
} from '../controllers/deliverynote.controller.js'

const router = Router()

// OJO: /pdf/:id ANTES que /:id (misma regla de siempre)
router.get('/pdf/:id',       authMiddleware, downloadPDF)
router.patch('/:id/sign',    authMiddleware, upload.single('signature'), signDeliveryNote)

router.post('/',    authMiddleware, validate(createDeliveryNoteSchema), createDeliveryNote)
router.get('/',     authMiddleware, getDeliveryNotes)
router.get('/:id',  authMiddleware, getDeliveryNoteById)
router.delete('/:id', authMiddleware, deleteDeliveryNote)

export default router