# 08 — Prefactor: capture and apply the whole checklist form state

**What to build:** A single, tested way to capture the entire Comms Checklist (name, event, event-other, every item status and note, beltpack and headset assignments and notes, scan history) as one plain object, and to apply such an object back onto the page. Applying must go through the same paths as user input, so derived UI stays correct (selected status buttons, notes visibility, In-ear headset blocking). No user-visible change. This is the seam that tickets 09, 10, and 13 build on. See [PRD](../PRD-comms-checklist-feedback.md).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Capturing and then applying a snapshot to a fresh page reproduces every field, button state, and the scan history
- [x] Applying a snapshot with an In-ear beltpack blocks its paired headset exactly as a manual selection would
- [x] Snapshot shape validation is pure and unit-tested with Node's test runner, including missing/unknown fields
- [x] Existing submit payload and scanner behavior are unchanged; existing tests pass

## Comments

**2026-09-28 — done.** Added a pure form-state module (empty state + normalize/validate, UMD like the other comms modules) and two page functions: `captureFormState()` and `applyFormState(state)`. Status-button logic moved into `setItemStatus()` and the Others-event toggle into `syncOtherEventField()`, so apply reuses the user-input paths. `resetForm()` now applies the empty state instead of duplicating the reset by hand.

Verified: `node --test tests/*.test.js` shows 30/30 passing (7 new). In headless Chromium against the local in-memory server, I filled the form through real controls (Others event, Complete + notes, N/A, Headset beltpack with a Needs Repair headset, In-ear beltpack, two scans with the cursor moved back), captured it, reloaded a fresh page, and applied it. The re-captured state was identical, button classes and notes visibility matched, the In-ear headset was blocked as N/A, and history showed "1 of 2". Submit still reached the confirmation screen, and New Checklist returned exactly the empty state. No console errors.

Deviation: the snapshot already carries `beltpacks.SMn.notes` (always empty until ticket 13) so the draft format doesn't change later. A fresh Incomplete row keeps its notes collapsed on apply, matching today's behaviour until ticket 13 makes notes always visible.
