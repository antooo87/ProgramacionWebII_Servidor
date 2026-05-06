import { z } from 'zod';

export const registerSchema = z.object({

    email: z
    .string({ requireed_error: 'El email es obligatorio' })
    .email('El email no tiene ningún formato')
    .transform(val =>  val.toLowerCase().trim()),

    password: z.string({ required_error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')   
})

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('El email no tiene ningún formato')
    .transform(val => val.toLowerCase().trim()),

  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
})

// --- VERIFICACIÓN EMAIL ---
// Valida que el code tenga exactamente 6 dígitos
export const verificationSchema = z.object({
  code: z
    .string({ required_error: 'El código es obligatorio' })
    .length(6, 'El código debe tener exactamente 6 dígitos')
    .regex(/^\d{6}$/, 'El código solo puede contener dígitos')
})

// --- ONBOARDING DATOS PERSONALES ---
// PUT /api/user/register — nombre, apellidos y NIF
export const personalDataSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(1, 'El nombre no puede estar vacío')
    .transform(val => val.trim()),

  lastName: z
    .string({ required_error: 'Los apellidos son obligatorios' })
    .min(1, 'Los apellidos no pueden estar vacíos')
    .transform(val => val.trim()),

  nif: z
    .string({ required_error: 'El NIF es obligatorio' })
    .min(1, 'El NIF no puede estar vacío')
    .transform(val => val.trim().toUpperCase())
})

// --- ONBOARDING COMPAÑÍA ---
// PATCH /api/user/company
// Esquema base de dirección — lo reutilizamos
const addressSchema = z.object({
  street:   z.string().trim().optional(),
  number:   z.string().trim().optional(),
  postal:   z.string().trim().optional(),
  city:     z.string().trim().optional(),
  province: z.string().trim().optional()
}).optional()

export const companySchema = z.object({
  name: z
    .string({ required_error: 'El nombre de la empresa es obligatorio' })
    .min(1)
    .transform(val => val.trim()),

  cif: z
    .string({ required_error: 'El CIF es obligatorio' })
    .min(1)
    .transform(val => val.trim().toUpperCase()),

  address: addressSchema,

  // isFreelance es opcional, por defecto false
  isFreelance: z.boolean().optional().default(false)
})

// --- CAMBIAR CONTRASEÑA (BONUS) ---
// .refine() permite validaciones cruzadas entre campos
// Aquí comprobamos que la nueva contraseña sea diferente a la actual
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'La contraseña actual es obligatoria' })
    .min(1),

  newPassword: z
    .string({ required_error: 'La nueva contraseña es obligatoria' })
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
})
// .refine() recibe una función que devuelve true si es válido
// El segundo parámetro es el mensaje de error y el campo afectado
.refine(
  data => data.currentPassword !== data.newPassword,
  {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword']  // el error se asocia a este campo
  }
)

// --- INVITAR USUARIO ---
export const inviteSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('El email no tiene un formato válido')
    .transform(val => val.toLowerCase().trim()),

  name: z.string().trim().optional(),
  lastName: z.string().trim().optional()
})