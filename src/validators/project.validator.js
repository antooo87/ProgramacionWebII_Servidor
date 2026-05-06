import { z } from 'zod'

export const createProjectSchema = z.object({

  // El cliente al que pertenece — viene del body, es un ID de MongoDB
  // z.string() porque los ObjectId son strings en JSON
  client: z.string({ required_error: 'El cliente es obligatorio' })
    .min(1, 'El cliente es obligatorio'),

  name: z.string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres'),

  code: z.string({ required_error: 'El código es obligatorio' })
    .trim()
    .toUpperCase(),

  address: z.object({
    street:   z.string().trim().optional(),
    number:   z.string().trim().optional(),
    postal:   z.string().trim().optional(),
    city:     z.string().trim().optional(),
    province: z.string().trim().optional()
  }).optional(),

  notes:  z.string().trim().optional(),

  // active es opcional al crear — por defecto true en el modelo
  active: z.boolean().optional()
})

// Para actualizar, todo opcional
export const updateProjectSchema = createProjectSchema.partial()