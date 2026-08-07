# Spec: Admin Page QR Codes

## Objective

Add printable QR codes to the admin panel for the two public workflows:

- Borrow / Return: `https://wlsm-equipment-monitoring.vercel.app/borrow.html`
- Comms Checklist: `https://wlsm-equipment-monitoring.vercel.app/comms-checklist.html`

An authenticated admin can open a dedicated tab, visually identify each destination, scan the QR code, and print the pair for display.

Improve the public Borrow / Return journey at the same time by making that module more prominent on the landing page and making QR scanning the visually dominant action in both transaction modes.

## Tech Stack

- Static HTML, CSS, and browser JavaScript
- Existing `qrcodejs@1.0.0` browser library
- Existing Lucide icons and project design tokens
- Node.js built-in test runner for deterministic markup/config checks

## Commands

- Test: `node --test tests/admin-page-qrs.test.js`
- Syntax: `node --check js/admin.js`
- Local app: `node server/index.js`

## Project Structure

- `admin.html` - admin tabs and Page QR Codes panel
- `index.html` - prominent Borrow / Return module label
- `borrow.html` - emphasized transaction heading and scanner actions
- `js/admin.js` - QR rendering and tab behavior
- `css/style.css` - responsive and print presentation using existing tokens
- `tests/admin-page-qrs.test.js` - QR destination and admin integration checks

## Code Style

Follow the existing no-semicolon browser JavaScript style and build DOM content explicitly:

```js
new QRCode(container, {
  text: page.url,
  width: 180,
  height: 180,
})
```

Use descriptive IDs, native buttons and links, existing spacing tokens, and mobile-first layouts.

## Testing Strategy

- Write a failing Node test first that expects both exact production URLs and the new admin tab/panel.
- Add the minimum HTML and JavaScript needed to pass.
- Verify JavaScript syntax and manually inspect the locally served admin page when a browser connection is available.
- Confirm print CSS hides navigation and keeps both QR cards legible.

## Boundaries

- Always: encode the exact HTTPS production URLs, preserve existing admin behavior, keep controls keyboard-accessible, and verify locally.
- Ask first: add dependencies, change QR destinations, change authentication, or deploy to Vercel.
- Never: write production data, expose credentials, or deploy as part of this local-only change.

## Success Criteria

- Admin shows a third tab labeled `Page QR Codes` after login.
- The tab renders two distinct, labeled QR codes.
- Scanning each QR resolves to its exact requested production URL.
- Each destination is also available as a visible clickable link.
- A print action prints the two QR cards cleanly.
- Existing Equipment and Comms Items tabs continue to work.
- The landing page labels the module `BORROW / RETURN Equipment` with greater visual emphasis.
- The landing module label uses title case: `Borrow / Return Equipment`.
- Every browser tab uses `SM | Current Screen` and the existing `SM-log.png` app logo as its favicon.
- The active transaction heading reads `BORROW EQUIPMENT` or `RETURN EQUIPMENT` without a redundant mode label.
- Both scanner buttons are noticeably larger than ordinary actions, with at least an 88px touch target, 20px label, and 32px icon.
- Comms Checklist uses the same prominent heading and 88px QR-scanning action for a consistent scanning experience.
- Automated checks and JavaScript syntax validation pass.

## Implementation Plan and Tasks

- [x] Add a failing integration-style markup test.
  - Acceptance: the test fails because the Page QR Codes tab and destinations do not exist yet.
  - Verify: `node --test tests/admin-page-qrs.test.js`
  - Files: `tests/admin-page-qrs.test.js`
- [x] Add the Page QR Codes admin tab and render both QRs.
  - Acceptance: both exact URLs render as labeled QR codes and links.
  - Verify: test passes and `node --check js/admin.js` succeeds.
  - Files: `admin.html`, `js/admin.js`
- [x] Add responsive and print presentation.
  - Acceptance: cards work at mobile/desktop widths and print without admin navigation.
  - Verify: local visual inspection and final test run.
  - Files: `css/style.css`
- [x] Strengthen the Borrow / Return visual hierarchy.
  - Acceptance: the module label and scan actions are immediately noticeable without changing their behavior.
  - Verify: markup test, responsive local inspection, and keyboard focus check.
  - Files: `index.html`, `borrow.html`, `css/style.css`

## Open Questions

None. The exact QR destinations and local-only scope were supplied by the user.
