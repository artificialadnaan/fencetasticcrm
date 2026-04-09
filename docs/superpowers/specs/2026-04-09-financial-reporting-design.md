# Financial Reporting & Material Cost Tracking Design

**Date:** 2026-04-09

## Goal

Replace external spreadsheet-based financial management with comprehensive in-app reporting and tighter material cost tracking per project. Build 5 financial reports (P&L, Job Costing, Commission Summary, Expense Breakdown, Cash Flow), extend the data model to support project-linked material line items, and add material entry UX on the Project Detail page.

## Scope

In scope:

- Add `subcategory` field to Transaction model.
- Add `effectiveFrom` / `effectiveTo` date fields to OperatingExpense model.
- New `MaterialLineItem` model for per-project material cost tracking.
- Rebuild the Reports page with 5 financial report views styled to the unified design system.
- Add Materials tab to Project Detail page with inline entry and bulk-add.
- Project-level financial summary card on Project Detail.
- CSV and PDF export for all reports.

Out of scope:

- QuickBooks or external accounting software integration.
- Bank/card statement import or reconciliation.
- Accounts receivable / invoicing.
- Restyling Commissions, Settings, or Login pages.

## Data Model Extensions

All IDs use UUID strings (`@id @default(uuid()) @db.Uuid`), consistent with the existing schema.

### Transaction Model Changes

`Transaction` already has `projectId` (FK → Project) and `payee`. Only one new field is needed:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subcategory` | String | No | Finer grain than `category` (e.g., category="Materials", subcategory="Lumber") |

The existing `payee` field serves the vendor role — no separate `vendor` field needed.

### New MaterialLineItem Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (UUID PK) | Yes | `@default(uuid()) @db.Uuid` |
| `projectId` | String (FK → Project) | Yes | The project this material belongs to |
| `description` | String | Yes | What was purchased ("4x4x8 cedar posts") |
| `category` | Enum (MaterialCategory) | Yes | LUMBER, CONCRETE, HARDWARE, FASTENERS, GATES, PANELS, OTHER |
| `vendor` | String | No | Supplier name |
| `quantity` | Decimal(10,2) | Yes | Number of units |
| `unitCost` | Decimal(10,2) | Yes | Cost per unit |
| `totalCost` | Decimal(10,2) | Yes | Server-computed: `quantity * unitCost`, rounded to 2 decimal places. Clients may not send this field — it is always recomputed on create/update. |
| `purchaseDate` | DateTime (Date) | Yes | When the material was purchased. Required for date-range reporting. |
| `transactionId` | String (FK → Transaction) | No | Optional link to the transaction that paid for this material |
| `createdAt` | DateTime (Timestamptz) | Yes | DEFAULT NOW() |
| `updatedAt` | DateTime (Timestamptz) | Yes | Auto-updated |

### Enum: MaterialCategory

`LUMBER | CONCRETE | HARDWARE | FASTENERS | GATES | PANELS | OTHER`

### Relations

- `Project` has many `MaterialLineItem`
- `Transaction` has many `MaterialLineItem` (one receipt can cover multiple material line items)
- `Project` has many `Transaction` (already exists via `projectId` FK on Transaction)

### Linking & Integrity Rules

- A `MaterialLineItem.transactionId` must reference a Transaction where `type = EXPENSE`. Linking to INCOME transactions is rejected.
- A linked Transaction must have the same `projectId` as the MaterialLineItem, or `projectId = null`. Cross-project linking is rejected.
- On Transaction delete: set `MaterialLineItem.transactionId` to null (don't cascade-delete the material record — the cost still happened).
- On MaterialLineItem delete: no cascade to Transaction.
- A Transaction can be linked to many MaterialLineItems. The sum of linked MaterialLineItem totals may be less than or equal to the Transaction amount (remaining amount = non-material expense like tax/shipping).

## Double-Count Prevention

One Transaction can map to many MaterialLineItems. Reports handle this by:

1. **Material costs** are always sourced from `MaterialLineItem.totalCost` aggregations, never from Transaction amounts.
2. **Non-material expense costs** from Transactions are calculated as: `Transaction.amount - SUM(linked MaterialLineItem.totalCost)` for transactions that have linked materials. For transactions with no linked materials, the full `Transaction.amount` is used.
3. This means a $500 Home Depot receipt (one Transaction) with $400 in MaterialLineItems contributes $400 to "Materials" and $100 to "Other Expenses" (tax/misc).

## Report Definitions

All reports share:
- Date range picker (default: current month)
- CSV export button
- PDF export button
- Styled to unified design system (warm canvas, glass cards, dark accents)

Reports page uses tab navigation across the 5 reports.

### Date Attribution Rules — Completion-Based P&L

The P&L is **completion-based** (accrual-like): both revenue and costs for a project are attributed to the project's completion month. This prevents the common problem of revenue and COGS landing in different months for the same job.

| Report | Date attribution |
|--------|-----------------|
| P&L | **Completion-based.** Revenue AND all project COGS (materials, subs) are attributed to `Project.completedDate` month (fallback: `Project.contractDate`). Non-project expenses and operating expenses use `Transaction.date` / synthetic monthly. |
| Job Costing | `Project.contractDate` for project inclusion filter. All costs tied to project regardless of date. |
| Commission Summary | `CommissionSnapshot.settledAt` for settled. Unsettled shown separately with no date filter. |
| Expense Breakdown | `Transaction.date`; `MaterialLineItem.purchaseDate`. Shows all expenses regardless of project attribution. |
| Cash Flow | `Transaction.date` for both INCOME and EXPENSE types. MaterialLineItem costs only appear via their linked Transaction. Unlinked materials use `purchaseDate`. |

### Operating Expense Attribution

`OperatingExpense` records have no date — they represent recurring costs (monthly/quarterly/annual) with an `isActive` flag.

**New fields on OperatingExpense:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `effectiveFrom` | DateTime (Date) | No | When this expense started. Null = assumed active since business start. |
| `effectiveTo` | DateTime (Date) | No | When this expense ended. Null = still active. |

For date-range reporting:
- Expand operating expenses into synthetic monthly amounts: `MONTHLY` = amount, `QUARTERLY` = amount / 3, `ANNUAL` = amount / 12.
- Only attribute to months within the `effectiveFrom`–`effectiveTo` range (inclusive). If `effectiveFrom` is null, include all months up to `effectiveTo`. If `effectiveTo` is null, include all months from `effectiveFrom` onward.
- `isActive` is kept for backward compatibility but `effectiveTo` is the authoritative end date for reporting. A deactivated expense with no `effectiveTo` is treated as ending at deactivation time (set `effectiveTo` when deactivating).

### 1. Profit & Loss (P&L)

Period toggle: monthly / quarterly / annual.

| Line Item | Source |
|-----------|--------|
| **Revenue** | Sum of `Project.moneyReceived` for projects completed (or contracted) in period |
| **Cost of Goods Sold** | For each project in period: Materials (MaterialLineItem totals, fallback `materialsCost`) + Subs (`SubcontractorPayment.amountPaid`) + Other Project Expenses (project-linked Transaction remainders after material split). All rolled into the project's completion month. |
| **Gross Profit** | Revenue - COGS |
| **Operating Expenses** | Synthetic monthly operating expenses (within `effectiveFrom`–`effectiveTo`) + non-project-linked expense Transactions by `Transaction.date` |
| **Commissions** | Sum of `CommissionSnapshot.adnaanCommission + CommissionSnapshot.memeCommission` for snapshots settled in period |
| **Net Profit** | Gross Profit - Operating Expenses - Commissions |

Visual: Summary table + Recharts bar/line chart showing month-over-month trend.

Note: `Project.moneyReceived` is derived from `projectTotal` minus CC fees (see `calculateCommission`). It is a project-level value, not a dated payment event. For P&L purposes, this is attributed to the project's completion month. True cash-basis accounting would require a payment ledger — flagged as a future enhancement.

### 2. Job Costing Report

Table view, one row per project:

| Column | Source |
|--------|--------|
| Customer | `Project.customer` |
| Address | `Project.address` |
| Status | `Project.status` |
| Fence type | `Project.fenceType` |
| Revenue | `Project.moneyReceived` |
| Materials | Sum of `MaterialLineItem.totalCost` for project. Falls back to `Project.materialsCost` for legacy projects with no MaterialLineItems. |
| Subcontractors | Sum of `SubcontractorPayment.amountPaid` for project |
| Other Project Expenses | Sum of project-linked Transaction remainders (amount minus linked MaterialLineItem totals). Captures tax, shipping, misc costs from receipts. |
| Commissions (Adnaan) | If settled: `CommissionSnapshot.adnaanCommission`. If unsettled: computed via `calculateCommission()` using current project data (same path as commission preview). |
| Commissions (Meme) | If settled: `CommissionSnapshot.memeCommission`. If unsettled: computed via `calculateCommission()`. |
| **Profit** | Revenue - Materials - Subs - Other Expenses - Commissions |
| **Margin %** | Profit / Revenue * 100 (guard: 0% if Revenue = 0) |

Sortable by any column. Filterable by status, date range (using `contractDate`), fence type. Click row to expand line-item breakdown.

Note on legacy data: Existing projects have `Project.materialsCost` as a single aggregate value. Job Costing uses `MaterialLineItem` totals when available, falling back to `Project.materialsCost` for older projects. No backfill migration is required — the fallback handles historical data gracefully.

### 3. Commission Summary

Period-based, grouped by person. Source of truth: `CommissionSnapshot` records (already captures the full waterfall per project).

| Column | Source |
|--------|--------|
| Project | `Project.customer` + `Project.address` |
| Project Total | `Project.projectTotal` |
| Commission (Adnaan) | `CommissionSnapshot.adnaanCommission` |
| Commission (Meme) | `CommissionSnapshot.memeCommission` |
| **Period total per person** | Sum of respective commission columns |
| Aimann deductions | `CommissionSnapshot.aimannDeduction` (this is 25% of grossProfit when debt > 0, per existing commission logic — it is NOT a generic deduction from both people's payouts) |
| **Net payout (Adnaan)** | Period total - Aimann deductions |
| **Net payout (Meme)** | Period total (Meme) — Aimann deductions do not apply to Meme's commission |

Filtered by `CommissionSnapshot.settledAt` date range.

For unsettled projects (no snapshot yet): compute commission values live via `calculateCommission()` using the project's current `projectTotal`, `paymentMethod`, `materialsCost`, and subcontractor totals — the same calculation path used by the commission preview on the project detail page. Show these in a separate "Pending" section, not mixed into settled totals.

### 4. Expense Breakdown

Two views toggled with tabs:

**By Category:**
- Donut chart + table
- Categories: Materials (from MaterialLineItems), Subcontractors (from SubcontractorPayment), Operating Expenses (synthetic monthly), Other Expenses (from Transactions minus linked MaterialLineItem amounts)
- Drill into subcategories for Materials (LUMBER, CONCRETE, etc.) and Transactions (using `subcategory` field)
- Filtered by `Transaction.date` / `MaterialLineItem.purchaseDate`

**By Vendor:**
- Table sorted by total spend descending
- Columns: Vendor/payee name, total spend, number of projects, top categories
- Source: `Transaction.payee` + `MaterialLineItem.vendor`
- Filtered by date range

Both views include project-linked and general business expenses.

### 5. Cash Flow

Monthly view:

| Row | Source |
|-----|--------|
| **Money In** | Sum of INCOME Transactions grouped by `Transaction.date` month |
| **Money Out** | Sum of EXPENSE Transactions + unlinked MaterialLineItem costs + synthetic operating expenses, grouped by month |
| **Net Cash Flow** | Money In - Money Out |
| **Running Balance** | Cumulative net over time |

Visual: Dual-axis bar chart (green bars = in, red bars = out) with line overlay for running balance.

Note: Cash Flow uses Transaction dates for timing. Projects without corresponding income Transactions will not appear in Money In. This is intentional — Cash Flow tracks actual recorded transactions, not project-level derived values.

## Material Entry UX

### Project Detail Page — Materials Tab

New tab on Project Detail alongside existing Notes, Timeline, Financials sections.

**Quick-add row:**
- Inline form at top of materials list
- Fields: description (text), category (dropdown), vendor (text), quantity (number), unit cost (currency), purchase date (date picker, defaults to today)
- Total auto-displays as quantity * unitCost (read-only, computed client-side for preview, server recomputes on save)
- Submit adds row to list immediately

**Bulk entry:**
- "Add Multiple" button opens a multi-row form
- Same fields as quick-add but repeated rows
- Submit all at once (server wraps in a DB transaction — all-or-nothing)

**Link to transaction:**
- Optional dropdown on each material line item to link to an existing Transaction
- Dropdown only shows EXPENSE transactions for the same project (or unlinked transactions)
- When linked, reports use the split accounting described in Double-Count Prevention

**Materials list:**
- Table showing all MaterialLineItems for the project
- Columns: description, category, vendor, qty, unit cost, total, purchase date
- Inline edit and delete
- Running total at bottom

### Project Detail — Financial Summary Card

New summary card visible on Project Detail (above or alongside materials):

| Metric | Source |
|--------|--------|
| Total Materials | Sum of `MaterialLineItem.totalCost` (fallback: `Project.materialsCost` if no line items) |
| Total Subs | Sum of `SubcontractorPayment.amountPaid` |
| Other Expenses | Sum of project-linked Transaction remainders (amount minus linked MaterialLineItem totals) |
| Total Commissions | If settled: from `CommissionSnapshot`. If unsettled: computed live via `calculateCommission()`. |
| **Project Profit** | `Project.moneyReceived` - Materials - Subs - Other Expenses - Commissions |
| **Margin %** | Profit / `Project.moneyReceived` * 100 (guard: 0% if moneyReceived = 0) |

### Finances Page

No changes needed — Transaction creation already supports `projectId` via the existing schema. The "Link to Project" dropdown already exists or can use the existing `projectId` field.

## API Endpoints

### New Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/materials` | List material line items for a project |
| POST | `/api/projects/:id/materials` | Create one or more material line items (array body) |
| PATCH | `/api/materials/:id` | Update a material line item |
| DELETE | `/api/materials/:id` | Delete a material line item |
| GET | `/api/reports/pnl` | P&L data for date range and period |
| GET | `/api/reports/job-costing` | Job costing data with filters |
| GET | `/api/reports/commissions` | Commission summary for date range |
| GET | `/api/reports/expenses` | Expense breakdown (by-category or by-vendor mode) |
| GET | `/api/reports/cash-flow` | Cash flow data by month |
| GET | `/api/reports/:type/export` | CSV/PDF export for any report type |

### Modified Routes

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/transactions` | Accept optional `subcategory` in create body |
| PATCH | `/api/transactions/:id` | Accept optional `subcategory` in update body |
| GET | `/api/transactions` | Return `subcategory` in list response |

### Shared Type Changes

Update `packages/shared/src/types.ts`:
- Add `subcategory?: string` to `TransactionCreate`, `TransactionUpdate`, and `TransactionListItem` types.
- Update Zod schemas in `apps/api/src/routes/transactions.ts` for both create and update to accept `subcategory: z.string().max(100).optional()`.

### API Validation (Zod)

**POST `/api/projects/:id/materials`** — accepts array of items:
```
z.array(z.object({
  description: z.string().min(1).max(500),
  category: z.nativeEnum(MaterialCategory),
  vendor: z.string().max(200).optional(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
  purchaseDate: z.coerce.date(),
  transactionId: z.string().uuid().optional(),
})).min(1).max(50)
```

Validation rules:
- `quantity` must be positive (> 0)
- `unitCost` must be non-negative (>= 0)
- `category` must be a valid MaterialCategory enum value
- `transactionId` if provided must reference an EXPENSE Transaction with matching or null `projectId`
- **Allocation cap:** When linking to a Transaction, server validates that `SUM(existing linked MaterialLineItem.totalCost) + new item(s) totalCost <= Transaction.amount`. This check runs inside the Prisma `$transaction` to prevent race conditions on concurrent links. Applies to both bulk create and individual PATCH.
- Bulk create is wrapped in a Prisma `$transaction` — all-or-nothing
- Max 50 items per bulk request

**PATCH `/api/materials/:id`** — partial update, same field validations as create. Allocation cap is rechecked: `existing total - old row total + new row total <= Transaction.amount`.

## Database Indexes

Add indexes for report query performance:

| Table | Index | Purpose |
|-------|-------|---------|
| `MaterialLineItem` | `(projectId)` | Job costing aggregation |
| `MaterialLineItem` | `(purchaseDate)` | Date-range filtering in P&L, expenses, cash flow |
| `MaterialLineItem` | `(transactionId)` | Double-count join |
| `MaterialLineItem` | `(category)` | Expense breakdown by category |
| `Transaction` | `(date, type)` | Cash flow queries |
| `Transaction` | `(projectId, type)` | Project expense aggregation |
| `CommissionSnapshot` | `(settledAt)` | Commission summary date filtering |

Note: `Transaction` already has a `projectId` field but may need a composite index. Check existing indexes before adding.

## Migration Strategy

- Add `subcategory` column to Transaction as nullable (no breaking changes)
- Add `effectiveFrom` and `effectiveTo` nullable Date columns to OperatingExpense
- Create `MaterialLineItem` table with `MaterialCategory` enum
- Add database indexes listed above
- Existing `Project.materialsCost` field is NOT removed — it serves as the legacy fallback for projects that predate MaterialLineItem tracking. Job Costing report checks for MaterialLineItems first, falls back to `materialsCost`.
- No data backfill needed — the fallback strategy handles historical projects without migration
- `CommissionSnapshot` records are frozen settlement data — they are never recalculated. Reports use them as-is for historical periods.
