(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  root.CommsAssignment = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const VALID_IDS = new Set(['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6', 'SM7', 'SM8'])
  const MONITOR_TYPES = new Set(['In-ear', 'Headset', 'N/A'])
  const HEADSET_STATUSES = new Set(['Working', 'Needs Repair', 'Needs Replacement', 'N/A'])

  function parseAssignmentQr(value) {
    const match = String(value || '').trim().toUpperCase().match(/^(BELTPACK|HEADSET):(SM\d+)$/)
    if (!match || !VALID_IDS.has(match[2])) return null
    return { kind: match[1].toLowerCase(), id: match[2] }
  }

  function requireName(name) {
    const user = String(name || '').trim()
    if (!user) throw new Error('Assigned name is required')
    return user
  }

  function createBeltpackAssignment(name, monitorType, notes = '') {
    if (!MONITOR_TYPES.has(monitorType)) throw new Error('A valid monitor type is required')
    // An unused (N/A) beltpack has nobody assigned.
    const user = monitorType === 'N/A' ? '' : requireName(name)
    return { user, monitor_type: monitorType, notes: String(notes || '').trim() }
  }

  function isBeltpackUnused(beltpack) {
    return beltpack?.monitor_type === 'N/A'
  }

  function createHeadsetAssignment(name, status, notes = '') {
    const user = requireName(name)
    if (!HEADSET_STATUSES.has(status)) throw new Error('A valid headset status is required')
    return { user, status, notes: String(notes || '').trim() }
  }

  // The paired headset is not used when its beltpack is In-ear or not used at all.
  function isHeadsetDisabled(beltpack) {
    return beltpack?.monitor_type === 'In-ear' || isBeltpackUnused(beltpack)
  }

  function headsetDisabledReason(id, beltpack) {
    return isBeltpackUnused(beltpack) ? `${id} Beltpack is N/A` : `${id} Beltpack uses In-ear`
  }

  return {
    parseAssignmentQr,
    createBeltpackAssignment,
    createHeadsetAssignment,
    isHeadsetDisabled,
    isBeltpackUnused,
    headsetDisabledReason,
  }
})
