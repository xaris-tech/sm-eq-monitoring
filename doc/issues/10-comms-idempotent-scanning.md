# 10 — Idempotent scanning with "already scanned" feedback

**What to build:** Scanning something that's already done no longer re-processes it. If a comms item is currently Complete, the scanner shows an amber *"✓ <item> already scanned"*, gives a short buzz instead of the success tone, changes nothing, adds no history entry, and keeps scanning. If a beltpack or headset already has a saved assignment, the popup does not reopen. The scanner shows *"<SMn> Beltpack already assigned to <name> (<type>)"* (or the headset equivalent) with an Edit button that opens the pre-filled popup. Idempotency is judged against the **current** checklist state, so an item manually set back to Incomplete becomes Complete when re-scanned. Each message shows once while a code stays in view. See [PRD §3.4](../PRD-comms-checklist-feedback.md).

**Blocked by:** 08 — Prefactor: capture and apply the whole checklist form state.

**Status:** done

- [x] Re-scanning a Complete item changes nothing and shows the "already scanned" message
- [x] An item manually set back to Incomplete becomes Complete on re-scan
- [x] Re-scanning an assigned beltpack/headset shows the assignee and an Edit button; Edit opens the popup pre-filled
- [x] Scan history gets no duplicate entries from re-scans
- [x] A code held in view triggers its message once, not per frame
- [x] The In-ear "headset disabled" message and unknown-QR error are unchanged
- [x] Scan classification (complete / already-complete / assign / already-assigned / blocked / unknown) is a pure, unit-tested function
- [x] If 09 has landed: items restored from a draft count as already done

## Comments

**2026-09-28 — done.** Added `classifyScan(value, formState)` (outcomes: complete / already-complete / assign / already-assigned / blocked / unknown) and a notice tracker (`createNoticeState` / `shouldAnnounce`) to the scanner-state module. `handleScan` classifies against `captureFormState()`, so headsets filled in by hand and restored drafts count. "Already" outcomes don't pause the camera or touch state or history. They show an amber message with a `[40,60,40]` buzz, plus an **Edit assignment** button for beltpacks and headsets. Every read refreshes the notice timestamp, so a code held in view stays quiet until it has been out of view for 3s. A successful scan and a closed popup both count as "seen", so the code you just handled doesn't immediately announce itself. The assignment popup now pre-fills from the form, not the scanner-only maps, which fixes an empty pre-fill for headsets filled in by hand.

Verified: `node --test tests/*.test.js` shows 42/42 passing (5 new; one existing assertion now looks for `parseAssignmentQr` in the scan-routing code, page plus scanner module, since parsing moved into `classifyScan`). In headless Chromium I drove `handleScan`, the camera's own callback, with vibrate stubbed:
- First scan: Complete with the success buzz. Held in view: silent. Later re-scan: "✓ Base Station already scanned" in amber with the short buzz, history unchanged. Five more held reads: silent.
- Manual Incomplete then re-scan: Complete again.
- Hand-filled SM3 headset: "already assigned to Leo (Needs Repair)" with Edit. Edit opened the popup pre-filled; saving updated the row with no history entry.
- New beltpack: prompt opened and saving added a history entry. Held in view after saving: silent. Later re-scan: "already assigned to Juan (In-ear)".
- In-ear headset message and unknown-QR error unchanged.
- A run that started from a restored draft showed "already scanned" for the restored Complete item on the first read.

A screenshot at 390px confirmed the amber notice and the full-width Edit button.
