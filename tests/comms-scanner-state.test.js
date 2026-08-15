const test = require('node:test')
const assert = require('node:assert/strict')

const {
  createScanHistory,
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
