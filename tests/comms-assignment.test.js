const test = require('node:test')
const assert = require('node:assert/strict')

const {
  parseAssignmentQr,
  createBeltpackAssignment,
  createHeadsetAssignment,
  isHeadsetDisabled,
} = require('../js/comms-assignment')
const { serializeBeltpack, serializeHeadset } = require('../server/services/commsSerialization')
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
  })
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
  assert.match(script, /parseAssignmentQr/)
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

test('API serialization preserves legacy values and stores structured assignments', () => {
  assert.equal(serializeBeltpack('Juan'), 'Juan')
  assert.equal(serializeBeltpack({ user: 'Juan', monitor_type: 'Headset' }), 'Juan | Headset')
  assert.equal(serializeHeadset({ status: 'Working', notes: 'old format' }), 'Working | old format')
  assert.equal(serializeHeadset({ user: 'Juan', status: 'Needs Repair', notes: '' }), 'Juan | Needs Repair')
  assert.equal(serializeHeadset({ user: '', status: 'N/A', notes: '' }), 'N/A')
})
