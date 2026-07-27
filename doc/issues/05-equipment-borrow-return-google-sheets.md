## What to build

Configure and verify the Equipment CRUD and Borrow/Return flows work end-to-end using Google Sheets as the backend. This is the primary vertical slice that proves the Express API correctly replaces the old Google Apps Script deployment.

**Steps:**
1. Configure real Google Sheets service account credentials in `server/.env` (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, SPREADSHEET_ID)
2. Verify GET `/api/equipment` reads from the Equipment sheet
3. Verify POST `/api/equipment` appends to the Equipment sheet
4. Verify DELETE `/api/equipment/:item_id` deletes rows from the Equipment sheet
5. Verify POST `/api/borrow` decrements stock for consumables and writes to BorrowLog sheet
6. Verify POST `/api/return` updates return_time in BorrowLog for non-consumables
7. Verify consumable items cannot be returned (rejected by the API)
8. Verify admin seed endpoint (`POST /api/admin/seed`) populates Equipment sheet with default data

## Acceptance criteria

- [ ] Admin panel loads equipment list from Google Sheets (not mock data)
- [ ] Admin can add new equipment — appears in Google Sheets
- [ ] Admin can delete equipment — removed from Google Sheets
- [ ] Admin can seed default equipment — populates Equipment sheet
- [ ] Borrow flow: scan a non-consumable QR → submit → appears in BorrowLog sheet
- [ ] Borrow flow: scan a consumable QR → submit → stock decrements in Equipment sheet, logged in BorrowLog with quantity
- [ ] Borrow flow: consumable with insufficient stock shows error
- [ ] Return flow: scan a non-consumable QR → submit → return_time updated in BorrowLog
- [ ] Return flow: scanning a consumable QR shows "cannot be returned" error
- [ ] All flows work without `USE_MOCK`

## Blocked by

- [04-fix-csp-and-auth](04-fix-csp-and-auth.md) (icons and login needed to verify in browser)
