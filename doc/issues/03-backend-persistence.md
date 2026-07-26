## What to build

Replace mock mode for the Comms Checklist with real Google Apps Script persistence.

**Backend (`apps-script/Code.gs`):**
- Add a new handler for `action: submitChecklist`
- Accept the full payload: name, event, event_other, slot, timestamp, all 9 item statuses, 8 beltpack assignments, 8 headset statuses
- Write to a new sheet named `CommsChecklist`
- Add a new `action: getCommsEquipment` handler that returns the comms equipment list from a new `CommsEquipment` sheet
- Add `action: addCommsItem` and `action: deleteCommsItem` for admin management

**Frontend (`js/api.js`):**
- Add `submitChecklist(name, event, slot, items, beltpacks, headsets, timestamp)` function
- Add `getCommsEquipment()`, `addCommsItem()`, `deleteCommsItem()` functions
- Wire real `CONFIG.API_URL` calls when `USE_MOCK` is false

**Admin page:**
- Comms Items CRUD now persists to real sheet
- Checklist history view (optional for MVP — can show a simple list of past submissions)

**Config:**
- Keep `USE_MOCK: false` as default once deployed — the app must work with real data

## Acceptance criteria

- [x] Google Sheet has `CommsChecklist` and `CommsEquipment` sheets (auto-created by `ensureCommsChecklistSheet` / `ensureCommsEquipmentSheet`)
- [x] Apps Script deploy handles all 4 new actions (`getCommsEquipment` in doGet, `submitChecklist` / `addCommsItem` / `deleteCommsItem` in doPost)
- [x] Submitting a checklist writes a complete row to `CommsChecklist`
- [x] Admin add/delete comms items persists to `CommsEquipment`
- [x] Setting `USE_MOCK: false` uses real API, `USE_MOCK: true` uses mock store (already wired in `api.js` — `api()` routes to real URL or `mockApi()`)
- [x] Previous borrow/return flow still works (no regressions) — existing handlers untouched

## Blocked by

- `02-comms-qr-scanning.md` — needs the full frontend form and scanner before backend wiring

