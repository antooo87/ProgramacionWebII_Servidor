import DeliveryNote from '../models/DeliveryNote.js'
import Project      from '../models/Project.js'
import AppError     from '../utils/AppError.js'
import { getIO }    from '../config/socket.js'
import PDFDocument  from 'pdfkit'
import { v2 as cloudinary } from 'cloudinary'

export const createDeliveryNote = async (req, res, next) => {
  try {
    const { project, format, hoursEntries, materialEntries, description, workDate } = req.body
    const userId    = req.user._id
    const companyId = req.user.company

    const proyectoExiste = await Project.findOne({
      _id: project, company: companyId, deleted: false
    })
    if (!proyectoExiste) throw new AppError('Proyecto no encontrado', 404)

    const albaran = await DeliveryNote.create({
      user:    userId,
      company: companyId,
      project,
      client:          proyectoExiste.client,
      format,
      hoursEntries:    format === 'hours'    ? hoursEntries    : [],
      materialEntries: format === 'material' ? materialEntries : [],
      description,
      workDate: workDate ? new Date(workDate) : new Date()
    })

    getIO().to(companyId.toString()).emit('deliverynote:new', { data: albaran })

    res.status(201).json({ message: 'Albarán creado', data: albaran })

  } catch (error) {
    next(error)
  }
}

export const getDeliveryNotes = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10,
      project, client, format, signed,
      from, to, sort = '-workDate'
    } = req.query
    const companyId = req.user.company

    const filter = { company: companyId }

    if (project) filter.project = project
    if (client)  filter.client  = client
    if (format)  filter.format  = format
    if (signed !== undefined) filter.signed = signed === 'true'

    if (from || to) {
      filter.workDate = {}
      if (from) filter.workDate.$gte = new Date(from)
      if (to)   filter.workDate.$lte = new Date(to)
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [albaranes, total] = await Promise.all([
      DeliveryNote.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('project', 'name code')
        .populate('client',  'name cif'),
      DeliveryNote.countDocuments(filter)
    ])

    res.status(200).json({
      data:        albaranes,
      currentPage: Number(page),
      totalPages:  Math.ceil(total / Number(limit)),
      totalItems:  total
    })

  } catch (error) {
    next(error)
  }
}

export const getDeliveryNoteById = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company

    const albaran = await DeliveryNote.findOne({ _id: id, company: companyId })
      .populate('user',    'name email')
      .populate('client',  'name cif email')
      .populate('project', 'name code address')

    if (!albaran) throw new AppError('Albarán no encontrado', 404)

    res.status(200).json({ data: albaran })

  } catch (error) {
    next(error)
  }
}

export const downloadPDF = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company

    const albaran = await DeliveryNote.findOne({ _id: id, company: companyId })
      .populate('user',    'name email')
      .populate('client',  'name cif')
      .populate('project', 'name code')

    if (!albaran) throw new AppError('Albarán no encontrado', 404)

    // Si ya tiene PDF firmado en la nube, redirigimos allí directamente
    if (albaran.signed && albaran.pdfUrl) {
      return res.redirect(albaran.pdfUrl)
    }

    // Generamos el PDF al vuelo con pdfkit
    const doc = new PDFDocument({ margin: 50 })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="albaran-${albaran._id}.pdf"`)

    // pipe conecta el stream del PDF con la respuesta HTTP
    // el PDF se envía mientras se genera, sin esperar a terminar
    doc.pipe(res)

    doc.fontSize(20).font('Helvetica-Bold').text('ALBARÁN', { align: 'center' })
    doc.moveDown()

    doc.fontSize(12).font('Helvetica')
    doc.text(`Número:  ${albaran._id}`)
    doc.text(`Fecha:   ${albaran.workDate.toLocaleDateString('es-ES')}`)
    doc.text(`Tipo:    ${albaran.format === 'hours' ? 'Horas' : 'Material'}`)
    doc.moveDown()

    doc.font('Helvetica-Bold').text('Datos del usuario:')
    doc.font('Helvetica')
    doc.text(`Nombre: ${albaran.user?.name || '-'}`)
    doc.text(`Email:  ${albaran.user?.email || '-'}`)
    doc.moveDown()

    doc.font('Helvetica-Bold').text('Cliente:')
    doc.font('Helvetica')
    doc.text(`Nombre: ${albaran.client?.name || '-'}`)
    doc.text(`CIF:    ${albaran.client?.cif  || '-'}`)
    doc.moveDown()

    doc.font('Helvetica-Bold').text('Proyecto:')
    doc.font('Helvetica')
    doc.text(`Nombre: ${albaran.project?.name || '-'}`)
    doc.text(`Código: ${albaran.project?.code || '-'}`)
    doc.moveDown()

    if (albaran.format === 'hours') {
      doc.font('Helvetica-Bold').text('Horas trabajadas:')
      doc.font('Helvetica')
      albaran.hoursEntries.forEach(e => {
        doc.text(`  • ${e.worker}: ${e.hours}h`)
      })
    } else {
      doc.font('Helvetica-Bold').text('Materiales:')
      doc.font('Helvetica')
      albaran.materialEntries.forEach(e => {
        doc.text(`  • ${e.name}: ${e.quantity} ${e.unit || ''}`)
      })
    }

    if (albaran.description) {
      doc.moveDown()
      doc.font('Helvetica-Bold').text('Descripción:')
      doc.font('Helvetica').text(albaran.description)
    }

    if (albaran.signed) {
      doc.moveDown()
      doc.font('Helvetica-Bold').text('Firmado:')
      doc.font('Helvetica').text(`Fecha de firma: ${albaran.signedAt?.toLocaleDateString('es-ES')}`)
    }

    doc.end()

  } catch (error) {
    next(error)
  }
}

export const signDeliveryNote = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company

    const albaran = await DeliveryNote.findOne({ _id: id, company: companyId })
      .populate('user',    'name email')
      .populate('client',  'name cif')
      .populate('project', 'name code')

    if (!albaran) throw new AppError('Albarán no encontrado', 404)
    if (albaran.signed) throw new AppError('Este albarán ya está firmado', 400)
    if (!req.file) throw new AppError('La firma es obligatoria', 400)

    // 1. Subir imagen de firma a Cloudinary
    const signatureUpload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'signatures', resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve(result)
      )
      stream.end(req.file.buffer) // buffer disponible gracias a memoryStorage
    })

    // 2. Generar el PDF en memoria con pdfkit
    // En vez de pipe a res, lo guardamos en un Buffer
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc    = new PDFDocument({ margin: 50 })
      const chunks = []

      // Cada vez que pdfkit genera un trozo de PDF lo guardamos
      doc.on('data',  chunk => chunks.push(chunk))
      // Cuando termina, unimos todos los trozos en un Buffer
      doc.on('end',   () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Contenido del PDF
      doc.fontSize(20).font('Helvetica-Bold').text('ALBARÁN', { align: 'center' })
      doc.moveDown()
      doc.fontSize(12).font('Helvetica')
      doc.text(`Número:  ${albaran._id}`)
      doc.text(`Fecha:   ${albaran.workDate.toLocaleDateString('es-ES')}`)
      doc.text(`Tipo:    ${albaran.format === 'hours' ? 'Horas' : 'Material'}`)
      doc.moveDown()
      doc.font('Helvetica-Bold').text('Cliente:')
      doc.font('Helvetica')
      doc.text(`Nombre: ${albaran.client?.name || '-'}`)
      doc.text(`CIF:    ${albaran.client?.cif  || '-'}`)
      doc.moveDown()
      doc.font('Helvetica-Bold').text('Proyecto:')
      doc.font('Helvetica')
      doc.text(`Nombre: ${albaran.project?.name || '-'}`)
      doc.text(`Código: ${albaran.project?.code || '-'}`)
      doc.moveDown()

      if (albaran.format === 'hours') {
        doc.font('Helvetica-Bold').text('Horas trabajadas:')
        doc.font('Helvetica')
        albaran.hoursEntries.forEach(e => doc.text(`  • ${e.worker}: ${e.hours}h`))
      } else {
        doc.font('Helvetica-Bold').text('Materiales:')
        doc.font('Helvetica')
        albaran.materialEntries.forEach(e => doc.text(`  • ${e.name}: ${e.quantity} ${e.unit || ''}`))
      }

      doc.moveDown()
      doc.font('Helvetica-Bold').text('Firma:')
      doc.font('Helvetica').text(`Firmado el: ${new Date().toLocaleDateString('es-ES')}`)

      doc.end() // dispara el evento 'end'
    })

    // 3. Subir el PDF a Cloudinary
    const pdfUpload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'pdfs', resource_type: 'raw', format: 'pdf' },
        (error, result) => error ? reject(error) : resolve(result)
      )
      stream.end(pdfBuffer)
    })

    // 4. Guardar todo en la base de datos
    albaran.signed       = true
    albaran.signatureUrl = signatureUpload.secure_url
    albaran.signedAt     = new Date()
    albaran.pdfUrl       = pdfUpload.secure_url  // ← esto faltaba antes
    await albaran.save()

    getIO().to(companyId.toString()).emit('deliverynote:signed', { data: albaran })

    res.status(200).json({ message: 'Albarán firmado', data: albaran })

  } catch (error) {
    next(error)
  }
}

export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const { id }    = req.params
    const companyId = req.user.company

    const albaran = await DeliveryNote.findOne({ _id: id, company: companyId })
    if (!albaran) throw new AppError('Albarán no encontrado', 404)

    if (albaran.signed) throw new AppError('No se puede borrar un albarán firmado', 403)

    await DeliveryNote.findByIdAndDelete(id)
    res.status(200).json({ message: 'Albarán eliminado' })

  } catch (error) {
    next(error)
  }
}