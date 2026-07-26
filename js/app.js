let currentMode = 'borrow'
let scannedEquipment = []
let returnEquipment = []
let html5Scanner = null
let clockInterval = null
let borrowBtnHTML = ''
let returnBtnHTML = ''

function setError(msg) {

  const el = document.getElementById('errorMsg')
  if (msg) {
    el.textContent = msg
    el.classList.add('visible')
  } else {
    el.classList.remove('visible')
    el.textContent = ''
  }
}

function startClock(elementId) {
  function tick() {
    const now = new Date()
    const el = document.getElementById(elementId)
    el.innerHTML = `<i data-lucide="clock"></i> ${now.toLocaleString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })}`
    lucide.createIcons()
  }
  tick()
  if (clockInterval) clearInterval(clockInterval)
  clockInterval = setInterval(tick, 1000)
}

function showSection(id) {
  setError(null)
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

function renderEquipmentList(list, containerId, mode) {
  const container = document.getElementById(containerId)
  if (!list.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="search"></i></div><p>No equipment scanned yet. Tap the scanner button above.</p></div>'
    lucide.createIcons()
    return
  }

  container.innerHTML = list.map((item, i) => {
    const isConsumable = (item.type || '').toLowerCase() === 'consumable'
    const typeIcon = isConsumable ? 'package' : 'tool'
    const typeLabel = isConsumable ? 'Consumable' : 'Non-Consumable'
    const stockInfo = isConsumable ? `<span class="equipment-chip-stock">Stock: ${item.stock}</span>` : ''
    return `
    <div class="equipment-chip" role="listitem" data-type="${typeLabel}">
      <div class="equipment-chip-info">
        <span class="equipment-chip-name"><i data-lucide="${typeIcon}" style="width:14px;height:14px;margin-right:4px"></i>${escapeHtml(item.item_name)}</span>
        <span class="equipment-chip-id">${escapeHtml(item.item_id)} · ${typeLabel}</span>
        ${stockInfo}
      </div>
      ${mode === 'borrow' && isConsumable ? `
        <div class="equipment-chip-qty">
          <label>Qty:</label>
          <input type="number" class="qty-input" value="${item._quantity || 1}" min="1" max="${item.stock || 999}" onchange="updateItemQuantity(${i}, this.value)">
        </div>
      ` : ''}
      <button class="equipment-chip-remove" onclick="removeEquipment(${i}, '${mode}')" aria-label="Remove ${escapeHtml(item.item_name)}"><i data-lucide="x"></i></button>
    </div>
  `}).join('')
  lucide.createIcons()
}

function updateItemQuantity(index, value) {
  if (scannedEquipment[index]) {
    scannedEquipment[index]._quantity = parseInt(value) || 1
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function removeEquipment(index, mode) {
  if (mode === 'borrow') {
    scannedEquipment.splice(index, 1)
    renderEquipmentList(scannedEquipment, 'borrowList', 'borrow')
    updateSubmitBtn('borrow')
  } else {
    returnEquipment.splice(index, 1)
    renderEquipmentList(returnEquipment, 'returnList', 'return')
    updateSubmitBtn('return')
  }
}

function updateSubmitBtn(mode) {
  document.getElementById(mode === 'borrow' ? 'submitBorrowBtn' : 'submitReturnBtn').disabled =
    (mode === 'borrow' ? scannedEquipment : returnEquipment).length === 0
}

function showScanner(mode) {
  setError(null)
  const overlay = document.getElementById('scannerOverlay')
  overlay.classList.remove('hidden')

  if (html5Scanner) html5Scanner.clear()

  html5Scanner = new Html5Qrcode('scanner-container')
  html5Scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => handleScan(decodedText, mode),
    () => {}
  )
}

function handleScan(decodedText, mode) {
  if (html5Scanner) {
    html5Scanner.stop().then(() => { html5Scanner.clear(); html5Scanner = null }).catch(() => {})
  }

  document.getElementById('scannerOverlay').classList.add('hidden')

  const equipment = findEquipmentByItemId(decodedText.trim())
  if (!equipment) {
    setError(`Unknown equipment: ${decodedText.trim()}. Add it in the admin panel first.`)
    return
  }

  if (mode === 'return' && (equipment.type || '').toLowerCase() === 'consumable') {
    setError(`"${equipment.item_name}" is a consumable item and cannot be returned. Consumables are not returned after use.`)
    return
  }

  if (mode === 'borrow' && equipment.type === 'Consumable' && equipment.stock === 0) {
    setError(`"${equipment.item_name}" is out of stock. Cannot borrow.`)
    return
  }

  const list = mode === 'borrow' ? scannedEquipment : returnEquipment
  if (list.find(e => e.item_id === equipment.item_id)) {
    setError(`${equipment.item_name} is already in the list.`)
    return
  }

  const entry = { ...equipment }
  if (mode === 'borrow' && (equipment.type || '').toLowerCase() === 'consumable') {
    entry._quantity = 1
  }
  list.push(entry)
  renderEquipmentList(list, mode === 'borrow' ? 'borrowList' : 'returnList', mode)
  updateSubmitBtn(mode)
}

function findEquipmentByItemId(item_id) {
  if (typeof equipmentCache !== 'undefined' && equipmentCache.length) {
    return equipmentCache.find(e => e.item_id === item_id) || null
  }
  return null
}

let equipmentCache = []

async function loadEquipmentCache() {
  try {
    const result = await getEquipment()
    if (result.equipment) equipmentCache = result.equipment
  } catch (e) {
    equipmentCache = []
  }
}

function setBtnLoading(btn, loading) {
  if (loading) {
    btn._origHTML = btn.innerHTML
    btn.innerHTML = '<i data-lucide="loader-circle" class="lucide-spin"></i> Processing...'
    btn.disabled = true
  } else {
    btn.innerHTML = btn._origHTML || btn.innerHTML
    btn.disabled = false
  }
  lucide.createIcons()
}

function validateBeforeSubmit(nameFieldId, list, label) {
  const name = document.getElementById(nameFieldId).value.trim()
  if (!name) {
    setError('Please enter your full name.')
    document.getElementById(nameFieldId).focus()
    return null
  }
  if (!list.length) {
    setError(`Please scan at least one equipment to ${label}.`)
    return null
  }
  return name
}

async function submitAction(nameFieldId, list, label, submitFn, mode) {
  const name = validateBeforeSubmit(nameFieldId, list, label)
  if (!name) return

  const btnId = mode === 'borrow' ? 'submitBorrowBtn' : 'submitReturnBtn'
  const btn = document.getElementById(btnId)
  setError(null)
  setBtnLoading(btn, true)

  try {
    const result = await submitFn(name, list, new Date().toISOString())
    if (result.success) {
      showConfirm(mode, name, list)
    } else {
      setError(result.error || 'Server error. Try again.')
      setBtnLoading(btn, false)
    }
  } catch (e) {
    setError('Network error. Check your connection and API URL.')
    setBtnLoading(btn, false)
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  borrowBtnHTML = document.getElementById('submitBorrowBtn').innerHTML
  returnBtnHTML = document.getElementById('submitReturnBtn').innerHTML

  startClock('borrowTime')
  await loadEquipmentCache()

  document.getElementById('switchToReturn').addEventListener('click', () => {
    currentMode = 'return'
    showSection('returnSection')
    startClock('returnTime')
  })

  document.getElementById('switchToBorrow').addEventListener('click', () => {
    currentMode = 'borrow'
    showSection('borrowSection')
    startClock('borrowTime')
  })

  document.getElementById('scanBorrowBtn').addEventListener('click', () => showScanner('borrow'))
  document.getElementById('scanReturnBtn').addEventListener('click', () => showScanner('return'))

  document.getElementById('scannerCloseBtn').addEventListener('click', () => {
    if (html5Scanner) {
      html5Scanner.stop().then(() => { html5Scanner.clear(); html5Scanner = null }).catch(() => {})
    }
    document.getElementById('scannerOverlay').classList.add('hidden')
  })

  document.getElementById('submitBorrowBtn').addEventListener('click', () => {
    submitAction('borrowName', scannedEquipment, 'borrow', submitBorrow, 'borrow')
  })

  document.getElementById('submitReturnBtn').addEventListener('click', () => {
    submitAction('returnName', returnEquipment, 'return', submitReturn, 'return')
  })

  document.getElementById('confirmBackBtn').addEventListener('click', () => {
    scannedEquipment = []
    returnEquipment = []
    document.getElementById('borrowName').value = ''
    document.getElementById('returnName').value = ''
    renderEquipmentList([], 'borrowList', 'borrow')
    renderEquipmentList([], 'returnList', 'return')
    updateSubmitBtn('borrow')
    updateSubmitBtn('return')
    setError(null)
    currentMode = 'borrow'
    showSection('borrowSection')
    startClock('borrowTime')
  })
})

function showConfirm(type, name, items) {
  const title = type === 'borrow' ? 'Equipment Borrowed' : 'Equipment Returned'
  document.getElementById('confirmTitle').textContent = title
  document.getElementById('confirmMessage').textContent = type === 'borrow'
    ? `${items.length} item(s) borrowed by ${name}.`
    : `${items.length} item(s) returned by ${name}.`

  const now = new Date().toLocaleString('en-PH')
  const itemList = items.map(i => {
    const isConsumable = (i.type || '').toLowerCase() === 'consumable'
    const qty = i._quantity || 1
    const suffix = type === 'borrow' && isConsumable ? ` x${qty} (consumed)` : ''
    return `${escapeHtml(i.item_name)}${suffix}`
  }).join(', ')
  const totalConsumableQty = type === 'borrow'
    ? items.filter(i => (i.type || '').toLowerCase() === 'consumable').reduce((s, i) => s + (i._quantity || 1), 0)
    : 0
  document.getElementById('confirmDetails').innerHTML = `
    <div><span>Name</span><span>${escapeHtml(name)}</span></div>
    <div><span>Time</span><span>${now}</span></div>
    <div><span>Items</span><span>${itemList}</span></div>
    <div><span>Status</span><span>${type === 'borrow' ? 'Borrowed' : 'Returned'}</span></div>
    ${totalConsumableQty > 0 ? `<div><span>Total Consumed</span><span>${totalConsumableQty} unit(s)</span></div>` : ''}
  `

  showSection('confirmSection')
}
