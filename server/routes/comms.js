const { Router } = require('express')
const { v4: uuidv4 } = require('uuid')
const { getRows, appendRows, deleteRow, ensureSheet } = require('../services/sheets')
const { ApiError } = require('../middleware/errorHandler')

const router = Router()

const CE_SHEET = 'CommsEquipment'
const CE_HEADERS = ['item_id', 'item_name', 'spec']
const CE = { ID: 0, NAME: 1, SPEC: 2 }

const CL_SHEET = 'CommsChecklist'
const CL_HEADERS = ['id', 'name', 'event', 'event_other', 'slot', 'timestamp',
  'COMMS-BASE-01', 'COMMS-ANTENNA-01', 'COMMS-CABLE-01', 'COMMS-POE-01',
  'COMMS-KNOB-01', 'COMMS-BATT-01', 'COMMS-CHARGER-01', 'COMMS-XLR-01', 'COMMS-CASE-01',
  'SM1_user', 'SM2_user', 'SM3_user', 'SM4_user', 'SM5_user', 'SM6_user', 'SM7_user', 'SM8_user',
  'SM1_headset', 'SM2_headset', 'SM3_headset', 'SM4_headset', 'SM5_headset', 'SM6_headset', 'SM7_headset', 'SM8_headset',
]
const COMMS_ITEM_IDS = ['COMMS-BASE-01','COMMS-ANTENNA-01','COMMS-CABLE-01','COMMS-POE-01','COMMS-KNOB-01','COMMS-BATT-01','COMMS-CHARGER-01','COMMS-XLR-01','COMMS-CASE-01']
const BELTPACK_KEYS = ['SM1','SM2','SM3','SM4','SM5','SM6','SM7','SM8']

const CL_ITEM_START = 6
const CL_BELTPACK_START = 15
const CL_HEADSET_START = 23

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
    const { name, event, event_other, slot, timestamp, items, beltpacks, headsets } = req.body
    if (!name || !name.trim()) throw ApiError(400, 'name is required')

    await ensureSheet(CL_SHEET, CL_HEADERS)

    const row = new Array(31).fill('')
    row[0] = uuidv4()
    row[1] = name.trim()
    row[2] = event || ''
    row[3] = event_other || ''
    row[4] = slot || ''
    row[5] = timestamp || new Date().toISOString()

    COMMS_ITEM_IDS.forEach((id, i) => {
      const item = (items || []).find(it => it.item_id === id)
      row[CL_ITEM_START + i] = item ? (item.status || '') + ' | ' + (item.notes || '') : ''
    })

    BELTPACK_KEYS.forEach((key, i) => {
      row[CL_BELTPACK_START + i] = (beltpacks || {})[key] || 'N/A'
    })

    BELTPACK_KEYS.forEach((key, i) => {
      const hs = (headsets || {})[key] || {}
      row[CL_HEADSET_START + i] = (hs.status || 'Working') + ' | ' + (hs.notes || '')
    })

    await appendRows(`'${CL_SHEET}'!A:AE`, [row])
    res.status(201).json({ success: true })
  } catch (err) {
    next(err)
  }
})

// GET /api/comms/checklists
router.get('/checklists', async (req, res, next) => {
  try {
    const rows = await getRows(`'${CL_SHEET}'!A:AE`)
    if (rows.length < 2) return res.json({ checklists: [] })

    const checklists = rows.slice(1).filter(r => r[0]).map(r => ({
      id: r[0],
      name: r[1],
      event: r[2],
      event_other: r[3],
      slot: r[4],
      timestamp: r[5],
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
