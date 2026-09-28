const { Router } = require('express')
const { getRows, appendRows, deleteRow, ensureSheet } = require('../services/sheets')
const { ApiError } = require('../middleware/errorHandler')
const {
  LOG_SHEET,
  DETAILS_SHEET,
  LOG_HEADERS,
  DETAILS_HEADERS,
  buildReportRows,
  buildFormatRequests,
  nextSubmissionNo,
} = require('../services/commsReport')

const router = Router()

const CE_SHEET = 'CommsEquipment'
const CE_HEADERS = ['item_id', 'item_name', 'spec']
const CE = { ID: 0, NAME: 1, SPEC: 2 }

// Submissions go to the Checklist Log / Checklist Details tabs. The legacy
// 'CommsChecklist' tab is frozen: nothing writes to it any more.

// GET /api/comms
router.get('/', async (req, res, next) => {
  try {
    const rows = await getRows(`'${CE_SHEET}'!A:C`)
    if (rows.length < 2) return res.json({ equipment: [] })

    const equipment = rows.slice(1)
      .filter(r => r[CE.ID] && r[CE.NAME])
      .map(r => ({
        item_id: r[CE.ID],
        item_name: r[CE.NAME],
        spec: r[CE.SPEC] || '',
      }))

    res.json({ equipment })
  } catch (err) {
    next(err)
  }
})

// POST /api/comms
router.post('/', async (req, res, next) => {
  try {
    const { item_name, spec } = req.body
    if (!item_name) throw ApiError(400, 'item_name is required')

    await ensureSheet(CE_SHEET, CE_HEADERS)

    const id = await generateCommsId()
    await appendRows(`'${CE_SHEET}'!A:C`, [[id, item_name, spec || '']])

    res.status(201).json({ success: true, item_id: id })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/comms/:item_id
router.delete('/:item_id', async (req, res, next) => {
  try {
    const rows = await getRows(`'${CE_SHEET}'!A:A`)
    const idx = rows.findIndex(r => r[0] === req.params.item_id)
    if (idx === -1) throw ApiError(404, 'Comms item not found')

    await deleteRow(CE_SHEET, idx + 1)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// POST /api/comms/checklist
router.post('/checklist', async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) throw ApiError(400, 'name is required')

    await ensureSheet(LOG_SHEET, LOG_HEADERS, id => buildFormatRequests(LOG_SHEET, id))
    await ensureSheet(DETAILS_SHEET, DETAILS_HEADERS, id => buildFormatRequests(DETAILS_SHEET, id))

    const ids = (await getRows(`'${LOG_SHEET}'!A:A`)).slice(1).map(r => r[0])
    const { submission, logRow, detailRows } = buildReportRows(req.body, nextSubmissionNo(ids))

    await appendRows(`'${LOG_SHEET}'!A:H`, [logRow])
    await appendRows(`'${DETAILS_SHEET}'!A:J`, detailRows)
    res.status(201).json({ success: true, submission })
  } catch (err) {
    next(err)
  }
})

// GET /api/comms/checklists
router.get('/checklists', async (req, res, next) => {
  try {
    let rows
    try {
      rows = await getRows(`'${LOG_SHEET}'!A:H`)
    } catch (err) {
      // The Log tab is created by the first submission; until then there is no history.
      if (/Unable to parse range/i.test(err.message)) return res.json({ checklists: [] })
      throw err
    }
    if (rows.length < 2) return res.json({ checklists: [] })

    const checklists = rows.slice(1).filter(r => r[0]).map(r => ({
      id: r[0],
      date: r[1],
      time: r[2],
      event: r[3],
      name: r[4],
      items_complete: r[5],
      issues_found: Number(r[6]) || 0,
      issue_summary: r[7],
    }))

    res.json({ checklists })
  } catch (err) {
    next(err)
  }
})

async function generateCommsId() {
  const rows = await getRows(`'${CE_SHEET}'!A:A`)
  let maxId = 0
  for (let i = 1; i < rows.length; i++) {
    const match = String(rows[i]?.[0] || '').match(/^COMMS-(\d+)$/)
    if (match) maxId = Math.max(maxId, Number(match[1]))
  }
  return 'COMMS-' + String(maxId + 1).padStart(3, '0')
}

module.exports = router
