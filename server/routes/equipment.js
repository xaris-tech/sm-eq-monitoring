const { Router } = require('express')
const { getRows, appendRows, deleteRow, updateCell, ensureSheet } = require('../services/sheets')
const { ApiError } = require('../middleware/errorHandler')
const { parseStockQuantity } = require('../lib/stock')

const router = Router()

const SHEET = 'Equipment'
const HEADERS = ['item_id', 'item_name', 'type', 'description', 'stock', 'status']
const COL = { ID: 0, NAME: 1, TYPE: 2, DESC: 3, STOCK: 4, STATUS: 5 }

router.get('/', async (req, res, next) => {
  try {
    const rows = await getRows(`'${SHEET}'!A:F`)
    if (rows.length < 2) return res.json({ equipment: [] })

    const equipment = rows.slice(1)
      .filter(r => r[COL.ID] && r[COL.NAME])
      .map(r => ({
        item_id: r[COL.ID],
        item_name: r[COL.NAME],
        type: r[COL.TYPE] || '',
        description: r[COL.DESC] || '',
        stock: parseStockQuantity(r[COL.STOCK]),
        status: r[COL.STATUS] || 'available',
      }))

    res.json({ equipment })
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { item_name, type, description, stock, item_id } = req.body
    if (!item_name) throw ApiError(400, 'item_name is required')
    if (type && !['Consumable', 'Non-Consumable'].includes(type)) {
      throw ApiError(400, 'type must be "Consumable" or "Non-Consumable"')
    }

    await ensureSheet(SHEET, HEADERS)

    const id = item_id || await generateId()
    await appendRows(`'${SHEET}'!A:F`, [[
      id, item_name, type || 'Non-Consumable', description || '', stock || 1, 'available',
    ]])

    res.status(201).json({ success: true, item_id: id })
  } catch (err) {
    next(err)
  }
})

router.delete('/:item_id', async (req, res, next) => {
  try {
    const rows = await getRows(`'${SHEET}'!A:A`)
    const idx = rows.findIndex(r => r[0] === req.params.item_id)
    if (idx === -1) throw ApiError(404, 'Equipment not found')

    await deleteRow(SHEET, idx + 1)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.patch('/:item_id/restock', async (req, res, next) => {
  try {
    const { quantity } = req.body
    if (!quantity || quantity < 1) throw ApiError(400, 'quantity must be >= 1')

    const rows = await getRows(`'${SHEET}'!A:F`)
    const idx = rows.findIndex(r => r[COL.ID] === req.params.item_id)
    if (idx === -1) throw ApiError(404, 'Equipment not found')

    const currentStock = parseStockQuantity(rows[idx][COL.STOCK])
    const newStock = currentStock + quantity

    await updateCell(`'${SHEET}'!E${idx + 1}`, newStock)
    res.json({ success: true, new_stock: newStock })
  } catch (err) {
    next(err)
  }
})

router.patch('/:item_id/toggle-type', async (req, res, next) => {
  try {
    const rows = await getRows(`'${SHEET}'!A:F`)
    const idx = rows.findIndex(r => r[COL.ID] === req.params.item_id)
    if (idx === -1) throw ApiError(404, 'Equipment not found')

    const currentType = rows[idx][COL.TYPE] || 'Non-Consumable'
    const newType = currentType === 'Consumable' ? 'Non-Consumable' : 'Consumable'

    await updateCell(`'${SHEET}'!C${idx + 1}`, newType)
    res.json({ success: true, new_type: newType })
  } catch (err) {
    next(err)
  }
})

async function generateId() {
  const rows = await getRows(`'${SHEET}'!A:A`)
  let maxId = 0
  for (let i = 1; i < rows.length; i++) {
    const match = String(rows[i]?.[0] || '').match(/^EQ-(\d+)$/)
    if (match) maxId = Math.max(maxId, Number(match[1]))
  }
  return 'EQ-' + String(maxId + 1).padStart(3, '0')
}

module.exports = router
