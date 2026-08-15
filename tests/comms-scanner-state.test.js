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
