// Builds the Checklist Log / Checklist Details rows for one comms checklist
// submission. Rows are written with valueInputOption USER_ENTERED, so dates
// and times become real Sheets values and user text is escaped below.

const LOG_SHEET = 'Checklist Log'
const DETAILS_SHEET = 'Checklist Details'
const LOG_HEADERS = ['Submission #', 'Date', 'Time', 'Event', 'Checked By', 'Items Complete', 'Issues Found', 'Issue Summary']
const DETAILS_HEADERS = ['Submission #', 'Date', 'Event', 'Checked By', 'Category', 'Equipment', 'Assigned To', 'Monitor Type', 'Status', 'Notes']

const COMMS_ITEM_IDS = ['COMMS-BASE-01', 'COMMS-ANTENNA-01', 'COMMS-CABLE-01', 'COMMS-POE-01', 'COMMS-KNOB-01', 'COMMS-BATT-01', 'COMMS-CHARGER-01', 'COMMS-XLR-01', 'COMMS-CASE-01']
const BELTPACK_KEYS = ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6', 'SM7', 'SM8']
const TIME_ZONE = 'Asia/Manila'
const IN_EAR_HEADSET_NOTE = 'Not used — In-ear'
const UNUSED_BELTPACK_NOTE = 'Not used'
const UNUSED_HEADSET_NOTE = 'Not used — beltpack N/A'
const ISSUE_HEADSET_STATUSES = new Set(['Needs Repair', 'Needs Replacement'])

function clean(value) {
  return String(value ?? '').trim()
}

// Stops user text from being evaluated as a formula by USER_ENTERED.
function text(value) {
  const str = clean(value)
  return /^[=+\-@]/.test(str) ? `'${str}` : str
}

function formatSubmissionNo(n) {
  return `CL-${String(n).padStart(4, '0')}`
}

function nextSubmissionNo(existingIds) {
  let max = 0
  for (const id of existingIds) {
    const match = String(id || '').match(/^CL-(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

function manilaDateTime(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

function submittedAt(timestamp, now) {
  const parsed = new Date(timestamp)
  return timestamp && !Number.isNaN(parsed.getTime()) ? parsed : now
}

function eventLabel(event, eventOther) {
  const name = clean(event)
  const other = clean(eventOther)
  return name === 'Others' && other ? `Others — ${other}` : name
}

// Accepts the structured payload shape and the legacy string form.
function readBeltpack(value) {
  if (typeof value === 'string') return { user: clean(value), monitorType: '', notes: '' }
  const beltpack = value && typeof value === 'object' ? value : {}
  return { user: clean(beltpack.user), monitorType: clean(beltpack.monitor_type), notes: clean(beltpack.notes) }
}

function readHeadset(value) {
  const headset = value && typeof value === 'object' ? value : {}
  return { user: clean(headset.user), status: clean(headset.status) || 'Working', notes: clean(headset.notes) }
}

function countText(item) {
  if (!Number.isInteger(item.count)) return ''
  return Number.isInteger(item.expected_count) ? `Count: ${item.count} of ${item.expected_count}` : `Count: ${item.count}`
}

function issueText(label, status, notes) {
  return `${label}: ${[status, notes].filter(Boolean).join(' — ')}`
}

function buildReportRows(payload, submissionNo, now = new Date()) {
  const submission = formatSubmissionNo(submissionNo)
  const { date, time } = manilaDateTime(submittedAt(payload.timestamp, now))
  const event = eventLabel(payload.event, payload.event_other)
  const checkedBy = clean(payload.name)
  const detail = (category, equipment, assignedTo, monitorType, status, notes) =>
    [submission, date, text(event), text(checkedBy), category, text(equipment), text(assignedTo), monitorType, status, text(notes)]

  const detailRows = []
  const issues = []
  let complete = 0

  const items = Array.isArray(payload.items) ? payload.items : []
  COMMS_ITEM_IDS.forEach(id => {
    const item = items.find(it => it && it.item_id === id) || {}
    const name = clean(item.item_name) || id
    const status = clean(item.status) || 'Incomplete'
    const notes = clean(item.notes)
    const count = countText(item)
    if (status === 'Complete') complete++
    if (status === 'Incomplete' || notes) {
      issues.push(issueText(name, status === 'Incomplete' ? [status, count].filter(Boolean).join(', ') : '', notes))
    }
    detailRows.push(detail('Comms Item', name, '', '', status, [count, notes].filter(Boolean).join(' — ')))
  })

  const beltpacks = payload.beltpacks || {}
  const headsets = payload.headsets || {}
  const beltpackRows = []
  const headsetRows = []
  BELTPACK_KEYS.forEach(key => {
    const beltpack = readBeltpack(beltpacks[key])
    const user = beltpack.user === 'N/A' ? '' : beltpack.user
    const inEar = beltpack.monitorType === 'In-ear'
    if (beltpack.monitorType === 'N/A') {
      beltpackRows.push(detail('Beltpack', `${key} Beltpack`, '', '', 'N/A', UNUSED_BELTPACK_NOTE))
      headsetRows.push(detail('Headset', `${key} Headset`, '', '', 'N/A', UNUSED_HEADSET_NOTE))
      return
    }
    if (beltpack.notes) issues.push(issueText(`${key} ${inEar ? 'In-ear' : 'Beltpack'}`, '', beltpack.notes))
    beltpackRows.push(detail('Beltpack', `${key} Beltpack`, user, beltpack.monitorType, '', beltpack.notes))

    if (inEar) {
      headsetRows.push(detail('Headset', `${key} Headset`, '', '', 'N/A', IN_EAR_HEADSET_NOTE))
      return
    }
    const headset = readHeadset(headsets[key])
    if (ISSUE_HEADSET_STATUSES.has(headset.status) || headset.notes) {
      issues.push(issueText(`${key} Headset`, ISSUE_HEADSET_STATUSES.has(headset.status) ? headset.status : '', headset.notes))
    }
    headsetRows.push(detail('Headset', `${key} Headset`, headset.user, '', headset.status, headset.notes))
  })
  detailRows.push(...beltpackRows, ...headsetRows)

  const logRow = [
    submission,
    date,
    time,
    text(event),
    text(checkedBy),
    `${complete} of ${COMMS_ITEM_IDS.length}`,
    issues.length,
    issues.length ? text(issues.join('; ')) : 'None',
  ]

  return { submission, logRow, detailRows }
}

const HEADER_BG = { red: 0.886, green: 0.91, blue: 0.941 }
const RED_BG = { red: 0.996, green: 0.886, blue: 0.886 }
const GREEN_BG = { red: 0.82, green: 0.98, blue: 0.898 }
const RED_STATUSES = ['Incomplete', 'Needs Repair', 'Needs Replacement']
const GREEN_STATUSES = ['Complete', 'Working']

const SHEET_LAYOUTS = {
  [LOG_SHEET]: {
    headers: LOG_HEADERS,
    widths: [110, 100, 70, 200, 170, 110, 100, 480],
    dateColumns: [1],
    timeColumns: [2],
    statusColumn: null,
  },
  [DETAILS_SHEET]: {
    headers: DETAILS_HEADERS,
    widths: [110, 100, 200, 170, 110, 220, 150, 110, 150, 320],
    dateColumns: [1],
    timeColumns: [],
    statusColumn: 8,
  },
}

function columnLetter(index) {
  return String.fromCharCode(65 + index)
}

function statusRule(sheetId, column, statuses, backgroundColor, index) {
  const cell = `$${columnLetter(column)}2`
  return {
    addConditionalFormatRule: {
      index,
      rule: {
        ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: `=OR(${statuses.map(s => `${cell}="${s}"`).join(',')})` }],
          },
          format: { backgroundColor },
        },
      },
    },
  }
}

// Sheets batchUpdate requests that format a freshly created report tab.
function buildFormatRequests(sheetName, sheetId) {
  const layout = SHEET_LAYOUTS[sheetName]
  if (!layout) throw new Error(`No layout for sheet ${sheetName}`)
  const columnCount = layout.headers.length

  const columnFormat = (column, type, pattern) => ({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 },
      cell: { userEnteredFormat: { numberFormat: { type, pattern } } },
      fields: 'userEnteredFormat.numberFormat',
    },
  })

  const requests = [
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: HEADER_BG, wrapStrategy: 'WRAP' } },
        fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy)',
      },
    },
    {
      setBasicFilter: {
        filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: columnCount } },
      },
    },
    ...layout.widths.map((pixelSize, column) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: column, endIndex: column + 1 },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    })),
    ...layout.dateColumns.map(column => columnFormat(column, 'DATE', 'yyyy-mm-dd')),
    ...layout.timeColumns.map(column => columnFormat(column, 'TIME', 'hh:mm')),
  ]

  if (layout.statusColumn !== null) {
    requests.push(
      statusRule(sheetId, layout.statusColumn, RED_STATUSES, RED_BG, 0),
      statusRule(sheetId, layout.statusColumn, GREEN_STATUSES, GREEN_BG, 1)
    )
  }
  return requests
}

module.exports = {
  buildFormatRequests,
  LOG_SHEET,
  DETAILS_SHEET,
  LOG_HEADERS,
  DETAILS_HEADERS,
  buildReportRows,
  nextSubmissionNo,
  formatSubmissionNo,
}
