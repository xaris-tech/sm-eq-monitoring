# PRD: Comms Checklist — Team Feedback Round

## 1. Overview

Address feedback from the comms team on `comms-checklist.html`, and make the Google Sheet output read like a professional log. Scope is the **Comms Checklist only**; the borrow/return pages are untouched.

## 2. Feedback and Decisions

| # | Feedback | Source | Decision |
|---|----------|--------|----------|
| 1 | Comments only work for headsets; nowhere to report in-ear monitor issues | Adrian Matira | Notes on every beltpack row + beltpack popup. Notes always visible on every row except when status is N/A. |
| 2 | Unfamiliar parts need Googling | Jennifer Carbonel | Reference photo thumbnail per item, tap to enlarge. Static files in the app. |
| 3 | Checklist resets to zero on leaving the site | Elisha Micah Cruz | Auto-save to the phone's browser storage; restore on return. |
| 4 | Android needs multiple camera adjustments to scan | Michelle Ann Escober | **Deferred.** Out of scope for this round. |
| 5 | Scanner re-processes codes already scanned | Product owner | Scans are idempotent against current checklist state, with an "already scanned" message. |
| 6 | Sheet output looks unprofessional | Product owner | Replace the wide `CommsChecklist` tab with two formatted tabs: Checklist Log + Checklist Details. |

## 3. Detailed Behavior

### 3.1 Notes (issue 13)

- Every comms item, beltpack, and headset row shows a Notes field at all times.
- Notes hide only when that row's status is `N/A` (and for headsets blocked by an In-ear beltpack, as today).
- Beltpack rows gain a Notes field; the beltpack assignment popup gains an optional Notes field.
- Payload: `beltpacks.SM1 = { user, monitor_type, notes }` (additive; `notes` optional for backward compatibility).
- The In-ear → headset blocking rule from `SPEC-comms-assignment-qrs.md` is unchanged.

### 3.2 Reference photos (issue 14)

- 12 photos: the 9 comms items, plus Beltpack, Headset, and In-ear monitor.
- Stored as static files in `img/comms/`, resized to ~800px wide, ~100KB each.
- Each row shows a small thumbnail; tapping opens a full-size viewer that closes on tap, Escape, or a close button.
- Items without a photo show a "No photo yet" placeholder. The product owner supplies photos of the church's actual gear.
- `COMMS_ITEMS` in `js/config.js` gains an optional `photo` path.

### 3.3 Session auto-save (issue 09)

- Saved to `localStorage` on every change: name, event, event-other, item statuses and notes, beltpack/headset assignments and notes, scan history.
- On page load, a valid draft restores automatically and shows a bar: *"Restored your progress from 9:14 AM · Start over"*.
- The draft is cleared on successful submit, on **Start over**, and when older than **12 hours**.
- All storage access is wrapped in try/catch; the page works normally when storage is unavailable.
- When the page detects an in-app browser (Messenger, Facebook, Instagram), show a small note: *"For best results, open in Chrome/Safari."* In-app browsers keep separate storage and may clear it on close.
- Per phone only. No server-side or shared drafts.

### 3.4 Idempotent scanning (issue 10)

- **Comms item already Complete:** no state change, no new history entry. Show an amber *"✓ Base Station already scanned"* message and play a short buzz instead of the success beep. The scanner keeps running.
- Idempotency is judged against **current checklist state**, not past scans. An item scanned earlier and then manually set to Incomplete becomes Complete when scanned again.
- **Beltpack/headset already assigned:** the popup does not reopen. Show *"SM3 Beltpack already assigned to Juan (In-ear)"* with an **Edit** button that opens the popup.
- A code held in front of the camera shows its message once, not on every frame.
- Restored drafts count, so scanning an item that was restored as Complete says "already scanned".

### 3.5 Sheet redesign (issues 11, 12)

New submissions write to two new tabs. The existing `CommsChecklist` tab is frozen: no more writes. The product owner renames it manually to `CommsChecklist (Legacy)`. The server never renames or deletes tabs.

**Checklist Log**: one row per submission:

| Submission # | Date | Time | Event | Checked By | Items Complete | Issues Found | Issue Summary |
|---|---|---|---|---|---|---|---|
| CL-0042 | 2026-09-28 | 09:14 | Sunday Service | Juan | 8/9 | 2 | SM3 In-ear: left earpiece crackles; Antenna: Incomplete |

**Checklist Details**: one row per equipment per submission (9 comms items + 8 beltpacks + 8 headsets = 25 rows):

| Submission # | Date | Event | Checked By | Category | Equipment | Assigned To | Monitor Type | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| CL-0042 | 2026-09-28 | Sunday Service | Juan | Beltpack | SM3 Beltpack | Maria | In-ear | | left earpiece crackles |

Rules:

- Submission numbers are `CL-` plus a 4-digit number, one higher than the last row in Checklist Log.
- Date and Time are written in **Asia/Manila** as real Sheets date/time values, not ISO strings.
- "Event" shows the event, or `Others — <text>` when Others is chosen.
- An **issue** is any comms item with status `Incomplete`, any headset with status `Needs Repair` or `Needs Replacement`, or any row with non-empty notes.
- On first write, the server creates each tab with a bold frozen header row, a filter, set column widths, date/time formats, and conditional formatting on Status: red for `Incomplete`, `Needs Repair`, `Needs Replacement`; green for `Complete`, `Working`.

## 4. Non-Goals

- Android scanner tuning (feedback #4). Deferred.
- Migrating legacy `CommsChecklist` rows.
- Shared or cross-device drafts.
- Admin photo upload.
- Changes to borrow/return pages.

## 5. Boundaries

Carried from `SPEC-comms-continuous-scanner.md` and `SPEC-comms-assignment-qrs.md`:

- QR formats, SM1–SM8 pairing, and Complete/Incomplete/N/A meanings are unchanged.
- Never auto-submit from the scanner or from a restored draft.
- Never write production Sheet data during verification. Use the in-memory store (no credentials configured).

## 6. Issues

| # | Issue | Blocked by |
|---|-------|------------|
| 08 | [Prefactor: capture and apply the whole checklist form state](issues/08-comms-form-state-snapshot.md) | — |
| 09 | [Session auto-save and restore](issues/09-comms-session-autosave.md) | 08 |
| 10 | [Idempotent scanning with "already scanned" feedback](issues/10-comms-idempotent-scanning.md) | 08 |
| 11 | [Sheet: Checklist Log and Checklist Details tabs](issues/11-comms-sheet-log-and-details.md) | — |
| 12 | [Sheet: professional formatting for the new tabs](issues/12-comms-sheet-formatting.md) | 11 |
| 13 | [Notes on all equipment, end to end](issues/13-comms-notes-everywhere.md) | 08, 11 |
| 14 | [Reference photos for equipment parts](issues/14-comms-reference-photos.md) | — |

Frontier (can start now): 08, 11, 14. Suggested order: 08 → 09 → 10 → 11 → 12 → 13 → 14.
