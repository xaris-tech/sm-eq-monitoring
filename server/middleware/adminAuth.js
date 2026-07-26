const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' })
  }

  const token = authHeader.slice(7)
  if (ADMIN_TOKEN && token !== ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Invalid authorization token' })
  }

  next()
}

module.exports = { requireAdmin }
