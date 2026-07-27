function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' })
  }

  const token = authHeader.slice(7)
  const adminToken = process.env.ADMIN_TOKEN
  if (adminToken && token !== adminToken) {
    return res.status(401).json({ success: false, error: 'Invalid authorization token' })
  }

  next()
}

module.exports = { requireAdmin }
