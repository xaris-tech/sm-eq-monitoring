# Spec: Beltpack and Headset QR Assignment

## Objective

Give every SM1-SM8 beltpack and its paired headset a printable QR code. Scanning a code in Comms Checklist opens the correct assignment prompt instead of treating it as a general comms-equipment item.

## Confirmed Pairing Rules

- Beltpack SM1 pairs with Headset SM1, continuing through SM8.
- Beltpack QR values are `BELTPACK:SM1` through `BELTPACK:SM8`.
- Headset QR values are `HEADSET:SM1` through `HEADSET:SM8`.
- Selecting `In-ear` for a beltpack disables only its matching headset, clears its values, and saves that headset as `N/A`.
- Selecting `Headset` re-enables the matching headset fields.

## Interaction Contract

### Beltpack scan

1. Scan `BELTPACK:SMn`.
2. Show a required assigned-name field.
3. Show a required monitor-type dropdown with `In-ear` and `Headset`.
4. Save the assignment into the visible SMn beltpack row.

### Headset scan

1. Scan `HEADSET:SMn`.
2. If the paired beltpack is `In-ear`, explain that the headset is disabled and do not open the assignment form.
3. Otherwise show a required assigned-name field and status dropdown.
4. Status values remain `Working`, `Needs Repair`, `Needs Replacement`, and `N/A`.
5. Save the assignment into the visible SMn headset row.

Existing comms equipment QR codes continue to mark checklist equipment Complete.

## Payload Contract

The browser submits additive structured values:

```js
beltpacks.SM1 = { user: 'Juan', monitor_type: 'Headset' }
headsets.SM1 = { user: 'Juan', status: 'Working', notes: '' }
```

The API remains backward compatible with legacy string beltpack values and headset objects without `user`. Google Sheets continues using the existing columns, serialized as:

- Beltpack cell: `Juan | Headset`
- Headset cell: `Juan | Working | notes`
- Disabled headset cell: `N/A`

## Tech Stack and Files

- `js/comms-assignment.js`: small pure QR parsing and validation contract
- `js/comms-checklist.js`: scanner routing, dialog, form state, and payload collection
- `comms-checklist.html`, `css/style.css`: accessible assignment dialog and paired fields
- `js/admin.js`, `admin.html`: one Show All QR Codes action with separate comms-item and beltpack/headset print sections
- `server/routes/comms.js`: backward-compatible serialization and boundary validation
- `tests/comms-assignment.test.js`: behavior tests using Node's built-in runner

## Commands

- Test: `node --test tests/admin-page-qrs.test.js tests/comms-assignment.test.js`
- Syntax: `node --check js/comms-assignment.js && node --check js/comms-checklist.js && node --check js/admin.js && node --check server/routes/comms.js`
- Local app: `node server/index.js`

## Boundaries

- Always: validate scanned values, require names, preserve existing equipment scans, keep SM1-SM8 pairing deterministic, and keep the API backward compatible.
- Ask first: change the SM1-SM8 inventory, add new status choices, add sheet columns, or deploy.
- Never: silently submit a headset for an In-ear beltpack, accept an unknown QR prefix, or write production data during verification.

## Success Criteria

- Admin's Show All QR Codes action displays the existing comms-item codes and, in a separate section, 16 distinct beltpack/headset QR codes.
- Each recognized QR routes to the correct prompt and paired form row.
- Beltpack prompts require name and In-ear/Headset selection.
- Headset prompts require name and status unless disabled by the paired In-ear selection.
- In-ear disables and visually blocks only the matching headset row and submits it as `N/A`.
- A blocked headset is shown as a solid grey unavailable card; its form controls are hidden rather than faded.
- Existing comms equipment scanning and checklist submission continue working.
- Automated tests, syntax checks, and local served-file checks pass.

## Tasks

- [x] Define and test the QR parsing/assignment contract.
- [x] Add paired beltpack/headset fields and assignment dialog.
- [x] Route scans and enforce In-ear headset blocking.
- [x] Add 16 printable QR codes to Admin under the existing Show All QR Codes action.
- [x] Serialize the additive payload backward compatibly in the API.
- [x] Run local verification without submitting production data.
