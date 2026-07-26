# API Reference — SM Equipment Monitoring

Base URL: `https://<your-deployment>/api`

All endpoints return JSON. Errors follow the format `{ error: string }`.

---

## Equipment

### `GET /api/equipment`

List all equipment items.

**Response `200`:**

```json
{
  "equipment": [
    {
      "item_id": "EQ-001",
      "item_name": "Tool Box",
      "type": "Non-Consumable",
      "description": "2 pcs",
      "stock": 2,
      "status": "available"
    },
    {
      "item_id": "EQ-003",
      "item_name": "Gun tack staple",
      "type": "Consumable",
      "description": "5 boxes",
      "stock": 5,
      "status": "available"
    }
  ]
}
```

### `POST /api/equipment`

Add a new equipment item.

**Request body:**

```json
{
  "item_name": "Cordless Drill",
  "type": "Non-Consumable",
  "description": "18V Makita",
  "stock": 1,
  "item_id": "EQ-030"
}
```

`type` must be `"Consumable"` or `"Non-Consumable"`. `item_id` is optional — auto-generated if omitted.

**Response `201`:**

```json
{
  "success": true,
  "item_id": "EQ-030"
}
```

### `DELETE /api/equipment/:item_id`

Remove an equipment item.

**Response `200`:**

```json
{
  "success": true
}
```

**Response `404`:**

```json
{
  "error": "Equipment not found"
}
```

### `PATCH /api/equipment/:item_id/restock`

Increment stock for a consumable item (admin use).

**Request body:**

```json
{
  "quantity": 5
}
```

**Response `200`:**

```json
{
  "success": true,
  "new_stock": 10
}
```

### `PATCH /api/equipment/:item_id/toggle-type`

Toggle item between Consumable and Non-Consumable (admin use).

**Response `200`:**

```json
{
  "success": true,
  "new_type": "Consumable"
}
```

---

## Borrow / Return

### `POST /api/borrow`

Borrow one or more items.

**Request body:**

```json
{
  "name": "Juan Dela Cruz",
  "items": [
    { "item_id": "EQ-001", "item_name": "Tool Box", "quantity": 1 },
    { "item_id": "EQ-003", "item_name": "Gun tack staple", "quantity": 2 }
  ],
  "time": "2026-07-27T10:00:00.000Z"
}
```

- `time` is optional (defaults to server time).
- For **Non-Consumable** items: `quantity` is ignored (always 1).
- For **Consumable** items: `quantity` must be ≥ 1 and ≤ `stock`.

**Response `200`:**

```json
{
  "success": true,
  "results": [
    { "item_id": "EQ-001", "status": "borrowed" },
    { "item_id": "EQ-003", "status": "borrowed", "consumed": 2, "remaining_stock": 3 }
  ]
}
```

**Response `400` (validation error):**

```json
{
  "success": false,
  "error": "Insufficient stock for 'Gun tack staple'. Available: 5, Requested: 10"
}
```

### `POST /api/return`

Return one or more non-consumable items.

**Request body:**

```json
{
  "name": "Juan Dela Cruz",
  "items": [
    { "item_id": "EQ-001", "item_name": "Tool Box" }
  ],
  "time": "2026-07-27T16:00:00.000Z"
}
```

**Response `200`:**

```json
{
  "success": true,
  "results": [
    { "item_id": "EQ-001", "status": "returned" }
  ]
}
```

**Response `400`:**

```json
{
  "success": false,
  "error": "Consumable items cannot be returned. Item 'Gun tack staple' is consumable."
}
```

---

## Comms Checklist

### `GET /api/comms`

List all comms checklist items.

**Response `200`:**

```json
{
  "equipment": [
    {
      "item_id": "COMMS-BASE-01",
      "item_name": "Base Station",
      "spec": "1 pc"
    }
  ]
}
```

### `POST /api/comms`

Add a new comms item.

**Request body:**

```json
{
  "item_name": "Base Station",
  "spec": "1 pc"
}
```

**Response `201`:**

```json
{
  "success": true,
  "item_id": "COMMS-010"
}
```

### `DELETE /api/comms/:item_id`

Remove a comms item.

### `POST /api/comms/checklist`

Submit a completed comms checklist.

**Request body:**

```json
{
  "name": "Juan Dela Cruz",
  "event": "Sunday Service",
  "event_other": "",
  "slot": "AM",
  "timestamp": "2026-07-27T08:00:00.000Z",
  "items": [
    { "item_id": "COMMS-BASE-01", "status": "Complete", "notes": "" },
    { "item_id": "COMMS-ANTENNA-01", "status": "Complete", "notes": "" }
  ],
  "beltpacks": {
    "SM1": "Alice",
    "SM2": "Bob",
    "SM3": "N/A",
    "SM4": "N/A",
    "SM5": "N/A",
    "SM6": "N/A",
    "SM7": "N/A",
    "SM8": "N/A"
  },
  "headsets": {
    "SM1": { "status": "Working", "notes": "" },
    "SM2": { "status": "Working", "notes": "" }
  }
}
```

**Response `201`:**

```json
{
  "success": true
}
```

### `GET /api/comms/checklists`

List all submitted checklists (admin use).

---

## Admin

### `POST /api/admin/login`

Authenticate for admin access.

**Request body:**

```json
{
  "password": "admin123"
}
```

**Response `200`:**

```json
{
  "success": true,
  "token": "uuid-string"
}
```

**Response `401`:**

```json
{
  "success": false,
  "error": "Incorrect password"
}
```

### `POST /api/admin/seed`

Reset equipment to default seed data (admin, auth required).

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**

```json
{
  "success": true,
  "count": 29
}
```

### `GET /api/admin/logs`

Get the full borrow log (admin, auth required).

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**

```json
{
  "logs": [
    {
      "log_id": "uuid",
      "borrower": "Juan Dela Cruz",
      "item_id": "EQ-001",
      "item_name": "Tool Box",
      "item_type": "non-consumable",
      "quantity": 1,
      "borrow_time": "2026-07-27T10:00:00.000Z",
      "return_time": "2026-07-27T16:00:00.000Z"
    }
  ]
}
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request — validation error |
| 401 | Unauthorized — invalid or missing auth token |
| 404 | Resource not found |
| 500 | Internal server error |

All error responses:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Google Sheets Data Model

### Sheet: `Equipment`

| Column | Field | Description |
|--------|-------|-------------|
| A | item_id | Unique ID (EQ-001) |
| B | item_name | Human-readable name |
| C | type | `Consumable` or `Non-Consumable` |
| D | description | Free-text description |
| E | stock | Integer count |
| F | status | `available` or `borrowed` |

### Sheet: `BorrowLog`

| Column | Field | Description |
|--------|-------|-------------|
| A | log_id | UUID |
| B | borrower | Full name |
| C | item_id | Equipment ID |
| D | item_name | Equipment name |
| E | item_type | `consumable` or `non-consumable` |
| F | quantity | Number of units |
| G | borrow_time | ISO timestamp |
| H | return_time | ISO timestamp (empty for consumables) |

### Sheet: `CommsChecklist`

| Column | Field | Description |
|--------|-------|-------------|
| A | id | UUID |
| B | name | Full name |
| C | event | Event name |
| D | event_other | Custom event |
| E | slot | AM / PM |
| F | timestamp | ISO timestamp |
| G–O | Item status | 9 comms items (status \| notes) |
| P–W | Beltpack assignments | SM1–SM8 user names |
| X–AE | Headset status | SM1–SM8 (status \| notes) |

### Sheet: `CommsEquipment`

| Column | Field |
|--------|-------|
| A | item_id |
| B | item_name |
| C | spec |
