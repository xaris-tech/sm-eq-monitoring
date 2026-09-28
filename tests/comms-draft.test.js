const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { createEmptyFormState } = require('../js/comms-form-state')
const {
  DRAFT_MAX_AGE_MS,
  isEmptyDraft,
  serializeDraft,
  parseDraft,
  isInAppBrowser,
} = require('../js/comms-draft')

const ITEM_IDS = ['COMMS-BASE-01', 'COMMS-ANTENNA-01']
const BELTPACK_IDS = ['SM1', 'SM2']
const NOW = Date.UTC(2026, 8, 28, 1, 0, 0)

function filledState() {
  const state = createEmptyFormState(ITEM_IDS, BELTPACK_IDS)
  state.name = 'Juan'
  state.items['COMMS-BASE-01'] = { status: 'Complete', notes: 'knob loose', count: null }
  state.beltpacks.SM2 = { user: 'Ana', monitor_type: 'In-ear', notes: '' }
  state.headsets.SM2 = { user: '', status: 'N/A', notes: '' }
  return state
}

test('a saved draft restores with its saved time', () => {
  const raw = serializeDraft(filledState(), NOW - 60_000)
  const draft = parseDraft(raw, NOW, ITEM_IDS, BELTPACK_IDS)

  assert.deepEqual(draft.state, filledState())
  assert.equal(draft.savedAt, NOW - 60_000)
})

test('drafts older than 12 hours are discarded', () => {
  const fresh = serializeDraft(filledState(), NOW - DRAFT_MAX_AGE_MS)
  const stale = serializeDraft(filledState(), NOW - DRAFT_MAX_AGE_MS - 1)

  assert.notEqual(parseDraft(fresh, NOW, ITEM_IDS, BELTPACK_IDS), null)
  assert.equal(parseDraft(stale, NOW, ITEM_IDS, BELTPACK_IDS), null)
})

test('corrupt, missing, versionless, and future-dated drafts are ignored', () => {
  const inputs = [
    null,
    '',
    '{not json',
    'null',
    '[]',
    JSON.stringify({ savedAt: NOW, state: filledState() }),
    JSON.stringify({ version: 99, savedAt: NOW, state: filledState() }),
    JSON.stringify({ version: 1, savedAt: 'yesterday', state: filledState() }),
    serializeDraft(filledState(), NOW + 60_000),
  ]
  for (const raw of inputs) {
    assert.equal(parseDraft(raw, NOW, ITEM_IDS, BELTPACK_IDS), null, String(raw))
  }
})

test('a draft with nothing filled in is not restored', () => {
  const empty = createEmptyFormState(ITEM_IDS, BELTPACK_IDS)

  assert.equal(isEmptyDraft(empty, ITEM_IDS, BELTPACK_IDS), true)
  assert.equal(isEmptyDraft(filledState(), ITEM_IDS, BELTPACK_IDS), false)
  assert.equal(parseDraft(serializeDraft(empty, NOW), NOW, ITEM_IDS, BELTPACK_IDS), null)
})

test('stored drafts are re-validated on restore', () => {
  const tampered = JSON.stringify({
    version: 1,
    savedAt: NOW,
    state: { name: 'Juan', items: { 'COMMS-BASE-01': { status: 'Hacked' } } },
  })
  const draft = parseDraft(tampered, NOW, ITEM_IDS, BELTPACK_IDS)

  assert.equal(draft.state.name, 'Juan')
  assert.equal(draft.state.items['COMMS-BASE-01'].status, 'Incomplete')
})

test('in-app browsers are detected from the user agent', () => {
  const inApp = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/450.0]',
    'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/470.0]',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36 Instagram 350.0.0',
  ]
  const regular = [
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    '',
  ]
  inApp.forEach(ua => assert.equal(isInAppBrowser(ua), true, ua))
  regular.forEach(ua => assert.equal(isInAppBrowser(ua), false, ua))
})

test('the checklist page restores drafts and guards every storage access', () => {
  const root = path.resolve(__dirname, '..')
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(html, /js\/comms-draft\.js/)
  assert.match(html, /id="draftBar"/)
  assert.match(html, /id="draftStartOverBtn"/)
  assert.match(html, /id="inAppBrowserNote"/)

  const storageCalls = script.match(/localStorage\.\w+\(/g) || []
  assert.ok(storageCalls.length >= 3)
  for (const fn of ['readStoredDraft', 'writeStoredDraft', 'clearStoredDraft']) {
    const body = script.match(new RegExp(`function ${fn}\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ''
    assert.match(body, /try \{[\s\S]*localStorage/, fn)
  }
})
