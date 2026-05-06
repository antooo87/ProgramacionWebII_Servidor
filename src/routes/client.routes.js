import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.js'
import { createClientSchema, updateClientSchema } from '../validators/client.validator.js'
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getArchivedClients,
  restoreClient
} from '../controllers/client.controller.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Gestión de clientes
 */

/**
 * @swagger
 * /api/client:
 *   post:
 *     summary: Crear un cliente
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, cif]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Constructora García SL
 *               cif:
 *                 type: string
 *                 example: B12345678
 *               email:
 *                 type: string
 *                 example: info@garcia.com
 *               phone:
 *                 type: string
 *                 example: '666123456'
 *               address:
 *                 type: object
 *                 properties:
 *                   street:   { type: string, example: Calle Mayor }
 *                   number:   { type: string, example: '10' }
 *                   postal:   { type: string, example: '28001' }
 *                   city:     { type: string, example: Madrid }
 *                   province: { type: string, example: Madrid }
 *     responses:
 *       201:
 *         description: Cliente creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/Client'
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Token no válido o ausente
 *       409:
 *         description: Ya existe un cliente con ese CIF en la empresa
 */
router.post('/', authMiddleware, validate(createClientSchema), createClient)

/**
 * @swagger
 * /api/client:
 *   get:
 *     summary: Listar clientes de la empresa (con paginación y filtros)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Búsqueda parcial por nombre
 *     responses:
 *       200:
 *         description: Lista paginada de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
 *                 currentPage: { type: integer }
 *                 totalPages:  { type: integer }
 *                 totalItems:  { type: integer }
 *       401:
 *         description: Token no válido o ausente
 */
router.get('/', authMiddleware, getClients)

/**
 * @swagger
 * /api/client/archived:
 *   get:
 *     summary: Listar clientes archivados (borrado lógico)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes archivados
 */
// OJO: /archived ANTES que /:id — si no, Express interpreta "archived" como un ID
router.get('/archived', authMiddleware, getArchivedClients)

/**
 * @swagger
 * /api/client/{id}:
 *   get:
 *     summary: Obtener un cliente concreto
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del cliente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/:id', authMiddleware, getClientById)

/**
 * @swagger
 * /api/client/{id}:
 *   put:
 *     summary: Actualizar un cliente
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Client'
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *       404:
 *         description: Cliente no encontrado
 */
router.put('/:id', authMiddleware, validate(updateClientSchema), updateClient)

/**
 * @swagger
 * /api/client/{id}:
 *   delete:
 *     summary: Borrar un cliente (soft o hard)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: soft
 *         schema: { type: boolean }
 *         description: Si es true, borrado lógico. Si es false, borrado permanente.
 *     responses:
 *       200:
 *         description: Cliente eliminado o archivado
 *       404:
 *         description: Cliente no encontrado
 */
router.delete('/:id', authMiddleware, deleteClient)

/**
 * @swagger
 * /api/client/{id}/restore:
 *   patch:
 *     summary: Restaurar un cliente archivado
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cliente restaurado
 *       404:
 *         description: Cliente archivado no encontrado
 */
router.patch('/:id/restore', authMiddleware, restoreClient)

export default router