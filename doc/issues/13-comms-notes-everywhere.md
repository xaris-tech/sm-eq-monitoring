# 13 — Notes on all equipment, end to end

**What to build:** Users can leave a note on any piece of comms equipment, including in-ear monitors, and the note reaches the Sheet. Notes fields are visible from page load on every comms item, beltpack, and headset, and hide only when that row is N/A (plus headsets blocked by an In-ear beltpack, as today). Every SM1–SM8 beltpack row and the beltpack assignment popup get an optional Notes field, kept in sync with each other. Beltpack notes are saved with the draft, sent with the submission, written to the beltpack's Checklist Details row, and count toward Issues Found / Issue Summary. Addresses feedback from Adrian Matira. See [PRD §3.1](../PRD-comms-checklist-feedback.md).

**Blocked by:** 08 — Prefactor: capture and apply the whole checklist form state; 11 — Sheet: Checklist Log and Checklist Details tabs.

**Status:** done

- [x] A fresh checklist shows Notes on all 9 comms items; N/A hides it, any other status shows it
- [x] Every beltpack row has Notes, including when set to In-ear
- [x] Popup notes and row notes stay in sync in both directions
- [x] A note on an In-ear beltpack appears in its Checklist Details row and in the Log's Issue Summary
- [x] Beltpack notes survive a reload (with the form-state snapshot; with the autosave if 09 has landed)
- [x] Payloads without beltpack notes are still accepted
- [x] Headset notes and In-ear blocking behavior are unchanged
- [x] Beltpack assignment validation with notes is unit-tested

## Comments

**2026-09-28 — done.** Comms item notes now render visible and hide only on N/A (`applyFormState` lost its special "collapsed until tapped" rule). Every SM1–SM8 beltpack row gained a Notes input under the name and type. The beltpack popup gained an optional Notes field (hidden for headsets), pre-filled from the row and written back on save. `createBeltpackAssignment(name, type, notes = '')` returns trimmed `notes`. The form snapshot, autosave and `collectPayload` carry `beltpacks.SMn.notes`. The server report builder from ticket 11 already writes it to Details and counts it as an issue.

Verified: frontend `node --test` shows 44/44 passing (2 new, one existing deepEqual updated for the new `notes` key). Server tests 18/18. In headless Chromium at 390px:
- A fresh page shows notes on 9/9 items. N/A hides them, Incomplete shows them.
- All 8 beltpacks have visible notes, including In-ear SM3 (screenshot checked).
- Scanning BELTPACK:SM3 showed the popup Notes field. Saving "left earpiece crackles" filled the row. Editing the row then using Edit pre-filled the popup with the edited text. The headset popup hides Notes.
- After a reload the SM3 notes, name and In-ear came back from the draft.
- The exact payload from `collectPayload()` posted through the real route (in-memory) gave `SM3 Beltpack | Maria | In-ear | | left earpiece crackles, spare used`, `SM3 Headset | N/A | Not used — In-ear`, and "SM3 In-ear: left earpiece crackles, spare used" in the Log summary.

Payloads without beltpack notes stay covered by the legacy-payload report tests.
