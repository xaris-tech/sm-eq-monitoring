// ─── Real API ──────────────────────────────────────────────────

const API_BASE = CONFIG.API_URL

function getAuthHeaders() {
  // admin.js stores the token in 'admin_auth' after login
  const token = sessionStorage.getItem('admin_auth')
  // Only send Bearer header if it looks like a real token (not 'true')
  return token && token !== 'true' ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  return res.json()
}

// ─── Equipment ─────────────────────────────────────────────────

async function getEquipment() {
  return CONFIG.USE_MOCK ? mockGetEquipment() : apiFetch('GET', '/equipment')
}

async function addEquipment(item_name, type, description, stock, item_id) {
  return CONFIG.USE_MOCK
    ? mockAddEquipment(item_name, type, description, stock, item_id)
    : apiFetch('POST', '/equipment', { item_name, type, description, stock, item_id })
}

async function deleteEquipment(item_id) {
  return CONFIG.USE_MOCK
    ? mockDeleteEquipment(item_id)
    : apiFetch('DELETE', `/equipment/${encodeURIComponent(item_id)}`)
}

// ─── Borrow / Return ───────────────────────────────────────────

async function submitBorrow(name, items, time) {
  return CONFIG.USE_MOCK
    ? mockSubmitBorrow(name, items, time)
    : apiFetch('POST', '/borrow', { name, items, time })
}

async function submitReturn(name, items, time) {
  return CONFIG.USE_MOCK
    ? mockSubmitReturn(name, items, time)
    : apiFetch('POST', '/return', { name, items, time })
}

// ─── Comms Checklist ───────────────────────────────────────────

async function getCommsEquipment() {
  return CONFIG.USE_MOCK
    ? { equipment: JSON.parse(JSON.stringify(COMMS_ITEMS)) }
    : apiFetch('GET', '/comms')
}

async function addCommsItem(item_name, spec) {
  return CONFIG.USE_MOCK
    ? mockAddCommsItem(item_name, spec)
    : apiFetch('POST', '/comms', { item_name, spec })
}

async function deleteCommsItem(item_id) {
  return CONFIG.USE_MOCK
    ? mockDeleteCommsItem(item_id)
    : apiFetch('DELETE', `/comms/${encodeURIComponent(item_id)}`)
}

async function submitChecklist(payload) {
  return CONFIG.USE_MOCK
    ? mockSubmitChecklist(payload)
    : apiFetch('POST', '/comms/checklist', payload)
}

// ─── Admin ─────────────────────────────────────────────────────

async function adminLogin(password) {
  if (CONFIG.USE_MOCK) return mockAdminLogin(password)
  return apiFetch('POST', '/admin/login', { password })
}

async function seedEquipment() {
  return CONFIG.USE_MOCK ? mockSeedEquipment() : apiFetch('POST', '/admin/seed')
}

async function getAdminLogs() {
  return CONFIG.USE_MOCK ? mockGetAdminLogs() : apiFetch('GET', '/admin/logs')
}

// ─── Mock Store ────────────────────────────────────────────────

let mockStore = {
  equipment: JSON.parse(JSON.stringify(MOCK_EQUIPMENT)),
  logs: [],
  commsEquipment: JSON.parse(JSON.stringify(COMMS_ITEMS)),
  commsChecklists: [],
  adminToken: null,
}

// ─── Mock API ──────────────────────────────────────────────────

function mockGetEquipment() {
  return { equipment: mockStore.equipment }
}

function mockAddEquipment(item_name, type, description, stock, item_id) {
  const id = item_id || 'EQ-' + String(mockStore.equipment.length + 1).padStart(3, '0')
  mockStore.equipment.push({
    item_id: id, item_name, type: type || '', description: description || '',
    stock: stock || 0, status: 'available',
  })
  return { success: true, item_id: id }
}

function mockDeleteEquipment(item_id) {
  mockStore.equipment = mockStore.equipment.filter(e => e.item_id !== item_id)
  return { success: true }
}

function mockSubmitBorrow(name, items, time) {
  const results = []
  for (const item of items) {
    const eq = mockStore.equipment.find(e => e.item_id === item.item_id)
    if (!eq) return { success: false, error: `Equipment '${item.item_id}' not found` }

    const qty = item.quantity || 1
    if (eq.type === 'Consumable') {
      if (qty > eq.stock) {
        return {
          success: false,
          error: `Insufficient stock for '${eq.item_name}'. Available: ${eq.stock}, Requested: ${qty}`,
        }
      }
      eq.stock -= qty
      mockStore.logs.push({
        log_id: crypto.randomUUID(), borrower: name,
        item_id: item.item_id, item_name: eq.item_name,
        item_type: 'consumable', quantity: qty,
        borrow_time: time, return_time: '',
      })
      results.push({ item_id: item.item_id, status: 'borrowed', consumed: qty, remaining_stock: eq.stock })
    } else {
      eq.status = 'borrowed'
      mockStore.logs.push({
        log_id: crypto.randomUUID(), borrower: name,
        item_id: item.item_id, item_name: eq.item_name,
        item_type: 'non-consumable', quantity: 1,
        borrow_time: time, return_time: '',
      })
      results.push({ item_id: item.item_id, status: 'borrowed' })
    }
  }
  return { success: true, results }
}

function mockSubmitReturn(name, items, time) {
  const results = []
  for (const item of items) {
    const eq = mockStore.equipment.find(e => e.item_id === item.item_id)
    if (!eq) return { success: false, error: `Equipment '${item.item_id}' not found` }

    if (eq.type === 'Consumable') {
      return {
        success: false,
        error: `Consumable items cannot be returned. Item '${eq.item_name}' is consumable.`,
      }
    }

    eq.status = 'available'
    const log = mockStore.logs.filter(l => l.item_id === item.item_id && !l.return_time)
    if (log.length) log[log.length - 1].return_time = time
    results.push({ item_id: item.item_id, status: 'returned' })
  }
  return { success: true, results }
}

let mockCommsIdCounter = COMMS_ITEMS.length + 1

function mockAddCommsItem(item_name, spec) {
  const id = 'COMMS-' + String(mockCommsIdCounter++).padStart(3, '0')
  mockStore.commsEquipment.push({ item_id: id, item_name, spec: spec || '' })
  return { success: true, item_id: id }
}

function mockDeleteCommsItem(item_id) {
  mockStore.commsEquipment = mockStore.commsEquipment.filter(e => e.item_id !== item_id)
  return { success: true }
}

function mockSubmitChecklist(payload) {
  mockStore.commsChecklists.push({
    id: crypto.randomUUID(), name: payload.name, event: payload.event,
    event_other: payload.event_other || '', slot: payload.slot,
    timestamp: payload.timestamp, items: payload.items,
    beltpacks: payload.beltpacks, headsets: payload.headsets,
  })
  return { success: true }
}

function mockAdminLogin(password) {
  if (password === '#Isaiah40:3!') {
    const token = crypto.randomUUID()
    mockStore.adminToken = token
    return { success: true, token }
  }
  return { success: false, error: 'Incorrect password' }
}

function mockSeedEquipment() {
  mockStore.equipment = JSON.parse(JSON.stringify(MOCK_EQUIPMENT))
  return { success: true, count: MOCK_EQUIPMENT.length }
}

function mockGetAdminLogs() {
  return { logs: mockStore.logs }
}
