const test = require('node:test')
const assert = require('node:assert/strict')

const {
  parseAssignmentQr,
  createBeltpackAssignment,
  createHeadsetAssignment,
  isHeadsetDisabled,
} = require('../js/comms-assignment')
const { buildReportRows } = require('../server/services/commsReport')
const fs = require('node:fs')
const path = require('node:path')

test('recognizes paired beltpack and headset QR values', () => {
  assert.deepEqual(parseAssignmentQr('BELTPACK:SM1'), { kind: 'beltpack', id: 'SM1' })
  assert.deepEqual(parseAssignmentQr(' headset:sm8 '), { kind: 'headset', id: 'SM8' })
})

test('rejects unknown QR prefixes and identifiers', () => {
  assert.equal(parseAssignmentQr('BELTPACK:SM9'), null)
  assert.equal(parseAssignmentQr('HEADSET:ABC'), null)
  assert.equal(parseAssignmentQr('COMMS-BASE-01'), null)
})

test('beltpack assignment requires a name and supported monitor type', () => {
  assert.throws(() => createBeltpackAssignment('', 'Headset'), /name is required/i)
  assert.throws(() => createBeltpackAssignment('Juan', 'Speaker'), /monitor type/i)
  assert.deepEqual(createBeltpackAssignment('  Juan  ', 'In-ear'), {
    user: 'Juan',
    monitor_type: 'In-ear',
    notes: '',
  })
})

test('beltpack assignment keeps optional trimmed notes', () => {
  assert.deepEqual(createBeltpackAssignment('Maria', 'In-ear', '  left earpiece crackles '), {
    user: 'Maria',
    monitor_type: 'In-ear',
    notes: 'left earpiece crackles',
  })
  assert.equal(createBeltpackAssignment('Maria', 'Headset', undefined).notes, '')
  assert.throws(() => createBeltpackAssignment('', 'In-ear', 'note'), /name is required/i)
})

test('every comms row shows notes, and beltpacks carry notes end to end', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(script, /class="checklist-item-notes visible"/)
  assert.match(script, /id="beltpack-notes-\$\{id\}"/)
  assert.match(html, /id="assignmentNotes"/)
  const payloadBody = script.match(/function collectPayload\(\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
  assert.match(payloadBody, /beltpack-notes-/)
})

test('headset assignment requires a name and supported status', () => {
  assert.throws(() => createHeadsetAssignment('', 'Working'), /name is required/i)
  assert.throws(() => createHeadsetAssignment('Juan', 'Missing'), /status/i)
  assert.deepEqual(createHeadsetAssignment(' Juan ', 'Needs Repair'), {
    user: 'Juan',
    status: 'Needs Repair',
    notes: '',
  })
})

test('only an In-ear beltpack disables its paired headset', () => {
  assert.equal(isHeadsetDisabled({ monitor_type: 'In-ear' }), true)
  assert.equal(isHeadsetDisabled({ monitor_type: 'Headset' }), false)
  assert.equal(isHeadsetDisabled(null), false)
})

test('Comms Checklist includes the assignment dialog and paired controls', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(html, /js\/comms-assignment\.js/)
  assert.match(html, /id="assignmentOverlay"/)
  assert.match(html, /id="assignmentName"/)
  assert.match(html, /id="assignmentMonitorType"/)
  assert.match(html, /id="assignmentHeadsetStatus"/)
  const scanRouting = script + fs.readFileSync(path.join(root, 'js/comms-scanner-state.js'), 'utf8')
  assert.match(scanRouting, /parseAssignmentQr/)
  assert.match(script, /syncHeadsetAvailability/)
})

test('an In-ear paired headset renders as a solid grey unavailable card', () => {
  const root = path.resolve(__dirname, '..')
  const css = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')

  assert.match(css, /\.headset-item\.is-disabled\s*\{[^}]*background:\s*var\(--border-light\)/s)
  assert.match(css, /\.headset-item\.is-disabled\s+(?:\.headset-row\s+)?input,[^}]*display:\s*none/s)
  assert.doesNotMatch(css, /\.headset-item\.is-disabled\s*\{[^}]*border-style:\s*dashed/s)
})

test('Show All QR Codes includes a separate section for all paired devices', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8')

  const commsQrSection = html.match(/<div id="commsQrSection"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] ?? ''

  assert.match(commsQrSection, /id="commsQrGrid"/)
  assert.match(commsQrSection, /Beltpack &amp; Headset QR Codes/)
  assert.match(commsQrSection, /id="assignmentQrGrid"/)
  assert.doesNotMatch(html, /id="showAssignmentQrBtn"/)
  assert.doesNotMatch(script, /toggleAssignmentQrSection/)
  assert.match(script, /BELTPACK:\$\{id\}/)
  assert.match(script, /HEADSET:\$\{id\}/)
})

test('API report rows accept legacy and structured assignments', () => {
  const { detailRows } = buildReportRows({
    name: 'Juan',
    event: 'Sunday Service',
    beltpacks: { SM1: 'Juan', SM2: { user: 'Ana', monitor_type: 'Headset' }, SM3: { user: 'N/A', monitor_type: '' } },
    headsets: { SM1: { status: 'Working', notes: 'old format' }, SM2: { user: 'Ana', status: 'Needs Repair', notes: '' } },
  }, 1)
  const row = equipment => detailRows.find(r => r[5] === equipment)

  assert.deepEqual(row('SM1 Beltpack').slice(6, 10), ['Juan', '', '', ''])
  assert.deepEqual(row('SM2 Beltpack').slice(6, 10), ['Ana', 'Headset', '', ''])
  assert.deepEqual(row('SM3 Beltpack').slice(6, 10), ['', '', '', ''])
  assert.deepEqual(row('SM1 Headset').slice(6, 10), ['', '', 'Working', 'old format'])
  assert.deepEqual(row('SM2 Headset').slice(6, 10), ['Ana', '', 'Needs Repair', ''])
})

test('an N/A beltpack needs no name and blocks its paired headset', () => {
  const { isBeltpackUnused, headsetDisabledReason } = require('../js/comms-assignment')

  assert.deepEqual(createBeltpackAssignment('', 'N/A'), { user: '', monitor_type: 'N/A', notes: '' })
  assert.deepEqual(createBeltpackAssignment('Juan', 'N/A').user, '', 'a name typed before choosing N/A is dropped')
  assert.equal(isBeltpackUnused({ monitor_type: 'N/A' }), true)
  assert.equal(isHeadsetDisabled({ user: '', monitor_type: 'N/A' }), true)
  assert.equal(headsetDisabledReason('SM4', { monitor_type: 'N/A' }), 'SM4 Beltpack is N/A')
  assert.equal(headsetDisabledReason('SM4', { monitor_type: 'In-ear' }), 'SM4 Beltpack uses In-ear')
})

test('the beltpack row and popup offer N/A (not used)', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(script, /<option value="N\/A">N\/A \(not used\)<\/option>/)
  assert.match(html, /id="assignmentMonitorType">[\s\S]*?<option value="N\/A">/)
  assert.match(html, /id="assignmentNameField"/)
  assert.match(script, /function syncBeltpackUsage\(id\)/)
})
