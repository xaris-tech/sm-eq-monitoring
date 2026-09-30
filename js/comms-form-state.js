(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  root.CommsFormState = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FORM_STATE_VERSION = 1
  const ITEM_STATUSES = new Set(['Complete', 'Incomplete', 'N/A'])
  const MONITOR_TYPES = new Set(['', 'In-ear', 'Headset', 'N/A'])
  const HEADSET_STATUSES = new Set(['Working', 'Needs Repair', 'Needs Replacement', 'N/A'])
  const MAX_COUNT = 999

  function text(value) {
    return typeof value === 'string' ? value : ''
  }

  function pick(value, allowed, fallback) {
    return allowed.has(value) ? value : fallback
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
  }

  // A counted quantity is a whole number from 0 to MAX_COUNT, or null when not counted.
  function normalizeCount(value) {
    return Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null
  }

  // Counted items are Complete only when every expected unit is present.
  function statusForCount(count, expected) {
    return count >= expected ? 'Complete' : 'Incomplete'
  }

  function createEmptyFormState(itemIds, beltpackIds) {
    const items = {}
    itemIds.forEach(id => { items[id] = { status: 'Incomplete', notes: '', count: null } })

    const beltpacks = {}
    const headsets = {}
    beltpackIds.forEach(id => {
      beltpacks[id] = { user: '', monitor_type: '', notes: '' }
      headsets[id] = { user: '', status: 'Working', notes: '' }
    })

    return {
      version: FORM_STATE_VERSION,
      name: '',
      event: '',
      eventOther: '',
      items,
      beltpacks,
      headsets,
      scanHistory: { entries: [], cursor: -1, lastValue: '', lastAcceptedAt: 0 },
    }
  }

  function normalizeScanHistory(raw) {
    const empty = { entries: [], cursor: -1, lastValue: '', lastAcceptedAt: 0 }
    if (!isObject(raw) || !Array.isArray(raw.entries)) return empty

    const entries = raw.entries
      .filter(entry => isObject(entry) && text(entry.value) && text(entry.label))
      .map(entry => ({
        value: entry.value,
        label: entry.label,
        acceptedAt: Number.isFinite(entry.acceptedAt) ? entry.acceptedAt : 0,
      }))
    if (!entries.length) return empty

    const cursor = Number.isInteger(raw.cursor)
      ? Math.max(0, Math.min(entries.length - 1, raw.cursor))
      : entries.length - 1
    // The rapid-duplicate cooldown only matters within one camera session.
    return { entries, cursor, lastValue: '', lastAcceptedAt: 0 }
  }

  // Returns a complete, valid form state for the given inventory. Unknown
  // fields are dropped, missing or invalid ones fall back to the empty form.
  function normalizeFormState(raw, itemIds, beltpackIds) {
    const state = createEmptyFormState(itemIds, beltpackIds)
    if (!isObject(raw)) return state

    state.name = text(raw.name)
    state.event = text(raw.event)
    state.eventOther = state.event === 'Others' ? text(raw.eventOther) : ''

    const items = isObject(raw.items) ? raw.items : {}
    itemIds.forEach(id => {
      const item = isObject(items[id]) ? items[id] : {}
      state.items[id] = {
        status: pick(item.status, ITEM_STATUSES, 'Incomplete'),
        notes: text(item.notes),
        count: normalizeCount(item.count),
      }
    })

    const beltpacks = isObject(raw.beltpacks) ? raw.beltpacks : {}
    const headsets = isObject(raw.headsets) ? raw.headsets : {}
    beltpackIds.forEach(id => {
      const beltpack = isObject(beltpacks[id]) ? beltpacks[id] : {}
      state.beltpacks[id] = {
        user: text(beltpack.user),
        monitor_type: pick(beltpack.monitor_type, MONITOR_TYPES, ''),
        notes: text(beltpack.notes),
      }

      const headset = isObject(headsets[id]) ? headsets[id] : {}
      state.headsets[id] = ['In-ear', 'N/A'].includes(state.beltpacks[id].monitor_type)
        ? { user: '', status: 'N/A', notes: '' }
        : {
          user: text(headset.user),
          status: pick(headset.status, HEADSET_STATUSES, 'Working'),
          notes: text(headset.notes),
        }
    })

    state.scanHistory = normalizeScanHistory(raw.scanHistory)
    return state
  }

  // Lists what still blocks submission. items is COMMS_ITEMS ({ item_id, item_name }).
  // Each entry names the card to highlight: { section, id, label, message }.
  function findMissing(state, items, beltpackIds) {
    const missing = []
    items.forEach(({ item_id: id, item_name: name }) => {
      const item = state.items[id]
      const handled = item.status === 'Complete' || item.status === 'N/A' ||
        item.notes.trim() !== '' || item.count !== null
      if (!handled) missing.push({ section: 'item', id, label: name, message: 'mark Complete or N/A, or add a note saying what is wrong' })
    })
    beltpackIds.forEach(id => {
      const beltpack = state.beltpacks[id]
      if (!beltpack.monitor_type) {
        missing.push({ section: 'beltpack', id, label: `${id} Beltpack`, message: 'choose In-ear, Headset, or N/A' })
      } else if (beltpack.monitor_type !== 'N/A' && !beltpack.user.trim()) {
        missing.push({ section: 'beltpack', id, label: `${id} Beltpack`, message: 'enter the assigned name' })
      }
    })
    beltpackIds.forEach(id => {
      if (state.beltpacks[id].monitor_type === 'Headset' && !state.headsets[id].user.trim()) {
        missing.push({ section: 'headset', id, label: `${id} Headset`, message: 'enter the assigned name' })
      }
    })
    return missing
  }

  return { FORM_STATE_VERSION, MAX_COUNT, createEmptyFormState, normalizeFormState, normalizeCount, statusForCount, findMissing }
})
