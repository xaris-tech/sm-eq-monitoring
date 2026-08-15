# Implementation Plan: Comms Continuous Scanner

## Architecture Decisions

- Restore the existing assignment QR contract from `origin/agent/add-comms-assignment-qrs` before changing scanner lifecycle behavior.
- Keep camera lifecycle and DOM rendering in `js/comms-checklist.js`.
- Put scan-history calculations in a small browser/CommonJS module for deterministic Node tests.
- Pause scan processing while an assignment popup is open, then resume the existing camera after Save or Cancel.

## Tasks

### Task 1: Restore scan-driven assignment workflows

- Acceptance: Beltpack/headset QR values open their existing popup and preserve In-ear pairing rules.
- Verify: Existing assignment tests and syntax checks pass.
- Files: Existing assignment workflow commit.

### Task 2: Add tested scan history state

- Acceptance: Successful scans append to history; rapid duplicates are rejected; Previous/Next remain within history bounds.
- Verify: `node --test tests/comms-scanner-state.test.js`.
- Files: `js/comms-scanner-state.js`, `tests/comms-scanner-state.test.js`.

### Task 3: Integrate continuous camera and controls

- Acceptance: Camera stays active across equipment scans, resumes after assignment dialogs, and stops only on Exit; history indicator and Previous/Next work.
- Verify: Full tests, syntax checks, and browser checks at mobile/desktop widths.
- Files: `comms-checklist.html`, `js/comms-checklist.js`, `css/style.css`.

## Checkpoints

- After Task 1: assignment workflows pass independently.
- After Tasks 2–3: all automated tests pass and the browser flow has no console errors.

## Risks and Mitigations

- Repeated camera callbacks: lock scan processing and apply a duplicate cooldown.
- Camera conflict with popup: pause scanner during the popup and resume after it closes.
- Lost assignment behavior: retain the tested QR parser and pairing functions unchanged.
