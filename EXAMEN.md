# EXAMEN.md

## Reto
F3 — Cierra los agujeros: JWT, firma de albarán y aislamiento multi-empresa

## Tarea técnica

### 1. Fix JWT helper (`tests/helpers/auth.js`)
Cambiado `_id` por `id` en el payload del token de test.

**Por qué:** `auth.middleware.js` decodifica el token y lee `decoded.id` para buscar el usuario con `User.findById(decoded.id)`. El helper generaba tokens con `_id` en el payload, así `decoded.id` era `undefined`. `User.findById(undefined)` en Mongoose devuelve `null`, lo que debería lanzar un 401 — pero los tests pasaban porque el middleware de test no verificaba bien que el usuario existiera en la BD de test. Los tests de integración autenticados no estaban probando autenticación real.

### 2. Fix Multer (`src/middleware/upload.js`)
Cambiado `multer.diskStorage` por `multer.memoryStorage()`.

**Por qué:** Con `diskStorage`, Multer guarda el archivo en el sistema de archivos y `req.file.buffer` es `undefined`. El controlador `signDeliveryNote` usa `req.file.buffer` para hacer `stream.end(req.file.buffer)` y subir la imagen a Cloudinary. Con `memoryStorage()`, el archivo se mantiene en RAM como un `Buffer` y `req.file.buffer` contiene los bytes del archivo, lo que permite subirlo directamente a Cloudinary sin pasar por disco.

### 3. Fix pdfUrl (`signDeliveryNote`)
Añadida generación del PDF en memoria con pdfkit y subida a Cloudinary, guardando la URL en `albaran.pdfUrl`.

**Por qué:** `downloadPDF` comprueba `if (albaran.signed && albaran.pdfUrl)` y redirige a esa URL. Si `signDeliveryNote` nunca asigna `pdfUrl`, al descargar el PDF de un albarán firmado el servidor intenta `res.redirect(undefined)`, lo que provoca un error o una redirección a una URL inválida. Ahora se genera el PDF como Buffer, se sube a Cloudinary y se guarda la URL resultante.

### 4. Tests en `tests/deliverynote.test.js`
8 tests nuevos cubriendo: creación correcta, proyecto inexistente (404), formato inválido (400), borrado de firmado (403), borrado de no firmado (200), descarga PDF (200), aislamiento empresa B no ve albarán de empresa A (404), empresa B no puede borrar firmado de empresa A (404).

### 5. `mongoSanitize` y rate limiter activados en `app.js`
Eliminados los comentarios que desactivaban ambos middlewares.

**Por qué:** Sin `mongoSanitize`, un atacante puede mandar `{ "email": { "$gt": "" } }` en el login y bypassear la autenticación por inyección NoSQL. Sin rate limiter, un atacante puede hacer fuerza bruta sobre el endpoint de login probando miles de contraseñas por segundo.

## Respuestas socráticas

### Pregunta 1
`User.findById(undefined)` en Mongoose devuelve `null` sin lanzar error. El middleware entonces lanza `AppError.unauthorized('El usuario del token no existe')` con status 401. Los tests pasaban silenciosamente porque el helper generaba tokens con `_id` en el payload pero el middleware leía `decoded.id` — al ser `undefined`, `findById` devolvía `null` y el middleware debería rechazar la petición... pero los tests de auth mock no conectaban con la BD real de test correctamente, enmascarando el fallo.

### Pregunta 2
`diskStorage` guarda el archivo en el sistema de archivos (`uploads/` por defecto) y `req.file` contiene `path` y `filename` pero `buffer` es `undefined`. `memoryStorage()` mantiene el archivo en RAM y `req.file.buffer` es un `Buffer` con el contenido binario del archivo. Para subir a Cloudinary necesitamos el Buffer porque usamos `upload_stream` con `stream.end(req.file.buffer)`.

### Pregunta 3
Si `signDeliveryNote` nunca asigna `pdfUrl`, cuando alguien llama a `GET /api/deliverynote/pdf/:id` sobre un albarán firmado, el controlador ejecuta `res.redirect(albaran.pdfUrl)` siendo `pdfUrl` `undefined`. Express convierte `undefined` a la string `"undefined"` y redirige a esa URL, lo que resulta en un error 404 o una URL inválida. El cliente recibe una respuesta incorrecta pensando que el PDF está en la nube cuando no existe.

### Pregunta 4
Sin rate limiter en `/api/user/login` y `/api/user/register`, un atacante puede realizar un ataque de fuerza bruta: probar miles de combinaciones de email/contraseña por segundo de forma automatizada hasta encontrar credenciales válidas. También permite ataques de enumeración de usuarios (probando emails hasta recibir respuestas diferentes) y ataques de denegación de servicio (DDoS) sobrecargando el servidor con peticiones masivas.

### Pregunta 5
El aislamiento multi-empresa funciona porque todos los `findOne` y `find` incluyen `company: companyId` en el filtro, donde `companyId` viene del JWT del usuario autenticado — nunca del body. Si empresa B intenta borrar un albarán de empresa A, el `findOne({ _id: id, company: companyIdB })` no encuentra el documento (porque pertenece a `companyIdA`) y devuelve `null`, lanzando un `AppError 404`. Empresa B no sabe si el albarán existe o simplemente no tiene acceso.

## Proceso

1. Identifiqué el bug de JWT comparando el payload generado en `auth.js` con lo que lee `auth.middleware.js`.
2. Reproduje el bug de Multer: `req.file.buffer` era `undefined` con diskStorage al intentar firmar.
3. Tracé el flujo de `signDeliveryNote` → `downloadPDF` y vi que `pdfUrl` nunca se asignaba.
4. Activé `mongoSanitize` y el rate limiter que estaban comentados en `app.js`.
5. Escribí los 8 tests de `deliverynote.test.js` cubriendo los escenarios críticos.