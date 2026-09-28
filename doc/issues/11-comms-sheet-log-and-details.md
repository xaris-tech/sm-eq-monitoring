# 11 — Sheet: Checklist Log and Checklist Details tabs

**What to build:** Submitting a Comms Checklist writes a readable record instead of one 30-column row of pipe-joined codes. Each submission adds one row to **Checklist Log** (Submission #, Date, Time, Event, Checked By, Items Complete, Issues Found, Issue Summary). It also adds 25 rows to **Checklist Details**, one per comms item, beltpack, and headset (Submission #, Date, Event, Checked By, Category, Equipment, Assigned To, Monitor Type, Status, Notes). Submission numbers are `CL-NNNN`, counting up from the last Log row. Date and time are Asia/Manila values that Sheets can sort. The legacy `CommsChecklist` tab receives no more writes, and code never renames or deletes tabs. The checklist history endpoint reads from Checklist Log. Formatting is out of scope here (ticket 12). See [PRD §3.5](../PRD-comms-checklist-feedback.md) for exact columns and the definition of an "issue".

**Blocked by:** None — can start immediately.

**Status:** done

- [x] One submission produces exactly 1 Log row and 25 Details rows with correct values
- [x] Issues Found and Issue Summary follow the PRD's issue definition
- [x] The first submission is `CL-0001`; later ones increment from the last Log row
- [x] Dates/times are Manila time and sort correctly in Sheets
- [x] Headsets of In-ear beltpacks appear as Status `N/A`, Notes `Not used — In-ear`
- [x] "Others" events show as `Others — <text>`
- [x] Legacy payloads (string beltpacks, headsets without `user`) still produce valid rows
- [x] Row building is a pure, unit-tested function; verification uses the in-memory store only, never production
- [x] Deploy note for product owner: optionally rename `CommsChecklist` → `CommsChecklist (Legacy)` in Google Sheets

## Comments

**2026-09-28 — done.** New pure `server/services/commsReport.js` (`buildReportRows`, `nextSubmissionNo`) builds 1 Checklist Log row plus 25 Checklist Details rows. `POST /api/comms/checklist` ensures both tabs, numbers the submission from the last Log row, appends to both, and returns `{ success, submission }`. `GET /api/comms/checklists` reads Checklist Log. Nothing writes to `CommsChecklist` any more. The dead pipe-joined serializer (`commsSerialization.js`) was removed, and its legacy-payload test now checks the new row builder.

Deviations from the PRD wording, both forced by writing with `USER_ENTERED` (needed so Date/Time become real Sheets values):
- **Items Complete is `8 of 9`, not `8/9`.** Sheets would parse `8/9` as the date 9 August.
- **User text starting with `= + - @` gets a leading `'`,** so names and notes can't run as formulas (e.g. `=IMPORTXML(...)`). The old tab had this exposure too.

Verified: `server` `node --test` shows 12/12 passing (9 new report tests: row counts and columns, Manila date rollover across midnight UTC, invalid timestamp fallback, issue definition and summary order, In-ear headset rows, Others label, formula escaping, missing data defaults, numbering). Frontend suite still 42/42. I booted the real Express app from a Node script against the in-memory store (it refuses to run if Sheets credentials are present):
- Two POSTs produced `CL-0001` and `CL-0002` with 25 Details rows each and Manila times 09:14 and 19:02.
- The summary read "Antenna: Incomplete; SM3 In-ear: left earpiece crackles", the In-ear headset row read `N/A | Not used — In-ear`, and `Others — Youth Night` showed as the event.
- A malformed legacy `beltpacks` value still produced valid rows. A blank name returned 400.
- The legacy tab had 0 rows written.
- A submit from the real page in headless Chromium reached the confirmation screen and appeared in `GET /checklists`.

Sorting: Date is `yyyy-mm-dd` and Time is `HH:mm` (24h), so both sort correctly whether Sheets parses them as date/time (expected with USER_ENTERED) or keeps them as text. I have not observed this on a real Google Sheet: no credentials here, and production writes are off-limits.

**Deploy note for the product owner:** optionally rename `CommsChecklist` → `CommsChecklist (Legacy)` in Google Sheets. Nothing breaks if you skip it.
