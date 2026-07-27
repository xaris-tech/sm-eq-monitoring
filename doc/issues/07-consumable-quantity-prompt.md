## What to build

Add an immediate quantity prompt when a consumable QR code is scanned during the borrow flow. Currently, scanning a consumable silently assigns `_quantity = 1` with no user input — the quantity input only appears in the equipment list item, which is easy to miss.

**Behavior:**
- When a consumable QR is scanned in borrow mode, show a modal/dialog overlay immediately (before adding the item to the list)
- The dialog shows: item name, available stock, and a number input for quantity
- Default quantity = 1
- Max quantity = available stock
- Min quantity = 1
- User must tap "Confirm" to add the item with the chosen quantity
- User can tap "Cancel" to discard the item
- Reuse the existing scanner overlay pattern for UI consistency

**Technical notes:**
- The quantity field in the equipment list chip should remain as a fallback so users can adjust quantity before submitting
- The dialog is a convenience/prompt — the list chip qty input is the authoritative value

## Acceptance criteria

- [ ] Scanning a consumable QR shows a quantity dialog before adding to the list
- [ ] Dialog displays item name and available stock
- [ ] Default quantity is 1
- [ ] Quantity cannot exceed available stock (capped)
- [ ] Quantity cannot be less than 1
- [ ] Tapping "Confirm" adds the item to the scanned list with chosen quantity
- [ ] Tapping "Cancel" discards the scan (item not added)
- [ ] Non-consumable scans bypass the dialog entirely (added directly)
- [ ] Dialog reuses the scanner overlay pattern for visual consistency
- [ ] List chip quantity input still works as a fallback for adjustments

## Blocked by

- [04-fix-csp-and-auth](04-fix-csp-and-auth.md) (icons needed for the dialog UI)
