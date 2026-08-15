function parseStockQuantity(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : 0
  }

  const match = String(value ?? '').trim().match(/^([0-9][0-9,]*(?:\.[0-9]+)?)/)
  if (!match) return 0

  const quantity = Number(match[1].replaceAll(',', ''))
  return Number.isFinite(quantity) ? quantity : 0
}

module.exports = { parseStockQuantity }
