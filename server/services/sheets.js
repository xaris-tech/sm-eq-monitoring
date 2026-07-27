const path = require('path')
const { google } = require('googleapis')

const SPREADSHEET_ID = process.env.SPREADSHEET_ID

let sheetsClient = null
let usingGoogleSheets = false

// In-memory fallback store when Google Sheets is not configured
const memStore = {}

function memEnsureSheet(name) {
  if (!memStore[name]) memStore[name] = []
}

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient

  // Try 1: JWT auth with explicit email + key
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    )
    sheetsClient = google.sheets({ version: 'v4', auth })
    usingGoogleSheets = true
    return sheetsClient
  }

  // Try 2: Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
      sheetsClient = google.sheets({ version: 'v4', auth })
      usingGoogleSheets = true
      console.log('Google Sheets: using credentials at', credPath)
      return sheetsClient
    } catch (err) {
      console.warn('Failed to authenticate with GOOGLE_APPLICATION_CREDENTIALS:', err.message)
    }
  }

  // No credentials configured — stay in-memory
  return null
}

async function getRows(range) {
  if (!usingGoogleSheets) {
    await getSheetsClient()
  }
  if (!usingGoogleSheets) {
    const name = range.match(/^'([^']+)'!/)?.[1]
    if (!name) return []
    memEnsureSheet(name)
    return memStore[name].map(r => [...r])
  }
  const sheets = await getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  })
  return res.data.values || []
}

async function appendRows(range, rows) {
  if (!usingGoogleSheets) {
    await getSheetsClient()
  }
  if (!usingGoogleSheets) {
    const name = range.match(/^'([^']+)'!/)?.[1]
    if (!name) { const m = range.match(/^([^!]+)!/); if (m) { memEnsureSheet(m[1]); memStore[m[1]].push(...rows.map(r => [...r])) } return }
    memEnsureSheet(name)
    for (const row of rows) {
      memStore[name].push([...row])
    }
    return
  }
  const sheets = await getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: rows },
  })
}

async function updateCell(range, value) {
  if (!usingGoogleSheets) {
    await getSheetsClient()
  }
  if (!usingGoogleSheets) {
    // Update in-memory store: range format "'SheetName'!C2"
    const match = range.match(/^'([^']+)'!([A-Z]+)(\d+)$/)
    if (match) {
      const name = match[1]
      const colStr = match[2]
      const row = parseInt(match[3]) - 1
      memEnsureSheet(name)
      if (row >= 0 && row < memStore[name].length) {
        let colIndex = 0
        for (let i = 0; i < colStr.length; i++) {
          colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64)
        }
        colIndex--
        if (colIndex >= 0) {
          while (memStore[name][row].length <= colIndex) {
            memStore[name][row].push('')
          }
          memStore[name][row][colIndex] = value
        }
      }
    }
    return
  }
  const sheets = await getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[value]] },
  })
}

async function getSheetData(range) {
  return getRows(range)
}

async function getSheetIdByName(sheets, name) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  })
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === name)
  return sheet ? sheet.properties.sheetId : null
}

async function deleteRow(sheetName, rowIndex) {
  if (!usingGoogleSheets) {
    await getSheetsClient()
  }
  if (!usingGoogleSheets) {
    memEnsureSheet(sheetName)
    const idx = rowIndex - 1
    if (idx >= 0 && idx < memStore[sheetName].length) {
      memStore[sheetName].splice(idx, 1)
    }
    return
  }
  const sheets = await getSheetsClient()
  const sheetId = await getSheetIdByName(sheets, sheetName)
  if (sheetId === null) throw new Error(`Sheet '${sheetName}' not found`)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}

async function ensureSheet(name, headers) {
  if (!usingGoogleSheets) {
    await getSheetsClient()
  }
  if (!usingGoogleSheets) {
    memEnsureSheet(name)
    if (memStore[name].length === 0 && headers && headers.length) {
      memStore[name].push([...headers])
    }
    return
  }
  const sheets = await getSheetsClient()

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  })
  const existing = spreadsheet.data.sheets.find(s => s.properties.title === name)

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: { properties: { title: name } },
        }],
      },
    })
  }

  const rows = await getRows(`'${name}'!A1:Z1`)
  if (!rows.length || rows[0].length === 0) {
    await appendRows(`'${name}'!A1:Z1`, [headers])
  }
}

function isUsingInMemory() {
  return !usingGoogleSheets
}

// Auto-seed default data when using in-memory fallback
const DEFAULT_SEEDS = {
  Equipment: [
    ['item_id', 'item_name', 'type', 'description', 'stock', 'status'],
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
  ],
  CommsEquipment: [
    ['item_id', 'item_name', 'spec'],
    ['COMMS-BASE-01', 'Base Station', '1 pc'],
    ['COMMS-ANTENNA-01', 'Antenna', '2 pcs'],
    ['COMMS-CABLE-01', 'Cable', '1 pc'],
    ['COMMS-POE-01', 'POE Adapter', '1 pc'],
    ['COMMS-KNOB-01', 'Pet Knob with Tripod Adapter', '1 Knob, 1 Adapter'],
    ['COMMS-BATT-01', 'Beltpack Battery', '16 pcs (8 spares)'],
    ['COMMS-CHARGER-01', 'Charging Base', '1 pc'],
    ['COMMS-XLR-01', '4-Pin XLR Adapter', '1 pc'],
    ['COMMS-CASE-01', 'M1 Hard Case', '1 pc'],
  ],
}

function seedDefaults() {
  if (!usingGoogleSheets) {
    for (const [name, data] of Object.entries(DEFAULT_SEEDS)) {
      memStore[name] = data.map(r => [...r])
    }
  }
}

module.exports = {
  getRows,
  appendRows,
  updateCell,
  getSheetData,
  deleteRow,
  ensureSheet,
  isUsingInMemory,
  seedDefaults,
  getSheetsClient,
}
