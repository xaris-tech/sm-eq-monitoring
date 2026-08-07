function clean(value) {
  return String(value || '').trim()
}

function serializeBeltpack(value) {
  if (typeof value === 'string') return clean(value) || 'N/A'
  if (!value || typeof value !== 'object') return 'N/A'

  const user = clean(value.user) || 'N/A'
  const monitorType = clean(value.monitor_type)
  if (user === 'N/A') return 'N/A'
  return [user, monitorType].filter(Boolean).join(' | ')
}

function serializeHeadset(value) {
  if (!value || typeof value !== 'object') return 'Working | '
  const user = clean(value.user)
  const status = clean(value.status) || 'Working'
  const notes = clean(value.notes)
  if (status === 'N/A' && !user) return 'N/A'
  return [user, status, notes].filter(Boolean).join(' | ')
}

module.exports = { serializeBeltpack, serializeHeadset }
