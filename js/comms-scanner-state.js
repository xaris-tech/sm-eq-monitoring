(function (root, factory) {
  const api = factory(root.CommsAssignment || (typeof require === 'function' ? require('./comms-assignment') : null))
  if (typeof module === 'object' && module.exports) module.exports = api
  root.CommsScannerState = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CommsAssignment) {
  const DUPLICATE_COOLDOWN_MS = 2000
  // A code must leave the camera's view this long before its notice repeats.
  const NOTICE_REPEAT_MS = 3000

  // Decides what a scan means against the current form state (see CommsFormState).
  function classifyScan(rawValue, formState) {
    const value = String(rawValue || '').trim()
    const assignment = CommsAssignment.parseAssignmentQr(value)

    if (assignment) {
      const beltpack = formState.beltpacks[assignment.id]
      if (assignment.kind === 'beltpack') {
        return beltpack.user.trim() || beltpack.monitor_type === 'N/A'
          ? { kind: 'already-assigned', value: value.toUpperCase(), assignment, current: beltpack }
          : { kind: 'assign', value: value.toUpperCase(), assignment }
      }
      if (CommsAssignment.isHeadsetDisabled(beltpack)) {
        return { kind: 'blocked', value: value.toUpperCase(), assignment }
      }
      const headset = formState.headsets[assignment.id]
      return headset.user.trim()
        ? { kind: 'already-assigned', value: value.toUpperCase(), assignment, current: headset }
        : { kind: 'assign', value: value.toUpperCase(), assignment }
    }

    const item = formState.items[value]
    if (!item) return { kind: 'unknown', value }
    return { kind: item.status === 'Complete' ? 'already-complete' : 'complete', value, itemId: value }
  }

  function createNoticeState() {
    return { value: '', seenAt: 0 }
  }

  // Every read of a code refreshes seenAt, so a code held in view stays quiet.
  function shouldAnnounce(noticeState, value, now) {
    const repeat = value === noticeState.value && now - noticeState.seenAt < NOTICE_REPEAT_MS
    return { announce: !repeat, noticeState: { value, seenAt: now } }
  }

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

  return {
    createScanHistory,
    isRapidDuplicate,
    recordSuccessfulScan,
    moveScanHistory,
    classifyScan,
    createNoticeState,
    shouldAnnounce,
  }
})
