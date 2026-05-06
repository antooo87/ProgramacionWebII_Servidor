import { z } from 'zod'

// Schema de dirección reutilizable
const addressSchema = z.object({
  street:   z.string().trim().optional(),
  number:   z.string().trim().optional(),
  postal:   z.string().trim().optional(),
  city:     z.string().trim().optional(),
  province: z.string().trim().optional()
}).optional()

export const createClientSchema = z.object({

  name: z.string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres'),

  cif: z.string({ required_error: 'El CIF es obligatorio' })
    .trim()
    .toUpperCase(),

  email: z.string()
    .email('El email no tiene formato válido')
    .trim()
    .toLowerCase()
    .optional(),

  phone: z.string()
    .trim()
    .optional(),

  address: addressSchema

})

// .partial() hace todos los campos opcionales para el update
export const updateClientSchema = createClientSchema.partial()