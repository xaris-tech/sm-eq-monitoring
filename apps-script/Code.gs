const MASTER_SHEET = 'Equipment'
const SHEET_EQUIPMENT = 'Equipment'
const SHEET_LOG = 'BorrowLog'
const SHEET_COMMS_CHECKLIST = 'CommsChecklist'
const SHEET_COMMS_EQUIPMENT = 'CommsEquipment'
const SHEET_SM_KIT = 'SM KIT'
const SPREADSHEET_ID = '14AUw-o53cyXoCRLmrdkaikMVlQzYyWo-Ad2g6BzHfdA'
const ADMIN_PASSWORD = '#Isaiah40:3!'  // Change this before deploying.

// Equipment columns: 0=item_id, 1=item_name, 2=type, 3=description, 4=stock, 5=status
const COL_EQ_ID = 0, COL_EQ_NAME = 1, COL_EQ_TYPE = 2, COL_EQ_DESC = 3, COL_EQ_STOCK = 4, COL_EQ_STATUS = 5
// BorrowLog columns: 0=log_id, 1=borrower, 2=item_id, 3=item_name, 4=quantity, 5=borrow_time, 6=return_time
const COL_LOG_BORROWER = 1, COL_LOG_ITEM_ID = 2, COL_LOG_ITEM_NAME = 3, COL_LOG_QUANTITY = 4, COL_LOG_BORROW_TIME = 5, COL_LOG_RETURN_TIME = 6
// CommsChecklist columns: 0=id, 1=name, 2=event, 3=event_other, 4=slot, 5=timestamp, 6-14=items status|notes, 15-22=beltpack usernames, 23-30=headset status|notes
const COL_CL_NAME = 1, COL_CL_EVENT = 2, COL_CL_EVENT_OTHER = 3, COL_CL_SLOT = 4, COL_CL_TIMESTAMP = 5, COL_CL_ITEM_START = 6, COL_CL_BELTPACK_START = 15, COL_CL_HEADSET_START = 23
// CommsEquipment columns: 0=item_id, 1=item_name, 2=spec
const COL_CE_ID = 0, COL_CE_NAME = 1, COL_CE_SPEC = 2

const COMMS_ITEM_IDS = ['COMMS-BASE-01','COMMS-ANTENNA-01','COMMS-CABLE-01','COMMS-POE-01','COMMS-KNOB-01','COMMS-BATT-01','COMMS-CHARGER-01','COMMS-XLR-01','COMMS-CASE-01']
const BELTPACK_KEYS = ['SM1','SM2','SM3','SM4','SM5','SM6','SM7','SM8']

function doGet(e) {
  const action = e.parameter.action
  if (action === 'getEquipment') return getEquipment()
  if (action === 'getCommsEquipment') return getCommsEquipment()
  return jsonResponse({ error: 'Unknown action' }, 400)
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const action = data.action
    switch (action) {
      case 'borrow': return borrow(data)
      case 'return': return doReturn(data)
      case 'addEquipment': return addEquipment(data)
      case 'deleteEquipment': return deleteEquipment(data)
      case 'submitChecklist': return submitChecklist(data)
      case 'seedEquipment': return seedEquipment(data)
      case 'addCommsItem': return addCommsItem(data)
      case 'deleteCommsItem': return deleteCommsItem(data)
      case 'adminLogin': return adminLogin(data)
      default: return jsonResponse({ error: 'Unknown action' }, 400)
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500)
  }
}

function getEquipment() {
  const ss = getSpreadsheet()
  const sheet = ensureEquipmentSheet(ss)
  if (!sheet) return jsonResponse({ equipment: [] })

  const rows = sheet.getDataRange().getValues()
  if (rows.length < 2) return jsonResponse({ equipment: [] })

  const cleaned = normalizeEquipmentRows(rows)
  if (cleaned.changed) {
    sheet.clearContents()
    sheet.getRange(1, 1, 1, 6).setValues([['item_id', 'item_name', 'type', 'description', 'stock', 'status']])
    if (cleaned.rows.length) {
      sheet.getRange(2, 1, cleaned.rows.length, 6).setValues(cleaned.rows)
    }
  }

  const equipment = cleaned.rows.map(r => ({
    item_id: r[COL_EQ_ID],
    item_name: r[COL_EQ_NAME],
    type: r[COL_EQ_TYPE] || '',
    description: r[COL_EQ_DESC] || '',
    stock: r[COL_EQ_STOCK] || 0,
    status: r[COL_EQ_STATUS] || 'available',
  }))

  return jsonResponse({ equipment })
}

function borrow(data) {
  const ss = getSpreadsheet()
  const sheet = ensureBorrowLogSheet(ss)
  const equipSheet = ensureEquipmentSheet(ss)

  const name = data.name
  const items = data.items || []
  const time = data.time || new Date().toISOString()
  const results = []

  items.forEach(item => {
    sheet.appendRow([
      Utilities.getUuid(),
      name,
      item.item_id,
      item.item_name,
      item.quantity || 1,
      time,
      '',
    ])
    results.push({ item_id: item.item_id, status: 'borrowed' })
    markEquipmentStatus(equipSheet, item.item_id, 'borrowed')
  })

  return jsonResponse({ success: true, results })
}

function doReturn(data) {
  const ss = getSpreadsheet()
  const logSheet = ensureBorrowLogSheet(ss)
  const equipSheet = ensureEquipmentSheet(ss)

  const items = data.items || []
  const time = data.time || new Date().toISOString()
  const results = []

  items.forEach(item => {
    const logData = logSheet.getDataRange().getValues()
    for (let i = logData.length - 1; i >= 1; i--) {
      if (logData[i][COL_LOG_ITEM_ID] === item.item_id && logData[i][COL_LOG_RETURN_TIME] === '') {
        logSheet.getRange(i + 1, COL_LOG_RETURN_TIME + 1).setValue(time)
        break
      }
    }
    results.push({ item_id: item.item_id, status: 'returned' })
    markEquipmentStatus(equipSheet, item.item_id, 'available')
  })

  return jsonResponse({ success: true, results })
}

function addEquipment(data) {
  const ss = getSpreadsheet()
  const sheet = ensureEquipmentSheet(ss)
  const id = data.item_id || generateId(sheet)

  sheet.appendRow([id, data.item_name, data.type || '', data.description || '', data.stock || 0, 'available'])

  return jsonResponse({ success: true, item_id: id })
}

function deleteEquipment(data) {
  const ss = getSpreadsheet()
  const sheet = ensureEquipmentSheet(ss)
  const rows = sheet.getDataRange().getValues()

  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][COL_EQ_ID] === data.item_id) {
      sheet.deleteRow(i + 1)
      return jsonResponse({ success: true })
    }
  }

  return jsonResponse({ error: 'Equipment not found' }, 404)
}

function markEquipmentStatus(sheet, item_id, status) {
  if (!sheet) return
  const rows = sheet.getDataRange().getValues()
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL_EQ_ID] === item_id) {
      sheet.getRange(i + 1, COL_EQ_STATUS + 1).setValue(status)
      return
    }
  }
}

function generateId() {
  return generateIdForSheet(ensureEquipmentSheet(getSpreadsheet()))
}

function adminLogin(data) {
  const pw = data.password || ''
  if (pw === ADMIN_PASSWORD) {
    return jsonResponse({ success: true, token: Utilities.getUuid() })
  }
  return jsonResponse({ success: false, error: 'Incorrect password' }, 401)
}

// ── Comms Checklist ──────────────────────────────────────────

function submitChecklist(data) {
  const ss = getSpreadsheet()
  const sheet = ensureCommsChecklistSheet(ss)
  const items = data.items || []
  const beltpacks = data.beltpacks || {}
  const headsets = data.headsets || {}

  const row = []
  row[0] = Utilities.getUuid()
  row[COL_CL_NAME] = data.name || ''
  row[COL_CL_EVENT] = data.event || ''
  row[COL_CL_EVENT_OTHER] = data.event_other || ''
  row[COL_CL_SLOT] = data.slot || ''
  row[COL_CL_TIMESTAMP] = data.timestamp || new Date().toISOString()

  COMMS_ITEM_IDS.forEach((id, i) => {
    const item = items.find(it => it.item_id === id)
    row[COL_CL_ITEM_START + i] = item ? (item.status || '') + ' | ' + (item.notes || '') : ''
  })

  BELTPACK_KEYS.forEach((key, i) => {
    row[COL_CL_BELTPACK_START + i] = beltpacks[key] || 'N/A'
  })

  BELTPACK_KEYS.forEach((key, i) => {
    const hs = headsets[key] || {}
    row[COL_CL_HEADSET_START + i] = (hs.status || 'Working') + ' | ' + (hs.notes || '')
  })

  sheet.appendRow(row.map(v => v === undefined ? '' : v))
  return jsonResponse({ success: true })
}

function getCommsEquipment() {
  const ss = getSpreadsheet()
  const sheet = ensureCommsEquipmentSheet(ss)
  if (!sheet) return jsonResponse({ equipment: [] })

  const rows = sheet.getDataRange().getValues()
  if (rows.length < 2) return jsonResponse({ equipment: [] })

  const equipment = rows.slice(1).map(r => ({
    item_id: r[COL_CE_ID],
    item_name: r[COL_CE_NAME],
    spec: r[COL_CE_SPEC] || '',
  })).filter(e => e.item_id && e.item_name)

  return jsonResponse({ equipment })
}

function addCommsItem(data) {
  const ss = getSpreadsheet()
  const sheet = ensureCommsEquipmentSheet(ss)
  const id = 'COMMS-' + String(generateCommsId(sheet)).padStart(3, '0')

  sheet.appendRow([id, data.item_name || '', data.spec || ''])
  return jsonResponse({ success: true, item_id: id })
}

function deleteCommsItem(data) {
  const ss = getSpreadsheet()
  const sheet = ensureCommsEquipmentSheet(ss)
  const rows = sheet.getDataRange().getValues()

  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][COL_CE_ID] === data.item_id) {
      sheet.deleteRow(i + 1)
      return jsonResponse({ success: true })
    }
  }
  return jsonResponse({ error: 'Comms item not found' }, 404)
}

function ensureCommsChecklistSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_COMMS_CHECKLIST)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMMS_CHECKLIST)
  }
  if (sheet.getLastRow() === 0) {
    const headers = ['id', 'name', 'event', 'event_other', 'slot', 'timestamp']
    COMMS_ITEM_IDS.forEach(id => headers.push(id))
    BELTPACK_KEYS.forEach(key => headers.push(key + '_user'))
    BELTPACK_KEYS.forEach(key => headers.push(key + '_headset'))
    sheet.appendRow(headers)
  }
  return sheet
}

function ensureCommsEquipmentSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_COMMS_EQUIPMENT)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMMS_EQUIPMENT)
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['item_id', 'item_name', 'spec'])
  }
  return sheet
}

function generateCommsId(sheet) {
  const rows = sheet.getDataRange().getValues()
  let maxId = 0
  for (let i = 1; i < rows.length; i++) {
    const match = String(rows[i][COL_CE_ID] || '').match(/^COMMS-(\d+)$/)
    if (match) maxId = Math.max(maxId, Number(match[1]))
  }
  return maxId + 1
}

function jsonResponse(data, status) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
  output.setMimeType(ContentService.MimeType.JSON)
  return output
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID)
}

function ensureEquipmentSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_EQUIPMENT)
  if (sheet && isProcessedEquipmentSheet(sheet)) {
    cleanupEquipmentRows(sheet)
    const data = sheet.getDataRange().getValues()
    if (hasTestData(data)) {
      ss.deleteSheet(sheet)
      sheet = ss.insertSheet(SHEET_EQUIPMENT)
      seedEquipmentSheet(sheet)
    }
    return sheet
  }

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EQUIPMENT)
  }

  const imported = importMasterList(ss, sheet)
  if (imported) {
    cleanupEquipmentRows(sheet)
    return sheet
  }

  const importedSm = importFromSMKit(ss, sheet)
  if (importedSm) {
    cleanupEquipmentRows(sheet)
    return sheet
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['item_id', 'item_name', 'type', 'description', 'stock', 'status'])
  }

  cleanupEquipmentRows(sheet)
  return sheet
}

function importFromSMKit(ss, targetSheet) {
  const src = ss.getSheetByName(SHEET_SM_KIT)
  if (!src) return false

  const values = src.getDataRange().getDisplayValues()
  if (values.length < 2) return false

  const rows = []
  let currentCategory = ''
  let nextId = 1

  for (let i = 1; i < values.length; i++) {
    const row = values[i]
    const category = String(row[0] || '').trim()
    const item = String(row[1] || '').trim()
    const qty = String(row[2] || '').trim()
    const unit = String(row[3] || '').trim()
    const preStatus = String(row[4] || '').trim()
    const location = String(row[5] || '').trim()
    const postStatus = String(row[6] || '').trim()
    const note = String(row[7] || '').trim()

    if (category && !item && !qty && !unit) {
      currentCategory = category
      continue
    }

    if (!item) continue

    const desc = [unit, preStatus, location, postStatus, note].filter(Boolean).join(' | ')
    const numericQty = parseInt(qty) || 1

    rows.push([
      'EQ-' + String(nextId++).padStart(3, '0'),
      item,
      currentCategory,
      desc || unit,
      numericQty,
      'available',
    ])
  }

  if (!rows.length) return false

  targetSheet.clearContents()
  targetSheet.getRange(1, 1, 1, 6).setValues([['item_id', 'item_name', 'type', 'description', 'stock', 'status']])
  targetSheet.getRange(2, 1, rows.length, 6).setValues(rows)
  return true
}

function ensureBorrowLogSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_LOG)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOG)
    sheet.appendRow(['log_id', 'borrower', 'item_id', 'item_name', 'quantity', 'borrow_time', 'return_time'])
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(['log_id', 'borrower', 'item_id', 'item_name', 'quantity', 'borrow_time', 'return_time'])
  }
  return sheet
}

function importMasterList(ss, targetSheet) {
  const master = ss.getSheetByName(MASTER_SHEET)
  if (!master) return false

  const values = master.getDataRange().getDisplayValues()
  if (values.length < 2) return false

  const headers = values[0].map(normalizeHeader)
  const nameCol = findHeaderIndex(headers, ['equipment', 'item', 'description', 'name'])
  const quantityCol = findHeaderIndex(headers, ['quantity', 'qty', 'stock'])
  const unitCol = findHeaderIndex(headers, ['unit', 'type', 'category'])
  const linkCol = findHeaderIndex(headers, ['link', 'url'])
  const noteCol = findHeaderIndex(headers, ['note', 'notes', 'remarks'])

  const rows = []
  let currentGroup = ''
  let nextId = 1

  for (let i = 1; i < values.length; i++) {
    const row = values[i]
    const name = getCell(row, nameCol, 0)
    const quantity = getCell(row, quantityCol, 1)
    const unit = getCell(row, unitCol, 2)
    const link = getCell(row, linkCol, 3)
    const note = getCell(row, noteCol, 4)

    if (!name && !quantity && !unit && !link && !note) continue

    const numericQty = parseQuantity(quantity)
    const isGroupRow = name && !quantity && !unit && !link && !note

    if (isGroupRow) {
      currentGroup = name
      continue
    }

    if (!name || numericQty === null) continue

    const descriptionParts = []
    if (currentGroup) descriptionParts.push(currentGroup)
    if (unit) descriptionParts.push(unit)
    if (link) descriptionParts.push(link)
    if (note) descriptionParts.push(note)

    rows.push([
      'EQ-' + String(nextId++).padStart(3, '0'),
      name,
      currentGroup,
      descriptionParts.join(' | '),
      numericQty,
      'available',
    ])
  }

  if (!rows.length) return false

  targetSheet.clearContents()
  targetSheet.getRange(1, 1, 1, 6).setValues([['item_id', 'item_name', 'type', 'description', 'stock', 'status']])
  targetSheet.getRange(2, 1, rows.length, 6).setValues(rows)
  return true
}

function isProcessedEquipmentSheet(sheet) {
  const lastRow = sheet.getLastRow()
  const lastColumn = sheet.getLastColumn()
  if (lastRow < 1 || lastColumn < 6) return false

  const headers = sheet.getRange(1, 1, 1, Math.min(lastColumn, 6)).getDisplayValues()[0].map(normalizeHeader)
  return headers[COL_EQ_ID] === 'item_id' && headers[COL_EQ_NAME] === 'item_name'
}

function cleanupEquipmentRows(sheet) {
  const rows = sheet.getDataRange().getValues()
  const cleaned = normalizeEquipmentRows(rows)
  if (!cleaned.changed) return

  sheet.clearContents()
  sheet.getRange(1, 1, 1, 6).setValues([['item_id', 'item_name', 'type', 'description', 'stock', 'status']])
  if (cleaned.rows.length) {
    sheet.getRange(2, 1, cleaned.rows.length, 6).setValues(cleaned.rows)
  }
}

function normalizeEquipmentRows(rows) {
  if (rows.length < 2) {
    return { rows: [], changed: false }
  }

  const seenIds = new Set()
  const cleanedRows = []
  let changed = false

  for (let i = 1; i < rows.length; i++) {
    const rawId = String(rows[i][COL_EQ_ID] || '').trim()
    const rawName = String(rows[i][COL_EQ_NAME] || '').trim()
    const rawType = String(rows[i][COL_EQ_TYPE] || '').trim()
    const rawDesc = String(rows[i][COL_EQ_DESC] || '').trim()
    const rawStock = rows[i][COL_EQ_STOCK]
    const rawStatus = String(rows[i][COL_EQ_STATUS] || 'available').trim() || 'available'

    if (!rawId || !rawName) {
      changed = true
      continue
    }

    if (seenIds.has(rawId)) {
      changed = true
      continue
    }

    seenIds.add(rawId)
    cleanedRows.push([rawId, rawName, rawType, rawDesc, rawStock || 0, rawStatus])
  }

  cleanedRows.sort((a, b) => compareEquipmentIds(a[COL_EQ_ID], b[COL_EQ_ID]))

  if (rows.length - 1 !== cleanedRows.length) changed = true
  if (!changed) {
    for (let i = 0; i < cleanedRows.length; i++) {
      const original = rows[i + 1]
      const cleaned = cleanedRows[i]
      if (
        String(original[COL_EQ_ID] || '').trim() !== cleaned[COL_EQ_ID] ||
        String(original[COL_EQ_NAME] || '').trim() !== cleaned[COL_EQ_NAME] ||
        String(original[COL_EQ_TYPE] || '').trim() !== cleaned[COL_EQ_TYPE] ||
        String(original[COL_EQ_DESC] || '').trim() !== cleaned[COL_EQ_DESC] ||
        String(original[COL_EQ_STOCK] || 0) !== String(cleaned[COL_EQ_STOCK]) ||
        String(original[COL_EQ_STATUS] || 'available').trim() !== cleaned[COL_EQ_STATUS]
      ) {
        changed = true
        break
      }
    }
  }

  return { rows: cleanedRows, changed }
}

function compareEquipmentIds(a, b) {
  const matchA = String(a).match(/^EQ-(\d+)$/)
  const matchB = String(b).match(/^EQ-(\d+)$/)
  if (matchA && matchB) return Number(matchA[1]) - Number(matchB[1])
  if (matchA) return -1
  if (matchB) return 1
  return String(a).localeCompare(String(b))
}

function parseQuantity(quantity) {
  if (!quantity) return null
  const match = String(quantity).match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase()
}

function findHeaderIndex(headers, candidates) {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate)
    if (idx !== -1) return idx
  }
  return -1
}

function getCell(row, preferredIndex, fallbackIndex) {
  const index = preferredIndex !== -1 ? preferredIndex : fallbackIndex
  return String(row[index] || '').trim()
}

function generateIdForSheet(sheet) {
  const rows = sheet.getDataRange().getValues()
  let maxId = 0

  for (let i = 1; i < rows.length; i++) {
    const value = String(rows[i][COL_EQ_ID] || '')
    const match = value.match(/^EQ-(\d+)$/)
    if (!match) continue
    maxId = Math.max(maxId, Number(match[1]))
  }

  return 'EQ-' + String(maxId + 1).padStart(3, '0')
}

const SM_KIT_EQUIPMENT = [
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

function seedEquipment() {
  const ss = getSpreadsheet()
  const sheet = ss.getSheetByName(SHEET_EQUIPMENT)
  if (sheet) ss.deleteSheet(sheet)
  const newSheet = ss.insertSheet(SHEET_EQUIPMENT)
  seedEquipmentSheet(newSheet)
  return jsonResponse({ success: true, count: SM_KIT_EQUIPMENT.length })
}

function seedEquipmentSheet(sheet) {
  sheet.appendRow(['item_id', 'item_name', 'type', 'description', 'stock', 'status'])
  SM_KIT_EQUIPMENT.forEach(row => sheet.appendRow(row))
}

function seedEquipmentSheet(sheet) {
  // Delete and recreate the sheet to avoid stale cell issues
  const ss = sheet.getParent()
  const name = sheet.getSheetName()
  ss.deleteSheet(sheet)
  sheet = ss.insertSheet(name)
  sheet.appendRow(['item_id', 'item_name', 'type', 'description', 'stock', 'status'])
  SM_KIT_EQUIPMENT.forEach(row => sheet.appendRow(row))
}

function hasTestData(rows) {
  for (let i = 1; i < Math.min(rows.length, 5); i++) {
    const name = String(rows[i][COL_EQ_NAME] || '').trim().toLowerCase()
    if (name === 'test') return true
  }
  return false
}
