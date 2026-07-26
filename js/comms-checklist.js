let clockInterval = null
let checklistState = {}
let html5Scanner = null

function escapeHtml(str) {
  const d = document.createElement('div')
  d.textContent = str
  return d.innerHTML
}

function findCommsItem(itemId) {
  return COMMS_ITEMS.find(i => i.item_id === itemId) || null
}

function showScanner() {
  setError(null)
  const overlay = document.getElementById('scannerOverlay')
  overlay.classList.remove('hidden')

  if (html5Scanner) html5Scanner.clear()

  html5Scanner = new Html5Qrcode('scanner-container')
  html5Scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => handleScan(decodedText),
    () => {}
  )
}

function hideScanner() {
  if (html5Scanner) {
    html5Scanner.stop().then(() => { html5Scanner.clear(); html5Scanner = null }).catch(() => {})
  }
  document.getElementById('scannerOverlay').classList.add('hidden')
}

function handleScan(decodedText) {
  hideScanner()

  const item = findCommsItem(decodedText.trim())
  if (!item) {
    setError(`Unknown comms item: ${decodedText.trim()}`)
    return
  }

  const completeBtn = document.querySelector(`#checklist-${item.item_id} .status-btn[data-value="Complete"]`)
  if (completeBtn) {
    completeBtn.click()
    setError(null)
  }
}

function startClock(id) {
  function tick() {
    const now = new Date()
    const el = document.getElementById(id)
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
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

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

function populateEventDropdown() {
  const select = document.getElementById('eventSelect')
  select.innerHTML = '<option value="">-- Select Event --</option>' +
    COMMS_EVENTS.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('')

  select.addEventListener('change', () => {
    const field = document.getElementById('otherEventField')
    if (select.value === 'Others') {
      field.classList.remove('hidden')
      document.getElementById('otherEvent').focus()
    } else {
      field.classList.add('hidden')
      document.getElementById('otherEvent').value = ''
    }
  })
}

function buildChecklist() {
  const container = document.getElementById('checklistContainer')
  COMMS_ITEMS.forEach(item => {
    checklistState[item.item_id] = 'Incomplete'
    const div = document.createElement('div')
    div.className = 'checklist-item'
    div.id = `checklist-${item.item_id}`
    div.innerHTML = `
      <div class="checklist-item-header">
        <div class="checklist-item-info">
          <div class="checklist-item-name">${escapeHtml(item.item_name)}</div>
          <div class="checklist-item-spec">${escapeHtml(item.spec)}</div>
        </div>
        <div class="status-group">
          <button class="status-btn" data-id="${item.item_id}" data-value="Complete">Complete</button>
          <button class="status-btn selected-incomplete" data-id="${item.item_id}" data-value="Incomplete">Incomplete</button>
          <button class="status-btn" data-id="${item.item_id}" data-value="N/A">N/A</button>
        </div>
      </div>
      <div class="checklist-item-notes" id="notes-${item.item_id}">
        <input type="text" placeholder="Notes (optional)" data-id="${item.item_id}">
      </div>
    `
    container.appendChild(div)
  })

  container.addEventListener('click', e => {
    const btn = e.target.closest('.status-btn')
    if (!btn) return

    const id = btn.dataset.id
    const value = btn.dataset.value
    checklistState[id] = value

    const group = btn.closest('.status-group')
    group.querySelectorAll('.status-btn').forEach(b => {
      b.className = 'status-btn'
    })
    btn.classList.add(`selected-${value.toLowerCase()}`)

    const notesField = document.getElementById(`notes-${id}`)
    if (value === 'N/A') {
      notesField.classList.remove('visible')
    } else {
      notesField.classList.add('visible')
    }
  })
}

function buildBeltpacks() {
  const container = document.getElementById('beltpackContainer')
  BELTPACK_IDS.forEach(id => {
    const div = document.createElement('div')
    div.className = 'beltpack-field'
    div.innerHTML = `
      <span class="beltpack-label">${id}</span>
      <input type="text" id="beltpack-${id}" placeholder="N/A" data-beltpack="${id}">
    `
    container.appendChild(div)
  })
}

function buildHeadsets() {
  const container = document.getElementById('headsetContainer')
  BELTPACK_IDS.forEach(id => {
    const div = document.createElement('div')
    div.className = 'headset-item'
    div.innerHTML = `
      <div class="headset-row">
        <span class="headset-label">${id}</span>
        <select id="headset-status-${id}">
          <option value="Working">Working</option>
          <option value="Needs Repair">Needs Repair</option>
          <option value="Needs Replacement">Needs Replacement</option>
          <option value="N/A">N/A</option>
        </select>
        <input type="text" id="headset-notes-${id}" placeholder="Notes (optional)">
      </div>
    `
    container.appendChild(div)
  })
}

function collectPayload() {
  const name = document.getElementById('fullName').value.trim()
  if (!name) { setError('Please enter your full name.'); document.getElementById('fullName').focus(); return null }

  const event = document.getElementById('eventSelect').value
  if (!event) { setError('Please select a church event and activity.'); return null }

  const slotEl = document.querySelector('input[name="slot"]:checked')
  const slot = slotEl ? slotEl.value : ''
  if (!slot) { setError('Please select a slot (AM/PM).'); return null }

  const items = COMMS_ITEMS.map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    status: checklistState[item.item_id] || 'Incomplete',
    notes: document.querySelector(`#notes-${item.item_id} input`)?.value?.trim() || '',
  }))

  const beltpacks = {}
  BELTPACK_IDS.forEach(id => {
    const val = document.getElementById(`beltpack-${id}`).value.trim()
    beltpacks[id] = val || 'N/A'
  })

  const headsets = {}
  BELTPACK_IDS.forEach(id => {
    headsets[id] = {
      status: document.getElementById(`headset-status-${id}`).value,
      notes: document.getElementById(`headset-notes-${id}`).value.trim(),
    }
  })

  return {
    name,
    event,
    event_other: event === 'Others' ? document.getElementById('otherEvent').value.trim() : '',
    slot,
    timestamp: new Date().toISOString(),
    items,
    beltpacks,
    headsets,
  }
}

async function handleSubmit() {
  const payload = collectPayload()
  if (!payload) return

  setError(null)
  const btn = document.getElementById('submitBtn')
  btn.innerHTML = '<i data-lucide="loader-circle" class="lucide-spin"></i> Submitting...'
  btn.disabled = true
  lucide.createIcons()

  try {
    const result = await submitChecklist(payload)
    if (result.success) {
      showConfirm(payload)
    } else {
      setError(result.error || 'Server error. Try again.')
      btn.innerHTML = '<i data-lucide="check"></i> Submit Checklist'
      btn.disabled = false
      lucide.createIcons()
    }
  } catch (e) {
    setError('Network error. Check your connection.')
    btn.innerHTML = '<i data-lucide="check"></i> Submit Checklist'
    btn.disabled = false
    lucide.createIcons()
  }
}

function showConfirm(payload) {
  if (clockInterval) clearInterval(clockInterval)

  const itemsOk = payload.items.filter(i => i.status === 'Complete').length
  const itemNames = payload.items
    .filter(i => i.status === 'Complete')
    .map(i => escapeHtml(i.item_name))
    .join(', ')

  document.getElementById('confirmTitle').textContent = 'Checklist Submitted'
  document.getElementById('confirmMessage').textContent =
    `${itemsOk} item(s) checked by ${escapeHtml(payload.name)}.`

  const now = new Date(payload.timestamp).toLocaleString('en-PH')
  document.getElementById('confirmDetails').innerHTML = `
    <div><span>Name</span><span>${escapeHtml(payload.name)}</span></div>
    <div><span>Event</span><span>${escapeHtml(payload.event)}${payload.event_other ? ' — ' + escapeHtml(payload.event_other) : ''}</span></div>
    <div><span>Slot</span><span>${escapeHtml(payload.slot)}</span></div>
    <div><span>Time</span><span>${now}</span></div>
    <div><span>Items Checked</span><span>${itemsOk}</span></div>
    <div><span>Beltpacks Assigned</span><span>${Object.values(payload.beltpacks).filter(v => v !== 'N/A').length}</span></div>
    <div><span>Headsets Checked</span><span>${BELTPACK_IDS.length}</span></div>
  `

  showSection('confirmSection')
  window.scrollTo(0, 0)
}

function resetForm() {
  document.getElementById('fullName').value = ''
  document.getElementById('eventSelect').value = ''
  document.getElementById('otherEventField').classList.add('hidden')
  document.getElementById('otherEvent').value = ''
  document.querySelector('input[name="slot"][value="AM"]').checked = true
  COMMS_ITEMS.forEach(item => {
    checklistState[item.item_id] = 'Incomplete'
    const group = document.querySelector(`#checklist-${item.item_id} .status-group`)
    if (group) {
      group.querySelectorAll('.status-btn').forEach(b => {
        b.className = 'status-btn'
        if (b.dataset.value === 'Incomplete') b.classList.add('selected-incomplete')
      })
    }
    const notesField = document.getElementById(`notes-${item.item_id}`)
    if (notesField) {
      notesField.classList.remove('visible')
      notesField.querySelector('input').value = ''
    }
  })

  BELTPACK_IDS.forEach(id => {
    document.getElementById(`beltpack-${id}`).value = ''
  })

  BELTPACK_IDS.forEach(id => {
    document.getElementById(`headset-status-${id}`).value = 'Working'
    document.getElementById(`headset-notes-${id}`).value = ''
  })

  setError(null)
  const btn = document.getElementById('submitBtn')
  btn.innerHTML = '<i data-lucide="check"></i> Submit Checklist'
  btn.disabled = false
  lucide.createIcons()
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof CONFIG !== 'undefined' && CONFIG.USE_MOCK) {
    document.querySelector('.mock-badge').style.display = 'inline-block'
  }

  startClock('timestampDisplay')
  populateEventDropdown()
  buildChecklist()
  buildBeltpacks()
  buildHeadsets()

  document.getElementById('scanItemBtn').addEventListener('click', showScanner)
  document.getElementById('scannerCloseBtn').addEventListener('click', hideScanner)
  document.getElementById('submitBtn').addEventListener('click', handleSubmit)
  document.getElementById('newChecklistBtn').addEventListener('click', () => {
    resetForm()
    startClock('timestampDisplay')
    showSection('formSection')
  })
})
