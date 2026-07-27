# PRD: Bug Fixes & Backend Hardening

## Problem Statement

The QR equipment logging system has several critical issues preventing mobile usage. Icons fail to render (Lucide blocked by CSP), admin login is non-functional, consumable quantity prompts don't appear on scan, and the backend still carries legacy coupling to Google Apps Script patterns. These must be fixed before the app is reliable for mobile users.

## Solution

Fix the Content Security Policy to allow Lucide CDN and inline scripts, repair the admin auth middleware token lifecycle, add an immediate quantity prompt on consumable scan, and decouple the backend from Google Sheets into a standalone database (SQLite/JSON store) for local-first scalability.

## User Stories

1. As a mobile user, I want icons to render properly when I open the app, so that the UI is understandable and navigable.
2. As an admin, I want to log into the admin panel with my password, so that I can manage equipment and generate QR codes.
3. As a borrower scanning a consumable QR, I want to input the quantity immediately after scanning, so that I can specify how many units I'm taking.
4. As a borrower scanning a consumable QR, I want the quantity prompt to be a clear modal or inline form, so that I don't miss it.
5. As a borrower scanning a consumable QR, I want the quantity to default to 1 and be capped by available stock, so that I cannot over-borrow.
6. As a developer, I want the backend to use a local database instead of Google Sheets, so that the system works offline and is easy to refactor.
7. As an admin, I want all CRUD operations (add, delete, update equipment) to persist to a database, so that data survives server restarts.
8. As a developer, I want the admin auth middleware to correctly validate tokens, so that protected routes are secure.
9. As a developer, I want the system to have zero dependency on Google Apps Script, so that deployment and scaling are straightforward.
10. As a comms volunteer, I want the comms checklist page to load with icons, so that I can verify equipment for events.
11. As an admin, I want the QR code generation pages to render correctly, so that I can print QR codes for equipment.
12. As a returner, I want the return flow to show correct icons and work reliably, so that I can return equipment without confusion.
13. As a developer, I want the CSP to allow necessary external resources while blocking malicious ones, so that security is maintained.

## Implementation Decisions

### 1. Fix Content Security Policy (Issues #1, #2)

- **Root cause**: Helmet middleware applies a default CSP with `script-src 'self'` which blocks both the Lucide CDN (`unpkg.com`) and all inline `<script>` blocks.
- **Fix**: Configure Helmet CSP explicitly in `server/index.js`:
  - Allow `script-src 'self' https://unpkg.com 'unsafe-inline'` for Lucide, html5-qrcode, and qrcodejs CDNs and inline icon creation.
  - Allow `img-src 'self' data:` for QR code rendering.
  - Keep other CSP defaults intact for security.
- This single fix resolves both issue #1 (icons not showing) and issue #2 (login broken — inline scripts couldn't execute).

### 2. Fix Admin Auth Middleware (Issue #2)

- **Root cause**: `middleware/adminAuth.js` captures `process.env.ADMIN_TOKEN` into a module-level `const ADMIN_TOKEN` at load time (value: `null`). The login handler writes to `process.env.ADMIN_TOKEN` at runtime, but the captured constant never updates. The middleware's null check always short-circuits (`null && ...`), so no token validation ever occurs.
- **Fix**: Read from `process.env.ADMIN_TOKEN` directly in the `requireAdmin` function instead of a module-level constant. This ensures the middleware sees the token set at login time.

### 3. Add Quantity Prompt on Consumable Scan (Issue #3)

- **Current behavior**: When a consumable QR is scanned in borrow mode, `_quantity` is silently set to 1 (line 150 of `js/app.js`). A quantity input appears in the equipment list item, but there is no immediate prompt asking the user how many they want.
- **Fix**: After scanning a consumable, show a quantity dialog/modal before adding the item to the scanned list. The dialog should:
  - Display item name and available stock.
  - Default to 1.
  - Cap max at available stock.
  - Require confirmation before proceeding.
- Use a lightweight modal overlay (reuse the existing scanner overlay pattern).

### 4. Migrate Backend to Local Database (Issue #4)

- **Current**: Google Sheets API via service account — requires internet, has rate limits, is slow, and credentials are not configured.
- **Target**: Replace Google Sheets with `better-sqlite3` (SQLite) for the local dev/self-hosted case, with a clear repository pattern to swap in Postgres later.
- **Schema**: Four tables: `equipment`, `borrow_log`, `comms_equipment`, `comms_checklists`.
- **Migration steps**:
  1. Add `better-sqlite3` dependency to `server/package.json`.
  2. Create `server/services/database.js` — SQLite connection + schema init.
  3. Create `server/services/repository.js` — repository functions mirroring current sheets.js interface.
  4. Update `server/services/sheets.js` to become a thin adapter, or replace calls directly in routes.
  5. Seed data on first run from the existing seed arrays.
  6. Keep `sheets.js` as an optional adapter for Google Sheets (for users who want cloud sync), switchable via config.
- **Seams for testing**: The `repository.js` module is the highest-value test seam — all route handlers depend on it. Tests can mock or swap this at the seam.

### 5. Remove Google Apps Script Dependency

- The `apps-script/` directory contains the legacy `Code.gs` (645 lines). It is already documented as "Legacy (reference)" in the README.
- **Action**: Add a note to the README that the Apps Script is fully replaced and kept only for historical reference. Do not delete yet — some users may reference it for backup logic.

## Testing Decisions

- A good test verifies external behavior through the repository seam without touching Google Sheets or real network calls.
- **Module to test**: `server/services/repository.js` — all CRUD operations with an in-memory SQLite database.
- **Prior art**: No existing tests in the codebase — this will be the first test setup. Use `node:test` (built-in) or `vitest`.
- The frontend JS files (`api.js`, `app.js`, `admin.js`) have no existing test infrastructure — testing is deferred.

## Out of Scope

- Unit tests for frontend JavaScript files (no framework exists, low priority).
- Replacing the entire UI framework (vanilla HTML/CSS/JS stays).
- Password reset or multi-admin support.
- Mobile app packaging (stays as a web app).
- Deployment to production infrastructure (CI/CD setup deferred).
- Real Google Sheets credentials configuration (must be done manually by admin).

## Further Notes

- The Helmet CSP fix is the highest-priority item — it unblocks issues #1 and #2 with a single-line change.
- The auth middleware fix is trivially simple (replace `const ADMIN_TOKEN` with a getter) but critical for security.
- The consumable quantity prompt should reuse the existing scanner overlay pattern for UI consistency.
- For the database migration, prefer a progressive approach: introduce SQLite alongside Google Sheets, then switch the default. This reduces risk and allows rollback.
- The environment variable `USE_MOCK` in `config.js` provides a fallback if the database/API is unavailable — keep this for development.
