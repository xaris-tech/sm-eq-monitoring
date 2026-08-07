const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('every screen uses the SM browser title format and app favicon', () => {
  const expectedTitles = {
    'index.html': 'SM | Home',
    'borrow.html': 'SM | Borrow / Return Equipment',
    'comms-checklist.html': 'SM | Comms Checklist',
    'admin.html': 'SM | Admin',
    'equipment-qrs.html': 'SM | Equipment QR Codes',
    'test-qrs.html': 'SM | Test QR Codes',
  }

  Object.entries(expectedTitles).forEach(([file, title]) => {
    const html = read(file)
    assert.match(html, new RegExp(`<title>${title.replace(/[|/]/g, '\\$&')}</title>`))
    assert.match(html, /<link rel="icon" type="image\/png" href="SM-log\.png">/)
  })
})

test('admin exposes a Page QR Codes tab with both production destinations', () => {
  const html = read('admin.html')
  const script = read('js/admin.js')

  assert.match(html, /data-tab="pageQrTab"/)
  assert.match(html, /id="pageQrTab"/)
  assert.match(html, /id="borrowPageQr"/)
  assert.match(html, /id="commsChecklistPageQr"/)
  assert.match(script, /https:\/\/wlsm-equipment-monitoring\.vercel\.app\/borrow\.html/)
  assert.match(script, /https:\/\/wlsm-equipment-monitoring\.vercel\.app\/comms-checklist\.html/)
})

test('Borrow and Return scanning is the dominant action', () => {
  const landing = read('index.html')
  const borrow = read('borrow.html')
  const css = read('css/style.css')

  assert.match(landing, /Borrow\s*\/\s*Return <span>Equipment<\/span>/)
  assert.match(borrow, /<h1 class="transaction-title">BORROW EQUIPMENT<\/h1>/)
  assert.match(borrow, /<h1 class="transaction-title">RETURN EQUIPMENT<\/h1>/)
  assert.doesNotMatch(borrow, /Borrow mode|Return mode/)
  assert.match(borrow, /class="btn btn-primary scan-action" id="scanBorrowBtn"/)
  assert.match(borrow, /class="btn btn-primary scan-action" id="scanReturnBtn"/)
  assert.match(css, /\.scan-action\s*\{[^}]*min-height:\s*88px/s)
  assert.match(css, /\.scan-action\s*\{[^}]*font-size:\s*1\.25rem/s)
  assert.match(css, /\.scan-action \.lucide\s*\{[^}]*width:\s*32px/s)
})

test('Comms Checklist uses the same prominent heading and scan action', () => {
  const html = read('comms-checklist.html')

  assert.match(html, /<h1 class="workflow-title">COMMS CHECKLIST<\/h1>/)
  assert.match(html, /class="btn btn-primary scan-action" id="scanItemBtn"/)
})
