let clockInterval = null
let checklistState = {}
let html5Scanner = null
let pendingAssignment = null
let pendingScanEntry = null
let scannerPaused = false
let scanProcessing = false
let scannerResumeTimer = null
let scanHistory = CommsScannerState.createScanHistory()
let scanAudioContext = null
let scanNotice = CommsScannerState.createNoticeState()
let scannerEditTarget = null

const beltpackAssignments = {}
const itemCounts = {}
let pendingCountItem = null
const headsetAssignments = {}

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
  prepareScanAudio()
  const overlay = document.getElementById('scannerOverlay')
  overlay.classList.remove('hidden')
  scanProcessing = false
  scanNotice = CommsScannerState.createNoticeState()
  setScannerEditTarget(null)
  renderScanHistory()
  setScannerMessage('Point camera at any Comms QR code')

  if (html5Scanner) html5Scanner.clear()

  html5Scanner = new Html5Qrcode('scanner-container')
  html5Scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => handleScan(decodedText),
    () => {}
  ).catch(() => {
    setScannerMessage('Camera could not start. Check camera permission and try again.', 'error')
  })
}

function hideScanner() {
  if (scannerResumeTimer) clearTimeout(scannerResumeTimer)
  scannerResumeTimer = null
  if (html5Scanner) {
    const scannerToStop = html5Scanner
    html5Scanner = null
    try {
      Promise.resolve(scannerToStop.stop())
        .catch(() => {})
        .finally(() => {
          try { scannerToStop.clear() } catch (_) {}
        })
    } catch (_) {
      try { scannerToStop.clear() } catch (_) {}
    }
  }
  scannerPaused = false
  scanProcessing = false
  setScannerEditTarget(null)
  document.getElementById('scannerOverlay').classList.add('hidden')
}

function handleScan(decodedText) {
  if (scanProcessing) return
  scanProcessing = true

  const scan = CommsScannerState.classifyScan(decodedText, captureFormState())
  const notice = CommsScannerState.shouldAnnounce(scanNotice, scan.value, Date.now())
  scanNotice = notice.noticeState

  if (scan.kind === 'already-complete' || scan.kind === 'already-assigned') {
    if (notice.announce) showAlreadyScannedNotice(scan)
    scanProcessing = false
    return
  }

  setScannerEditTarget(null)
  const assignment = scan.assignment

  if (scan.kind === 'assign' || scan.kind === 'blocked') {
    pauseScanner()
    pendingScanEntry = {
      value: scan.value,
      label: `${assignment.id} ${assignment.kind === 'beltpack' ? 'Beltpack' : 'Headset'}`,
    }
    if (showAssignmentPrompt(assignment)) {
      playScanSuccessFeedback()
    } else {
      pendingScanEntry = null
      resumeScanner(900)
    }
    return
  }

  const item = scan.kind === 'complete' ? findCommsItem(scan.itemId) : null
  if (!item) {
    pauseScanner()
    setScannerMessage(`Unknown QR: ${scan.value}`, 'error')
    resumeScanner(1200)
    return
  }

  pauseScanner()
  if (item.expected_count) {
    pendingScanEntry = { value: item.item_id, label: item.item_name }
    showCountPrompt(item)
    playScanSuccessFeedback()
    return
  }
  const completeBtn = document.querySelector(`#checklist-${item.item_id} .status-btn[data-value="Complete"]`)
  if (completeBtn) {
    completeBtn.click()
    recordCompletedScan({ value: item.item_id, label: item.item_name })
    playScanSuccessFeedback()
    setError(null)
    setScannerMessage('Item marked Complete. Ready for the next QR.')
  }
  resumeScanner(1000)
}

function showAlreadyScannedNotice(scan) {
  if (scan.kind === 'already-complete') {
    const item = findCommsItem(scan.itemId)
    const count = itemCounts[item.item_id]
    if (item.expected_count) {
      setScannerEditTarget({ kind: 'count', itemId: item.item_id })
      setScannerMessage(`✓ ${item.item_name} already counted${count != null ? `: ${count} of ${item.expected_count}` : ''}`, 'warning')
    } else {
      setScannerEditTarget(null)
      setScannerMessage(`✓ ${item.item_name} already scanned`, 'warning')
    }
  } else {
    const { assignment, current } = scan
    const isBeltpack = assignment.kind === 'beltpack'
    const detail = isBeltpack ? current.monitor_type : current.status
    setScannerEditTarget(assignment)
    setScannerMessage(
      `${assignment.id} ${isBeltpack ? 'Beltpack' : 'Headset'} already assigned to ${current.user.trim()}${detail ? ` (${detail})` : ''}`,
      'warning'
    )
  }
  playAlreadyScannedFeedback()
}

function playAlreadyScannedFeedback() {
  if (navigator.vibrate) navigator.vibrate([40, 60, 40])
}

function setScannerEditTarget(assignment) {
  scannerEditTarget = assignment
  document.getElementById('scannerEditBtn').classList.toggle('hidden', !assignment)
}

function editScannedAssignment() {
  const assignment = scannerEditTarget
  if (!assignment) return
  setScannerEditTarget(null)
  pauseScanner()
  scanProcessing = true
  // Editing an existing assignment is not a new scan, so it adds no history entry.
  pendingScanEntry = null
  if (assignment.kind === 'count') {
    showCountPrompt(findCommsItem(assignment.itemId))
  } else if (!showAssignmentPrompt(assignment)) {
    resumeScanner(900)
  }
}

function playScanSuccessFeedback() {
  if (navigator.vibrate) navigator.vibrate(120)

  prepareScanAudio()
  const audioContext = scanAudioContext
  if (!audioContext) return

  try {
    const playTone = () => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const now = audioContext.currentTime

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(now + 0.15)
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(playTone).catch(() => {})
    } else {
      playTone()
    }
  } catch (_) {}
}

function prepareScanAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  try {
    if (!scanAudioContext || scanAudioContext.state === 'closed') {
      scanAudioContext = new AudioContext()
    }
    if (scanAudioContext.state === 'suspended') scanAudioContext.resume().catch(() => {})
  } catch (_) {}
}

function pauseScanner() {
  if (!html5Scanner || scannerPaused) return
  try {
    html5Scanner.pause(true)
    scannerPaused = true
  } catch (_) {}
}

function resumeScanner(delay = 0) {
  if (scannerResumeTimer) clearTimeout(scannerResumeTimer)
  scannerResumeTimer = setTimeout(() => {
    scannerResumeTimer = null
    if (!html5Scanner || document.getElementById('scannerOverlay').classList.contains('hidden')) return
    try {
      html5Scanner.resume()
      scannerPaused = false
    } catch (_) {}
    scanProcessing = false
  }, delay)
}

function setScannerMessage(message, tone = '') {
  const hint = document.getElementById('scannerHint')
  hint.textContent = message
  hint.classList.toggle('is-error', tone === 'error')
  hint.classList.toggle('is-warning', tone === 'warning')
}

function recordCompletedScan(entry) {
  const result = CommsScannerState.recordSuccessfulScan(scanHistory, entry, Date.now())
  scanHistory = result.history
  renderScanHistory()
  saveDraft()
  return result.accepted
}

function renderScanHistory() {
  const entry = scanHistory.entries[scanHistory.cursor]
  const label = document.getElementById('scannerHistoryLabel')
  const meta = document.getElementById('scannerHistoryMeta')
  const previous = document.getElementById('scannerPreviousBtn')
  const next = document.getElementById('scannerNextBtn')

  if (!entry) {
    label.textContent = 'No successful scans yet'
    meta.textContent = 'Ready for any Comms QR'
    previous.disabled = true
    next.disabled = true
    return
  }

  label.textContent = entry.label
  meta.textContent = `${scanHistory.cursor + 1} of ${scanHistory.entries.length} successful scans`
  previous.disabled = scanHistory.cursor <= 0
  next.disabled = scanHistory.cursor >= scanHistory.entries.length - 1
}

function navigateScanHistory(direction) {
  scanHistory = CommsScannerState.moveScanHistory(scanHistory, direction)
  renderScanHistory()
  saveDraft()
}

function showAssignmentPrompt(assignment) {
  if (assignment.kind === 'headset' && CommsAssignment.isHeadsetDisabled(beltpackAssignments[assignment.id])) {
    setError(`${assignment.id} Headset is not used because ${assignment.id} Beltpack is assigned to In-ear.`)
    setScannerMessage(`${assignment.id} Headset is disabled because its beltpack uses In-ear.`, 'error')
    return false
  }

  pendingAssignment = assignment
  const isBeltpack = assignment.kind === 'beltpack'
  const formState = captureFormState()
  const current = isBeltpack ? formState.beltpacks[assignment.id] : formState.headsets[assignment.id]
  document.getElementById('assignmentTitle').textContent = `${assignment.id} ${isBeltpack ? 'Beltpack' : 'Headset'}`
  document.getElementById('assignmentDescription').textContent = isBeltpack
    ? 'Enter the assigned name and monitor type.'
    : 'Enter the assigned name and headset status.'
  document.getElementById('assignmentName').value = current?.user || ''
  document.getElementById('assignmentMonitorType').value = current?.monitor_type || ''
  document.getElementById('assignmentNotes').value = isBeltpack ? current?.notes || '' : ''
  document.getElementById('assignmentNotesField').classList.toggle('hidden', !isBeltpack)
  document.getElementById('assignmentHeadsetStatus').value = current?.status || 'Working'
  document.getElementById('assignmentMonitorField').classList.toggle('hidden', !isBeltpack)
  document.getElementById('assignmentStatusField').classList.toggle('hidden', isBeltpack)
  document.getElementById('assignmentError').classList.remove('visible')
  document.getElementById('assignmentOverlay').classList.remove('hidden')
  document.getElementById('assignmentName').focus()
  return true
}

function closeAssignmentPrompt() {
  pendingAssignment = null
  pendingScanEntry = null
  document.getElementById('assignmentOverlay').classList.add('hidden')
  scanNotice = { ...scanNotice, seenAt: Date.now() }
  setScannerMessage('Assignment cancelled. Ready for the next QR.')
  resumeScanner(300)
}

function confirmAssignmentPrompt() {
  if (!pendingAssignment) return
  const name = document.getElementById('assignmentName').value
  const error = document.getElementById('assignmentError')

  try {
    if (pendingAssignment.kind === 'beltpack') {
      const assignment = CommsAssignment.createBeltpackAssignment(
        name,
        document.getElementById('assignmentMonitorType').value,
        document.getElementById('assignmentNotes').value
      )
      beltpackAssignments[pendingAssignment.id] = assignment
      document.getElementById(`beltpack-${pendingAssignment.id}`).value = assignment.user
      document.getElementById(`beltpack-type-${pendingAssignment.id}`).value = assignment.monitor_type
      document.getElementById(`beltpack-notes-${pendingAssignment.id}`).value = assignment.notes
      syncHeadsetAvailability(pendingAssignment.id)
    } else {
      const assignment = CommsAssignment.createHeadsetAssignment(name, document.getElementById('assignmentHeadsetStatus').value)
      headsetAssignments[pendingAssignment.id] = assignment
      document.getElementById(`headset-user-${pendingAssignment.id}`).value = assignment.user
      document.getElementById(`headset-status-${pendingAssignment.id}`).value = assignment.status
    }
    const completedScan = pendingScanEntry
    pendingAssignment = null
    pendingScanEntry = null
    document.getElementById('assignmentOverlay').classList.add('hidden')
  scanNotice = { ...scanNotice, seenAt: Date.now() }
    if (completedScan) recordCompletedScan(completedScan)
    saveDraft()
    setScannerMessage('Assignment saved. Ready for the next QR.')
    resumeScanner(300)
    setError(null)
  } catch (e) {
    error.textContent = e.message
    error.classList.add('visible')
  }
}

function renderItemCount(id) {
  const el = document.getElementById(`count-${id}`)
  if (!el) return
  const count = itemCounts[id]
  const expected = findCommsItem(id).expected_count
  el.textContent = count == null ? '' : `Counted: ${count} of ${expected}`
  el.classList.toggle('is-short', count != null && count < expected)
}

function showCountPrompt(item) {
  pendingCountItem = item
  const current = itemCounts[item.item_id]
  document.getElementById('countTitle').textContent = item.item_name
  document.getElementById('countQuestion').textContent = `How many ${item.count_noun || item.item_name} are there? Expected: ${item.expected_count}.`
  document.getElementById('countInput').value = current ?? item.expected_count
  document.getElementById('countError').classList.remove('visible')
  document.getElementById('countOverlay').classList.remove('hidden')
  document.getElementById('countInput').focus()
  document.getElementById('countInput').select()
}

function closeCountPrompt(message) {
  pendingCountItem = null
  pendingScanEntry = null
  document.getElementById('countOverlay').classList.add('hidden')
  scanNotice = { ...scanNotice, seenAt: Date.now() }
  setScannerMessage(message)
  resumeScanner(300)
}

function confirmCountPrompt() {
  const item = pendingCountItem
  if (!item) return
  const raw = document.getElementById('countInput').value.trim()
  const count = CommsFormState.normalizeCount(/^\d+$/.test(raw) ? Number(raw) : NaN)
  if (count == null) {
    const error = document.getElementById('countError')
    error.textContent = `Enter a whole number from 0 to ${CommsFormState.MAX_COUNT}.`
    error.classList.add('visible')
    return
  }

  itemCounts[item.item_id] = count
  const status = CommsFormState.statusForCount(count, item.expected_count)
  setItemStatus(item.item_id, status)
  renderItemCount(item.item_id)
  const completedScan = pendingScanEntry
  pendingScanEntry = null
  if (completedScan) recordCompletedScan(completedScan)
  saveDraft()
  setError(null)
  closeCountPrompt(status === 'Complete'
    ? `${item.item_name}: all ${count} counted. Ready for the next QR.`
    : `${item.item_name}: ${count} of ${item.expected_count}, marked Incomplete. Ready for the next QR.`)
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
    syncOtherEventField()
    if (select.value === 'Others') document.getElementById('otherEvent').focus()
  })
}

function syncOtherEventField() {
  const isOther = document.getElementById('eventSelect').value === 'Others'
  document.getElementById('otherEventField').classList.toggle('hidden', !isOther)
  if (!isOther) document.getElementById('otherEvent').value = ''
}

const PHOTO_PLACEHOLDER = '<span class="ref-thumb ref-thumb-empty">No photo yet</span>'

function photoThumb(src, label) {
  if (!src) return PHOTO_PLACEHOLDER
  return `
    <button type="button" class="ref-thumb" data-photo="${escapeHtml(src)}" data-label="${escapeHtml(label)}"
      aria-label="View photo of ${escapeHtml(label)}">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" loading="lazy">
    </button>`
}

function renderReferencePhotos() {
  document.querySelectorAll('[data-reference-photo]').forEach(el => {
    const key = el.dataset.referencePhoto
    const label = el.dataset.referenceLabel
    el.innerHTML = `${photoThumb(COMMS_PHOTOS[key], label)}<span class="ref-caption">${escapeHtml(label)}</span>`
  })
}

// A photo path that fails to load falls back to the placeholder, never a broken image.
function handlePhotoError(e) {
  if (e.target.tagName !== 'IMG' || !e.target.closest('.ref-thumb')) return
  e.target.closest('.ref-thumb').outerHTML = PHOTO_PLACEHOLDER
}

let photoViewerReturnFocus = null

function openPhotoViewer(thumb) {
  const viewer = document.getElementById('photoViewer')
  const image = document.getElementById('photoViewerImage')
  image.src = thumb.dataset.photo
  image.alt = thumb.dataset.label
  document.getElementById('photoViewerCaption').textContent = thumb.dataset.label
  photoViewerReturnFocus = thumb
  viewer.classList.remove('hidden')
  document.getElementById('photoViewerCloseBtn').focus()
}

function closePhotoViewer() {
  const viewer = document.getElementById('photoViewer')
  if (viewer.classList.contains('hidden')) return
  viewer.classList.add('hidden')
  document.getElementById('photoViewerImage').removeAttribute('src')
  if (photoViewerReturnFocus) photoViewerReturnFocus.focus()
  photoViewerReturnFocus = null
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
        ${photoThumb(COMMS_PHOTOS[item.item_id], item.item_name)}
        <div class="checklist-item-info">
          <div class="checklist-item-name">${escapeHtml(item.item_name)}</div>
          <div class="checklist-item-spec">${escapeHtml(item.spec)}</div>
          ${item.expected_count ? `<div class="checklist-item-count" id="count-${item.item_id}"></div>` : ''}
        </div>
        <div class="status-group">
          <button class="status-btn" data-id="${item.item_id}" data-value="Complete">Complete</button>
          <button class="status-btn selected-incomplete" data-id="${item.item_id}" data-value="Incomplete">Incomplete</button>
          <button class="status-btn" data-id="${item.item_id}" data-value="N/A">N/A</button>
        </div>
      </div>
      <div class="checklist-item-notes visible" id="notes-${item.item_id}">
        <input type="text" placeholder="Notes (optional)" data-id="${item.item_id}">
      </div>
    `
    container.appendChild(div)
  })

  container.addEventListener('click', e => {
    const btn = e.target.closest('.status-btn')
    if (!btn) return
    setItemStatus(btn.dataset.id, btn.dataset.value)
  })
}

function setItemStatus(id, value, showNotes = value !== 'N/A') {
  checklistState[id] = value

  document.querySelectorAll(`#checklist-${id} .status-btn`).forEach(b => {
    b.className = 'status-btn'
    if (b.dataset.value === value) b.classList.add(`selected-${value.toLowerCase()}`)
  })

  document.getElementById(`notes-${id}`).classList.toggle('visible', showNotes)
}

function buildBeltpacks() {
  const container = document.getElementById('beltpackContainer')
  BELTPACK_IDS.forEach(id => {
    const div = document.createElement('div')
    div.className = 'beltpack-field'
    div.innerHTML = `
      <span class="beltpack-label">${id}</span>
      <input type="text" id="beltpack-${id}" placeholder="Assigned name" data-beltpack="${id}">
      <select id="beltpack-type-${id}" data-beltpack-type="${id}" aria-label="${id} monitor type">
        <option value="">Monitor type</option>
        <option value="In-ear">In-ear</option>
        <option value="Headset">Headset</option>
      </select>
      <input type="text" id="beltpack-notes-${id}" class="beltpack-notes" placeholder="Notes (optional)" aria-label="${id} beltpack notes">
    `
    container.appendChild(div)
  })

  container.addEventListener('input', e => {
    const id = e.target.dataset.beltpack
    if (!id) return
    beltpackAssignments[id] = {
      user: e.target.value.trim(),
      monitor_type: document.getElementById(`beltpack-type-${id}`).value,
    }
  })
  container.addEventListener('change', e => {
    const id = e.target.dataset.beltpackType
    if (!id) return
    beltpackAssignments[id] = {
      user: document.getElementById(`beltpack-${id}`).value.trim(),
      monitor_type: e.target.value,
    }
    syncHeadsetAvailability(id)
  })
}

function buildHeadsets() {
  const container = document.getElementById('headsetContainer')
  BELTPACK_IDS.forEach(id => {
    const div = document.createElement('div')
    div.className = 'headset-item'
    div.id = `headset-${id}`
    div.innerHTML = `
      <div class="headset-row">
        <span class="headset-label">${id}</span>
        <input type="text" id="headset-user-${id}" placeholder="Assigned name">
        <select id="headset-status-${id}">
          <option value="Working">Working</option>
          <option value="Needs Repair">Needs Repair</option>
          <option value="Needs Replacement">Needs Replacement</option>
          <option value="N/A">N/A</option>
        </select>
        <input type="text" id="headset-notes-${id}" placeholder="Notes (optional)">
        <span class="headset-disabled-note">Not used — paired beltpack is set to In-ear.</span>
      </div>
    `
    container.appendChild(div)
  })
}

function syncHeadsetAvailability(id) {
  const item = document.getElementById(`headset-${id}`)
  const disabled = CommsAssignment.isHeadsetDisabled(beltpackAssignments[id])
  item.classList.toggle('is-disabled', disabled)
  item.querySelectorAll('input, select').forEach(control => { control.disabled = disabled })

  if (disabled) {
    document.getElementById(`headset-user-${id}`).value = ''
    document.getElementById(`headset-status-${id}`).value = 'N/A'
    document.getElementById(`headset-notes-${id}`).value = ''
    headsetAssignments[id] = { user: '', status: 'N/A', notes: '' }
  } else if (document.getElementById(`headset-status-${id}`).value === 'N/A') {
    document.getElementById(`headset-status-${id}`).value = 'Working'
    headsetAssignments[id] = { user: '', status: 'Working', notes: '' }
  }
}

function formValue(id) {
  return document.getElementById(id).value
}

function captureFormState() {
  const state = CommsFormState.createEmptyFormState(COMMS_ITEMS.map(i => i.item_id), BELTPACK_IDS)
  state.name = formValue('fullName')
  state.event = formValue('eventSelect')
  state.eventOther = formValue('otherEvent')
  COMMS_ITEMS.forEach(({ item_id: id }) => {
    state.items[id] = {
      status: checklistState[id] || 'Incomplete',
      notes: document.querySelector(`#notes-${id} input`).value,
      count: itemCounts[id] ?? null,
    }
  })
  BELTPACK_IDS.forEach(id => {
    state.beltpacks[id] = {
      user: formValue(`beltpack-${id}`),
      monitor_type: formValue(`beltpack-type-${id}`),
      notes: formValue(`beltpack-notes-${id}`),
    }
    state.headsets[id] = {
      user: formValue(`headset-user-${id}`),
      status: formValue(`headset-status-${id}`),
      notes: formValue(`headset-notes-${id}`),
    }
  })
  state.scanHistory = scanHistory
  return CommsFormState.normalizeFormState(state, COMMS_ITEMS.map(i => i.item_id), BELTPACK_IDS)
}

// Applies a form state through the same paths user input takes, so derived
// UI (status buttons, notes visibility, In-ear headset blocking) stays correct.
function applyFormState(state) {
  const next = CommsFormState.normalizeFormState(state, COMMS_ITEMS.map(i => i.item_id), BELTPACK_IDS)

  document.getElementById('fullName').value = next.name
  document.getElementById('eventSelect').value = next.event
  document.getElementById('otherEvent').value = next.eventOther
  syncOtherEventField()

  COMMS_ITEMS.forEach(({ item_id: id }) => {
    const item = next.items[id]
    document.querySelector(`#notes-${id} input`).value = item.notes
    setItemStatus(id, item.status)
    itemCounts[id] = item.count
    renderItemCount(id)
  })

  BELTPACK_IDS.forEach(id => {
    const beltpack = next.beltpacks[id]
    document.getElementById(`beltpack-${id}`).value = beltpack.user
    document.getElementById(`beltpack-type-${id}`).value = beltpack.monitor_type
    document.getElementById(`beltpack-notes-${id}`).value = beltpack.notes
    if (beltpack.user || beltpack.monitor_type) {
      beltpackAssignments[id] = { user: beltpack.user.trim(), monitor_type: beltpack.monitor_type }
    } else {
      delete beltpackAssignments[id]
    }
    delete headsetAssignments[id]
    syncHeadsetAvailability(id)

    if (!CommsAssignment.isHeadsetDisabled(beltpackAssignments[id])) {
      const headset = next.headsets[id]
      document.getElementById(`headset-user-${id}`).value = headset.user
      document.getElementById(`headset-status-${id}`).value = headset.status
      document.getElementById(`headset-notes-${id}`).value = headset.notes
      if (headset.user) headsetAssignments[id] = { ...headset, user: headset.user.trim() }
    }
  })

  scanHistory = next.scanHistory
  renderScanHistory()
}

function collectPayload() {
  const name = document.getElementById('fullName').value.trim()
  if (!name) { setError('Please enter your full name.'); document.getElementById('fullName').focus(); return null }

  const event = document.getElementById('eventSelect').value
  if (!event) { setError('Please select a church event and activity.'); return null }

  const items = COMMS_ITEMS.map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    status: checklistState[item.item_id] || 'Incomplete',
    notes: document.querySelector(`#notes-${item.item_id} input`)?.value?.trim() || '',
    ...(item.expected_count ? { count: itemCounts[item.item_id] ?? null, expected_count: item.expected_count } : {}),
  }))

  const beltpacks = {}
  BELTPACK_IDS.forEach(id => {
    beltpacks[id] = {
      user: document.getElementById(`beltpack-${id}`).value.trim() || 'N/A',
      monitor_type: document.getElementById(`beltpack-type-${id}`).value,
      notes: document.getElementById(`beltpack-notes-${id}`).value.trim(),
    }
  })

  const headsets = {}
  BELTPACK_IDS.forEach(id => {
    headsets[id] = {
      user: document.getElementById(`headset-user-${id}`).value.trim(),
      status: document.getElementById(`headset-status-${id}`).value,
      notes: document.getElementById(`headset-notes-${id}`).value.trim(),
    }
  })

  return {
    name,
    event,
    event_other: event === 'Others' ? document.getElementById('otherEvent').value.trim() : '',
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
      clearStoredDraft()
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
    <div><span>Time</span><span>${now}</span></div>
    <div><span>Items Checked</span><span>${itemsOk}</span></div>
    <div><span>Beltpacks Assigned</span><span>${Object.values(payload.beltpacks).filter(v => v.user !== 'N/A').length}</span></div>
    <div><span>Headsets Checked</span><span>${Object.values(payload.headsets).filter(v => v.status !== 'N/A').length}</span></div>
  `

  showSection('confirmSection')
  window.scrollTo(0, 0)
}

function readStoredDraft() {
  try {
    return localStorage.getItem(CommsDraft.DRAFT_KEY)
  } catch (_) {
    return null
  }
}

function writeStoredDraft(value) {
  try {
    localStorage.setItem(CommsDraft.DRAFT_KEY, value)
  } catch (_) {}
}

function clearStoredDraft() {
  try {
    localStorage.removeItem(CommsDraft.DRAFT_KEY)
  } catch (_) {}
}

function saveDraft() {
  if (!document.getElementById('formSection').classList.contains('active')) return
  const state = captureFormState()
  if (CommsDraft.isEmptyDraft(state, COMMS_ITEMS.map(i => i.item_id), BELTPACK_IDS)) {
    clearStoredDraft()
  } else {
    writeStoredDraft(CommsDraft.serializeDraft(state, Date.now()))
  }
}

function restoreDraft() {
  const draft = CommsDraft.parseDraft(readStoredDraft(), Date.now(), COMMS_ITEMS.map(i => i.item_id), BELTPACK_IDS)
  if (!draft) {
    clearStoredDraft()
    return
  }

  applyFormState(draft.state)
  document.getElementById('draftTime').textContent = new Date(draft.savedAt).toLocaleTimeString('en-PH', {
    hour: 'numeric', minute: '2-digit',
  })
  document.getElementById('draftBar').classList.remove('hidden')
}

function startOver() {
  resetForm()
  clearStoredDraft()
}

function resetForm() {
  applyFormState(CommsFormState.createEmptyFormState(COMMS_ITEMS.map(i => i.item_id), BELTPACK_IDS))
  document.getElementById('draftBar').classList.add('hidden')
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
  renderReferencePhotos()
  restoreDraft()
  if (CommsDraft.isInAppBrowser(navigator.userAgent)) {
    document.getElementById('inAppBrowserNote').classList.remove('hidden')
  }

  const formSection = document.getElementById('formSection')
  ;['input', 'change', 'click'].forEach(type => formSection.addEventListener(type, saveDraft))
  window.addEventListener('pagehide', saveDraft)
  document.getElementById('draftStartOverBtn').addEventListener('click', startOver)

  document.addEventListener('error', handlePhotoError, true)
  formSection.addEventListener('click', e => {
    const thumb = e.target.closest('button.ref-thumb')
    if (thumb) openPhotoViewer(thumb)
  })
  document.getElementById('photoViewer').addEventListener('click', closePhotoViewer)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePhotoViewer()
  })

  document.getElementById('scanItemBtn').addEventListener('click', showScanner)
  document.getElementById('scannerExitBtn').addEventListener('click', hideScanner)
  document.getElementById('scannerPreviousBtn').addEventListener('click', () => navigateScanHistory(-1))
  document.getElementById('scannerNextBtn').addEventListener('click', () => navigateScanHistory(1))
  document.getElementById('scannerEditBtn').addEventListener('click', editScannedAssignment)
  document.getElementById('assignmentCancelBtn').addEventListener('click', closeAssignmentPrompt)
  document.getElementById('assignmentConfirmBtn').addEventListener('click', confirmAssignmentPrompt)
  document.getElementById('countCancelBtn').addEventListener('click', () => closeCountPrompt('Count cancelled. Ready for the next QR.'))
  document.getElementById('countConfirmBtn').addEventListener('click', confirmCountPrompt)
  document.getElementById('countInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmCountPrompt()
  })
  document.getElementById('assignmentName').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAssignmentPrompt()
  })
  document.getElementById('submitBtn').addEventListener('click', handleSubmit)
  document.getElementById('newChecklistBtn').addEventListener('click', () => {
    resetForm()
    startClock('timestampDisplay')
    showSection('formSection')
  })
})
