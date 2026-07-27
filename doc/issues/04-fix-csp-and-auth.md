## What to build

Fix the Helmet Content Security Policy and admin auth middleware so the frontend renders correctly and login works.

**Part 1 — CSP:** The Helmet middleware in `server/index.js` applies a default CSP with `script-src 'self'`, which blocks:
- The Lucide icons library loaded from `https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js`
- All inline `<script>` blocks (e.g., `lucide.createIcons()`, per-page logic)

Fix: Explicitly configure Helmet CSP to allow `script-src 'self' https://unpkg.com 'unsafe-inline'` and `img-src 'self' data:`.

**Part 2 — Auth middleware:** In `server/middleware/adminAuth.js`, the token constant is captured at module load time (`const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null`), which is always `null`. The login handler writes to `process.env.ADMIN_TOKEN` at runtime but the middleware never sees it. Fix: read `process.env.ADMIN_TOKEN` directly inside the `requireAdmin` function instead of using a module-level constant.

## Acceptance criteria

- [ ] Landing page (`index.html`) shows Lucide icons (scan-line, clipboard-check, shield)
- [ ] Borrow page (`borrow.html`) shows Lucide icons (clock, scan-line, check, check-circle, x, home)
- [ ] Admin page (`admin.html`) shows Lucide icons (shield, arrow-right, rotate-ccw, plus, package, check, qr-code, printer, trash-2, arrow-left, home)
- [ ] Comms checklist page (`comms-checklist.html`) shows Lucide icons
- [ ] Equipment QR codes page (`equipment-qrs.html`) shows Lucide icons
- [ ] Admin login with correct password succeeds and shows the admin panel
- [ ] Admin login with incorrect password shows "Incorrect password" error
- [ ] Admin auth middleware correctly validates Bearer token on protected routes (`/api/admin/seed`, `/api/admin/logs`)
- [ ] `img-src` CSP allows `data:` URIs for QR code rendering
- [ ] Console shows no CSP violation errors

## Blocked by

None - can start immediately
