import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BildyApp API',
      version: '1.0.0',
      description: 'API REST para gestión de albaranes'
    },
    // Aquí defines cómo se autentica — con Bearer token
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      // ─── SCHEMAS: definen la forma de cada entidad ───
      schemas: {

        Client: {
          type: 'object',
          properties: {
            _id:     { type: 'string', example: '64abc123' },
            name:    { type: 'string', example: 'Constructora García SL' },
            cif:     { type: 'string', example: 'B12345678' },
            email:   { type: 'string', example: 'info@garcia.com' },
            phone:   { type: 'string', example: '666123456' },
            address: { $ref: '#/components/schemas/Address' },
            deleted: { type: 'boolean', example: false }
          }
        },

        Project: {
          type: 'object',
          properties: {
            _id:     { type: 'string', example: '64def456' },
            name:    { type: 'string', example: 'Reforma oficinas Madrid' },
            code:    { type: 'string', example: 'OBR-2024-001' },
            client:  { type: 'string', example: '64abc123' },
            active:  { type: 'boolean', example: true },
            address: { $ref: '#/components/schemas/Address' },
            notes:   { type: 'string', example: 'Planta 3ª del edificio' }
          }
        },

        DeliveryNote: {
          type: 'object',
          properties: {
            _id:     { type: 'string', example: '64ghi789' },
            project: { type: 'string', example: '64def456' },
            format:  { type: 'string', enum: ['hours', 'material'] },
            signed:  { type: 'boolean', example: false },
            workDate:{ type: 'string', format: 'date', example: '2024-03-15' }
          }
        },

        Address: {
          type: 'object',
          properties: {
            street:   { type: 'string', example: 'Calle Mayor' },
            number:   { type: 'string', example: '10' },
            postal:   { type: 'string', example: '28001' },
            city:     { type: 'string', example: 'Madrid' },
            province: { type: 'string', example: 'Madrid' }
          }
        },

        Error: {
          type: 'object',
          properties: {
            status:  { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Descripción del error' }
          }
        }
      }
    },
    // security global — todos los endpoints requieren JWT por defecto
    security: [{ bearerAuth: [] }]
  },
  // Dónde buscar los comentarios Swagger — en todas las rutas
  apis: ['./src/routes/*.js']
}

export default swaggerJsdoc(options)