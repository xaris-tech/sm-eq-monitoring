require('dotenv').config()
const path = require('path')
const express = require('express')
const helmet = require('helmet')

const equipmentRoutes = require('./routes/equipment')
const borrowRoutes = require('./routes/borrow')
const commsRoutes = require('./routes/comms')
const adminRoutes = require('./routes/admin')
const { errorHandler } = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
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

app.listen(PORT, () => {
  console.log(`SM Equipment serving frontend + API on port ${PORT}`)
})

module.exports = app
