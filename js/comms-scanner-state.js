(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  root.CommsScannerState = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DUPLICATE_COOLDOWN_MS = 2000

  function createScanHistory() {
    return { entries: [], cursor: -1, lastValue: '', lastAcceptedAt: 0 }
  }

  function isRapidDuplicate(history, value, scannedAt) {
    return value === history.lastValue && scannedAt - history.lastAcceptedAt < DUPLICATE_COOLDOWN_MS
  }

  function recordSuccessfulScan(history, entry, acceptedAt) {
    if (isRapidDuplicate(history, entry.value, acceptedAt)) return { accepted: false, history }

    const entries = [...history.entries, { ...entry, acceptedAt }]
    return {
      accepted: true,
      history: {
        entries,
        cursor: entries.length - 1,
        lastValue: entry.value,
        lastAcceptedAt: acceptedAt,
      },
    }
  }

  function moveScanHistory(history, direction) {
    if (!history.entries.length) return history
    const cursor = Math.max(0, Math.min(history.entries.length - 1, history.cursor + direction))
    return { ...history, cursor }
  }

  return { createScanHistory, isRapidDuplicate, recordSuccessfulScan, moveScanHistory }
})
