# PRD: SM Equipment Monitoring — Comms Checklist Module

## 1. Overview

Add a **Comms Checklist** module alongside the existing Borrow/Return flow. This digitizes the current paper-based comms equipment checklist (Hollyland intercom system and peripherals) so volunteers can check items in/out using QR codes from their phone — no paper, no lost forms.

## 2. Goals

- Replace the Google Form workflow with a dedicated web page
- Enforce that every required comms item is verified before submitting
- Track who checked what, when, and for which event
- Generate individual QR codes for each comms item

## 3. Main Page Changes

The landing page (`index.html`) gets two options:

| Option | Action |
|--------|--------|
| **Borrowing Equipment** | Redirects to the existing borrow/return flow (current app) |
| **Comms Checklist** | Opens the new Comms Checklist page |

## 4. Comms Checklist Page — Form Fields

### 4.1 Header Fields

| Field | Type | Notes |
|-------|------|-------|
| Full Name | Text | Required, autofill from previous session |
| Timestamp | Auto | Current date/time, 1-sec tick |
| Church Event and Activity | Dropdown | Sunday Service, Tuesday Worship Service, Special Service (Support when Requested), Empowered Night, Others |
| Others (free text) | Text input | Shown only when "Others" is selected |
| SLOT | Radio | AM / PM |

### 4.2 Checklist Items

Each item has: **Item name, Required qty/completeness, Status (Complete / Incomplete / N/A), Notes field**.

| # | Item | Specification | Required |
|---|------|---------------|----------|
| 1 | Base Station | Complete (1 pc), + Notes | No |
| 2 | Antenna | Complete (2 pcs), + Notes | No |
| 3 | Cable | Complete (1 pc), + Notes | No |
| 4 | POE Adapter | Complete (1 pc), + Notes | **Yes** |
| 5 | Pet Knob with Tripod Adapter | 1 Knob, 1 Adapter, + Notes | **Yes** |
| 6 | Beltpack Battery | 16 pcs complete (8 spares), + Notes | **Yes** |
| 7 | Charging Base | Complete (1 pc), + Notes | **Yes** |
| 8 | 4-Pin XLR Adapter | Complete (1 pc), + Notes | **Yes** |
| 9 | M1 Hard Case | Complete (1 pc), + Notes | **Yes** |

### 4.3 Beltpack Assignment

8 beltpacks (SM1–SM8), each with a text field for the assigned user's full name. Default "N/A" if not used.

| Beltpack | Input |
|----------|-------|
| SM1 Beltpack | Username text |
| SM2 Beltpack | Username text |
| SM3 Beltpack | Username text |
| SM4 Beltpack | Username text |
| SM5 Beltpack | Username text |
| SM6 Beltpack | Username text |
| SM7 Beltpack | Username text |
| SM8 Beltpack | Username text |

### 4.4 Headset Assignment

8 headsets (SM1–SM8), each with status: **Headset Working** (radio/select) or **Notes**.

| Headset | Status |
|---------|--------|
| SM1 Hollyland Headset | Working / Needs Repair / Notes |
| SM2 Hollyland Headset | Working / Needs Repair / Notes |
| SM3 Hollyland Headset | Working / Needs Repair / Notes |
| SM4 Hollyland Headset | Working / Needs Repair / Notes |
| SM5 Hollyland Headset | Working / Needs Repair / Notes |
| SM6 Hollyland Headset | Working / Needs Repair / Notes |
| SM7 Hollyland Headset | Working / Needs Repair / Notes |
| SM8 Hollyland Headset | Working / Needs Repair / Notes |

## 5. Flow

1. User lands on `index.html` → sees two options
2. Taps **Comms Checklist** → navigates to `/comms-checklist.html`
3. Fills in Name, Event, Slot
4. Scans each comms item QR code → item auto-checks as "Complete"
5. Alternatively taps each item to toggle status (Complete / Incomplete / N/A)
6. Fills beltpack assignments and headset status manually
7. Taps **Submit** → data logged to Google Sheet
8. Confirmation screen shown

## 6. QR Integration

- Each comms item gets a unique QR code (e.g. `COMMS-BASE-01`, `COMMS-ANTENNA-01`)
- Scanning a QR code marks that item as "Complete"
- Admin panel gets a **Comms Items** tab to manage comms equipment and print QR codes

## 7. Data Model (Google Sheets)

New sheet: **CommsChecklist**

| Column | Description |
|--------|-------------|
| id | Auto-generated |
| name | Full name of person checking |
| event | Church Event and Activity |
| event_other | Custom event name if "Others" |
| slot | AM / PM |
| timestamp | Submission timestamp |
| base_station | Status + notes |
| antenna | Status + notes |
| cable | Status + notes |
| poe_adapter | Status + notes |
| pet_knob | Status + notes |
| beltpack_battery | Status + notes |
| charging_base | Status + notes |
| xlr_adapter | Status + notes |
| m1_hard_case | Status + notes |
| sm1_user | Beltpack username |
| sm2_user | Beltpack username |
| ... | ... |
| sm8_user | Beltpack username |
| sm1_headset | Status + notes |
| sm2_headset | Status + notes |
| ... | ... |
| sm8_headset | Status + notes |

## 8. Future Considerations

- Pre-fill name from localStorage
- Summary dashboard for past checklists
- Export to PDF
