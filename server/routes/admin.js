const { Router } = require('express')
const { v4: uuidv4 } = require('uuid')
const { getRows, appendRows, ensureSheet, deleteRow } = require('../services/sheets')
const { ApiError } = require('../middleware/errorHandler')
const { requireAdmin } = require('../middleware/adminAuth')

const router = Router()

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const EQ_SHEET = 'Equipment'
const EQ_HEADERS = ['item_id', 'item_name', 'type', 'description', 'stock', 'status']
const LOG_SHEET = 'BorrowLog'

// Seed data matching the original MOCK_EQUIPMENT / SM_KIT_EQUIPMENT
const SEED_DATA = [
  ['EQ-001', 'Tool Box', 'Non-Consumable', '2 pcs', 2, 'available'],
  ['EQ-002', 'Gun tacker', 'Non-Consumable', '1 pc', 1, 'available'],
  ['EQ-003', 'Gun tack staple', 'Consumable', '5 boxes', 5, 'available'],
  ['EQ-004', 'Safety Pin', 'Consumable', '1 set (100 pcs)', 1, 'available'],
  ['EQ-005', 'Thumb tacks', 'Consumable', '2 boxes', 2, 'available'],
  ['EQ-006', 'Zip Ties', 'Consumable', '1 set (100 pcs)', 1, 'available'],
  ['EQ-007', 'Rubber Bands', 'Consumable', '1 set (100 pcs)', 1, 'available'],
  ['EQ-008', 'Combination Pliers', 'Non-Consumable', '1 pc', 1, 'available'],
  ['EQ-009', 'Screw Driver', 'Non-Consumable', '1 set', 1, 'available'],
  ['EQ-010', 'Hammer', 'Non-Consumable', '1 pc', 1, 'available'],
  ['EQ-011', 'Instant Glue', 'Consumable', '2 pcs', 2, 'available'],
  ['EQ-012', 'Anti-Slip', 'Non-Consumable', '5 pcs', 5, 'available'],
  ['EQ-013', 'Masking tape', 'Consumable', '15 pcs', 15, 'available'],
  ['EQ-014', 'Duct tape', 'Consumable', '20 pcs', 20, 'available'],
  ['EQ-015', 'Caution tape', 'Consumable', '15 pcs', 15, 'available'],
  ['EQ-016', 'Double-sided tape', 'Consumable', '2 sets', 2, 'available'],
  ['EQ-017', 'Electrical Tape', 'Consumable', '10 pcs', 10, 'available'],
  ['EQ-018', 'Glow tape', 'Consumable', '25 pcs', 25, 'available'],
  ['EQ-019', 'Ball Pen', 'Consumable', '1 box', 1, 'available'],
  ['EQ-020', 'Permanent Marker', 'Consumable', '1 box', 1, 'available'],
  ['EQ-021', 'Scissors', 'Non-Consumable', '5 pcs', 5, 'available'],
  ['EQ-022', 'Cutter Blade', 'Consumable', '1 box', 1, 'available'],
  ['EQ-023', 'Cutter', 'Non-Consumable', '5 pcs', 5, 'available'],
  ['EQ-024', 'Black Tray', 'Non-Consumable', '3 pcs', 3, 'available'],
  ['EQ-025', 'Black Mesh Pouch', 'Non-Consumable', '1 pc', 1, 'available'],
  ['EQ-026', 'Tissue Box', 'Consumable', '3 pcs', 3, 'available'],
  ['EQ-027', 'Bond Paper', 'Consumable', '1 ream', 1, 'available'],
  ['EQ-028', 'Inflator', 'Non-Consumable', '2 pcs', 2, 'available'],
  ['EQ-029', 'Extension', 'Non-Consumable', '2 pcs', 2, 'available'],
]

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Incorrect password' })
  }
  // Generate a simple session token
  const token = uuidv4()
  // Store it in memory (will reset on server restart — acceptable for this use case)
  process.env.ADMIN_TOKEN = token
  res.json({ success: true, token })
})

// POST /api/admin/seed — requires auth
router.post('/seed', requireAdmin, async (req, res, next) => {
  try {
    // Clear and recreate the Equipment sheet
    await ensureSheet(EQ_SHEET, EQ_HEADERS)
    const existingRows = await getRows(`'${EQ_SHEET}'!A:A`)
    for (let i = existingRows.length; i >= 2; i--) {
      await deleteRow(EQ_SHEET, i)
    }

    // Write seed data
    for (const row of SEED_DATA) {
      await appendRows(`'${EQ_SHEET}'!A:F`, [row])
    }

    res.json({ success: true, count: SEED_DATA.length })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/seed-comms — requires auth
const CE_SHEET = 'CommsEquipment'
const CE_HEADERS = ['item_id', 'item_name', 'spec']
const COMMS_SEED = [
  ['COMMS-BASE-01', 'Base Station', '1 pc'],
  ['COMMS-ANTENNA-01', 'Antenna', '2 pcs'],
  ['COMMS-CABLE-01', 'Cable', '1 pc'],
  ['COMMS-POE-01', 'POE Adapter', '1 pc'],
  ['COMMS-KNOB-01', 'Pet Knob with Tripod Adapter', '1 Knob, 1 Adapter'],
  ['COMMS-BATT-01', 'Beltpack Battery', '16 pcs (8 spares)'],
  ['COMMS-CHARGER-01', 'Charging Base', '1 pc'],
  ['COMMS-XLR-01', '4-Pin XLR Adapter', '1 pc'],
  ['COMMS-CASE-01', 'M1 Hard Case', '1 pc'],
]

router.post('/seed-comms', requireAdmin, async (req, res, next) => {
  try {
    await ensureSheet(CE_SHEET, CE_HEADERS)
    const existingRows = await getRows(`'${CE_SHEET}'!A:A`)
    for (let i = existingRows.length; i >= 2; i--) {
      await deleteRow(CE_SHEET, i)
    }
    for (const row of COMMS_SEED) {
      await appendRows(`'${CE_SHEET}'!A:C`, [row])
    }
    res.json({ success: true, count: COMMS_SEED.length })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/logs — requires auth
router.get('/logs', requireAdmin, async (req, res, next) => {
  try {
    const rows = await getRows(`'${LOG_SHEET}'!A:H`)
    if (rows.length < 2) return res.json({ logs: [] })

    const logs = rows.slice(1).filter(r => r[0]).map(r => ({
      log_id: r[0],
      borrower: r[1] || '',
      item_id: r[2] || '',
      item_name: r[3] || '',
      item_type: r[4] || '',
      quantity: Number(r[5]) || 1,
      borrow_time: r[6] || '',
      return_time: r[7] || '',
    }))

    res.json({ logs })
  } catch (err) {
    next(err)
  }
})

module.exports = router
