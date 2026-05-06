import { z } from 'zod'

// Schema para una entrada de horas
const hoursEntrySchema = z.object({
  worker: z.string().trim().min(1),
  hours:  z.number().min(0)
})

// Schema para una entrada de material
const materialEntrySchema = z.object({
  name:     z.string().trim().min(1),
  quantity: z.number().min(0),
  unit:     z.string().trim().optional()
})

export const createDeliveryNoteSchema = z.object({

  project: z.string({ required_error: 'El proyecto es obligatorio' }).min(1),

  // Solo puede ser uno de estos dos valores
  format: z.enum(['hours', 'material'], {
    required_error: 'El formato es obligatorio (hours o material)'
  }),

  // Arrays opcionales — el controlador validará que correspondan al format
  hoursEntries:    z.array(hoursEntrySchema).optional(),
  materialEntries: z.array(materialEntrySchema).optional(),

  description: z.string().trim().optional(),
  workDate:    z.string().optional() // fecha en string, la convertimos en el controlador

// .refine() añade validación cruzada entre campos
// Si el formato es "hours", debe haber al menos una entrada de horas
}).refine(data => {
  if (data.format === 'hours') {
    return data.hoursEntries && data.hoursEntries.length > 0
  }
  return true
}, { message: 'Un albarán de horas debe tener al menos una entrada', path: ['hoursEntries'] })
.refine(data => {
  if (data.format === 'material') {
    return data.materialEntries && data.materialEntries.length > 0
  }
  return true
}, { message: 'Un albarán de materiales debe tener al menos una entrada', path: ['materialEntries'] })