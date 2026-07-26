## What to build

Build the full Comms Checklist form page (`/comms-checklist.html`) with manual entry (QR integration comes in a later slice). All data flows end-to-end through mock mode:

**Header fields:**
- Full Name (text, required)
- Timestamp (auto, live clock)
- Church Event and Activity (dropdown: Sunday Service, Tuesday Worship Service, Special Service, Empowered Night, Others)
- If "Others" selected, show a text input for custom event name
- SLOT (radio: AM / PM)

**Checklist grid** (9 items):
Each row: Item name, spec, status toggle (Complete / Incomplete / N/A), text Notes field.

| Item | Spec |
|------|------|
| Base Station | 1 pc |
| Antenna | 2 pcs |
| Cable | 1 pc |
| POE Adapter | 1 pc |
| Pet Knob with Tripod Adapter | 1 Knob, 1 Adapter |
| Beltpack Battery | 16 pcs (8 spares) |
| Charging Base | 1 pc |
| 4-Pin XLR Adapter | 1 pc |
| M1 Hard Case | 1 pc |

**Beltpack assignment** (SM1–SM8):
Each gets a text input for the assigned username. Default "N/A".

**Headset assignment** (SM1–SM8):
Each gets: status dropdown (Working / Needs Repair / Needs Replacement / N/A) + Notes text field.

**Submit:**
- Validate at least the required fields (Name, Event, Slot)
- Submit via `api()` to mock store → confirmation screen
- Confirmation shows: name, event, slot, timestamp, item count

## Acceptance criteria

- [x] All form fields render correctly on `/comms-checklist.html` (incl. SLOT AM/PM radio)
- [ ] "Others" event shows/hides the custom event text field
- [ ] Items can be toggled between Complete / Incomplete / N/A
- [ ] Beltpack and headset fields are editable
- [ ] Submit with mock data shows confirmation with summary
- [ ] Submit with missing required fields shows validation error
- [ ] Form resets after confirmation

## Blocked by

- #00 — Landing page with two options (needs the nav infrastructure and the URL route)
