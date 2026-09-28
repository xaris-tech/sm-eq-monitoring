const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')

function loadConfig() {
  const context = {}
  vm.runInNewContext(`${fs.readFileSync(path.join(root, 'js/config.js'), 'utf8')}
    this.COMMS_ITEMS = COMMS_ITEMS; this.COMMS_PHOTOS = COMMS_PHOTOS`, context)
  return context
}

test('every comms item, the beltpack, and the headset have a reference photo slot', () => {
  const { COMMS_ITEMS, COMMS_PHOTOS } = loadConfig()
  // In-ear monitors are personal equipment, so they have no reference photo.
  const expected = [...COMMS_ITEMS.map(i => i.item_id), 'BELTPACK', 'HEADSET']

  assert.deepEqual(Object.keys(COMMS_PHOTOS).sort(), expected.sort())
  Object.values(COMMS_PHOTOS).forEach(src => assert.equal(typeof src, 'string'))
})

test('configured photo paths point at files that exist', () => {
  const { COMMS_PHOTOS } = loadConfig()
  Object.entries(COMMS_PHOTOS).filter(([, src]) => src).forEach(([key, src]) => {
    assert.ok(fs.existsSync(path.join(root, src)), `${key}: ${src} is missing`)
  })
})

test('the checklist shows thumbnails or placeholders and a closable viewer', () => {
  const html = fs.readFileSync(path.join(root, 'comms-checklist.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'js/comms-checklist.js'), 'utf8')

  assert.match(script, /No photo yet/)
  assert.match(script, /loading="lazy"/)
  assert.match(script, /photoThumb\(COMMS_PHOTOS\[item\.item_id\], item\.item_name\)/)
  assert.match(script, /addEventListener\('error', handlePhotoError, true\)/)
  assert.match(script, /e\.key === 'Escape'/)
  assert.doesNotMatch(html, /data-reference-photo="IN-EAR"/)
  for (const key of ['BELTPACK', 'HEADSET']) {
    assert.match(html, new RegExp(`data-reference-photo="${key}"`))
  }
  assert.match(html, /id="photoViewer"[^>]*role="dialog"/)
  assert.match(html, /id="photoViewerCloseBtn"/)
})
