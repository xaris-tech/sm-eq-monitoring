# Spec: Comms Continuous Scanner

## Objective

Turn the Comms checklist QR scanner into a continuous, any-order workflow. Each QR routes through its existing equipment, beltpack, or headset behavior. Successful scans are recorded in history, and scanning resumes automatically after the scan-specific action finishes.

### Acceptance Criteria

- Opening the scanner shows scan progress and the latest successful scan.
- Comms equipment can be scanned in any order; a valid `COMMS-*` scan marks the matching item Complete and keeps the scanner active.
- A `BELTPACK:SM1` through `BELTPACK:SM8` scan opens the existing required assignment popup. Saving returns to continuous scanning.
- A `HEADSET:SM1` through `HEADSET:SM8` scan opens the existing required status popup unless its paired beltpack is In-ear. Saving returns to continuous scanning.
- The scanner visibly identifies the most recently completed scan action.
- Previous and Next buttons navigate successfully scanned history without changing checklist or assignment data.
- An Exit button stops the camera and closes the scanner.
- Rapid repeated reads of the same QR code do not create repeated transitions.
- Unknown QR codes show an in-scanner error and keep scanning.
- The controls are usable by touch and keyboard and remain readable on small mobile screens.

## Tech Stack

- Vanilla HTML, CSS, and JavaScript
- `html5-qrcode` for camera scanning
- Node's built-in test runner for scanner state tests
- Lucide icons for existing interface consistency

## Commands

- Server tests: `cd server && npm test`
- Scanner tests: `node --test test/comms-scanner.test.js`
- Syntax check: `node --check js/comms-checklist.js`
- Local runtime: `cd server && npm start`

## Project Structure

- `comms-checklist.html` — scanner overlay structure and accessible controls
- `js/comms-checklist.js` — camera lifecycle and checklist integration
- `js/comms-scanner-state.js` — pure scan-history state transitions
- `css/style.css` — shared scanner presentation
- `test/comms-scanner.test.js` — continuous-scanning regression tests

## Code Style

Use small named functions and the existing CommonJS/browser-compatible module pattern:

```js
function moveScanHistory(history, currentIndex, direction) {
  // Return the bounded history position to display.
}
```

Keep DOM mutations in `comms-checklist.js` and sequence calculations in pure functions that can be tested without a browser.

## Testing Strategy

- Unit-test scan-history navigation, duplicate suppression, and scan routing as pure state transitions.
- Syntax-check browser JavaScript.
- Verify the real scanner overlay at mobile and desktop widths, including controls, status feedback, console output, and camera cleanup on Exit.

## Boundaries

- Always: Preserve the existing checklist state and submission payload format.
- Always: Stop and release the camera when the scanner exits.
- Ask first: Change the QR-code formats or beltpack/headset assignment rules.
- Ask first: Change what a Complete, Incomplete, or N/A status means.
- Never: Add a new dependency for state management or UI styling.
- Never: Submit the checklist automatically from the scanner.

## Success Criteria

All acceptance criteria pass in automated tests and the live browser workflow. Existing equipment scanning, checklist editing, and submission behavior remain unchanged.

## Open Questions

- None. The user confirmed any-order scanning and Previous/Next navigation through successful scan history.
