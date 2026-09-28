const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const {
  createScanHistory,
  isRapidDuplicate,
  recordSuccessfulScan,
  moveScanHistory,
} = require('../js/comms-scanner-state')

test('successful scans append in any order and select the newest entry', () => {
  let history = createScanHistory()
  history = recordSuccessfulScan(history, { value: 'COMMS-BASE-01', label: 'Base Station' }, 1000).history
  history = recordSuccessfulScan(history, { value: 'BELTPACK:SM4', label: 'SM4 Beltpack' }, 3000).history

  assert.deepEqual(history.entries.map(entry => entry.value), ['COMMS-BASE-01', 'BELTPACK:SM4'])
  assert.equal(history.cursor, 1)
})

test('rapid duplicate camera reads are ignored', () => {
  let history = createScanHistory()
  history = recordSuccessfulScan(history, { value: 'COMMS-BASE-01', label: 'Base Station' }, 1000).history

  const duplicate = recordSuccessfulScan(
    history,
    { value: 'COMMS-BASE-01', label: 'Base Station' },
    1800
  )

  assert.equal(duplicate.accepted, false)
  assert.equal(duplicate.history.entries.length, 1)
  assert.equal(isRapidDuplicate(history, 'COMMS-BASE-01', 1800), true)
  assert.equal(isRapidDuplicate(history, 'COMMS-BASE-01', 3001), false)
})

test('the same QR can be recorded again after the duplicate cooldown', () => {
  let history = createScanHistory()
  history = recordSuccessfulScan(history, { value: 'HEADSET:SM2', label: 'SM2 Headset' }, 1000).history

  const repeatedLater = recordSuccessfulScan(
    history,
    { value: 'HEADSET:SM2', label: 'SM2 Headset' },
    3001
  )

  assert.equal(repeatedLater.accepted, true)
  assert.equal(repeatedLater.history.entries.length, 2)
})

test('previous and next navigate scan history without moving past its bounds', () => {
  let history = createScanHistory()
  history = recordSuccessfulScan(history, { value: 'COMMS-BASE-01', label: 'Base Station' }, 1000).history
  history = recordSuccessfulScan(history, { value: 'BELTPACK:SM1', label: 'SM1 Beltpack' }, 3000).history

  history = moveScanHistory(history, -1)
  assert.equal(history.cursor, 0)
  history = moveScanHistory(history, -1)
  assert.equal(history.cursor, 0)
  history = moveScanHistory(history, 1)
  assert.equal(history.cursor, 1)
  history = moveScanHistory(history, 1)
  assert.equal(history.cursor, 1)
})

test('Comms scanner exposes continuous controls and scan-history feedback', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')

  assert.match(html, /js\/comms-scanner-state\.js/)
  assert.match(html, /id="scannerExitBtn"/)
  assert.match(html, /id="scannerPreviousBtn"/)
  assert.match(html, /id="scannerNextBtn"/)
  assert.match(html, /id="scannerHistoryStatus"[^>]*aria-live="polite"/)
})

test('scan routing keeps the camera session alive and resumes after assignment prompts', () => {
  const root = path.resolve(__dirname, '..')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')
  const handleScanBody = script.match(/function handleScan\(decodedText\) \{([\s\S]*?)\n\}/)?.[1] ?? ''

  assert.doesNotMatch(handleScanBody, /hideScanner\(/)
  assert.match(handleScanBody, /if \(scanProcessing\) return/)
  assert.match(handleScanBody, /pauseScanner\(/)
  assert.match(script, /resumeScanner\(/)
  assert.match(script, /recordCompletedScan\(/)
})

test('successful Comms scans provide sound, vibration, and a brief pause', () => {
  const root = path.resolve(__dirname, '..')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(script, /function playScanSuccessFeedback\(\)/)
  assert.match(script, /AudioContext/)
  assert.match(script, /oscillator\.start\(\)/)
  assert.match(script, /navigator\.vibrate\(/)
  assert.match(script, /resumeScanner\(1000\)/)
})

test('Exit still closes the overlay when the camera never started', () => {
  const root = path.resolve(__dirname, '..')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')
  const hideScannerBody = script.match(/function hideScanner\(\) \{([\s\S]*?)\n\}/)?.[1] ?? ''

  assert.match(hideScannerBody, /try \{[\s\S]*scannerToStop\.stop\(\)/)
  assert.match(hideScannerBody, /scannerOverlay[^\n]*classList\.add\('hidden'\)/)
})

const { classifyScan, createNoticeState, shouldAnnounce } = require('../js/comms-scanner-state')
const { createEmptyFormState } = require('../js/comms-form-state')

function scanFormState() {
  const state = createEmptyFormState(['COMMS-BASE-01', 'COMMS-ANTENNA-01'], ['SM1', 'SM2', 'SM3'])
  state.items['COMMS-BASE-01'].status = 'Complete'
  state.beltpacks.SM1 = { user: 'Juan', monitor_type: 'Headset', notes: '' }
  state.headsets.SM1 = { user: 'Juan', status: 'Working', notes: '' }
  state.beltpacks.SM2 = { user: 'Ana', monitor_type: 'In-ear', notes: '' }
  state.headsets.SM2 = { user: '', status: 'N/A', notes: '' }
  return state
}

test('scans are classified against the current checklist state', () => {
  const state = scanFormState()
  const kind = value => classifyScan(value, state).kind

  assert.equal(kind('COMMS-ANTENNA-01'), 'complete')
  assert.equal(kind('COMMS-BASE-01'), 'already-complete')
  assert.equal(kind('BELTPACK:SM3'), 'assign')
  assert.equal(kind('beltpack:sm1'), 'already-assigned')
  assert.equal(kind('HEADSET:SM3'), 'assign')
  assert.equal(kind('HEADSET:SM1'), 'already-assigned')
  assert.equal(kind('HEADSET:SM2'), 'blocked')
  assert.equal(kind('COMMS-NOPE-99'), 'unknown')
  assert.equal(kind('BELTPACK:SM9'), 'unknown')
})

test('an item set back to Incomplete completes again when re-scanned', () => {
  const state = scanFormState()
  state.items['COMMS-BASE-01'].status = 'Incomplete'

  assert.equal(classifyScan('COMMS-BASE-01', state).kind, 'complete')
})

test('already-assigned scans carry the current assignment for the notice', () => {
  const result = classifyScan('BELTPACK:SM2', scanFormState())

  assert.equal(result.value, 'BELTPACK:SM2')
  assert.deepEqual(result.assignment, { kind: 'beltpack', id: 'SM2' })
  assert.equal(result.current.user, 'Ana')
  assert.equal(result.current.monitor_type, 'In-ear')
})

test('a notice is announced once while its code stays in view', () => {
  let notice = createNoticeState()
  let result = shouldAnnounce(notice, 'COMMS-BASE-01', 1000)
  assert.equal(result.announce, true)

  for (const at of [1100, 2500, 4000, 6900]) {
    result = shouldAnnounce(result.noticeState, 'COMMS-BASE-01', at)
    assert.equal(result.announce, false, `held in view at ${at}`)
  }

  result = shouldAnnounce(result.noticeState, 'COMMS-BASE-01', 6900 + 3000)
  assert.equal(result.announce, true, 'announced again after leaving view')

  notice = shouldAnnounce(result.noticeState, 'BELTPACK:SM1', 10000)
  assert.equal(notice.announce, true, 'a different code is announced immediately')
})

test('re-scans show an already-scanned notice with an Edit action', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(html, /id="scannerEditBtn"/)
  assert.match(script, /CommsScannerState\.classifyScan\(/)
  assert.match(script, /already scanned/)
  assert.match(script, /already assigned to/)
})
