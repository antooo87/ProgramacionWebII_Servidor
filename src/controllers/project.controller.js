import Project from '../models/Project.js'
import Client  from '../models/Client.js'
import AppError from '../utils/AppError.js'

// ─────────────────────────────────────────────
// CREAR PROYECTO
// ─────────────────────────────────────────────
export const createProject = async (req, res, next) => {
  try {
    const { client, name, code, address, notes, active } = req.body
    const userId    = req.user._id
    const companyId = req.user.company

    // 1. Verificar que el cliente existe Y pertenece a nuestra empresa
    // Si no lo comprobamos, alguien podría asociar un proyecto a un cliente
    // de otra empresa que conoce por su ID
    const clienteExiste = await Client.findOne({
      _id:     client,
      company: companyId,
      deleted: false
    })
    if (!clienteExiste) {
      throw new AppError('Cliente no encontrado en tu empresa', 404)
    }

    // 2. Verificar que no existe ya ese código en la empresa
    const existe = await Project.findOne({ company: companyId, code: code.toUpperCase() })
    if (existe) {
      throw new AppError('Ya existe un proyecto con ese código en tu empresa', 409)
    }

    // 3. Crear el proyecto
    const proyecto = await Project.create({
      user: userId,
      company: companyId,
      client,
      name,
      code,
      address,
      notes,
      active
    })

    res.status(201).json({ message: 'Proyecto creado', data: proyecto })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────
// LISTAR PROYECTOS (con paginación y filtros)
// ─────────────────────────────────────────────
export const getProjects = async (req, res, next) => {
  try {
    // Sacamos todos los posibles filtros de la URL
    // ?page=1&limit=10&name=reforma&client=64abc&active=true&sort=-createdAt
    const { page = 1, limit = 10, name, client, active, sort = '-createdAt' } = req.query
    const companyId = req.user.company

    // Construimos el filtro base
    const filter = { company: companyId, deleted: false }

    // Añadimos filtros opcionales solo si vienen en la URL
    if (name)   filter.name   = { $regex: new RegExp(name, 'i') }
    if (client) filter.client = client
    // active viene como string "true"/"false" desde la URL, lo convertimos a booleano
    if (active !== undefined) filter.active = active === 'true'

    const skip = (Number(page) - 1) * Number(limit)

    // sort: "-createdAt" significa orden descendente (más reciente primero)
    // "createdAt" sería ascendente. El - delante lo indica Mongoose
    const [proyectos, total] = await Promise.all([
      Project.find(filter)
        .sort(sort)              // ordenación dinámica según ?sort=
        .skip(skip)
        .limit(Number(limit))
        .populate('client', 'name cif'), // trae nombre y CIF del cliente
      Project.countDocuments(filter)
    ])

    res.status(200).json({
      data:        proyectos,
      currentPage: Number(page),
      totalPages:  Math.ceil(total / Number(limit)),
      totalItems:  total
    })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────
// OBTENER UN PROYECTO POR ID
// ─────────────────────────────────────────────
export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.user.company

    const proyecto = await Project.findOne({
      _id: id, company: companyId, deleted: false
    }).populate('client', 'name cif email') // populate trae datos del cliente

    if (!proyecto) throw new AppError('Proyecto no encontrado', 404)

    res.status(200).json({ data: proyecto })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────
// ACTUALIZAR PROYECTO
// ─────────────────────────────────────────────
export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.user.company

    const proyecto = await Project.findOneAndUpdate(
      { _id: id, company: companyId, deleted: false },
      req.body,
      { new: true, runValidators: true }
    )

    if (!proyecto) throw new AppError('Proyecto no encontrado', 404)

    res.status(200).json({ message: 'Proyecto actualizado', data: proyecto })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────
// BORRAR PROYECTO (soft o hard)
// ─────────────────────────────────────────────
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.user.company
    const soft = req.query.soft === 'true'

    const proyecto = await Project.findOne({ _id: id, company: companyId, deleted: false })
    if (!proyecto) throw new AppError('Proyecto no encontrado', 404)

    if (soft) {
      proyecto.deleted = true
      await proyecto.save()
      return res.status(200).json({ message: 'Proyecto archivado' })
    }

    await Project.findByIdAndDelete(id)
    res.status(200).json({ message: 'Proyecto eliminado permanentemente' })

  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────
// LISTAR PROYECTOS ARCHIVADOS
// ─────────────────────────────────────────────
export const getArchivedProjects = async (req, res, next) => {
  try {
    const companyId = req.user.company
    const proyectos = await Project.find({ company: companyId, deleted: true })
      .populate('client', 'name')
    res.status(200).json({ data: proyectos })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────
// RESTAURAR PROYECTO
// ─────────────────────────────────────────────
export const restoreProject = async (req, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.user.company

    const proyecto = await Project.findOneAndUpdate(
      { _id: id, company: companyId, deleted: true },
      { deleted: false },
      { new: true }
    )

    if (!proyecto) throw new AppError('Proyecto archivado no encontrado', 404)

    res.status(200).json({ message: 'Proyecto restaurado', data: proyecto })

  } catch (error) {
    next(error)
  }
}