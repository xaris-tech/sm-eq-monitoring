const { google } = require('googleapis')

const SPREADSHEET_ID = process.env.SPREADSHEET_ID

let sheetsClient = null

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    )
    sheetsClient = google.sheets({ version: 'v4', auth })
    return sheetsClient
  }

  // Fallback: use Application Default Credentials
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

async function getRows(range) {
  const sheets = await getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  })
  return res.data.values || []
}

async function appendRows(range, rows) {
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

async function deleteRow(sheetName, rowIndex) {
  const sheets = await getSheetsClient()
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: null,
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
  const sheets = await getSheetsClient()

  // Check if sheet exists
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

  // Check if headers exist
  const rows = await getRows(`'${name}'!A1:Z1`)
  if (!rows.length || rows[0].length === 0) {
    await appendRows(`'${name}'!A1:Z1`, [headers])
  }
}

module.exports = {
  getRows,
  appendRows,
  updateCell,
  getSheetData,
  deleteRow,
  ensureSheet,
}
