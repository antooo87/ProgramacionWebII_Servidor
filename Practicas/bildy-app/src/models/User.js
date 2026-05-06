import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    // Email único — nadie puede registrarse dos veces con el mismo email
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,   // crea un index único automáticamente
      trim: true,
      lowercase: true // siempre en minúsculas
    },

    // Contraseña cifrada con bcrypt — nunca en texto plano
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 8,
      // select: false significa que NO se incluye en las consultas
      // por defecto. Así nunca se devuelve la contraseña al cliente
      // por accidente
      select: false
    },

    name: {
      type: String,
      trim: true
    },

    lastName: {
      type: String,
      trim: true
    },

    nif: {
      type: String,
      trim: true,
      uppercase: true
    },

    // Rol del usuario — admin crea empresa, guest se une a una existente
    role: {
      type: String,
      enum: ['admin', 'guest'],  // solo estos dos valores son válidos
      default: 'admin'
    },

    // Estado de verificación del email
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending'  // recién registrado siempre empieza pending
    },

    // Código de 6 dígitos que se envía al email para verificar
    verificationCode: {
      type: String,
      select: false  // tampoco se devuelve al cliente por defecto
    },

    // Intentos restantes para introducir el código (máximo 3)
    verificationAttempts: {
      type: Number,
      default: 3
    },

    // Referencia a la compañía del usuario
    // Se asigna durante el onboarding, por eso no es required
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },

    // Refresh token almacenado para poder invalidarlo en logout
    refreshToken: {
      type: String,
      default: null,
      select: false
    },

    address: {
      street:   { type: String, trim: true },
      number:   { type: String, trim: true },
      postal:   { type: String, trim: true },
      city:     { type: String, trim: true },
      province: { type: String, trim: true }
    },

    deleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,

    // toJSON: { virtuals: true } es OBLIGATORIO para que los virtuals
    // aparezcan cuando conviertes el documento a JSON
    // (por ejemplo cuando Express hace res.json(user))
    toJSON: { virtuals: true }
  }
)

// --- VIRTUAL: fullName ---
// Un virtual es un campo calculado que NO se guarda en MongoDB
// Se calcula al vuelo cada vez que lo pides
// El enunciado lo exige obligatoriamente
userSchema.virtual('fullName').get(function () {
  // Usamos function() en vez de arrow function =>
  // porque necesitamos acceder a 'this' (el documento actual)
  if (this.name && this.lastName) {
    return `${this.name} ${this.lastName}`
  }
  return this.name || ''
})

// --- INDEXES ---
// Los indexes aceleran las búsquedas en MongoDB
// Sin index, MongoDB recorre TODOS los documentos para buscar uno
// Con index, va directamente al que necesita (como el índice de un libro)
userSchema.index({ company: 1 })  // búsquedas por compañía
userSchema.index({ status: 1 })   // búsquedas por estado
userSchema.index({ role: 1 })     // búsquedas por rol
// email ya tiene index unique definido arriba en el campo

const User = mongoose.model('User', userSchema)

export default User