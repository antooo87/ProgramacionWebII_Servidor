import express from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import validate from '../middleware/validate.js'
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js'
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getArchivedProjects,
  restoreProject
} from '../controllers/project.controller.js'

const router = express.Router()

// OJO al orden: /archived ANTES que /:id
router.get('/archived',       authMiddleware, getArchivedProjects)
router.patch('/:id/restore',  authMiddleware, restoreProject)

router.post('/',    authMiddleware, validate(createProjectSchema), createProject)
router.get('/',     authMiddleware, getProjects)
router.get('/:id',  authMiddleware, getProjectById)
router.put('/:id',  authMiddleware, validate(updateProjectSchema), updateProject)
router.delete('/:id', authMiddleware, deleteProject)

export default router