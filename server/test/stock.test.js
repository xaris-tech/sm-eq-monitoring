const test = require('node:test')
const assert = require('node:assert/strict')

const { parseStockQuantity } = require('../lib/stock')

test('reads numeric stock values from Google Sheets', () => {
  assert.equal(parseStockQuantity(5), 5)
  assert.equal(parseStockQuantity('15'), 15)
})

test('reads the leading quantity from stock cells containing units and notes', () => {
  assert.equal(parseStockQuantity('1 pc'), 1)
  assert.equal(parseStockQuantity('1 set | Existing'), 1)
  assert.equal(parseStockQuantity('20 pcs'), 20)
})

test('uses zero for blank, invalid, or negative stock values', () => {
  assert.equal(parseStockQuantity(''), 0)
  assert.equal(parseStockQuantity('Existing'), 0)
  assert.equal(parseStockQuantity('-2 pcs'), 0)
})
