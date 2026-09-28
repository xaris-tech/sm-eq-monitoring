# 09 — Session auto-save and restore

**What to build:** A user who leaves, reloads, or closes the Comms Checklist comes back to their progress instead of a blank form. Every change is saved to the phone's browser storage. On return, a draft younger than 12 hours restores automatically, with a bar reading *"Restored your progress from <time> · Start over"*. The draft clears on successful submit, on Start over, and on expiry. Inside in-app browsers (Messenger, Facebook, Instagram) a small note suggests opening in Chrome/Safari. Addresses feedback from Elisha Micah Cruz. See [PRD §3.3](../PRD-comms-checklist-feedback.md).

**Blocked by:** 08 — Prefactor: capture and apply the whole checklist form state.

**Status:** done

- [x] Partially filling the checklist, reloading, and returning restores every field and the scan history
- [x] The restore bar shows the saved time; Start over clears the form and the draft
- [x] A draft older than 12 hours is discarded silently
- [x] Successful submit clears the draft; a failed submit keeps it
- [x] With storage unavailable or throwing (private mode), the page works exactly as it does today
- [x] Corrupt stored data is ignored, not crashed on
- [x] The in-app browser note appears only for in-app user agents
- [x] Save, restore, expiry, and corrupt-data handling are unit-tested

## Comments

**2026-09-28 — done.** Added a pure draft module: serialize, and parse with version, future-date, 12-hour-expiry and empty-draft checks. Parsing re-validates through the form-state normalizer, and the module also holds the in-app browser user-agent check. The page saves on every input, change and click inside the form, after scanner history changes and assignment saves, and on `pagehide`. It restores on load with the "Restored your progress from <time> · Start over" bar. It clears on successful submit and on Start over. A fully empty form removes the stored draft instead of saving it. All three storage helpers wrap `localStorage` in try/catch.

Verified: `node --test tests/*.test.js` shows 37/37 passing (7 new). In headless Chromium at 390px on the local in-memory server:
- Fill, reload: every field restored, In-ear headset still blocked, "1 of 1" scan history, bar shown.
- Start over: empty form, draft removed, a reload stays empty.
- A 13h-old draft was dropped and an 11h-old one restored. Drafts were injected from `index.html` because the checklist's own `pagehide` save overwrites an injected draft.
- Corrupt JSON was ignored with no console errors.
- Forced fetch failure: "Network error" shown, draft kept. Real submit: confirmation shown, draft cleared.
- Storage throwing `SecurityError` (sandboxed iframe without same-origin): the form built, input, Start over and scanning paths ran with no errors from the draft code.
- A Messenger UA shows the note; a Chrome UA hides it.

**Pre-existing issue found (not changed, out of scope):** `js/api.js` `getAuthHeaders()` reads `sessionStorage` unguarded. When a browser blocks site storage entirely, every API call, including checklist submit, throws and shows "Network error". This behaves the same before and after this ticket. A one-line try/catch in `api.js` would fix it for all pages.
