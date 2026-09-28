const APP_NAME = 'SM Equipment Monitoring'

const CONFIG = {
  // Relative path works when Express serves both frontend + API
  API_URL: '/api',
  USE_MOCK: false,
}

const COMMS_EVENTS = [
  'Sunday Service',
  'Tuesday Worship Service',
  'Special Service (Support when Requested)',
  'Empowered Night',
  'Others',
]

const COMMS_ITEMS = [
  { item_id: 'COMMS-BASE-01', item_name: 'Base Station', spec: '1 pc' },
  { item_id: 'COMMS-ANTENNA-01', item_name: 'Antenna', spec: '2 pcs' },
  { item_id: 'COMMS-CABLE-01', item_name: 'Cable', spec: '1 pc' },
  { item_id: 'COMMS-POE-01', item_name: 'POE Adapter', spec: '1 pc' },
  { item_id: 'COMMS-KNOB-01', item_name: 'Pet Knob with Tripod Adapter', spec: '1 Knob, 1 Adapter' },
  // expected_count: scanning this item asks how many are present (count_noun is the plural used in the question).
  { item_id: 'COMMS-BATT-01', item_name: 'Beltpack Battery', spec: '16 pcs (8 spares)', expected_count: 16, count_noun: 'beltpack batteries' },
  { item_id: 'COMMS-CHARGER-01', item_name: 'Charging Base', spec: '1 pc' },
  { item_id: 'COMMS-XLR-01', item_name: '4-Pin XLR Adapter', spec: '1 pc' },
  { item_id: 'COMMS-CASE-01', item_name: 'M1 Hard Case', spec: '1 pc' },
]

const BELTPACK_IDS = ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6', 'SM7', 'SM8']

// Reference photos shown in the Comms Checklist. Leave '' until a photo exists;
// the checklist shows "No photo yet". See img/comms/README.md for naming and size.
const COMMS_PHOTOS = {
  'COMMS-BASE-01': 'img/comms/COMMS-BASE-01.jpg',
  'COMMS-ANTENNA-01': 'img/comms/COMMS-ANTENNA-01.jpg',
  'COMMS-CABLE-01': 'img/comms/COMMS-CABLE-01.jpg',
  'COMMS-POE-01': 'img/comms/COMMS-POE-01.jpg',
  'COMMS-KNOB-01': 'img/comms/COMMS-KNOB-01.jpg',
  'COMMS-BATT-01': 'img/comms/COMMS-BATT-01.jpg',
  'COMMS-CHARGER-01': 'img/comms/COMMS-CHARGER-01.jpg',
  'COMMS-XLR-01': 'img/comms/COMMS-XLR-01.jpg',
  'COMMS-CASE-01': 'img/comms/COMMS-CASE-01.jpg',
  BELTPACK: 'img/comms/BELTPACK.jpg',
  HEADSET: 'img/comms/HEADSET.jpg',
}

const MOCK_EQUIPMENT = [
  { item_id: 'EQ-001', item_name: 'Tool Box', type: 'Non-Consumable', description: '2 pcs', stock: 2, status: 'available' },
  { item_id: 'EQ-002', item_name: 'Gun tacker', type: 'Non-Consumable', description: '1 pc', stock: 1, status: 'available' },
  { item_id: 'EQ-003', item_name: 'Gun tack staple', type: 'Consumable', description: '5 boxes', stock: 5, status: 'available' },
  { item_id: 'EQ-004', item_name: 'Safety Pin', type: 'Consumable', description: '1 set (100 pcs)', stock: 1, status: 'available' },
  { item_id: 'EQ-005', item_name: 'Thumb tacks', type: 'Consumable', description: '2 boxes', stock: 2, status: 'available' },
  { item_id: 'EQ-006', item_name: 'Zip Ties', type: 'Consumable', description: '1 set (100 pcs)', stock: 1, status: 'available' },
  { item_id: 'EQ-007', item_name: 'Rubber Bands', type: 'Consumable', description: '1 set (100 pcs)', stock: 1, status: 'available' },
  { item_id: 'EQ-008', item_name: 'Combination Pliers', type: 'Non-Consumable', description: '1 pc', stock: 1, status: 'available' },
  { item_id: 'EQ-009', item_name: 'Screw Driver', type: 'Non-Consumable', description: '1 set', stock: 1, status: 'available' },
  { item_id: 'EQ-010', item_name: 'Hammer', type: 'Non-Consumable', description: '1 pc', stock: 1, status: 'available' },
  { item_id: 'EQ-011', item_name: 'Instant Glue', type: 'Consumable', description: '2 pcs', stock: 2, status: 'available' },
  { item_id: 'EQ-012', item_name: 'Anti-Slip', type: 'Non-Consumable', description: '5 pcs', stock: 5, status: 'available' },
  { item_id: 'EQ-013', item_name: 'Masking tape', type: 'Consumable', description: '15 pcs', stock: 15, status: 'available' },
  { item_id: 'EQ-014', item_name: 'Duct tape', type: 'Consumable', description: '20 pcs', stock: 20, status: 'available' },
  { item_id: 'EQ-015', item_name: 'Caution tape', type: 'Consumable', description: '15 pcs', stock: 15, status: 'available' },
  { item_id: 'EQ-016', item_name: 'Double-sided tape', type: 'Consumable', description: '2 sets', stock: 2, status: 'available' },
  { item_id: 'EQ-017', item_name: 'Electrical Tape', type: 'Consumable', description: '10 pcs', stock: 10, status: 'available' },
  { item_id: 'EQ-018', item_name: 'Glow tape', type: 'Consumable', description: '25 pcs', stock: 25, status: 'available' },
  { item_id: 'EQ-019', item_name: 'Ball Pen', type: 'Consumable', description: '1 box', stock: 1, status: 'available' },
  { item_id: 'EQ-020', item_name: 'Permanent Marker', type: 'Consumable', description: '1 box', stock: 1, status: 'available' },
  { item_id: 'EQ-021', item_name: 'Scissors', type: 'Non-Consumable', description: '5 pcs', stock: 5, status: 'available' },
  { item_id: 'EQ-022', item_name: 'Cutter Blade', type: 'Consumable', description: '1 box', stock: 1, status: 'available' },
  { item_id: 'EQ-023', item_name: 'Cutter', type: 'Non-Consumable', description: '5 pcs', stock: 5, status: 'available' },
  { item_id: 'EQ-024', item_name: 'Black Tray', type: 'Non-Consumable', description: '3 pcs', stock: 3, status: 'available' },
  { item_id: 'EQ-025', item_name: 'Black Mesh Pouch', type: 'Non-Consumable', description: '1 pc', stock: 1, status: 'available' },
  { item_id: 'EQ-026', item_name: 'Tissue Box', type: 'Consumable', description: '3 pcs', stock: 3, status: 'available' },
  { item_id: 'EQ-027', item_name: 'Bond Paper', type: 'Consumable', description: '1 ream', stock: 1, status: 'available' },
  { item_id: 'EQ-028', item_name: 'Inflator', type: 'Non-Consumable', description: '2 pcs', stock: 2, status: 'available' },
  { item_id: 'EQ-029', item_name: 'Extension', type: 'Non-Consumable', description: '2 pcs', stock: 2, status: 'available' },
]
