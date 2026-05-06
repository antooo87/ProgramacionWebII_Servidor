import mongoose from 'mongoose'

// Una entrada de horas: quién trabajó y cuántas horas
const hoursEntrySchema = new mongoose.Schema({
  worker: { type: String, required: true, trim: true }, // nombre del trabajador
  hours:  { type: Number, required: true, min: 0 }      // horas trabajadas
}, { _id: false })

// Una entrada de material: qué material y cuánto
const materialEntrySchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit:     { type: String, trim: true } // "kg", "m2", "unidades"...
}, { _id: false })

const deliveryNoteSchema = new mongoose.Schema({

  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  // client lo sacamos del proyecto, pero lo guardamos aquí para facilitar filtros
  client:  { type: mongoose.Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },

  // Tipo de albarán: horas o materiales
  format: {
    type: String,
    enum: ['hours', 'material'], // solo estos dos valores son válidos
    required: true,
    index: true
  },

  // Si es de horas: array de trabajadores con sus horas
  hoursEntries: [hoursEntrySchema],

  // Si es de materiales: array de materiales
  materialEntries: [materialEntrySchema],

  description: { type: String, trim: true },

  workDate: { type: Date, default: Date.now, index: true },

  // Firma digital
  signed:       { type: Boolean, default: false, index: true },
  signatureUrl: { type: String },   // URL de la imagen de firma en la nube
  signedAt:     { type: Date },     // cuándo se firmó

  // PDF generado
  pdfUrl: { type: String },         // URL del PDF en la nube (solo si está firmado)

  deleted: { type: Boolean, default: false }

}, { timestamps: true })

export default mongoose.model('DeliveryNote', deliveryNoteSchema)