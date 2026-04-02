# Fencetastic Project Tracking Dashboard — Design Spec

## Problem

Fencetastic currently tracks all project financials, commissions, expenses, and scheduling in a single Excel spreadsheet (`Project Schedule.xlsx`). This is error-prone, hard to share between team members, lacks reporting capabilities, and provides no visibility into pipeline or commission projections. Two people (Adnaan and Meme) need concurrent access with real-time updates.

## Solution

A web-based project tracking dashboard that replaces the spreadsheet. Not a CRM — this handles post-closed-won project execution, financial tracking, commission calculations, scheduling, and reporting.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Railway-hosted) |
| Auth | Email/password + JWT (httpOnly cookies) |
| Photo Storage | Cloudflare R2 (S3-compatible SDK) |
| Calendar | react-big-calendar |
| Charts | Recharts |
| Deployment | Railway — 2 services (API + Web) |
| Data Import | xlsx npm package |

## Architecture

Monorepo with 2 Railway services, matching the SkyGuard pattern:

```
FencetasticCRM/
├── apps/
│   ├── api/                    # Express + Prisma (port 3001)
│   │   ├── src/
│   │   │   ├── routes/         # REST endpoints
│   │   │   ├── services/       # Business logic (commission calc, etc.)
│   │   │   ├── middleware/     # Auth, error handling
│   │   │   └── index.ts        # Server entry
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   └── web/                    # Vite + React (port 3000)
│       ├── src/
│       │   ├── pages/          # Route-level components
│       │   ├── components/     # Shared UI components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # API client, utils
│       │   └── App.tsx
│       └── package.json
├── packages/
│   └── shared/                 # Types, constants, commission math
│       ├── types.ts
│       ├── constants.ts
│       └── commission.ts
├── scripts/
│   └── import-spreadsheet.ts   # One-time data import
└── package.json                # Workspace root
```

## Authentication

- Email + password login with bcrypt-hashed passwords
- JWT stored in httpOnly cookie (not localStorage)
- 2 seeded users: Adnaan (adnaan@fencetastic.com) and Meme (meme@fencetastic.com)
- Both users have identical permissions — no role-based access control needed
- Session expiry: 7 days, refresh on activity
- **CORS:** API sets `Access-Control-Allow-Origin` to the web service URL, `Access-Control-Allow-Credentials: true`. Cookies use `SameSite=None; Secure; HttpOnly`. Both services should be on the same parent domain (e.g., `api.fencetastic.app` and `app.fencetastic.app`) to simplify cookie sharing.
- **Concurrency:** Simple 30-second polling on the frontend. Last-write-wins — acceptable for 2 users. No WebSockets needed for v1.

---

## Data Model

### User

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| email | string | Unique |
| name | string | Display name |
| passwordHash | string | bcrypt |
| createdAt | timestamptz | |

### Project

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| customer | string | Customer name |
| address | string | Job site address |
| description | string | Project description |
| fenceType | enum | WOOD, METAL, CHAIN_LINK, VINYL, GATE, OTHER |
| status | enum | ESTIMATE, OPEN, IN_PROGRESS, COMPLETED |
| projectTotal | decimal(10,2) | Amount charged to customer |
| paymentMethod | enum | CASH, CHECK, CREDIT_CARD |
| moneyReceived | decimal(10,2) | Actual amount received (auto: 97% if CC, else = projectTotal) |
| customerPaid | decimal(10,2) | Running total of payments received, default 0 |
| forecastedExpenses | decimal(10,2) | Estimated cost |
| materialsCost | decimal(10,2) | Actual materials cost |
| contractDate | date | Date contract signed |
| installDate | date | Scheduled install date |
| completedDate | date | Date project completed (nullable) |
| estimateDate | date | Date estimate was given (nullable) |
| followUpDate | date | Follow-up reminder date (nullable) |
| linearFeet | decimal(10,2) | Linear footage for rate template calc (nullable) |
| rateTemplateId | uuid | FK → RateTemplate used for estimate (nullable) |
| subcontractor | string | Primary subcontractor name (nullable) |
| notes | text | General project notes (nullable) |
| createdById | uuid | FK → User |
| isDeleted | boolean | default false, for soft delete |
| deletedAt | timestamptz | (nullable) |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### SubcontractorPayment

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| projectId | uuid | FK → Project |
| subcontractorName | string | e.g., Pepino, Froilan |
| amountOwed | decimal(10,2) | Total owed for this sub on this project |
| amountPaid | decimal(10,2) | Amount paid so far |
| datePaid | date | Date of payment (nullable) |
| notes | string | (nullable) |

### ProjectNote

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| projectId | uuid | FK → Project |
| authorId | uuid | FK → User |
| content | text | Note text |
| photoUrls | string[] | Array of Cloudflare R2 URLs |
| createdAt | timestamptz | |

### RateTemplate

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| fenceType | enum | WOOD, METAL, CHAIN_LINK, VINYL, GATE, OTHER |
| name | string | Template name (e.g., "6ft Cedar Privacy") |
| ratePerFoot | decimal(10,2) | Material cost per linear foot |
| laborRatePerFoot | decimal(10,2) | Labor cost per linear foot |
| description | string | (nullable) |
| isActive | boolean | default true |

### AimannDebtLedger

Tracks the running balance of the old owner's credit card debt.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| projectId | uuid | FK → Project (nullable — for manual adjustments) |
| amount | decimal(10,2) | Positive = debt added, negative = payment from project profit |
| runningBalance | decimal(10,2) | Balance after this entry |
| note | string | Description |
| date | timestamptz | |

The initial balance ($5,988.41 from the Payout sheet) is seeded as the first ledger entry.

### CommissionSnapshot

Persisted when a project status changes to COMPLETED. Locks in the commission values at completion time so historical reports are stable.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| projectId | uuid | FK → Project (unique) |
| moneyReceived | decimal(10,2) | Actual received at time of completion |
| totalExpenses | decimal(10,2) | materialsCost + sum(sub.amountOwed) |
| adnaanCommission | decimal(10,2) | projectTotal × 0.10 |
| memeCommission | decimal(10,2) | projectTotal × 0.05 |
| grossProfit | decimal(10,2) | moneyReceived - totalExpenses - adnaanCommission |
| aimannDeduction | decimal(10,2) | max(grossProfit, 0) × 0.25 (or 0 if no debt) |
| debtBalanceBefore | decimal(10,2) | Aimann debt balance before this project |
| debtBalanceAfter | decimal(10,2) | Balance after deduction posted |
| netProfit | decimal(10,2) | grossProfit - aimannDeduction - memeCommission |
| settledAt | timestamptz | When snapshot was created |

### OperatingExpense

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| category | string | e.g., Insurance, Advertising, Accounting |
| description | string | e.g., HISCOX INC |
| amount | decimal(10,2) | Cost per period |
| frequency | enum | MONTHLY, QUARTERLY, ANNUAL |
| isActive | boolean | default true |

---

## Commission Waterfall

All commission calculations live in `packages/shared/commission.ts` — shared between API (for storage/reports) and frontend (for live preview).

### Calculation Order

```
INPUTS:
  projectTotal      — what we charged the customer
  paymentMethod     — CASH, CHECK, or CREDIT_CARD
  materialsCost     — actual materials
  subOwedTotal      — sum of all SubcontractorPayment.amountOwed for this project
  aimannDebtBalance — current running balance from AimannDebtLedger

STEP 1: Money Received
  if paymentMethod == CREDIT_CARD:
    moneyReceived = projectTotal × 0.97
  else:
    moneyReceived = projectTotal

STEP 2: Total Expenses
  totalExpenses = materialsCost + subOwedTotal  (uses amountOwed, not amountPaid)

STEP 3: Commissions (based on projectTotal)
  adnaanCommission = projectTotal × 0.10
  memeCommission   = projectTotal × 0.05

STEP 4: Gross Profit
  grossProfit = moneyReceived - totalExpenses - adnaanCommission

STEP 5: Aimann Deduction
  if aimannDebtBalance > 0:
    aimannDeduction = max(grossProfit, 0) × 0.25
  else:
    aimannDeduction = 0
  (Guard: if grossProfit is negative, aimannDeduction is $0 — never negative)

STEP 6: Net Profit
  netProfit = grossProfit - aimannDeduction - memeCommission
```

### Rules

- For OPEN/IN_PROGRESS projects: commissions are computed live from current values (for previews and pipeline projections)
- When a project status changes to COMPLETED: a `CommissionSnapshot` is persisted, locking in all values at that moment. The Aimann deduction is also written to `AimannDebtLedger`.
- Historical reports and the Commissions page read from `CommissionSnapshot`, not live calculations — this ensures numbers never shift after completion
- Aimann's 25% applies as the full percentage as long as any debt balance remains (no capping at remaining balance)
- Commission percentages are defined as constants in `packages/shared/constants.ts` for easy future adjustment
- All monetary calculations use 2 decimal places, rounded half-up

---

## Pages

### 1. Dashboard (Homepage)

**Route:** `/`

**KPI Cards (top row):**
- Revenue MTD (sum of moneyReceived for completed projects this month)
- Open Projects (count of OPEN + IN_PROGRESS)
- Outstanding Receivables (sum of projectTotal - customerPaid where customerPaid < projectTotal — based on full invoiced amount, not post-CC-fee amount, matching the spreadsheet)
- Aimann Debt Balance (current running balance)

**Charts:**
- Monthly Revenue vs Expenses (Recharts bar chart, 6-month trailing)
- Project Type Breakdown (Recharts pie chart by fenceType)

**Widgets:**
- Today's Follow-Ups (projects with followUpDate = today)
- Recent Activity (last 5 project notes/status changes)
- Upcoming Installs (next 5 projects by installDate)

### 2. Projects

**Route:** `/projects`

- Filterable, sortable data table (shadcn DataTable)
- Filters: status, fenceType, date range, search by customer/address
- Columns: Customer, Address, Type, Status, Project Total, Receivable, Profit %, Install Date
- Status badges: Green = Completed, Blue = In Progress, Amber = Open, Gray = Estimate
- Quick-add button opens a modal/drawer to create a new project
- Click row → navigates to project detail

### 3. Project Detail

**Route:** `/projects/:id`

**Sections:**
- **Header:** Customer name, address, status badge, status change controls
- **Financials Card:** Project total, payment method, money received, expenses, commission breakdown (read-only computed), net profit — all calculated live
- **Expenses Breakdown:** Materials cost + subcontractor payment table (add/edit/delete subs, mark payments)
- **Rate Template Pre-fill:** When creating a project, select a rate template + enter linear footage → auto-fills materialsCost and forecastedExpenses. Override any value manually.
- **Notes Timeline:** Chronological list of ProjectNotes with text + photo thumbnails. Add new note with text field + photo upload (multi-file, uploads to R2). Photos expand on click.
- **Schedule:** Estimate date, follow-up date, install date, completed date — all editable with date pickers

### 4. Calendar

**Route:** `/calendar`

- react-big-calendar with month/week/day views
- Event types (color-coded):
  - Estimate Given (blue) — from project.estimateDate
  - Follow-Up Reminder (amber) — from project.followUpDate
  - Scheduled Install (green) — from project.installDate
  - Project Completed (gray) — from project.completedDate
- Click a date → create new calendar entry (pre-fills into a new project or updates an existing one)
- Click an event → navigates to the project detail page
- Events are derived from project date fields, not a separate events table

### 5. Commissions

**Route:** `/commissions`

- **Summary Cards:** Adnaan total (MTD + YTD), Meme total (MTD + YTD)
- **Aimann Debt Tracker:** Current balance, ledger history table (date, project, amount, running balance), manual adjustment button for adding new debt
- **Per-Project Breakdown:** Table showing each completed project's commission split (Adnaan, Meme, Aimann, Net Profit)
- **Pipeline Projection:** Estimated commissions from open/in-progress projects (assumes they complete at current projectTotal)
- **Monthly Summary:** Bar chart of commission payouts by month

### 6. Reports

**Route:** `/reports`

- **Monthly P&L:** Revenue, expenses, commissions, net profit by month
- **Project Stats:** Average project duration by fence type, total projects completed per month
- **Receivables Aging:** Projects with outstanding balances grouped by 0-30, 31-60, 61-90, 90+ days
- **Operating Expenses:** Monthly recurring costs vs one-time project expenses
- Date range picker for all reports
- Export to PDF (browser print / react-to-print)

### 7. Settings

**Route:** `/settings`

- **Rate Templates:** CRUD table for fence type rate templates ($/ft materials, $/ft labor)
- **Operating Expenses:** CRUD table for recurring business expenses (category, amount, frequency)
- **Commission Rates:** Display current rates (10% Adnaan, 5% Meme, 25% Aimann). Read-only — rates are defined as constants in code.
- **Profile:** Change password

---

## UI Design

- **Layout:** Dark sidebar (#0F172A) with brand gradient (purple #7C3AED → cyan #06B6D4)
- **Sidebar:** Collapsible on desktop, hamburger menu on mobile
- **Component Library:** shadcn/ui for all form inputs, tables, modals, dropdowns, badges
- **Status Badges:** Green pill = Completed, Blue = In Progress, Amber = Open, Gray = Estimate
- **Charts:** Recharts with purple/cyan color scheme matching brand gradient
- **Tables:** shadcn DataTable with sort, filter, pagination. Alternating row shading, hover states.
- **Mobile:** Responsive down to 375px. Sidebar becomes hamburger. Tables stack on small screens.
- **Typography:** System font stack (Inter if available)

---

## Calendar Implementation

- **Library:** react-big-calendar with date-fns localizer
- **Data source:** Project date fields (estimateDate, followUpDate, installDate, completedDate) are transformed into calendar events on the API side
- **API endpoint:** `GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD` returns events for the visible date range
- **No separate events table** — events are derived views of project dates
- **Follow-up reminders:** No push notifications. Follow-ups for today/overdue are shown as a widget on the Dashboard page.

---

## Photo Upload (Cloudflare R2)

- **Upload flow:** Frontend sends file to `POST /api/upload` → API streams to R2 → returns public URL → URL stored in ProjectNote.photoUrls array
- **File types:** JPEG, PNG, HEIC (iPhone photos). Max 10MB per file, max 5 files per note.
- **R2 bucket structure:** `fencetastic/{projectId}/uploads/{uuid}-{filename}` (no noteId dependency — photos are uploaded before the note is created, then URLs are attached to the note on creation)
- **Environment variables:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Client SDK:** `@aws-sdk/client-s3` with R2 endpoint

---

## Data Import

One-time import script at `scripts/import-spreadsheet.ts`:

1. Reads `Project Schedule.xlsx` using the `xlsx` npm package
2. **Open sheet** → creates Project records with status OPEN or IN_PROGRESS
3. **Completed Projects sheet** → creates Project records with status COMPLETED
4. **Payout sheet** → seeds AimannDebtLedger with starting balance ($5,988.41)
5. **Expenses sheet** → seeds OperatingExpense records
6. Column mapping:
   - `install date` → installDate
   - `Contract Date` → contractDate
   - `Customer` → customer
   - `Address` → address
   - `Description` → description
   - `Project Total` → projectTotal
   - `Money Received` → moneyReceived
   - `Customer Paid` → customerPaid
   - `Forecasted Expenses` → forecastedExpenses
   - `Materials ONLY` → materialsCost
   - `Sub Payment 1/2` → SubcontractorPayment records
   - `Subcontractor` → subcontractor
   - `Status` → status
   - `Notes` → notes
7. Deduplication: skip if customer + address + contractDate already exists
8. Run with: `npx tsx scripts/import-spreadsheet.ts`

---

## API Routes

### Auth
- `POST /api/auth/login` — email + password → JWT cookie
- `POST /api/auth/logout` — clear cookie
- `GET /api/auth/me` — current user
- `PATCH /api/auth/password` — change password (requires current password)

### Projects
- `GET /api/projects` — list with filters (status, fenceType, search, dateRange)
- `GET /api/projects/:id` — single project with subs, notes, computed commissions
- `POST /api/projects` — create
- `PATCH /api/projects/:id` — update (triggers commission recalc if status → COMPLETED)
- `DELETE /api/projects/:id` — soft delete

### Subcontractor Payments
- `POST /api/projects/:id/subs` — add sub payment
- `PATCH /api/subs/:id` — update
- `DELETE /api/subs/:id` — remove

### Project Notes
- `GET /api/projects/:id/notes` — list notes for project
- `POST /api/projects/:id/notes` — create note (with photo URLs)
- `PATCH /api/notes/:id` — edit note content
- `DELETE /api/notes/:id` — delete note

### Activity Log
- `GET /api/activity` — recent status changes and notes across all projects (for dashboard widget)

### Upload
- `POST /api/upload` — upload file to R2, returns URL

### Calendar
- `GET /api/calendar/events` — events for date range (derived from project dates)

### Commissions
- `GET /api/commissions/summary` — MTD + YTD totals per person
- `GET /api/commissions/by-project` — per-project breakdown
- `GET /api/commissions/pipeline` — projections from open projects

### Aimann Debt
- `GET /api/debt/balance` — current balance
- `GET /api/debt/ledger` — full ledger history
- `POST /api/debt/adjustment` — manual balance adjustment

### Reports
- `GET /api/reports/monthly-pl` — monthly P&L data
- `GET /api/reports/project-stats` — duration, completion stats
- `GET /api/reports/receivables` — aging buckets

### Settings
- `GET/POST/PATCH/DELETE /api/rate-templates` — CRUD
- `GET/POST/PATCH/DELETE /api/operating-expenses` — CRUD

### Dashboard
- `GET /api/dashboard` — aggregated KPIs, charts data, today's follow-ups, recent activity

---

## Deployment (Railway)

### API Service
- **Root directory:** `apps/api`
- **Build command:** `npm run build`
- **Start command:** `node dist/index.js`
- **Port:** 3001
- **Env vars:** `DATABASE_URL` (auto from Postgres plugin), `JWT_SECRET`, `FRONTEND_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### Web Service
- **Root directory:** `apps/web`
- **Build command:** `npm run build`
- **Start command:** `npx serve dist -s -l 3000`
- **Port:** 3000
- **Env vars:** `VITE_API_URL` (points to API service URL)

### Database
- Railway PostgreSQL plugin
- Run `npx prisma migrate deploy` as build step in API service

---

## Out of Scope (for v1)

- CRM / lead management (Mikes Leads sheet is not part of this tool)
- Push notifications / email reminders
- Multi-company support
- Role-based permissions (both users are equal)
- Invoicing or payment processing
- QuickBooks / accounting software integration
- Mobile native app (responsive web is sufficient)
