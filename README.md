# QR Equipment Logging

Mobile-first web app for logging equipment borrowing via QR codes. Uses Google Sheets as the database with a Node.js/Express API server.

## Quick Start

### 1. Set Up the Server

```bash
cd server
cp .env.example .env
```

Edit `.env` with your Google Sheets credentials and spreadsheet ID.

```bash
npm install
npm start         # or: npm run dev (with --watch)
```

The server serves both the frontend and API at `http://localhost:3000`.

### 2. Set Up Google Sheets

1. Create a Google Sheet. Share it with your service account email.
2. The server auto-creates the required sheets (Equipment, BorrowLog, CommsChecklist, CommsEquipment) on first access.
3. Seed initial data: `POST /api/admin/seed` (after admin login).

### 3. Configure the Frontend

Edit `js/config.js`:

```js
const CONFIG = {
  API_URL: '/api',      // Relative — works with tunnel or direct
  USE_MOCK: false,
}
```

### 4. Expose with ngrok (Optional)

```bash
ngrok http 3000
```

The ngrok URL serves both the pages and the API — no extra setup needed.

### 5. Generate QR Codes

1. Visit `/admin.html` and log in with the admin password
2. Add equipment items (choose Consumable or Non-Consumable type)
3. Click **Show All QR Codes** and print the sheet
4. Cut and attach QR codes to equipment

### 6. Create the Main QR

Generate a QR code pointing to your deployed frontend URL.

## Usage

### Borrow Flow
1. User scans the main site QR → opens the borrow page
2. Enters name (time auto-captured)
3. Taps **Scan Equipment QR** → camera opens
4. Scans QR on equipment → added to list
   - **Non-Consumable:** added as-is
   - **Consumable:** quantity input appears (default 1, max = stock)
5. Repeats for more equipment
6. Taps **Submit Borrow** → stock auto-decrements for consumables

### Return Flow
1. User taps **Returning equipment?**
2. Enters name
3. Scans equipment QR (consumables are rejected — they cannot be returned)
4. Taps **Confirm Return**

### Admin Flow
- Visit `/admin.html` to add/delete/manage equipment
- Toggle item type between Consumable / Non-Consumable
- Generate QR codes for printing
- Seed default equipment data

## File Structure

```
├── server/               → Node.js/Express API server
│   ├── index.js          → Express app setup
│   ├── package.json
│   ├── .env.example
│   ├── routes/
│   │   ├── equipment.js  → CRUD equipment endpoints
│   │   ├── borrow.js     → Borrow/return endpoints
│   │   ├── comms.js      → Comms checklist endpoints
│   │   └── admin.js      → Admin login, seed, logs
│   ├── services/
│   │   └── sheets.js     → Google Sheets API client
│   └── middleware/
│       ├── errorHandler.js
│       └── adminAuth.js
├── index.html            → Landing page
├── borrow.html           → Borrow/return page
├── admin.html            → Admin panel
├── comms-checklist.html  → Comms checklist page
├── css/style.css         → Mobile-first styles
├── js/
│   ├── config.js         → API URL & settings
│   ├── api.js            → API client (mock + real)
│   ├── app.js            → Borrow page logic
│   ├── admin.js          → Admin page logic
│   └── comms-checklist.js → Comms checklist logic
├── apps-script/
│   └── Code.gs           → Legacy Google Apps Script (reference)
├── doc/
│   ├── PRD.md            → Original PRD
│   ├── PRD-inventory-overhaul.md → Inventory overhaul PRD
│   └── API.md            → Full API documentation
└── SPEC.md               → Specification document
```

## API Documentation

See [doc/API.md](doc/API.md) for all endpoints, request/response schemas, and error codes.

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **API Server:** Node.js + Express
- **QR Scan:** `html5-qrcode` (browser camera)
- **QR Generate:** `qrcodejs` (client-side)
- **Database:** Google Sheets (via Google Sheets API + service account)
- **Hosting:** Any static host for frontend + Vercel/Render/Fly.io for API
