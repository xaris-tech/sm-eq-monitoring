# PRD: SM Equipment Monitoring — Inventory Overhaul (Consumable Quantity & Stock Management)

## 1. Overview

Overhaul the inventory system to properly distinguish **Consumable** vs **Non-Consumable** items across borrow/return flows, stock tracking, and admin management. The core change: consumable items require a **quantity** field on borrow (since they're consumed, not returned), and stock levels auto-adjust accordingly.

## 2. Problem Statement

The current system has two item types (`Consumable` / `Non-Consumable`) defined in the data model, but:

- Quantity inputs for consumables exist in the frontend code but have edge-case gaps (no min/max enforcement, no low-stock gating)
- Both consumables and non-consumables go through the same return flow, but consumables are **consumed** — they shouldn't be "returned"
- Stock values exist per item but are never decremented on borrow or incremented on return
- No low-stock or out-of-stock warnings anywhere in the UI
- No visibility for admins into stock consumption history

## 3. Goals

- **Borrow flow:** Quantity input for consumables with validation (min 1, max = available stock, cannot exceed stock)
- **Return flow:** Consumables hidden from return flow entirely (they are consumed, not returned)
- **Stock management:** Auto-decrement stock when a consumable is borrowed; auto-restore when a non-consumable is returned
- **Alerts:** Low-stock warning badge (stock <= 2) and out-of-stock gating (stock = 0 blocks borrowing)
- **Admin panel:** Stock column visible per item, stock consumption log, low-stock highlights
- **Data integrity:** Server-side stock validation in Apps Script; reject borrows that exceed available stock

## 4. Non-Goals

- Physical inventory audit / cycle count feature
- Barcode/RFID scanning (QR only)
- Multi-warehouse or location tracking
- Purchase order / reorder automation
- User accounts or authentication (beyond admin)

## 5. Detailed Changes

### 5.1 Borrow Flow (`borrow.html` + `app.js`)

#### Consumable Quantity Input
- When a consumable is scanned, show a quantity stepper (number input) set to `min=1`, `max=item.stock`, default `1`
- Pre-fill from `item._quantity` if re-scanning
- Visually style the chip differently for consumables vs non-consumables (icon or badge)

#### Validation at Submit
- For each consumable: `quantity > 0 && quantity <= stock`
- If quantity exceeds stock: show inline error on that chip, block submission
- Show per-item subtotal and overall item count (including total consumable qty)

#### Stock Gating
- If `item.stock === 0`: show "Out of Stock" badge on the equipment chip, do not add to list
- If scanning an already-borrowed non-consumable: warn `"This item is currently borrowed by someone else"` (existing logic)

### 5.2 Return Flow (`borrow.html` + `app.js`)

- **Consumables excluded entirely** from the return scanner
- If a user scans a consumable QR during return mode: show `"Consumable items are not returned — they are consumed."`
- Non-consumables behave as today (scan to return, mark as available, restore stock)

### 5.3 Confirmation Screen

- Distinguish consumables vs non-consumables in the confirmation details
- For consumables: show `"Item Name x Qty consumed"`
- For non-consumables: show `"Item Name (returned)"` or `"Item Name (borrowed)"`
- Show total items count vs total consumable quantity separately

### 5.4 Stock Management

#### On Borrow (Consumable)
- `stock = stock - quantity`
- If stock reaches 0, status stays `available` but stock = 0

#### On Borrow (Non-Consumable)
- Stock unchanged
- Status changes to `borrowed`

#### On Return (Non-Consumable)
- Stock unchanged
- Status changes to `available`

#### BorrowLog
- Add `type` column to BorrowLog to distinguish consumable vs non-consumable records
- Consumable borrows record: `item_id, item_name, type=consumable, quantity, borrower, borrow_time`
- Non-consumable borrows record: `item_id, item_name, type=non-consumable, quantity=1, borrower, borrow_time, return_time`

### 5.5 Admin Panel (`admin.html` + `admin.js`)

#### Equipment Tab
- Stock column always visible in equipment list
- Low-stock items (stock <= 2) highlighted with an amber badge
- Out-of-stock items (stock = 0) highlighted with a red badge
- "Restock" button next to each consumable item to increment stock
- Stock adjustment log tab (see new borrow log entries)

#### New Tab: Stock Log
- Read-only view of all borrow log entries (consumable and non-consumable)
- Filterable by type (Consumable / Non-Consumable)
- Columns: Date, Borrower, Item, Type, Qty, Status (Borrowed/Returned)
- Sortable by date descending

### 5.6 Apps Script Backend (`Code.gs`)

#### `borrow()` — Stock Validation
- Before appending row, read current stock from Equipment sheet
- If item is consumable and `quantity > stock`: return error `{ success: false, error: 'Insufficient stock. Available: X, Requested: Y' }`
- After successful borrow: decrement stock in Equipment sheet

#### `doReturn()` — Consumable Block
- If item type is consumable: return error `{ success: false, error: 'Consumable items cannot be returned.' }`
- After successful return: restore stock to original +1 (non-consumables only)

#### New Endpoints
- `GET ?action=getStockLog` — Return all borrow log entries
- `POST ?action=restock` — Increment stock for a specific item by a given quantity

### 5.7 Data Model Changes

#### BorrowLog Sheet — Updated Columns

| Col | Field | Description |
|-----|-------|-------------|
| 0 | log_id | UUID |
| 1 | borrower | Borrower name |
| 2 | item_id | Equipment ID |
| 3 | item_name | Equipment name |
| 4 | item_type | `consumable` or `non-consumable` |
| 5 | quantity | Number of units |
| 6 | borrow_time | ISO timestamp |
| 7 | return_time | ISO timestamp (empty for consumables, filled for returned non-consumables) |

#### Equipment Sheet (unchanged)

| Col | Field |
|-----|-------|
| 0 | item_id |
| 1 | item_name |
| 2 | type |
| 3 | description |
| 4 | stock |
| 5 | status |

## 6. UI/UX Details

### Borrow Chip — Consumable
```
┌──────────────────────────────────────┐
│ 📦 Gun tack staple         [x]       │
│   EQ-003                             │
│   Stock: 5                           │
│   ┌──────┐ [-][ 2 ][+]  Consume      │
└──────────────────────────────────────┘
```

### Borrow Chip — Non-Consumable
```
┌──────────────────────────────────────┐
│ 🔧 Hammer                  [x]       │
│   EQ-010                             │
│   Available · 1 pc                   │
└──────────────────────────────────────┘
```

### Low-Stock Badge (Admin)
```
┌──────────────────────────────────────┐
│ 📦 Masking tape                      │
│   EQ-013        [⚠ Low Stock: 1]     │
└──────────────────────────────────────┘
```

## 7. Implementation Phases

### Phase 1 — Quantity + Stock Core (Frontend)
1. Refine quantity input for consumables in borrow flow (`app.js`)
2. Add stock display to equipment chips
3. Add client-side validation (quantity <= stock)
4. Remove consumables from return flow
5. Update confirmation screen for consumable/non-consumable distinction

### Phase 2 — Backend Stock Management (Apps Script)
1. Add stock validation to `borrow()` endpoint
2. Auto-decrement stock on consumable borrow
3. Block returns of consumable items
4. Add `restock` endpoint for admin
5. Update BorrowLog schema with `item_type` column

## 8. Open Questions

1. **Stock for non-consumables** — Should non-consumables also track stock? (Currently some have stock > 1). For now: non-consumables do NOT auto-decrement stock on borrow, only status changes.
2. **Stock restoration on return (non-consumable)** — Currently non-consumables don't change stock. Should returning a non-consumable increment stock? No — stock for non-consumables represents physical count, not available-to-borrow.
3. **Borrow limit** — Should there be a max per-transaction quantity for consumables? Not yet — addressed by per-item stock limit.
4. **Negative stock** — Prevent borrowing below 0 stock. Should we allow negative stock for special cases? No — reject with error.
5. **Partial return of consumables** — If a consumable is partially consumed but some is left, should we support returning the remainder? Not in scope — future consideration.

## 9. Future Considerations

- Email/Telegram notifications to admin when stock runs low
- Periodic inventory report generator (PDF)
- Bulk stock import from CSV
- Consumable usage trends (which items are consumed fastest)
- Barcode/RFID fallback for QR
