## What to build

Add QR scanning support to the Comms Checklist page. Each comms item gets a QR code encoding its item ID (e.g. `COMMS-BASE-01`). Scanning a QR with the phone camera automatically marks that item as "Complete" in the form.

Also add a **Comms Items** section to the admin page (`admin.html`) for:
- Viewing all comms items
- Generating/printing QR codes for each item

**Scanner behavior:**
- A "Scan Item QR" button opens the camera overlay (same pattern as the borrow flow)
- Scanning a valid comms QR sets that item's status to "Complete"
- If the QR code doesn't match any comms item, show an error

**Admin additions:**
- New tab/section: "Comms Items"
- List of comms items with name, ID, description
- "Show All QR Codes" button that renders a print-ready grid
- Each QR encodes the comms item ID only

**Seed data (mock):**
```
COMMS-BASE-01 — Base Station
COMMS-ANTENNA-01 — Antenna
COMMS-CABLE-01 — Cable
COMMS-POE-01 — POE Adapter
COMMS-KNOB-01 — Pet Knob with Tripod Adapter
COMMS-BATT-01 — Beltpack Battery
COMMS-CHARGER-01 — Charging Base
COMMS-XLR-01 — 4-Pin XLR Adapter
COMMS-CASE-01 — M1 Hard Case
```

## Acceptance criteria

- [ ] Comms Checklist page has a "Scan Item QR" button that opens the camera
- [ ] Scanning a valid comms QR marks that item as "Complete" in the checklist grid
- [ ] Scanning an unrecognized QR shows an error
- [ ] Admin Comms Items section lists all comms items with QR generation
- [ ] QR print sheet renders correctly for comms items
- [ ] All QR codes are scannable and resolve to the correct item ID

## Blocked by

- `01-comms-checklist-form.md` — needs the form UI to wire scanning into

