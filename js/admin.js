let equipment = []
let commsEquipment = []
let qrInstances = []
let commsQrInstances = []

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

function requireAuth() {
  if (!sessionStorage.getItem('admin_auth')) {
    document.getElementById('adminSection').classList.remove('active')
    document.getElementById('loginSection').classList.add('active')
    setError('Session expired. Please login again.')
    return false
  }
  return true
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth()

  document.getElementById('loginBtn').addEventListener('click', handleLogin)
  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin()
  })
  document.getElementById('seedBtn').addEventListener('click', async () => {
    if (!requireAuth()) return
    if (!confirm('Reset all equipment to default data? This will replace all current equipment.')) return
    setError(null)
    try {
      const result = await seedEquipment()
      if (result.success) {
        await loadEquipment()
      } else {
        setError(result.error || 'Failed to reset equipment.')
      }
    } catch (e) {
      setError('Network error.')
    }
  })
  document.getElementById('showAddBtn').addEventListener('click', () => {
    if (!requireAuth()) return
    document.getElementById('addForm').classList.remove('hidden')
    lucide.createIcons()
    document.getElementById('eqName').focus()
  })
  document.getElementById('cancelAddBtn').addEventListener('click', resetAddForm)
  document.getElementById('saveEqBtn').addEventListener('click', () => {
    if (!requireAuth()) return
    handleAddEquipment()
  })
  document.getElementById('showQrBtn').addEventListener('click', () => {
    if (!requireAuth()) return
    toggleQrSection()
  })
  document.getElementById('printQrBtn').addEventListener('click', () => window.print())

  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById(tab.dataset.tab).classList.add('active')

      if (tab.dataset.tab === 'commsTab') {
        loadCommsEquipment()
      }
    })
  })

  // Comms items
  document.getElementById('showCommsAddBtn').addEventListener('click', () => {
    if (!requireAuth()) return
    document.getElementById('commsAddForm').classList.remove('hidden')
    lucide.createIcons()
    document.getElementById('commsName').focus()
  })
  document.getElementById('cancelCommsAddBtn').addEventListener('click', resetCommsAddForm)
  document.getElementById('saveCommsBtn').addEventListener('click', () => {
    if (!requireAuth()) return
    handleAddCommsItem()
  })
  document.getElementById('showCommsQrBtn').addEventListener('click', () => {
    if (!requireAuth()) return
    toggleCommsQrSection()
  })
  document.getElementById('printCommsQrBtn').addEventListener('click', () => window.print())
})

async function handleLogin() {
  const pw = document.getElementById('password').value.trim()
  setError(null)

  const btn = document.getElementById('loginBtn')
  btn.innerHTML = '<i data-lucide="loader-circle" class="lucide-spin"></i> Verifying...'
  btn.disabled = true
  lucide.createIcons()

  try {
    const result = await adminLogin(pw)
    if (result.success) {
      sessionStorage.setItem('admin_auth', result.token || 'true')
      document.getElementById('loginSection').classList.remove('active')
      document.getElementById('adminSection').classList.add('active')
      loadEquipment()
    } else {
      setError('Incorrect password.')
      document.getElementById('password').value = ''
      document.getElementById('password').focus()
    }
  } catch (e) {
    setError('Network error. Check your connection and API URL.')
  }

  btn.innerHTML = '<i data-lucide="arrow-right"></i> Sign In'
  btn.disabled = false
  lucide.createIcons()
}

function checkAuth() {
  if (sessionStorage.getItem('admin_auth')) {
    document.getElementById('loginSection').classList.remove('active')
    document.getElementById('adminSection').classList.add('active')
    loadEquipment()
  }
}

async function loadEquipment() {
  const container = document.getElementById('equipmentContainer')
  container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading equipment...</span></div>'

  try {
    const result = await getEquipment()
    if (result.equipment && result.equipment.length) {
      equipment = result.equipment
      renderEquipment()
    } else {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="package"></i></div><p>No equipment yet. Add your first item.</p></div>'
      lucide.createIcons()
    }
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div><p>Failed to load. Check your API URL in config.js</p></div>'
    lucide.createIcons()
  }
}

function renderEquipment() {
  const container = document.getElementById('equipmentContainer')
  container.innerHTML = equipment.map(eq => {
    const typeBadge = eq.type === 'Consumable' ? 'badge-consumable' : eq.type === 'Non-Consumable' ? 'badge-non-consumable' : 'badge-default'
    const typeInfo = eq.type ? `<span class="badge ${typeBadge}" style="margin-right:var(--space-2);font-size:0.7rem">${escapeHtml(eq.type)}</span>` : ''
    const stockInfo = eq.stock !== undefined ? `<span class="meta">Stock: ${eq.stock}</span>` : ''
    return `
    <div class="equipment-card">
      <div class="equipment-card-main">
        <div class="equipment-card-body">
          <h3>${escapeHtml(eq.item_name)}</h3>
          <p class="desc">${eq.description ? escapeHtml(eq.description) : 'No description'}</p>
          <div>${typeInfo}${stockInfo}</div>
          <span class="meta">${escapeHtml(eq.item_id)}</span>
        </div>
        <span class="badge ${eq.status === 'available' ? 'badge-available' : 'badge-borrowed'}">${eq.status}</span>
      </div>
      <div class="equipment-card-actions" style="padding:0 var(--space-4) var(--space-3)">
        <button class="btn btn-outline btn-sm no-print" onclick="showQrFor('${eq.item_id}')"><i data-lucide="qr-code"></i> QR</button>
        <button class="btn btn-ghost btn-sm no-print" onclick="handleToggleType('${eq.item_id}')"><i data-lucide="refresh-cw"></i> Type</button>
        <button class="btn btn-danger btn-sm no-print" onclick="handleDelete('${eq.item_id}')"><i data-lucide="trash-2"></i> Delete</button>
      </div>
      <div id="qr-${eq.item_id}" class="hidden" style="padding:0 var(--space-4) var(--space-4)"></div>
    </div>`
  }).join('')
  lucide.createIcons()
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function resetAddForm() {
  document.getElementById('addForm').classList.add('hidden')
  document.getElementById('eqName').value = ''
  document.getElementById('eqType').value = ''
  document.getElementById('eqDesc').value = ''
  document.getElementById('eqStock').value = ''
  setError(null)
}

async function handleAddEquipment() {
  const name = document.getElementById('eqName').value.trim()
  if (!name) {
    setError('Please enter an equipment name.')
    document.getElementById('eqName').focus()
    return
  }

  const type = document.getElementById('eqType').value
  const desc = document.getElementById('eqDesc').value.trim()
  const stock = parseInt(document.getElementById('eqStock').value) || 0
  const btn = document.getElementById('saveEqBtn')
  btn.innerHTML = '<i data-lucide="loader-circle" class="lucide-spin"></i> Saving...'
  btn.disabled = true
  lucide.createIcons()
  setError(null)

  try {
    const result = await addEquipment(name, type, desc, stock)
    if (result.success) {
      resetAddForm()
      await loadEquipment()
    } else {
      setError(result.error || 'Failed to save equipment.')
    }
  } catch (e) {
    setError('Network error. Check your connection.')
  }

  btn.innerHTML = '<i data-lucide="check"></i> Save'
  btn.disabled = false
  lucide.createIcons()
}

async function handleToggleType(item_id) {
  const eq = equipment.find(e => e.item_id === item_id)
  if (!eq) return

  const newType = eq.type === 'Consumable' ? 'Non-Consumable' : 'Consumable'
  if (!confirm(`Change "${eq.item_name}" from "${eq.type || 'None'}" to "${newType}"?`)) return

  setError(null)
  try {
    await deleteEquipment(item_id)
    const result = await addEquipment(eq.item_name, newType, eq.description, eq.stock, eq.item_id)
    if (result.success) {
      await loadEquipment()
    } else {
      setError(result.error || 'Failed to update type.')
    }
  } catch (e) {
    setError('Network error.')
  }
}

async function handleDelete(item_id) {
  if (!confirm('Delete this equipment? This action cannot be undone.')) return
  setError(null)

  try {
    const result = await deleteEquipment(item_id)
    if (result.success) {
      await loadEquipment()
    } else {
      setError(result.error || 'Failed to delete.')
    }
  } catch (e) {
    setError('Network error.')
  }
}

function showQrFor(item_id) {
  const container = document.getElementById(`qr-${item_id}`)
  if (!container.classList.contains('hidden')) {
    container.classList.add('hidden')
    container.innerHTML = ''
    return
  }

  container.classList.remove('hidden')
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  setTimeout(() => {
    container.innerHTML = ''
    new QRCode(container, { text: item_id, width: 140, height: 140 })
  }, 50)
}

async function loadCommsEquipment() {
  const container = document.getElementById('commsEquipmentContainer')
  container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading comms items...</span></div>'

  try {
    const result = await getCommsEquipment()
    if (result.equipment && result.equipment.length) {
      commsEquipment = result.equipment
      renderCommsEquipment()
    } else {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="radio"></i></div><p>No comms items yet. Add your first item.</p></div>'
      lucide.createIcons()
    }
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div><p>Failed to load comms items.</p></div>'
    lucide.createIcons()
  }
}

function renderCommsEquipment() {
  const container = document.getElementById('commsEquipmentContainer')
  container.innerHTML = commsEquipment.map(item => `
    <div class="equipment-card">
      <div class="equipment-card-main">
        <div class="equipment-card-body">
          <h3>${escapeHtml(item.item_name)}</h3>
          <p class="desc">${item.spec ? escapeHtml(item.spec) : 'No spec'}</p>
          <span class="meta">${escapeHtml(item.item_id)}</span>
        </div>
      </div>
      <div class="equipment-card-actions" style="padding:0 var(--space-4) var(--space-3)">
        <button class="btn btn-outline btn-sm no-print" onclick="showCommsQrFor('${item.item_id}')"><i data-lucide="qr-code"></i> QR</button>
        <button class="btn btn-danger btn-sm no-print" onclick="handleDeleteCommsItem('${item.item_id}')"><i data-lucide="trash-2"></i> Delete</button>
      </div>
      <div id="comms-qr-${item.item_id}" class="hidden" style="padding:0 var(--space-4) var(--space-4)"></div>
    </div>`
  ).join('')
  lucide.createIcons()
}

function resetCommsAddForm() {
  document.getElementById('commsAddForm').classList.add('hidden')
  document.getElementById('commsName').value = ''
  document.getElementById('commsSpec').value = ''
  setError(null)
}

async function handleAddCommsItem() {
  const name = document.getElementById('commsName').value.trim()
  if (!name) {
    setError('Please enter an item name.')
    document.getElementById('commsName').focus()
    return
  }

  const spec = document.getElementById('commsSpec').value.trim()
  const btn = document.getElementById('saveCommsBtn')
  btn.innerHTML = '<i data-lucide="loader-circle" class="lucide-spin"></i> Saving...'
  btn.disabled = true
  lucide.createIcons()
  setError(null)

  try {
    const result = await addCommsItem(name, spec)
    if (result.success) {
      resetCommsAddForm()
      await loadCommsEquipment()
    } else {
      setError(result.error || 'Failed to save comms item.')
    }
  } catch (e) {
    setError('Network error. Check your connection.')
  }

  btn.innerHTML = '<i data-lucide="check"></i> Save'
  btn.disabled = false
  lucide.createIcons()
}

async function handleDeleteCommsItem(item_id) {
  if (!confirm('Delete this comms item? This action cannot be undone.')) return
  setError(null)

  try {
    const result = await deleteCommsItem(item_id)
    if (result.success) {
      await loadCommsEquipment()
    } else {
      setError(result.error || 'Failed to delete.')
    }
  } catch (e) {
    setError('Network error.')
  }
}

function showCommsQrFor(item_id) {
  const container = document.getElementById(`comms-qr-${item_id}`)
  if (!container.classList.contains('hidden')) {
    container.classList.add('hidden')
    container.innerHTML = ''
    return
  }

  container.classList.remove('hidden')
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  setTimeout(() => {
    container.innerHTML = ''
    new QRCode(container, { text: item_id, width: 140, height: 140 })
  }, 50)
}

function toggleCommsQrSection() {
  const section = document.getElementById('commsQrSection')
  const grid = document.getElementById('commsQrGrid')

  if (!section.classList.contains('hidden')) {
    section.classList.add('hidden')
    return
  }

  section.classList.remove('hidden')
  grid.innerHTML = ''
  commsQrInstances = []

  commsEquipment.forEach(item => {
    const div = document.createElement('div')
    div.className = 'qr-item'

    const qrDiv = document.createElement('div')
    const label = document.createElement('label')
    label.textContent = `${item.item_name} (${item.item_id})`

    div.appendChild(qrDiv)
    div.appendChild(label)
    grid.appendChild(div)

    commsQrInstances.push(new QRCode(qrDiv, { text: item.item_id, width: 128, height: 128 }))
  })
}

function toggleQrSection() {
  const section = document.getElementById('qrSection')
  const grid = document.getElementById('qrGrid')

  if (!section.classList.contains('hidden')) {
    section.classList.add('hidden')
    return
  }

  section.classList.remove('hidden')
  grid.innerHTML = ''
  qrInstances = []

  equipment.forEach(eq => {
    const div = document.createElement('div')
    div.className = 'qr-item'

    const qrDiv = document.createElement('div')
    const label = document.createElement('label')
    label.textContent = `${eq.item_name} (${eq.item_id})`

    div.appendChild(qrDiv)
    div.appendChild(label)
    grid.appendChild(div)

    qrInstances.push(new QRCode(qrDiv, { text: eq.item_id, width: 128, height: 128 }))
  })
}
