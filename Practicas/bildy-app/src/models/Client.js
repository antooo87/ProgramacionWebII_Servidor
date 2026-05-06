import mongoose from "mongoose";

// Subdocumento de dirección (reutilizable)
const addressSchema = new mongoose.Schema({
  street:   { type: String, trim: true },
  number:   { type: String, trim: true },
  postal:   { type: String, trim: true },
  city:     { type: String, trim: true },
  province: { type: String, trim: true }
}, { _id: false }) // _id: false porque no necesita su propio id

const clientSchema = new mongoose.Schema({

  // ─── Quién creó este cliente ───────────────────────────
  user: {
    type: mongoose.Schema.Types.ObjectId, // es una referencia a otro documento
    ref: 'User',                          // referencia al modelo User
    required: true,
    index: true                           // se busca frecuentemente
  },

  // ─── A qué empresa pertenece este cliente ─────────────
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // ─── Datos del cliente ────────────────────────────────
  name: {
    type: String,
    required: true,
    trim: true
  },

  cif: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  phone: {
    type: String,
    trim: true
  },

  address: addressSchema, // usamos el subdocumento de arriba

  // ─── Soft delete ─────────────────────────────────────
  deleted: {
    type: Boolean,
    default: false, // por defecto NO está borrado
    index: true
  }

}, {
  timestamps: true // genera createdAt y updatedAt automáticamente
})

// Índice compuesto: mismo CIF no puede repetirse dentro de la misma empresa
// pero sí puede existir en empresas distintas
clientSchema.index({ company: 1, cif: 1 }, { unique: true })

export default mongoose.model('Client', clientSchema)