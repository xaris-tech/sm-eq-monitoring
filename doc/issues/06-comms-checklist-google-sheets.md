## What to build

Configure and verify the Comms Checklist flow works end-to-end using Google Sheets. This proves the comms module is fully migrated from Google Apps Script to the Express API.

**Steps:**
1. Verify GET `/api/comms` reads comms equipment from the CommsEquipment sheet
2. Verify POST `/api/comms` adds a new comms item to the sheet
3. Verify DELETE `/api/comms/:item_id` removes a comms item from the sheet
4. Verify POST `/api/comms/checklist` writes a complete checklist submission to the CommsChecklist sheet (including items status, beltpack usernames, headset status)
5. Verify the full form flow on `comms-checklist.html` — fill name, event, scan comms item QRs, mark beltpack/headset status, submit
6. Verify the confirmation screen shows after successful submission

## Acceptance criteria

- [ ] Comms equipment list loads from Google Sheets in admin panel (Comms tab)
- [ ] Admin can add/delete comms items — reflected in Google Sheets
- [ ] Comms checklist page loads equipment from API
- [ ] Full checklist: scan all comms items → mark beltpack/headset status → submit → data persisted to CommsChecklist sheet
- [ ] Confirmation shows after successful submission
- [ ] All flows work without `USE_MOCK`

## Blocked by

- [04-fix-csp-and-auth](04-fix-csp-and-auth.md) (icons needed for comms-checklist.html UI)
