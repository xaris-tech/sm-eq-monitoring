const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  LOG_SHEET,
  DETAILS_SHEET,
  LOG_HEADERS,
  DETAILS_HEADERS,
  buildFormatRequests,
} = require('../services/commsReport')

// A recording stand-in for the googleapis Sheets client. Nothing leaves the process.
const calls = { batchUpdates: [], appends: [] }
let existingTabs = []
const fakeClient = {
  spreadsheets: {
    get: async () => ({ data: { sheets: existingTabs.map((title, i) => ({ properties: { title, sheetId: i + 1 } })) } }),
    batchUpdate: async ({ resource }) => {
      calls.batchUpdates.push(resource.requests)
      const addSheet = resource.requests.find(r => r.addSheet)
      if (addSheet) existingTabs.push(addSheet.addSheet.properties.title)
      return { data: { replies: addSheet ? [{ addSheet: { properties: { sheetId: 777 } } }] : [] } }
    },
    values: {
      get: async () => ({ data: { values: [] } }),
      append: async args => { calls.appends.push(args) },
    },
  },
}
require.cache[require.resolve('googleapis', { paths: [path.join(__dirname, '..')] })] = {
  exports: { google: { auth: { JWT: function JWT() {} }, sheets: () => fakeClient } },
}
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.invalid'
process.env.GOOGLE_PRIVATE_KEY = 'test-key'
process.env.SPREADSHEET_ID = 'fake-spreadsheet'
const { ensureSheet } = require('../services/sheets')

function reset(tabs = []) {
  existingTabs = [...tabs]
  calls.batchUpdates.length = 0
  calls.appends.length = 0
}

function requestsOf(type, requests) {
  return requests.filter(r => r[type]).map(r => r[type])
}

test('report tabs get a bold frozen header, filter, and column widths', () => {
  for (const [sheet, headers] of [[LOG_SHEET, LOG_HEADERS], [DETAILS_SHEET, DETAILS_HEADERS]]) {
    const requests = buildFormatRequests(sheet, 42)

    const [frozen] = requestsOf('updateSheetProperties', requests)
    assert.equal(frozen.properties.gridProperties.frozenRowCount, 1)

    const header = requestsOf('repeatCell', requests).find(r => r.range.endRowIndex === 1)
    assert.equal(header.cell.userEnteredFormat.textFormat.bold, true)
    assert.equal(header.range.endColumnIndex, headers.length)

    const [filter] = requestsOf('setBasicFilter', requests)
    assert.equal(filter.filter.range.endColumnIndex, headers.length)

    const widths = requestsOf('updateDimensionProperties', requests)
    assert.equal(widths.length, headers.length, sheet)
    widths.forEach(w => assert.ok(w.properties.pixelSize >= 70))

    requests.forEach(r => {
      const range = Object.values(r)[0].range || Object.values(r)[0].filter?.range || Object.values(r)[0].properties
      if (range && 'sheetId' in range) assert.equal(range.sheetId, 42)
    })
  }
})

test('date and time columns get date/time number formats', () => {
  const formats = sheet => requestsOf('repeatCell', buildFormatRequests(sheet, 1))
    .filter(r => r.cell.userEnteredFormat.numberFormat)
    .map(r => [r.range.startColumnIndex, r.cell.userEnteredFormat.numberFormat.type, r.range.startRowIndex])

  assert.deepEqual(formats(LOG_SHEET), [[1, 'DATE', 1], [2, 'TIME', 1]])
  assert.deepEqual(formats(DETAILS_SHEET), [[1, 'DATE', 1]])
})

test('Details Status is coloured red and green for every data row', () => {
  const rules = requestsOf('addConditionalFormatRule', buildFormatRequests(DETAILS_SHEET, 5))
  assert.equal(rules.length, 2)

  const [red, green] = rules.map(r => r.rule)
  const statusColumn = DETAILS_HEADERS.indexOf('Status')
  for (const rule of [red, green]) {
    assert.deepEqual(rule.ranges, [{ sheetId: 5, startRowIndex: 1, startColumnIndex: statusColumn, endColumnIndex: statusColumn + 1 }])
    assert.equal(rule.ranges[0].endRowIndex, undefined, 'open-ended so rows added later are coloured')
  }
  assert.equal(red.booleanRule.condition.values[0].userEnteredValue, '=OR($I2="Incomplete",$I2="Needs Repair",$I2="Needs Replacement")')
  assert.equal(green.booleanRule.condition.values[0].userEnteredValue, '=OR($I2="Complete",$I2="Working")')
  assert.ok(red.booleanRule.format.backgroundColor.red > red.booleanRule.format.backgroundColor.green)
  assert.ok(green.booleanRule.format.backgroundColor.green > green.booleanRule.format.backgroundColor.red)

  assert.equal(requestsOf('addConditionalFormatRule', buildFormatRequests(LOG_SHEET, 5)).length, 0)
})

test('ensureSheet formats a tab it creates, using the new sheet id', async () => {
  reset()
  await ensureSheet(LOG_SHEET, LOG_HEADERS, id => buildFormatRequests(LOG_SHEET, id))

  assert.equal(calls.batchUpdates.length, 2)
  assert.deepEqual(calls.batchUpdates[0], [{ addSheet: { properties: { title: LOG_SHEET } } }])
  assert.deepEqual(calls.batchUpdates[1], buildFormatRequests(LOG_SHEET, 777))
  assert.deepEqual(calls.appends[0].resource.values, [LOG_HEADERS])
})

test('ensureSheet never reformats a tab that already exists', async () => {
  reset([LOG_SHEET])
  let built = 0
  await ensureSheet(LOG_SHEET, LOG_HEADERS, id => { built++; return buildFormatRequests(LOG_SHEET, id) })

  assert.equal(built, 0)
  assert.equal(calls.batchUpdates.length, 0)
})

test('ensureSheet without a formatter still just creates the tab', async () => {
  reset()
  await ensureSheet('Other Tab', ['a', 'b'])

  assert.equal(calls.batchUpdates.length, 1)
  assert.ok(calls.batchUpdates[0][0].addSheet)
})

test('a rejected formatting request does not fail tab creation', async () => {
  reset()
  const original = fakeClient.spreadsheets.batchUpdate
  fakeClient.spreadsheets.batchUpdate = async args => {
    if (!args.resource.requests.some(r => r.addSheet)) throw new Error('Invalid requests[3]')
    return original(args)
  }
  const logged = []
  const originalError = console.error
  console.error = (...args) => logged.push(args.join(' '))
  try {
    await ensureSheet(DETAILS_SHEET, DETAILS_HEADERS, id => buildFormatRequests(DETAILS_SHEET, id))
  } finally {
    fakeClient.spreadsheets.batchUpdate = original
    console.error = originalError
  }

  assert.deepEqual(calls.appends[0].resource.values, [DETAILS_HEADERS])
  assert.match(logged.join('\n'), /formatting 'Checklist Details' failed: Invalid requests\[3\]/)
})
