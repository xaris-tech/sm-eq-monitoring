const { Router } = require('express')
const { v4: uuidv4 } = require('uuid')
const { getRows, appendRows, updateCell, ensureSheet } = require('../services/sheets')
const { ApiError } = require('../middleware/errorHandler')
const { parseStockQuantity } = require('../lib/stock')

const router = Router()

const EQ_SHEET = 'Equipment'
const LOG_SHEET = 'BorrowLog'
const LOG_HEADERS = ['log_id', 'borrower', 'item_id', 'item_name', 'item_type', 'quantity', 'borrow_time', 'return_time']
const EQ = { ID: 0, NAME: 1, TYPE: 2, STOCK: 4, STATUS: 5 }
const LOG = { ID: 0, BORROWER: 1, ITEM_ID: 2, ITEM_NAME: 3, ITEM_TYPE: 4, QTY: 5, BORROW_TIME: 6, RETURN_TIME: 7 }

async function findEquipmentRow(rows, itemId) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][EQ.ID] === itemId) return i
  }
  return -1
}

// POST /api/borrow
router.post('/borrow', async (req, res, next) => {
  try {
    const { name, items, time } = req.body
    if (!name || !name.trim()) throw ApiError(400, 'name is required')
    if (!items || !items.length) throw ApiError(400, 'items array is required')

    await ensureSheet(LOG_SHEET, LOG_HEADERS)
    const equipRows = await getRows(`'${EQ_SHEET}'!A:F`)
    const borrowTime = time || new Date().toISOString()
    const results = []

    for (const item of items) {
      const rowIdx = await findEquipmentRow(equipRows, item.item_id)
      if (rowIdx === -1) throw ApiError(404, `Equipment '${item.item_id}' not found`)

      const currentStock = parseStockQuantity(equipRows[rowIdx][EQ.STOCK])
      const itemType = equipRows[rowIdx][EQ.TYPE] || 'Non-Consumable'
      const itemName = equipRows[rowIdx][EQ.NAME] || item.item_name
      const qty = itemType === 'Consumable' ? (item.quantity || item._quantity || 1) : 1

      if (itemType === 'Consumable') {
        if (qty > currentStock) {
          throw ApiError(400,
            `Insufficient stock for '${itemName}'. Available: ${currentStock}, Requested: ${qty}`
          )
        }

        const newStock = currentStock - qty
        await updateCell(`'${EQ_SHEET}'!E${rowIdx + 1}`, newStock)
        equipRows[rowIdx][EQ.STOCK] = newStock

        await appendRows(`'${LOG_SHEET}'!A:H`, [[
          uuidv4(), name.trim(), item.item_id, itemName, 'consumable', qty, borrowTime, '',
        ]])

        results.push({ item_id: item.item_id, status: 'borrowed', consumed: qty, remaining_stock: newStock })
      } else {
        // Non-consumable — mark as borrowed
        await updateCell(`'${EQ_SHEET}'!F${rowIdx + 1}`, 'borrowed')
        equipRows[rowIdx][EQ.STATUS] = 'borrowed'

        await appendRows(`'${LOG_SHEET}'!A:H`, [[
          uuidv4(), name.trim(), item.item_id, itemName, 'non-consumable', 1, borrowTime, '',
        ]])

        results.push({ item_id: item.item_id, status: 'borrowed' })
      }
    }

    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
})

// POST /return — handled by the same router mounted at /api/return
router.post('/return', async (req, res, next) => {
  try {
    const { name, items, time } = req.body
    if (!name || !name.trim()) throw ApiError(400, 'name is required')
    if (!items || !items.length) throw ApiError(400, 'items array is required')

    const equipRows = await getRows(`'${EQ_SHEET}'!A:F`)
    const logRows = await getRows(`'${LOG_SHEET}'!A:H`)
    const returnTime = time || new Date().toISOString()
    const results = []

    for (const item of items) {
      const rowIdx = await findEquipmentRow(equipRows, item.item_id)
      if (rowIdx === -1) throw ApiError(404, `Equipment '${item.item_id}' not found`)

      const itemType = equipRows[rowIdx][EQ.TYPE] || 'Non-Consumable'
      const itemName = equipRows[rowIdx][EQ.NAME] || item.item_name

      if (itemType === 'Consumable') {
        throw ApiError(400,
          `Consumable items cannot be returned. Item '${itemName}' is consumable.`
        )
      }

      // Mark equipment as available
      await updateCell(`'${EQ_SHEET}'!F${rowIdx + 1}`, 'available')
      equipRows[rowIdx][EQ.STATUS] = 'available'

      // Find the most recent unresolved borrow log for this item
      for (let i = logRows.length - 1; i >= 1; i--) {
        if (logRows[i][LOG.ITEM_ID] === item.item_id && !logRows[i][LOG.RETURN_TIME]) {
          await updateCell(`'${LOG_SHEET}'!H${i + 1}`, returnTime)
          break
        }
      }

      results.push({ item_id: item.item_id, status: 'returned' })
    }

    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
})

module.exports = router
