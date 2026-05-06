const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    const errors = result.error?.issues || []

    const formatted = errors.map(e => ({
      field: e.path?.join('.') || 'unknown',
      message: e.message || 'Error de validación'
    }))

    return res.status(400).json({
      status: 'fail',
      errors: formatted
    })
  }

  req.body = result.data
  next()
}

export default validate