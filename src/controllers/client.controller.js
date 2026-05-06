import Client from '../models/Client.js'
import AppError from '../utils/AppError.js'
import { getIO } from '../config/socket.js'

export const createClient = async (req, res, next) => {
  try {
    const { name, cif, email, phone, address } = req.body
    const userId    = req.user._id
    const companyId = req.user.company

    const existe = await Client.findOne({
      company: companyId,
      cif:     cif.toUpperCase()
    })
    if (existe) throw new AppError('Ya existe un cliente con ese CIF en tu empresa', 409)

    const nuevoCliente = await Client.create({
      user: userId, company: companyId,
      name, cif, email, phone, address
    })

    // Notificamos en tiempo real a todos los usuarios de la empresa
    getIO().to(companyId.toString()).emit('client:new', { data: nuevoCliente })

    res.status(201).json({ message: 'Cliente creado', data: nuevoCliente })

  } catch (error) {
    next(error)
  }
}

export const getClients = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, name } = req.query
    const companyId = req.user.company

    const filter = { company: companyId, deleted: false }
    if (name) filter.name = { $regex: new RegExp(name, 'i') }

    const skip = (Number(page) - 1) * Number(limit)

    const [clientes, total] = await Promise.all([
      Client.find(filter).skip(skip).limit(Number(limit)),
      Client.countDocuments(filter)
    ])

    res.status(200).json({
      data:        clientes,
      currentPage: Number(page),
      totalPages:  Math.ceil(total / Number(limit)),
      totalItems:  total
    })

  } catch (error) {
    next(error)
  }
}

export const getClientById = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company

    const cliente = await Client.findOne({
      _id: id, company: companyId, deleted: false
    })
    if (!cliente) throw new AppError('Cliente no encontrado', 404)

    res.status(200).json({ data: cliente })

  } catch (error) {
    next(error)
  }
}

export const updateClient = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company

    const cliente = await Client.findOneAndUpdate(
      { _id: id, company: companyId, deleted: false },
      req.body,
      { new: true, runValidators: true }
    )
    if (!cliente) throw new AppError('Cliente no encontrado', 404)

    res.status(200).json({ message: 'Cliente actualizado', data: cliente })

  } catch (error) {
    next(error)
  }
}

export const deleteClient = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company
    const soft      = req.query.soft === 'true'

    const cliente = await Client.findOne({
      _id: id, company: companyId, deleted: false
    })
    if (!cliente) throw new AppError('Cliente no encontrado', 404)

    if (soft) {
      cliente.deleted = true
      await cliente.save()
      return res.status(200).json({ message: 'Cliente archivado' })
    }

    await Client.findByIdAndDelete(id)
    res.status(200).json({ message: 'Cliente eliminado permanentemente' })

  } catch (error) {
    next(error)
  }
}

export const getArchivedClients = async (req, res, next) => {
  try {
    const companyId = req.user.company
    const clientes  = await Client.find({ company: companyId, deleted: true })
    res.status(200).json({ data: clientes })
  } catch (error) {
    next(error)
  }
}

export const restoreClient = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company

    const cliente = await Client.findOneAndUpdate(
      { _id: id, company: companyId, deleted: true },
      { deleted: false },
      { new: true }
    )
    if (!cliente) throw new AppError('Cliente archivado no encontrado', 404)

    res.status(200).json({ message: 'Cliente restaurado', data: cliente })

  } catch (error) {
    next(error)
  }
}