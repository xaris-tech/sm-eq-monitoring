(function (root, factory) {
  const api = factory(root.CommsFormState || (typeof require === 'function' ? require('./comms-form-state') : null))
  if (typeof module === 'object' && module.exports) module.exports = api
  root.CommsDraft = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CommsFormState) {
  const DRAFT_KEY = 'sm-comms-checklist-draft'
  const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000
  const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram/i

  function isEmptyDraft(state, itemIds, beltpackIds) {
    const empty = CommsFormState.createEmptyFormState(itemIds, beltpackIds)
    return JSON.stringify(state) === JSON.stringify(empty)
  }

  function serializeDraft(state, savedAt) {
    return JSON.stringify({ version: CommsFormState.FORM_STATE_VERSION, savedAt, state })
  }

  // Returns { state, savedAt } for a usable draft, or null when the stored
  // value is missing, corrupt, from another version, future-dated, or expired.
  function parseDraft(raw, now, itemIds, beltpackIds) {
    if (typeof raw !== 'string' || !raw) return null

    let draft
    try {
      draft = JSON.parse(raw)
    } catch (_) {
      return null
    }

    if (!draft || draft.version !== CommsFormState.FORM_STATE_VERSION) return null
    if (!Number.isFinite(draft.savedAt) || draft.savedAt > now) return null
    if (now - draft.savedAt > DRAFT_MAX_AGE_MS) return null

    const state = CommsFormState.normalizeFormState(draft.state, itemIds, beltpackIds)
    if (isEmptyDraft(state, itemIds, beltpackIds)) return null
    return { state, savedAt: draft.savedAt }
  }

  function isInAppBrowser(userAgent) {
    return IN_APP_BROWSER.test(String(userAgent || ''))
  }

  return { DRAFT_KEY, DRAFT_MAX_AGE_MS, isEmptyDraft, serializeDraft, parseDraft, isInAppBrowser }
})
