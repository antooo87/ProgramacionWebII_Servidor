import mongoose from 'mongoose'

// Reutilizamos la misma estructura de dirección que en Client
const addressSchema = new mongoose.Schema({
  street:   { type: String, trim: true },
  number:   { type: String, trim: true },
  postal:   { type: String, trim: true },
  city:     { type: String, trim: true },
  province: { type: String, trim: true }
}, { _id: false })

const projectSchema = new mongoose.Schema({

  // De quién es este proyecto
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

  // Un proyecto pertenece a UN cliente — nuevo respecto a Client
  client:  { type: mongoose.Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },

  name:    { type: String, required: true, trim: true },

  // Código único del proyecto dentro de la empresa (como "OBR-2024-001")
  code:    { type: String, required: true, trim: true, uppercase: true },

  address: addressSchema,
  notes:   { type: String, trim: true },

  // active sirve para filtrar proyectos en curso vs terminados
  active:  { type: Boolean, default: true, index: true },

  deleted: { type: Boolean, default: false, index: true }

}, { timestamps: true })

// Mismo código no puede repetirse dentro de la misma empresa
projectSchema.index({ company: 1, code: 1 }, { unique: true })

export default mongoose.model('Project', projectSchema)