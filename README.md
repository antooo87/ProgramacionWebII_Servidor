# BildyApp API

API REST para gestión de albaranes entre empresas y clientes. Construida con Node.js, Express y MongoDB.

---

## Tecnologías

- **Node.js** + **Express** — servidor y rutas
- **MongoDB** + **Mongoose** — base de datos
- **JWT** — autenticación con access token y refresh token
- **Zod** — validación de datos de entrada
- **Socket.IO** — notificaciones en tiempo real
- **PDFKit** — generación de albaranes en PDF
- **Cloudinary** — almacenamiento de firmas e imágenes
- **Nodemailer** — envío de emails
- **Swagger** — documentación interactiva de la API
- **Jest** + **Supertest** — tests de integración
- **Docker** — contenedorización

---

## Requisitos

- Node.js 22+
- MongoDB (o cuenta en MongoDB Atlas)
- Cuenta en Cloudinary (para firmas)
- Cuenta en Mailtrap o Gmail (para emails)

---

## Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/tu-usuario/bildyapp-api.git
cd bildyapp-api

# 2. Instala las dependencias
npm install

# 3. Crea el archivo de variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# 4. Arranca el servidor en desarrollo
npm run dev
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz con estas variables:

```env
# Servidor
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/bildyapp

# JWT
JWT_SECRET=tu_clave_secreta_muy_larga
JWT_REFRESH_SECRET=otra_clave_secreta_muy_larga
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Mailtrap para desarrollo)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USER=tu_usuario_mailtrap
EMAIL_PASS=tu_password_mailtrap

# Cloudinary (para subir firmas)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Slack (para notificaciones de errores)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

---

## Scripts disponibles

```bash
npm run dev          # Arranca en desarrollo con hot-reload
npm start            # Arranca en producción
npm test             # Ejecuta los tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con informe de cobertura
```

---

## Estructura del proyecto

```
bildyapp-api/
├── src/
│   ├── config/
│   │   ├── index.js            # Configuración general (JWT, etc.)
│   │   ├── swagger.js          # Configuración de Swagger
│   │   └── socket.js           # Configuración de Socket.IO
│   ├── controllers/
│   │   ├── user.controller.js
│   │   ├── client.controller.js
│   │   ├── project.controller.js
│   │   └── deliverynote.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js   # Verificación de JWT
│   │   ├── error-handler.js    # Manejo centralizado de errores
│   │   ├── role.middleware.js   # Control de roles
│   │   ├── upload.js           # Configuración de Multer
│   │   └── validate.js         # Middleware de validación Zod
│   ├── models/
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── Client.js
│   │   ├── Project.js
│   │   └── DeliveryNote.js
│   ├── routes/
│   │   ├── user.routes.js
│   │   ├── client.routes.js
│   │   ├── project.routes.js
│   │   └── deliverynote.routes.js
│   ├── services/
│   │   ├── email.service.js    # Envío de emails
│   │   ├── slack.service.js    # Notificaciones a Slack
│   │   └── notification.service.js
│   ├── validators/
│   │   ├── client.validator.js
│   │   ├── project.validator.js
│   │   └── deliverynote.validator.js
│   ├── utils/
│   │   └── AppError.js
│   ├── app.js
│   └── index.js
├── tests/
│   ├── helpers/
│   │   ├── db.js               # BD en memoria para tests
│   │   └── auth.js             # Generador de tokens de test
│   ├── setup.js
│   └── client.test.js
├── jest.config.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Endpoints de la API

La documentación interactiva completa está disponible en `/api-docs` cuando el servidor está corriendo.

### Usuarios `/api/user`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Registrar usuario | No |
| POST | `/login` | Iniciar sesión | No |
| PUT | `/validation` | Verificar email con código | Sí |
| PUT | `/register` | Actualizar datos personales | Sí |
| PATCH | `/company` | Crear o unirse a empresa | Sí |
| PATCH | `/logo` | Subir logo de empresa | Sí |
| GET | `/` | Obtener perfil | Sí |
| POST | `/refresh` | Renovar tokens | No |
| POST | `/logout` | Cerrar sesión | Sí |
| DELETE | `/` | Eliminar cuenta | Sí |
| PUT | `/password` | Cambiar contraseña | Sí |
| POST | `/invite` | Invitar usuario a empresa | Sí (admin) |

### Clientes `/api/client`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/` | Crear cliente | Sí |
| GET | `/` | Listar clientes (paginado) | Sí |
| GET | `/archived` | Listar clientes archivados | Sí |
| GET | `/:id` | Obtener cliente | Sí |
| PUT | `/:id` | Actualizar cliente | Sí |
| DELETE | `/:id` | Borrar cliente (`?soft=true`) | Sí |
| PATCH | `/:id/restore` | Restaurar cliente archivado | Sí |

### Proyectos `/api/project`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/` | Crear proyecto | Sí |
| GET | `/` | Listar proyectos (paginado) | Sí |
| GET | `/archived` | Listar proyectos archivados | Sí |
| GET | `/:id` | Obtener proyecto | Sí |
| PUT | `/:id` | Actualizar proyecto | Sí |
| DELETE | `/:id` | Borrar proyecto (`?soft=true`) | Sí |
| PATCH | `/:id/restore` | Restaurar proyecto archivado | Sí |

### Albaranes `/api/deliverynote`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/` | Crear albarán | Sí |
| GET | `/` | Listar albaranes (paginado) | Sí |
| GET | `/:id` | Obtener albarán con populate | Sí |
| GET | `/pdf/:id` | Descargar PDF del albarán | Sí |
| PATCH | `/:id/sign` | Firmar albarán | Sí |
| DELETE | `/:id` | Borrar albarán (solo si no firmado) | Sí |

### Otros

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del servidor y MongoDB |
| GET | `/api-docs` | Documentación Swagger |

---

## Ejemplos de uso

### Registro y verificación

```bash
# 1. Registrarse
curl -X POST http://localhost:3001/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password123!"}'

# 2. Verificar email (el código llega por email)
curl -X PUT http://localhost:3001/api/user/validation \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### Crear cliente

```bash
curl -X POST http://localhost:3001/api/client \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Constructora García SL",
    "cif": "B12345678",
    "email": "info@garcia.com",
    "phone": "666123456"
  }'
```

### Crear albarán de horas

```bash
curl -X POST http://localhost:3001/api/deliverynote \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "ID_DEL_PROYECTO",
    "format": "hours",
    "hoursEntries": [
      {"worker": "Juan García", "hours": 8},
      {"worker": "Ana López",   "hours": 6}
    ],
    "workDate": "2024-03-15"
  }'
```

### Firmar un albarán

```bash
curl -X PATCH http://localhost:3001/api/deliverynote/ID_ALBARAN/sign \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -F "signature=@/ruta/a/firma.png"
```

---

## WebSockets

La API emite eventos en tiempo real a los usuarios de la misma empresa. Para conectarse:

```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001', {
  auth: { token: 'Bearer TU_ACCESS_TOKEN' }
})

socket.on('client:new',          (data) => console.log('Nuevo cliente:', data))
socket.on('project:new',         (data) => console.log('Nuevo proyecto:', data))
socket.on('deliverynote:new',    (data) => console.log('Nuevo albarán:', data))
socket.on('deliverynote:signed', (data) => console.log('Albarán firmado:', data))
```

---

## Tests

```bash
# Ejecutar todos los tests
npm test

# Ver cobertura (mínimo requerido: 70%)
npm run test:coverage
```

Los tests usan una base de datos MongoDB en memoria — no necesitas conexión a Atlas para ejecutarlos.

---

## Docker

```bash
# Levantar la app + MongoDB con Docker Compose
docker-compose up --build

# Parar los contenedores
docker-compose down

# Parar y eliminar los datos de MongoDB
docker-compose down -v
```

---

## Paginación y filtros

Todos los endpoints de listado aceptan estos parámetros:

```
?page=1           # página (default: 1)
?limit=10         # resultados por página (default: 10)
?name=García      # búsqueda parcial por nombre
?sort=-createdAt  # ordenación (- para descendente)
```

Los albaranes además aceptan:

```
?project=ID       # filtrar por proyecto
?client=ID        # filtrar por cliente
?format=hours     # filtrar por tipo (hours / material)
?signed=true      # filtrar por estado de firma
?from=2024-01-01  # rango de fechas
?to=2024-12-31
```

---

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado correctamente |
| 400 | Datos de entrada inválidos |
| 401 | No autenticado (token ausente o inválido) |
| 403 | Sin permisos |
| 404 | Recurso no encontrado |
| 409 | Conflicto (recurso duplicado) |
| 429 | Demasiadas peticiones |
| 500 | Error interno del servidor |

---

## Checklist antes de subir a GitHub

- [ ] El archivo `.env` está en `.gitignore`
- [ ] Existe un `.env.example` con las variables sin valores reales
- [ ] `npm test` pasa sin errores
- [ ] `npm run dev` arranca sin errores
- [ ] `/health` devuelve `db: connected`
- [ ] `/api-docs` carga la UI de Swagger