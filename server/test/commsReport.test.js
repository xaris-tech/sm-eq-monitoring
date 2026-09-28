const test = require('node:test')
const assert = require('node:assert/strict')

const {
  LOG_HEADERS,
  DETAILS_HEADERS,
  buildReportRows,
  nextSubmissionNo,
  formatSubmissionNo,
} = require('../services/commsReport')

const ITEMS = [
  ['COMMS-BASE-01', 'Base Station'], ['COMMS-ANTENNA-01', 'Antenna'], ['COMMS-CABLE-01', 'Cable'],
  ['COMMS-POE-01', 'POE Adapter'], ['COMMS-KNOB-01', 'Pet Knob with Tripod Adapter'],
  ['COMMS-BATT-01', 'Beltpack Battery'], ['COMMS-CHARGER-01', 'Charging Base'],
  ['COMMS-XLR-01', '4-Pin XLR Adapter'], ['COMMS-CASE-01', 'M1 Hard Case'],
]

function payload(overrides = {}) {
  const beltpacks = {}
  const headsets = {}
  for (let i = 1; i <= 8; i++) {
    beltpacks[`SM${i}`] = { user: 'N/A', monitor_type: '' }
    headsets[`SM${i}`] = { user: '', status: 'Working', notes: '' }
  }
  return {
    name: 'Juan Dela Cruz',
    event: 'Sunday Service',
    event_other: '',
    // 01:14 UTC is 09:14 in Manila.
    timestamp: '2026-09-28T01:14:00.000Z',
    items: ITEMS.map(([item_id, item_name]) => ({ item_id, item_name, status: 'Complete', notes: '' })),
    beltpacks,
    headsets,
    ...overrides,
  }
}

test('one submission yields one log row and 25 detail rows', () => {
  const { submission, logRow, detailRows } = buildReportRows(payload(), 42)

  assert.equal(submission, 'CL-0042')
  assert.equal(logRow.length, LOG_HEADERS.length)
  assert.deepEqual(logRow, ['CL-0042', '2026-09-28', '09:14', 'Sunday Service', 'Juan Dela Cruz', '9 of 9', 0, 'None'])
  assert.equal(detailRows.length, 25)
  detailRows.forEach(row => assert.equal(row.length, DETAILS_HEADERS.length))
  assert.deepEqual(detailRows.map(r => r[4]), [
    ...Array(9).fill('Comms Item'), ...Array(8).fill('Beltpack'), ...Array(8).fill('Headset'),
  ])
  assert.deepEqual(detailRows[0], ['CL-0042', '2026-09-28', 'Sunday Service', 'Juan Dela Cruz', 'Comms Item', 'Base Station', '', '', 'Complete', ''])
  assert.equal(detailRows[9][5], 'SM1 Beltpack')
  assert.equal(detailRows[17][5], 'SM1 Headset')
})

test('dates and times are Manila local time', () => {
  // 17:30 UTC on the 27th is 01:30 on the 28th in Manila.
  const { logRow } = buildReportRows(payload({ timestamp: '2026-09-27T17:30:00Z' }), 1)
  assert.deepEqual(logRow.slice(1, 3), ['2026-09-28', '01:30'])
})

test('a missing or invalid timestamp falls back to the server clock', () => {
  const now = new Date('2026-09-28T04:05:00Z')
  assert.deepEqual(buildReportRows(payload({ timestamp: 'garbage' }), 1, now).logRow.slice(1, 3), ['2026-09-28', '12:05'])
  assert.deepEqual(buildReportRows(payload({ timestamp: undefined }), 1, now).logRow.slice(1, 3), ['2026-09-28', '12:05'])
})

test('issues follow the PRD definition and are summarised in order', () => {
  const p = payload()
  p.items[1].status = 'Incomplete'
  p.items[2].notes = 'frayed near plug'
  p.items[3].status = 'N/A'
  p.beltpacks.SM3 = { user: 'Maria', monitor_type: 'In-ear', notes: 'left earpiece crackles' }
  p.beltpacks.SM4 = { user: 'Leo', monitor_type: 'Headset', notes: '' }
  p.headsets.SM4 = { user: 'Leo', status: 'Needs Replacement', notes: 'band snapped' }
  p.headsets.SM5 = { user: '', status: 'Working', notes: 'mic low' }

  const { logRow } = buildReportRows(p, 7)

  assert.equal(logRow[5], '7 of 9')
  assert.equal(logRow[6], 5)
  assert.equal(logRow[7], [
    'Antenna: Incomplete',
    'Cable: frayed near plug',
    'SM3 In-ear: left earpiece crackles',
    'SM4 Headset: Needs Replacement — band snapped',
    'SM5 Headset: mic low',
  ].join('; '))
})

test('headsets of In-ear beltpacks are recorded as not used', () => {
  const p = payload()
  p.beltpacks.SM2 = { user: 'Ana', monitor_type: 'In-ear' }
  p.headsets.SM2 = { user: 'Ana', status: 'Needs Repair', notes: 'should be ignored' }

  const { logRow, detailRows } = buildReportRows(p, 1)
  const headset = detailRows.find(r => r[5] === 'SM2 Headset')

  assert.deepEqual(headset.slice(6), ['', '', 'N/A', 'Not used — In-ear'])
  assert.equal(logRow[6], 0)
})

test('Others events include the typed event name', () => {
  const { logRow, detailRows } = buildReportRows(payload({ event: 'Others', event_other: 'Christmas Program' }), 1)
  assert.equal(logRow[3], 'Others — Christmas Program')
  assert.equal(detailRows[0][2], 'Others — Christmas Program')
})

test('user text that looks like a formula is escaped', () => {
  const p = payload({ name: '=IMPORTXML("http://x","//a")' })
  p.items[0].notes = '+1 spare'
  p.headsets.SM1 = { user: '@maria', status: 'Working', notes: '' }

  const { logRow, detailRows } = buildReportRows(p, 1)

  assert.equal(logRow[4], `'=IMPORTXML("http://x","//a")`)
  assert.equal(detailRows[0][9], `'+1 spare`)
  assert.equal(detailRows.find(r => r[5] === 'SM1 Headset')[6], `'@maria`)
  assert.ok(logRow[7].startsWith('Base Station'))
})

test('missing items and assignments default safely', () => {
  const { logRow, detailRows } = buildReportRows({ name: 'Juan', event: 'Sunday Service' }, 1)

  assert.equal(detailRows.length, 25)
  assert.equal(detailRows[0][5], 'COMMS-BASE-01')
  assert.equal(detailRows[0][8], 'Incomplete')
  assert.equal(logRow[5], '0 of 9')
  assert.equal(logRow[6], 9)
})

test('submission numbers continue from the last log row', () => {
  assert.equal(nextSubmissionNo([]), 1)
  assert.equal(nextSubmissionNo(['CL-0001', 'CL-0002', '', 'junk']), 3)
  assert.equal(nextSubmissionNo(['CL-0009', 'CL-0004']), 10)
  assert.equal(formatSubmissionNo(1), 'CL-0001')
  assert.equal(formatSubmissionNo(12345), 'CL-12345')
})
