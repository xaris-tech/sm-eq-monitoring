## What to build

Convert `index.html` from the borrow/return page into a landing page with two large option buttons:

1. **Borrowing Equipment** — navigates to the existing borrow/return flow (move that flow to a separate page or section)
2. **Comms Checklist** — navigates to a new `/comms-checklist.html` stub page

The existing borrow/return functionality must remain fully working — nothing breaks. The comms page stub should show a placeholder heading so the URL route is established.

## Acceptance criteria

- [ ] `index.html` shows two buttons: "Borrowing Equipment" and "Comms Checklist"
- [ ] Tapping "Borrowing Equipment" opens the full existing borrow/return flow (same UI, same behavior, same mock/API)
- [ ] Tapping "Comms Checklist" navigates to `/comms-checklist.html` (stub page)
- [ ] Borrow/return flow uses mock data when `CONFIG.USE_MOCK` is true
- [ ] No regressions in existing borrow/return functionality

## Blocked by

None - can start immediately
