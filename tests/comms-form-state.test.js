const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { createEmptyFormState, normalizeFormState } = require('../js/comms-form-state')

const ITEM_IDS = ['COMMS-BASE-01', 'COMMS-ANTENNA-01']
const BELTPACK_IDS = ['SM1', 'SM2']

test('empty form state matches a fresh checklist', () => {
  const state = createEmptyFormState(ITEM_IDS, BELTPACK_IDS)

  assert.equal(state.name, '')
  assert.deepEqual(state.items['COMMS-BASE-01'], { status: 'Incomplete', notes: '' })
  assert.deepEqual(state.beltpacks.SM1, { user: '', monitor_type: '', notes: '' })
  assert.deepEqual(state.headsets.SM2, { user: '', status: 'Working', notes: '' })
  assert.deepEqual(state.scanHistory.entries, [])
  assert.equal(state.scanHistory.cursor, -1)
})

test('a valid snapshot round-trips unchanged', () => {
  const snapshot = createEmptyFormState(ITEM_IDS, BELTPACK_IDS)
  snapshot.name = 'Juan'
  snapshot.event = 'Others'
  snapshot.eventOther = 'Christmas Program'
  snapshot.items['COMMS-BASE-01'] = { status: 'Complete', notes: 'loose knob' }
  snapshot.items['COMMS-ANTENNA-01'] = { status: 'N/A', notes: '' }
  snapshot.beltpacks.SM1 = { user: 'Maria', monitor_type: 'Headset', notes: '' }
  snapshot.headsets.SM1 = { user: 'Maria', status: 'Needs Repair', notes: 'cracked band' }
  snapshot.scanHistory = {
    entries: [
      { value: 'COMMS-BASE-01', label: 'Base Station', acceptedAt: 1000 },
      { value: 'BELTPACK:SM1', label: 'SM1 Beltpack', acceptedAt: 4000 },
    ],
    cursor: 0,
    lastValue: '',
    lastAcceptedAt: 0,
  }

  const json = JSON.parse(JSON.stringify(snapshot))
  assert.deepEqual(normalizeFormState(json, ITEM_IDS, BELTPACK_IDS), snapshot)
})

test('an In-ear beltpack forces its paired headset to N/A', () => {
  const state = normalizeFormState({
    beltpacks: { SM2: { user: 'Ana', monitor_type: 'In-ear' } },
    headsets: { SM2: { user: 'Ana', status: 'Working', notes: 'should be dropped' } },
  }, ITEM_IDS, BELTPACK_IDS)

  assert.deepEqual(state.headsets.SM2, { user: '', status: 'N/A', notes: '' })
  assert.deepEqual(state.headsets.SM1, { user: '', status: 'Working', notes: '' })
})

test('missing, unknown, and invalid fields fall back to the empty form', () => {
  const state = normalizeFormState({
    name: 42,
    event: 'Sunday Service',
    eventOther: 'ignored unless Others',
    injected: '<script>',
    items: {
      'COMMS-BASE-01': { status: 'Done', notes: ['x'] },
      'COMMS-UNKNOWN-01': { status: 'Complete' },
    },
    beltpacks: { SM1: { user: 'Leo', monitor_type: 'Earbuds' }, SM9: { user: 'x' } },
    headsets: { SM1: { status: 'Broken' } },
    scanHistory: { entries: [{ value: 'COMMS-BASE-01' }, 'junk'], cursor: 7 },
  }, ITEM_IDS, BELTPACK_IDS)

  assert.equal(state.name, '')
  assert.equal(state.eventOther, '')
  assert.equal(state.injected, undefined)
  assert.deepEqual(state.items['COMMS-BASE-01'], { status: 'Incomplete', notes: '' })
  assert.equal(state.items['COMMS-UNKNOWN-01'], undefined)
  assert.deepEqual(state.beltpacks.SM1, { user: 'Leo', monitor_type: '', notes: '' })
  assert.equal(state.beltpacks.SM9, undefined)
  assert.equal(state.headsets.SM1.status, 'Working')
  assert.deepEqual(state.scanHistory.entries, [])
  assert.equal(state.scanHistory.cursor, -1)
})

test('non-object input yields the empty form', () => {
  const empty = createEmptyFormState(ITEM_IDS, BELTPACK_IDS)
  for (const raw of [null, undefined, 'text', 5, []]) {
    assert.deepEqual(normalizeFormState(raw, ITEM_IDS, BELTPACK_IDS), empty)
  }
})

test('scan history cursor is clamped to the restored entries', () => {
  const state = normalizeFormState({
    scanHistory: {
      entries: [{ value: 'COMMS-BASE-01', label: 'Base Station', acceptedAt: 1 }],
      cursor: 9,
    },
  }, ITEM_IDS, BELTPACK_IDS)

  assert.equal(state.scanHistory.cursor, 0)
})

test('the checklist page captures and applies form state through one seam', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(html, /js\/comms-form-state\.js/)
  assert.match(script, /function captureFormState\(\)/)
  assert.match(script, /function applyFormState\(state\)/)
  assert.match(script, /function resetForm\(\) \{[\s\S]*?applyFormState\(/)
})
