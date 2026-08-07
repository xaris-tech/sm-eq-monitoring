const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { requireAdmin } = require('../server/middleware/adminAuth')

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('admin routes fail closed when no server token is configured', () => {
  const previousToken = process.env.ADMIN_TOKEN
  delete process.env.ADMIN_TOKEN
  const res = responseRecorder()
  let calledNext = false

  requireAdmin({ headers: { authorization: 'Bearer attacker-controlled-token' } }, res, () => { calledNext = true })

  assert.equal(calledNext, false)
  assert.equal(res.statusCode, 503)
  assert.equal(res.body.error, 'Admin authentication is not configured')

  if (previousToken === undefined) delete process.env.ADMIN_TOKEN
  else process.env.ADMIN_TOKEN = previousToken
})

test('admin login has no hard-coded password fallback', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../server/routes/admin.js'), 'utf8')

  assert.match(source, /const ADMIN_PASSWORD = process\.env\.ADMIN_PASSWORD\s*$/m)
  assert.doesNotMatch(source, /process\.env\.ADMIN_PASSWORD\s*\|\|/)
  assert.match(source, /Admin authentication is not configured/)
})
