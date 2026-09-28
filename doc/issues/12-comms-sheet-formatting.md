# 12 — Sheet: professional formatting for the new tabs

**What to build:** When the server first creates Checklist Log or Checklist Details, the tab is already formatted like a professional document: a bold, frozen header row, a filter on the header, sensible column widths, date/time number formats, and conditional formatting on Status (red for Incomplete, Needs Repair, Needs Replacement; green for Complete, Working). Formatting is applied only at creation, so tabs that already exist, including any manual styling, are never touched. See [PRD §3.5](../PRD-comms-checklist-feedback.md).

**Blocked by:** 11 — Sheet: Checklist Log and Checklist Details tabs.

**Status:** ready-for-human

- [ ] A newly created tab has a bold frozen header, a filter, column widths, and date/time formats
- [ ] Status cells colour red/green per the PRD rules, including rows added later
- [x] An existing tab is not reformatted when the server starts or on submit
- [x] The formatting requests are built by a pure, unit-tested function; the in-memory store still works without credentials
- [ ] Verified on a test spreadsheet, never the production Sheet

## Comments

**2026-09-28 — implemented; waiting on a real-spreadsheet check.** `buildFormatRequests(sheetName, sheetId)` in `server/services/commsReport.js` returns the batchUpdate requests: frozen header row, bold shaded wrapped header, basic filter, a width per column, `yyyy-mm-dd` / `hh:mm` number formats, and on Details two open-ended conditional rules on Status (red: Incomplete / Needs Repair / Needs Replacement; green: Complete / Working). `ensureSheet(name, headers, buildFormatRequests)` applies them only when that call created the tab, using the new tab's `sheetId` from the addSheet reply.

Verified: `server` `node --test` shows 18/18 passing (6 new):
- The requests have the right shape for both tabs and target the given sheet id.
- The Status rule ranges have no end row, so rows added later are coloured.
- Against a recording fake of the googleapis client (no network): a new tab gets `addSheet`, then its header append, then exactly the format requests with the new id. An existing tab gets no batchUpdate and the formatter is never called.

The in-memory end-to-end run still produces CL-0001/CL-0002 with 50 detail rows and no credentials.

**Needs a human (criteria left unchecked):** how the formatting actually looks can only be seen on a real Google Sheet, and I have no credentials. The PRD forbids touching production. To finish:
1. Create a blank test spreadsheet and share it with the service account.
2. Run the server locally with `SPREADSHEET_ID` set to the test sheet.
3. Submit one checklist.
4. Check both new tabs for the bold frozen header, filters, widths, date/time formats, and red/green Status cells, including on a second submission's rows.
