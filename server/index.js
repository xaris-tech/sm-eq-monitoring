const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const express = require('express')
const helmet = require('helmet')

const equipmentRoutes = require('./routes/equipment')
const borrowRoutes = require('./routes/borrow')
const commsRoutes = require('./routes/comms')
const adminRoutes = require('./routes/admin')
const { errorHandler } = require('./middleware/errorHandler')
const { isUsingInMemory, seedDefaults, getSheetsClient } = require('./services/sheets')

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://unpkg.com", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
}))
app.use(express.json())

// API routes
app.use('/api/equipment', equipmentRoutes)
app.use('/api', borrowRoutes)     // POST /api/borrow, POST /api/return
app.use('/api/comms', commsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve static frontend files from project root
app.use(express.static(path.join(__dirname, '..')))

// Fallback: serve index.html for any non-API, non-file route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(path.join(__dirname, '..', 'index.html'))
})

app.use(errorHandler)

app.listen(PORT, async () => {
  await getSheetsClient()
  seedDefaults()
  const mode = isUsingInMemory() ? 'in-memory store (no Google Sheets credentials)' : 'Google Sheets'
  console.log(`SM Equipment serving frontend + API on port ${PORT} [${mode}]`)
})

module.exports = app
