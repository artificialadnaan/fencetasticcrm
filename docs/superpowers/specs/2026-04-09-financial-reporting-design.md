# Financial Reporting & Material Cost Tracking Design

**Date:** 2026-04-09

## Goal

Replace external spreadsheet-based financial management with comprehensive in-app reporting and tighter material cost tracking per project. Build 5 financial reports (P&L, Job Costing, Commission Summary, Expense Breakdown, Cash Flow), extend the data model to support project-linked material line items and better expense categorization, and add material entry UX on the Project Detail page.

## Scope

In scope:

- Extend Transaction model with optional `projectId`, `vendor`, and `subcategory` fields.
- New `MaterialLineItem` model for per-project material cost tracking.
- Rebuild the Reports page with 5 financial report views styled to the unified design system.
- Add Materials tab to Project Detail page with inline entry and bulk-add.
- Add "Link to Project" option on expense transaction creation (Finances page).
- Project-level financial summary card on Project Detail.
- CSV and PDF export for all reports.

Out of scope:

- QuickBooks or external accounting software integration.
- Bank/card statement import or reconciliation.
- Accounts receivable / invoicing.
- Restyling Commissions, Settings, or Login pages.

## Data Model Extensions

### Transaction Model Changes

Add to existing `Transaction` model:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | Int (FK → Project) | No | Links expense to a specific project |
| `vendor` | String | No | Who was paid (Home Depot, supplier name, etc.) |
| `subcategory` | String | No | Finer grain than `category` (e.g., category="Materials", subcategory="Lumber") |

The existing `category`, `amount`, `type`, `description`, and `date` fields remain unchanged.

### New MaterialLineItem Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | Int (PK) | Yes | Auto-increment |
| `projectId` | Int (FK → Project) | Yes | The project this material belongs to |
| `description` | String | Yes | What was purchased ("4x4x8 cedar posts") |
| `category` | Enum | Yes | LUMBER, CONCRETE, HARDWARE, FASTENERS, GATES, PANELS, OTHER |
| `vendor` | String | No | Supplier name |
| `quantity` | Decimal | Yes | Number of units |
| `unitCost` | Decimal | Yes | Cost per unit |
| `totalCost` | Decimal | Yes | quantity * unitCost (stored for query efficiency) |
| `transactionId` | Int (FK → Transaction) | No | Optional link to prevent double-counting in reports |
| `createdAt` | DateTime | Yes | DEFAULT NOW() |
| `updatedAt` | DateTime | Yes | Auto-updated |

### Enum: MaterialCategory

`LUMBER | CONCRETE | HARDWARE | FASTENERS | GATES | PANELS | OTHER`

### Relations

- `Project` has many `MaterialLineItem`
- `Transaction` has optional one `MaterialLineItem` (a material line item can reference the transaction that paid for it)
- `Project` has many `Transaction` (via new `projectId` FK on Transaction)

## Report Definitions

All reports share:
- Date range picker (default: current month)
- CSV export button
- PDF export button
- Styled to unified design system (warm canvas, glass cards, dark accents)

Reports page uses tab navigation across the 5 reports.

### 1. Profit & Loss (P&L)

Period toggle: monthly / quarterly / annual.

| Line Item | Source |
|-----------|--------|
| **Revenue** | Sum of `moneyReceived` from Projects in period (attributed by `completedDate`, falling back to `createdAt` if no completed date) |
| **Cost of Goods Sold** | Sum of MaterialLineItem.totalCost + Project.laborCost + SubcontractorPayment.amountPaid, all project-linked |
| **Gross Profit** | Revenue - COGS |
| **Operating Expenses** | OperatingExpense table + non-project-linked expense Transactions |
| **Commissions** | Sum of commission payouts (Adnaan + Meme) from Projects in period |
| **Net Profit** | Gross Profit - Operating Expenses - Commissions |

Visual: Summary table + Recharts bar/line chart showing month-over-month trend.

### 2. Job Costing Report

Table view, one row per project:

| Column | Source |
|--------|--------|
| Project name | Project.customerName + Project.address |
| Status | Project.status |
| Fence type | Project.fenceType |
| Revenue | Project.moneyReceived |
| Materials | Sum of MaterialLineItem.totalCost for project |
| Labor | Project.laborCost |
| Subcontractors | Sum of SubcontractorPayment.amountPaid for project |
| Commissions | Project.commissionAdnaan + Project.commissionMeme |
| **Profit** | Revenue - Materials - Labor - Subs - Commissions |
| **Margin %** | Profit / Revenue * 100 |

Sortable by any column. Filterable by status, date range, fence type. Click row to expand line-item breakdown.

### 3. Commission Summary

Period-based, grouped by person (Adnaan, Meme):

| Column | Source |
|--------|--------|
| Project name | Project |
| Total revenue | Project.moneyReceived |
| Commission % | Project.commissionAdnaan% or commissionMeme% |
| Commission amount | Calculated from % and revenue |
| **Period total** | Sum per person |
| Aimann deductions | AimannDebtLedger entries in period |
| **Net payout** | Period total - deductions |

### 4. Expense Breakdown

Two tab views:

**By Category:**
- Donut chart + table
- Categories: Materials, Labor, Subcontractors, Operating Expenses, Commissions
- Drill into subcategories (e.g., Materials → Lumber, Concrete, Hardware)
- Date range filtered

**By Vendor:**
- Table sorted by total spend descending
- Columns: Vendor name, total spend, number of projects, top categories
- Date range filtered

Both views include project-linked and general business expenses.

### 5. Cash Flow

Monthly view:

| Row | Source |
|-----|--------|
| **Money In** | Sum of project payments received (moneyReceived) grouped by month |
| **Money Out** | Sum of all expenses (materials, labor, subs, operating, commissions) grouped by month |
| **Net Cash Flow** | Money In - Money Out |
| **Running Balance** | Cumulative net over time |

Visual: Dual-axis bar chart (green bars = in, red bars = out) with line overlay for running balance.

## Material Entry UX

### Project Detail Page — Materials Tab

New tab on Project Detail alongside existing Notes, Timeline, Financials sections.

**Quick-add row:**
- Inline form at top of materials list
- Fields: description (text), category (dropdown), vendor (text), quantity (number), unit cost (currency)
- Total auto-calculates as quantity * unitCost
- Submit adds row to list immediately

**Bulk entry:**
- "Add Multiple" button opens a multi-row form
- Same fields as quick-add but repeated rows
- Submit all at once

**Link to transaction:**
- Optional dropdown on each material line item to link to an existing Transaction
- When linked, reports exclude the Transaction amount from separate expense totals to avoid double-counting

**Materials list:**
- Table showing all MaterialLineItems for the project
- Columns: description, category, vendor, qty, unit cost, total
- Inline edit and delete
- Running total at bottom

### Project Detail — Financial Summary Card

New summary card visible on Project Detail (above or alongside materials):

| Metric | Source |
|--------|--------|
| Total Materials | Sum of MaterialLineItem.totalCost |
| Total Labor | Project.laborCost |
| Total Subs | Sum of SubcontractorPayment.amountPaid |
| Total Commissions | commissionAdnaan + commissionMeme |
| **Project Profit** | moneyReceived - all costs |
| **Margin %** | Profit / moneyReceived * 100 |

### Finances Page — Link to Project

When creating a new expense Transaction:
- New optional "Link to Project" dropdown showing active projects
- Selecting a project sets the `projectId` FK
- No changes to income entry (already tied to projects via moneyReceived)

## API Endpoints

### New Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/materials` | List material line items for a project |
| POST | `/api/projects/:id/materials` | Create one or more material line items |
| PUT | `/api/materials/:id` | Update a material line item |
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
| POST | `/api/transactions` | Accept optional `projectId`, `vendor`, `subcategory` |
| PUT | `/api/transactions/:id` | Accept optional `projectId`, `vendor`, `subcategory` |
| GET | `/api/transactions` | Support filtering by `projectId` |

## UI Design

All new UI follows the unified design system:
- Warm pale canvas background
- Glass-effect cards with subtle borders
- Dark structural accents
- Consistent typography and spacing
- Recharts for all visualizations
- TanStack Table for data tables
- Responsive — functional on mobile

### Reports Page Layout

- Tab bar at top: P&L | Job Costing | Commissions | Expenses | Cash Flow
- Shared date range controls below tabs
- Export buttons (CSV, PDF) in top-right of each report
- Each tab renders its report component with appropriate charts and tables

## Migration Strategy

- Add `projectId`, `vendor`, `subcategory` columns to Transaction as nullable (no breaking changes to existing data)
- Create `MaterialLineItem` table and `MaterialCategory` enum
- Existing transactions remain valid — new fields are optional
- No data migration needed for existing records

## Double-Count Prevention

When a MaterialLineItem is linked to a Transaction via `transactionId`:
- Reports that sum expenses from Transactions exclude any Transaction that has a linked MaterialLineItem
- The MaterialLineItem total is used instead (from the materials aggregation path)
- This prevents the same cost appearing in both "Materials" and "Expenses" buckets

When a Transaction has a `projectId` but no linked MaterialLineItem:
- It appears in project-level expense totals normally
- It shows in the job costing report under the appropriate category
