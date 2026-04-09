# Financial Reporting & Material Cost Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace spreadsheet-based financial management with 5 in-app reports (P&L, Job Costing, Commission Summary, Expense Breakdown, Cash Flow) and per-project material cost tracking.

**Architecture:** Extend Prisma schema with MaterialLineItem model and minor field additions. Build report service functions that query existing project/transaction/commission data with new material aggregations. Rebuild the Reports page with tab navigation and Recharts visualizations. Add Materials tab to Project Detail page for per-project material entry.

**Tech Stack:** TypeScript, Prisma, Express, Zod, React, Tailwind CSS, Recharts, pdfkit

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `apps/api/prisma/migrations/XXXXXX_add_material_line_items/migration.sql` | Schema migration |
| `apps/api/src/services/material.service.ts` | MaterialLineItem CRUD + aggregation |
| `apps/api/src/services/commission.helper.ts` | Shared `getAimannDebtBalance()` + `computeLiveCommission()` extracted from project.service.ts, used by financial-report.service.ts and material.service.ts |
| `apps/api/src/routes/materials.ts` | Material API routes + Zod validation |
| `apps/api/src/services/financial-report.service.ts` | 5 report calculation services |
| `apps/api/src/routes/financial-reports.ts` | Report API routes + CSV/PDF export |
| `apps/web/src/hooks/use-materials.ts` | React hooks for material CRUD |
| `apps/web/src/hooks/use-financial-reports.ts` | React hooks for 5 report endpoints |
| `apps/web/src/components/projects/materials-tab.tsx` | Material entry UI on project detail |
| `apps/web/src/components/projects/financial-summary-card.tsx` | Project profit/margin card |
| `apps/web/src/components/reports/pnl-report.tsx` | P&L report component |
| `apps/web/src/components/reports/job-costing-report.tsx` | Job costing table with expandable rows |
| `apps/web/src/components/reports/commission-report.tsx` | Commission summary component |
| `apps/web/src/components/reports/expense-report.tsx` | Expense breakdown component |
| `apps/web/src/components/reports/cash-flow-report.tsx` | Cash flow chart component |

### Modified Files
| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add MaterialLineItem model, MaterialCategory enum, Transaction.subcategory, OperatingExpense.effectiveFrom/To |
| `apps/api/src/index.ts` | Mount material and financial-report routers |
| `apps/api/src/routes/transactions.ts` | Add subcategory to create/update Zod schemas |
| `apps/api/src/services/transaction.service.ts` | Pass subcategory through create/update |
| `apps/api/src/routes/operating-expenses.ts` | Add effectiveFrom/To to Zod schemas; set effectiveTo on deactivation |
| `apps/api/src/services/operating-expense.service.ts` | Pass effectiveFrom/To through CRUD; auto-set effectiveTo on deactivation |
| `apps/web/src/components/settings/operating-expenses-section.tsx` | Add effectiveFrom/To date pickers to create/edit form and table display |
| `apps/web/src/hooks/use-operating-expenses.ts` | Pass effectiveFrom/To through create/update hooks |
| `packages/shared/src/types.ts` | Add MaterialLineItem types, MaterialCategory enum, update Transaction/OperatingExpense DTOs, add report response types |
| `apps/web/src/pages/project-detail.tsx` | Add Materials tab + import MaterialsTab and FinancialSummaryCard |
| `apps/web/src/pages/reports.tsx` | Rebuild with tab navigation and 5 report components |
| `apps/web/src/hooks/use-reports.ts` | Keep existing hooks, new hooks go in use-financial-reports.ts |

---

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add MaterialCategory enum and MaterialLineItem model to schema**

Add to `apps/api/prisma/schema.prisma` after the `EstimateFollowUpLostReasonCode` enum:

```prisma
enum MaterialCategory {
  LUMBER
  CONCRETE
  HARDWARE
  FASTENERS
  GATES
  PANELS
  OTHER
}
```

Add the MaterialLineItem model after the CalendarEvent model:

```prisma
model MaterialLineItem {
  id            String           @id @default(uuid()) @db.Uuid
  projectId     String           @map("project_id") @db.Uuid
  description   String
  category      MaterialCategory
  vendor        String?
  quantity      Decimal          @db.Decimal(10, 2)
  unitCost      Decimal          @map("unit_cost") @db.Decimal(10, 2)
  totalCost     Decimal          @map("total_cost") @db.Decimal(10, 2)
  purchaseDate  DateTime         @map("purchase_date") @db.Date
  transactionId String?          @map("transaction_id") @db.Uuid
  createdAt     DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime         @updatedAt @map("updated_at") @db.Timestamptz

  project     Project      @relation(fields: [projectId], references: [id])
  transaction Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([purchaseDate])
  @@index([transactionId])
  @@index([category])
  @@map("material_line_items")
}
```

- [ ] **Step 2: Add relations and new fields to existing models**

Add to the `Project` model relations (after `followUpTasks`):

```prisma
  materialLineItems       MaterialLineItem[]
```

Add to the `Transaction` model:

```prisma
  subcategory     String?
  materialLineItems MaterialLineItem[]
```

Add to the `OperatingExpense` model:

```prisma
  effectiveFrom DateTime? @map("effective_from") @db.Date
  effectiveTo   DateTime? @map("effective_to") @db.Date
```

Add composite indexes to Transaction (after the `@@map("transactions")` line, before the closing `}`):

```prisma
  @@index([date, type])
  @@index([projectId, type])
```

Add index to CommissionSnapshot:

```prisma
  @@index([settledAt])
```

- [ ] **Step 3: Generate and apply the migration**

Run:
```bash
cd apps/api && npx prisma migrate dev --name add_material_line_items
```

Expected: Migration creates `material_line_items` table, `MaterialCategory` enum, adds `subcategory` to transactions, adds `effective_from`/`effective_to` to operating_expenses, and creates indexes.

- [ ] **Step 4: Verify the migration**

Run:
```bash
cd apps/api && npx prisma generate
```

Expected: Prisma client regenerated successfully with new types.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add MaterialLineItem schema, Transaction.subcategory, OperatingExpense date fields"
```

---

### Task 2: Shared Types

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Add MaterialCategory enum and MaterialLineItem types**

Add after the `EstimateFollowUpLostReasonCode` enum:

```typescript
export enum MaterialCategory {
  LUMBER = 'LUMBER',
  CONCRETE = 'CONCRETE',
  HARDWARE = 'HARDWARE',
  FASTENERS = 'FASTENERS',
  GATES = 'GATES',
  PANELS = 'PANELS',
  OTHER = 'OTHER',
}
```

Add after the existing Transaction-related interfaces:

```typescript
// --- Material Line Items ---

export interface MaterialLineItem {
  id: string;
  projectId: string;
  description: string;
  category: MaterialCategory;
  vendor: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  purchaseDate: string;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialLineItemDTO {
  description: string;
  category: MaterialCategory;
  vendor?: string | null;
  quantity: number;
  unitCost: number;
  purchaseDate: string;
  transactionId?: string | null;
}

export interface UpdateMaterialLineItemDTO {
  description?: string;
  category?: MaterialCategory;
  vendor?: string | null;
  quantity?: number;
  unitCost?: number;
  purchaseDate?: string;
  transactionId?: string | null;
}
```

- [ ] **Step 2: Add subcategory to Transaction DTOs**

Update the `Transaction` interface — add after `sourceField`:

```typescript
  subcategory: string | null;
```

Update `CreateTransactionDTO` — add after `projectId`:

```typescript
  subcategory?: string | null;
```

Update `UpdateTransactionDTO` — add after `projectId`:

```typescript
  subcategory?: string | null;
```

- [ ] **Step 3: Add effectiveFrom/To to OperatingExpense**

Update the `OperatingExpense` interface — add after `isActive`:

```typescript
  effectiveFrom: string | null;
  effectiveTo: string | null;
```

Update `CreateOperatingExpenseDTO` (find it in types.ts) — add:

```typescript
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
```

Update `UpdateOperatingExpenseDTO` — add:

```typescript
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
```

- [ ] **Step 4: Add financial report response types**

Add at the end of types.ts:

```typescript
// --- Financial Report Types ---

export interface PnlRow {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  commissions: number;
  netProfit: number;
}

export interface PnlReport {
  rows: PnlRow[];
  totals: Omit<PnlRow, 'month'>;
}

export interface JobCostingRow {
  projectId: string;
  customer: string;
  address: string;
  status: ProjectStatus;
  fenceType: string;
  revenue: number;
  materials: number;
  subcontractors: number;
  otherExpenses: number;
  commissionsAdnaan: number;
  commissionsMeme: number;
  profit: number;
  marginPct: number;
}

export interface CommissionSummaryPerson {
  name: string;
  rows: {
    projectId: string;
    customer: string;
    projectTotal: number;
    commission: number;
  }[];
  periodTotal: number;
  aimannDeductions: number;
  netPayout: number;
}

export interface CommissionSummaryReport {
  settled: {
    adnaan: CommissionSummaryPerson;
    meme: CommissionSummaryPerson;
  };
  pending: {
    adnaan: CommissionSummaryPerson;
    meme: CommissionSummaryPerson;
  };
}

export interface ExpenseByCategoryRow {
  category: string;
  subcategories: { name: string; amount: number }[];
  total: number;
}

export interface ExpenseByVendorRow {
  vendor: string;
  totalSpend: number;
  projectCount: number;
  topCategories: string[];
}

export interface ExpenseBreakdownReport {
  byCategory: ExpenseByCategoryRow[];
  byVendor: ExpenseByVendorRow[];
  total: number;
}

export interface CashFlowRow {
  month: string;
  moneyIn: number;
  moneyOut: number;
  netCashFlow: number;
  runningBalance: number;
}
```

- [ ] **Step 5: Verify shared package compiles**

Run:
```bash
cd packages/shared && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat: add MaterialLineItem, financial report, and updated DTOs to shared types"
```

---

### Task 3: Material CRUD Service

**Files:**
- Create: `apps/api/src/services/material.service.ts`

- [ ] **Step 1: Create the material service**

Create `apps/api/src/services/material.service.ts`:

```typescript
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import type { CreateMaterialLineItemDTO, UpdateMaterialLineItemDTO } from '@fencetastic/shared';

function d(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function mapLineItem(m: any) {
  return {
    id: m.id,
    projectId: m.projectId,
    description: m.description,
    category: m.category,
    vendor: m.vendor,
    quantity: d(m.quantity),
    unitCost: d(m.unitCost),
    totalCost: d(m.totalCost),
    purchaseDate: m.purchaseDate instanceof Date ? m.purchaseDate.toISOString().split('T')[0] : m.purchaseDate,
    transactionId: m.transactionId,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
  };
}

// ─── List by Project ─────────────────────────────────────────────────────────

export async function listByProject(projectId: string) {
  const items = await prisma.materialLineItem.findMany({
    where: { projectId },
    orderBy: { purchaseDate: 'desc' },
  });
  return items.map(mapLineItem);
}

// ─── Create (bulk) ───────────────────────────────────────────────────────────

export async function createMaterialLineItems(
  projectId: string,
  items: CreateMaterialLineItemDTO[]
) {
  // Verify project exists
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  // Validate transaction links
  for (const item of items) {
    if (item.transactionId) {
      await validateTransactionLink(projectId, item.transactionId, roundMoney(item.quantity * item.unitCost));
    }
  }

  // Bulk create in a transaction
  const created = await prisma.$transaction(
    items.map((item) =>
      prisma.materialLineItem.create({
        data: {
          projectId,
          description: item.description,
          category: item.category,
          vendor: item.vendor ?? null,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: roundMoney(item.quantity * item.unitCost),
          purchaseDate: new Date(item.purchaseDate),
          transactionId: item.transactionId ?? null,
        },
      })
    )
  );

  return created.map(mapLineItem);
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateMaterialLineItem(
  id: string,
  dto: UpdateMaterialLineItemDTO
) {
  const existing = await prisma.materialLineItem.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Material line item not found', 'MATERIAL_NOT_FOUND');
  }

  const quantity = dto.quantity ?? d(existing.quantity);
  const unitCost = dto.unitCost ?? d(existing.unitCost);
  const totalCost = roundMoney(quantity * unitCost);

  if (dto.transactionId !== undefined && dto.transactionId !== null) {
    await validateTransactionLink(existing.projectId, dto.transactionId, totalCost, id);
  }

  const updated = await prisma.materialLineItem.update({
    where: { id },
    data: {
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.vendor !== undefined && { vendor: dto.vendor }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.unitCost !== undefined && { unitCost: dto.unitCost }),
      totalCost,
      ...(dto.purchaseDate !== undefined && { purchaseDate: new Date(dto.purchaseDate) }),
      ...(dto.transactionId !== undefined && { transactionId: dto.transactionId }),
    },
  });

  return mapLineItem(updated);
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteMaterialLineItem(id: string) {
  const existing = await prisma.materialLineItem.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Material line item not found', 'MATERIAL_NOT_FOUND');
  }
  await prisma.materialLineItem.delete({ where: { id } });
}

// ─── Validate Transaction Link ───────────────────────────────────────────────

async function validateTransactionLink(
  projectId: string,
  transactionId: string,
  newItemTotal: number,
  excludeItemId?: string
) {
  const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!txn) {
    throw new AppError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
  }
  if (txn.type !== 'EXPENSE') {
    throw new AppError(400, 'Can only link to EXPENSE transactions', 'INVALID_TRANSACTION_TYPE');
  }
  if (txn.projectId != null && txn.projectId !== projectId) {
    throw new AppError(400, 'Transaction belongs to a different project', 'PROJECT_MISMATCH');
  }

  // Allocation cap: sum of linked materials must not exceed transaction amount
  const existingLinks = await prisma.materialLineItem.findMany({
    where: {
      transactionId,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
    select: { totalCost: true },
  });
  const existingTotal = existingLinks.reduce((sum, item) => sum + d(item.totalCost), 0);
  if (existingTotal + newItemTotal > d(txn.amount) + 0.005) {
    throw new AppError(
      400,
      `Linked materials total (${roundMoney(existingTotal + newItemTotal)}) exceeds transaction amount (${d(txn.amount)})`,
      'ALLOCATION_CAP_EXCEEDED'
    );
  }
}

// ─── Project Material Summary ────────────────────────────────────────────────

export async function getProjectMaterialSummary(projectId: string) {
  const items = await prisma.materialLineItem.findMany({
    where: { projectId },
    select: { totalCost: true },
  });

  if (items.length === 0) {
    // Fallback to legacy materialsCost
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { materialsCost: true },
    });
    return { total: d(project?.materialsCost), lineItemCount: 0, isLegacy: true };
  }

  const total = items.reduce((sum, item) => sum + d(item.totalCost), 0);
  return { total: roundMoney(total), lineItemCount: items.length, isLegacy: false };
}
```

- [ ] **Step 2: Verify the service compiles**

Run:
```bash
cd apps/api && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/material.service.ts
git commit -m "feat: add material line item CRUD service with allocation cap validation"
```

---

### Task 4: Material Routes + Registration

**Files:**
- Create: `apps/api/src/routes/materials.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create the material routes**

Create `apps/api/src/routes/materials.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listByProject,
  createMaterialLineItems,
  updateMaterialLineItem,
  deleteMaterialLineItem,
  getProjectMaterialSummary,
} from '../services/material.service';

export const materialRouter = Router();

const materialCategoryEnum = z.enum([
  'LUMBER', 'CONCRETE', 'HARDWARE', 'FASTENERS', 'GATES', 'PANELS', 'OTHER',
]);

const createItemSchema = z.object({
  description: z.string().min(1).max(500),
  category: materialCategoryEnum,
  vendor: z.string().max(200).nullable().optional(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
  purchaseDate: z.string().min(1),
  transactionId: z.string().uuid().nullable().optional(),
});

const bulkCreateSchema = z.object({
  items: z.array(createItemSchema).min(1).max(50),
});

const updateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  category: materialCategoryEnum.optional(),
  vendor: z.string().max(200).nullable().optional(),
  quantity: z.number().positive().optional(),
  unitCost: z.number().nonnegative().optional(),
  purchaseDate: z.string().optional(),
  transactionId: z.string().uuid().nullable().optional(),
});

// GET /api/projects/:projectId/materials
materialRouter.get(
  '/projects/:projectId/materials',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listByProject(req.params.projectId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/projects/:projectId/materials/summary
materialRouter.get(
  '/projects/:projectId/materials/summary',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getProjectMaterialSummary(req.params.projectId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/projects/:projectId/materials
materialRouter.post(
  '/projects/:projectId/materials',
  requireAuth,
  validate(bulkCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await createMaterialLineItems(req.params.projectId, req.body.items);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/materials/:id
materialRouter.patch(
  '/materials/:id',
  requireAuth,
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await updateMaterialLineItem(req.params.id, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/materials/:id
materialRouter.delete(
  '/materials/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteMaterialLineItem(req.params.id);
      res.json({ data: { message: 'Material line item deleted' } });
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 2: Mount the router in index.ts**

In `apps/api/src/index.ts`, add the import after the workOrderRouter import:

```typescript
import { materialRouter } from './routes/materials';
```

Add the route mount after `app.use('/api', workOrderRouter);`:

```typescript
app.use('/api', materialRouter);
```

- [ ] **Step 3: Verify API compiles**

Run:
```bash
cd apps/api && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/materials.ts apps/api/src/index.ts
git commit -m "feat: add material line item API routes with bulk create and allocation validation"
```

---

### Task 5: Transaction & OperatingExpense Field Updates

**Files:**
- Modify: `apps/api/src/routes/transactions.ts`
- Modify: `apps/api/src/services/transaction.service.ts`
- Modify: `apps/api/src/routes/operating-expenses.ts`
- Modify: `apps/api/src/services/operating-expense.service.ts`

- [ ] **Step 1: Add subcategory to transaction Zod schemas**

In `apps/api/src/routes/transactions.ts`:

Add to `createSchema` after the `projectId` line:

```typescript
  subcategory: z.string().max(100).nullable().optional(),
```

Add to `updateSchema` after the `projectId` line:

```typescript
  subcategory: z.string().max(100).nullable().optional(),
```

- [ ] **Step 2: Pass subcategory through transaction service**

In `apps/api/src/services/transaction.service.ts`, find the `createTransaction` function's `prisma.transaction.create` call and add `subcategory: dto.subcategory ?? null` to the data object.

Find the `updateTransaction` function's update data building and add:

```typescript
if (dto.subcategory !== undefined) updateData.subcategory = dto.subcategory;
```

In the `mapTransaction` helper (or wherever transactions are serialized), add `subcategory: t.subcategory` to the returned object.

- [ ] **Step 3: Add effectiveFrom/To to operating expense Zod schemas**

In `apps/api/src/routes/operating-expenses.ts`:

Add to the create schema:

```typescript
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
```

Add to the update schema:

```typescript
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
```

- [ ] **Step 4: Pass effectiveFrom/To through operating expense service**

In `apps/api/src/services/operating-expense.service.ts`, update the create and update functions to include:

```typescript
effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
```

In the serialization/mapping, add:

```typescript
effectiveFrom: e.effectiveFrom ? e.effectiveFrom.toISOString().split('T')[0] : null,
effectiveTo: e.effectiveTo ? e.effectiveTo.toISOString().split('T')[0] : null,
```

- [ ] **Step 5: Verify API compiles**

Run:
```bash
cd apps/api && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/transactions.ts apps/api/src/services/transaction.service.ts apps/api/src/routes/operating-expenses.ts apps/api/src/services/operating-expense.service.ts
git commit -m "feat: add Transaction.subcategory and OperatingExpense.effectiveFrom/To support"
```

---

### Task 6: Financial Report Service — P&L and Job Costing

**Files:**
- Create: `apps/api/src/services/financial-report.service.ts`

- [ ] **Step 1: Create the financial report service with P&L**

Create `apps/api/src/services/financial-report.service.ts`:

```typescript
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateCommission, PaymentMethod } from '@fencetastic/shared';
import type {
  PnlReport, PnlRow, JobCostingRow, CommissionSummaryReport,
  CommissionSummaryPerson, ExpenseBreakdownReport, ExpenseByCategoryRow,
  ExpenseByVendorRow, CashFlowRow,
} from '@fencetastic/shared';

// ─── Shared Commission Helper ────────────────────────────────────────────────
// Import from the shared helper file (also used by material.service.ts and project.service.ts).
// Extract getAimannDebtBalance from project.service.ts into commission.helper.ts
// so all three services use the same path.
//
// File: apps/api/src/services/commission.helper.ts
// Contains: getAimannDebtBalance(), computeLiveCommission()
// project.service.ts should be updated to import from this file too.

import { getAimannDebtBalance } from './commission.helper';

// NOTE: The implementer should create apps/api/src/services/commission.helper.ts
// with the getAimannDebtBalance function extracted from project.service.ts:
//
// export async function getAimannDebtBalance(): Promise<number> {
//   const lastLedger = await prisma.aimannDebtLedger.findFirst({
//     orderBy: { date: 'desc' },
//   });
//   return lastLedger ? d(lastLedger.runningBalance) : 0;
// }

async function computeLiveCommission(project: {
  projectTotal: Prisma.Decimal;
  paymentMethod: string;
  materialsCost: Prisma.Decimal;
  subcontractorPayments: { amountOwed: Prisma.Decimal }[];
  materialLineItems?: { totalCost: Prisma.Decimal }[];
}) {
  const materialTotal = project.materialLineItems && project.materialLineItems.length > 0
    ? project.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0)
    : d(project.materialsCost);

  const subOwedTotal = project.subcontractorPayments.reduce((s, sp) => s + d(sp.amountOwed), 0);
  const aimannDebtBalance = await getAimannDebtBalance();

  return calculateCommission({
    projectTotal: d(project.projectTotal),
    paymentMethod: project.paymentMethod as PaymentMethod,
    materialsCost: materialTotal,
    subOwedTotal,
    aimannDebtBalance,
  });
}

function d(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

function roundMoney(v: number): number {
  return Number(v.toFixed(2));
}

function monthKey(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function getProjectAttributionDate(project: { completedDate: Date | null; contractDate: Date }): Date {
  return project.completedDate ?? project.contractDate;
}

// ─── P&L Report (Completion-Based) ──────────────────────────────────────────

export async function getPnlReport(
  dateFrom: string,
  dateTo: string,
  period: 'monthly' | 'quarterly' | 'annual'
): Promise<PnlReport> {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  // 1. Get completed projects in date range (attributed by completedDate or contractDate)
  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      OR: [
        { completedDate: { gte: from, lte: to } },
        { completedDate: null, contractDate: { gte: from, lte: to } },
      ],
    },
    include: {
      materialLineItems: { select: { totalCost: true } },
      subcontractorPayments: { select: { amountOwed: true, amountPaid: true } },
      transactions: { where: { type: 'EXPENSE' }, select: { amount: true, materialLineItems: { select: { totalCost: true } } } },
      commissionSnapshot: true,
    },
  });

  // Pre-fetch Aimann debt balance once (used for all unsettled commission calcs)
  const aimannDebtBalance = await getAimannDebtBalance();

  // 2. Non-project-linked expense transactions in range
  const nonProjectExpenses = await prisma.transaction.findMany({
    where: {
      type: 'EXPENSE',
      projectId: null,
      date: { gte: from, lte: to },
    },
    select: { amount: true, date: true },
  });

  // 3. Operating expenses (with effectiveFrom/To filtering)
  const opExItems = await prisma.operatingExpense.findMany({
    where: {
      OR: [
        { isActive: true },
        { effectiveTo: { gte: from } },
      ],
    },
  });

  // Build month buckets
  const buckets = new Map<string, PnlRow>();
  const current = new Date(from.getFullYear(), from.getMonth(), 1);
  while (current <= to) {
    const key = monthKey(current);
    buckets.set(key, {
      month: key,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      commissions: 0,
      netProfit: 0,
    });
    current.setMonth(current.getMonth() + 1);
  }

  // Fill project data (completion-based: revenue, COGS, and commissions all in same month)
  for (const p of projects) {
    const attrDate = getProjectAttributionDate(p);
    const key = monthKey(attrDate);
    const row = buckets.get(key);
    if (!row) continue;

    // Revenue
    row.revenue += d(p.moneyReceived);

    // Materials (MaterialLineItems or legacy fallback)
    const materialTotal = p.materialLineItems.length > 0
      ? p.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0)
      : d(p.materialsCost);

    // Subcontractors (use amountPaid for COGS — actual money spent)
    const subTotal = p.subcontractorPayments.reduce((s, sp) => s + d(sp.amountPaid), 0);

    // Other project expenses (transaction remainder after material split)
    let otherExpenses = 0;
    for (const txn of p.transactions) {
      const linkedMaterialTotal = txn.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0);
      otherExpenses += d(txn.amount) - linkedMaterialTotal;
    }

    row.cogs += roundMoney(materialTotal + subTotal + otherExpenses);

    // Commissions (completion-based: snapshot if settled, live calc if not)
    // Live calc uses amountOwed + real Aimann debt balance (matches buildCommissionPreview)
    if (p.commissionSnapshot) {
      row.commissions += d(p.commissionSnapshot.adnaanCommission) + d(p.commissionSnapshot.memeCommission);
    } else {
      const subOwedTotal = p.subcontractorPayments.reduce((s, sp) => s + d(sp.amountOwed), 0);
      const calc = calculateCommission({
        projectTotal: d(p.projectTotal),
        paymentMethod: p.paymentMethod as PaymentMethod,
        materialsCost: materialTotal,
        subOwedTotal,
        aimannDebtBalance,
      });
      row.commissions += calc.adnaanCommission + calc.memeCommission;
    }
  }

  // Non-project expenses by transaction date
  for (const txn of nonProjectExpenses) {
    const key = monthKey(txn.date);
    const row = buckets.get(key);
    if (row) {
      row.operatingExpenses += d(txn.amount);
    }
  }

  // Operating expenses (synthetic monthly)
  for (const exp of opExItems) {
    let monthlyAmt = d(exp.amount);
    if (exp.frequency === 'QUARTERLY') monthlyAmt /= 3;
    else if (exp.frequency === 'ANNUAL') monthlyAmt /= 12;

    // Normalize effectiveFrom/To to month boundaries for comparison
    // Null fallbacks also normalized so arbitrary dateFrom/dateTo don't skip months
    const expFrom = exp.effectiveFrom
      ? new Date(exp.effectiveFrom.getFullYear(), exp.effectiveFrom.getMonth(), 1)
      : new Date(from.getFullYear(), from.getMonth(), 1);
    const expTo = exp.effectiveTo
      ? new Date(exp.effectiveTo.getFullYear(), exp.effectiveTo.getMonth(), 1)
      : new Date(to.getFullYear(), to.getMonth(), 1);

    for (const [key, row] of buckets) {
      // Parse month key back to date for range check
      const monthDate = new Date(key.replace(/(\w+)\s(\d+)/, '$1 1, $2'));
      if (monthDate >= expFrom && monthDate <= expTo) {
        row.operatingExpenses += monthlyAmt;
      }
    }
  }

  // Calculate derived fields for monthly buckets
  for (const row of buckets.values()) {
    row.revenue = roundMoney(row.revenue);
    row.cogs = roundMoney(row.cogs);
    row.grossProfit = roundMoney(row.revenue - row.cogs);
    row.operatingExpenses = roundMoney(row.operatingExpenses);
    row.commissions = roundMoney(row.commissions);
    row.netProfit = roundMoney(row.grossProfit - row.operatingExpenses - row.commissions);
  }

  // Group by period (monthly = no-op, quarterly/annual = aggregate monthly buckets)
  const monthlyRows = Array.from(buckets.values());
  const rows: PnlRow[] = period === 'monthly' ? monthlyRows : groupByPeriod(monthlyRows, period);

  const totals = { revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, commissions: 0, netProfit: 0 };
  for (const row of rows) {
    totals.revenue += row.revenue;
    totals.cogs += row.cogs;
    totals.grossProfit += row.grossProfit;
    totals.operatingExpenses += row.operatingExpenses;
    totals.commissions += row.commissions;
    totals.netProfit += row.netProfit;
  }
  for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
    totals[key] = roundMoney(totals[key]);
  }

  return { rows, totals };
}

// Helper: group monthly rows into quarterly or annual periods
function groupByPeriod(monthlyRows: PnlRow[], period: 'quarterly' | 'annual'): PnlRow[] {
  const groups = new Map<string, PnlRow>();
  for (const row of monthlyRows) {
    const date = new Date(Date.parse('1 ' + row.month));
    const key = period === 'quarterly'
      ? `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
      : `${date.getFullYear()}`;
    const existing = groups.get(key) ?? { month: key, revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, commissions: 0, netProfit: 0 };
    existing.revenue += row.revenue;
    existing.cogs += row.cogs;
    existing.grossProfit += row.grossProfit;
    existing.operatingExpenses += row.operatingExpenses;
    existing.commissions += row.commissions;
    existing.netProfit += row.netProfit;
    groups.set(key, existing);
  }
  return Array.from(groups.values()).map((r) => ({
    ...r,
    revenue: roundMoney(r.revenue),
    cogs: roundMoney(r.cogs),
    grossProfit: roundMoney(r.grossProfit),
    operatingExpenses: roundMoney(r.operatingExpenses),
    commissions: roundMoney(r.commissions),
    netProfit: roundMoney(r.netProfit),
  }));
}
```

- [ ] **Step 2: Add Job Costing report to the same file**

Append to `apps/api/src/services/financial-report.service.ts`:

```typescript
// ─── Job Costing Report ──────────────────────────────────────────────────────

export async function getJobCostingReport(
  dateFrom?: string,
  dateTo?: string,
  status?: string,
  fenceType?: string,
): Promise<JobCostingRow[]> {
  const where: Prisma.ProjectWhereInput = { isDeleted: false };

  if (dateFrom || dateTo) {
    where.contractDate = {};
    if (dateFrom) where.contractDate.gte = new Date(dateFrom);
    if (dateTo) where.contractDate.lte = new Date(dateTo);
  }
  if (status) where.status = status as any;
  if (fenceType) where.fenceType = fenceType as any;

  const projects = await prisma.project.findMany({
    where,
    include: {
      materialLineItems: { select: { totalCost: true } },
      subcontractorPayments: { select: { amountOwed: true, amountPaid: true } },
      transactions: {
        where: { type: 'EXPENSE' },
        select: { amount: true, materialLineItems: { select: { totalCost: true } } },
      },
      commissionSnapshot: true,
    },
    orderBy: { contractDate: 'desc' },
  });

  const aimannDebtBalance = await getAimannDebtBalance();

  return projects.map((p) => {
    const revenue = d(p.moneyReceived);

    // Materials: line items or legacy fallback
    const materials = p.materialLineItems.length > 0
      ? p.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0)
      : d(p.materialsCost);

    const subcontractors = p.subcontractorPayments.reduce((s, sp) => s + d(sp.amountPaid), 0);

    // Other project expenses (transaction remainder after material split)
    let otherExpenses = 0;
    for (const txn of p.transactions) {
      const linkedMaterialTotal = txn.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0);
      otherExpenses += d(txn.amount) - linkedMaterialTotal;
    }

    // Commissions: snapshot if settled, live calc if not
    // Live calc uses amountOwed + real Aimann debt balance (matches buildCommissionPreview)
    let commissionsAdnaan: number;
    let commissionsMeme: number;
    if (p.commissionSnapshot) {
      commissionsAdnaan = d(p.commissionSnapshot.adnaanCommission);
      commissionsMeme = d(p.commissionSnapshot.memeCommission);
    } else {
      const subOwedTotal = p.subcontractorPayments.reduce((s, sp) => s + d(sp.amountOwed), 0);
      const calc = calculateCommission({
        projectTotal: d(p.projectTotal),
        paymentMethod: p.paymentMethod as PaymentMethod,
        materialsCost: materials,
        subOwedTotal,
        aimannDebtBalance,
      });
      commissionsAdnaan = calc.adnaanCommission;
      commissionsMeme = calc.memeCommission;
    }

    const totalCosts = materials + subcontractors + otherExpenses + commissionsAdnaan + commissionsMeme;
    const profit = roundMoney(revenue - totalCosts);
    const marginPct = revenue > 0 ? roundMoney((profit / revenue) * 100) : 0;

    return {
      projectId: p.id,
      customer: p.customer,
      address: p.address,
      status: p.status as any,
      fenceType: p.fenceType as string,
      revenue: roundMoney(revenue),
      materials: roundMoney(materials),
      subcontractors: roundMoney(subcontractors),
      otherExpenses: roundMoney(otherExpenses),
      commissionsAdnaan: roundMoney(commissionsAdnaan),
      commissionsMeme: roundMoney(commissionsMeme),
      profit,
      marginPct,
    };
  });
}
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
cd apps/api && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/financial-report.service.ts
git commit -m "feat: add P&L and Job Costing report services"
```

---

### Task 7: Financial Report Service — Commission Summary, Expense Breakdown, Cash Flow

**Files:**
- Modify: `apps/api/src/services/financial-report.service.ts`

- [ ] **Step 1: Add Commission Summary report**

Append to `apps/api/src/services/financial-report.service.ts`:

```typescript
// ─── Commission Summary Report ───────────────────────────────────────────────

export async function getCommissionSummaryReport(
  dateFrom: string,
  dateTo: string,
): Promise<CommissionSummaryReport> {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  // Settled projects: filter by CommissionSnapshot.settledAt (per spec)
  const settledSnapshots = await prisma.commissionSnapshot.findMany({
    where: { settledAt: { gte: from, lte: to } },
    include: { project: { select: { id: true, customer: true, projectTotal: true, isDeleted: true } } },
  });
  const settledProjects = settledSnapshots
    .filter((s) => !s.project.isDeleted)
    .map((s) => ({ ...s.project, commissionSnapshot: s }));

  // Unsettled projects: shown separately with NO date filter (per spec)
  const unsettledProjects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      commissionSnapshot: null,
      status: { notIn: ['ESTIMATE'] },
    },
    include: {
      materialLineItems: { select: { totalCost: true } },
      subcontractorPayments: { select: { amountOwed: true } },
    },
  });

  const aimannDebtBalance = await getAimannDebtBalance();

  function buildPerson(
    name: string,
    projects: typeof settledProjects,
    getCommission: (p: (typeof settledProjects)[0]) => number,
    getAimann: (p: (typeof settledProjects)[0]) => number,
  ): CommissionSummaryPerson {
    const rows = projects.map((p) => ({
      projectId: p.id,
      customer: p.customer,
      projectTotal: d(p.projectTotal),
      commission: getCommission(p),
    }));
    const periodTotal = roundMoney(rows.reduce((s, r) => s + r.commission, 0));
    const aimannDeductions = roundMoney(projects.reduce((s, p) => s + getAimann(p), 0));
    return { name, rows, periodTotal, aimannDeductions, netPayout: roundMoney(periodTotal - aimannDeductions) };
  }

  const settledAdnaan = buildPerson(
    'Adnaan',
    settledProjects,
    (p) => d(p.commissionSnapshot!.adnaanCommission),
    (p) => d(p.commissionSnapshot!.aimannDeduction),
  );

  const settledMeme = buildPerson(
    'Meme',
    settledProjects,
    (p) => d(p.commissionSnapshot!.memeCommission),
    () => 0, // Aimann deductions don't apply to Meme
  );

  // Pending: compute live
  const pendingAdnaanRows: CommissionSummaryPerson['rows'] = [];
  const pendingMemeRows: CommissionSummaryPerson['rows'] = [];

  for (const p of unsettledProjects) {
    const materialTotal = p.materialLineItems.length > 0
      ? p.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0)
      : d(p.materialsCost);
    const subOwedTotal = p.subcontractorPayments.reduce((s, sp) => s + d(sp.amountOwed), 0);

    const calc = calculateCommission({
      projectTotal: d(p.projectTotal),
      paymentMethod: p.paymentMethod as PaymentMethod,
      materialsCost: materialTotal,
      subOwedTotal,
      aimannDebtBalance,
    });

    pendingAdnaanRows.push({ projectId: p.id, customer: p.customer, projectTotal: d(p.projectTotal), commission: calc.adnaanCommission });
    pendingMemeRows.push({ projectId: p.id, customer: p.customer, projectTotal: d(p.projectTotal), commission: calc.memeCommission });
  }

  // Compute pending Aimann deductions with simulated debt paydown.
  // Each project's deduction reduces the simulated balance for the next,
  // so once debt is exhausted, remaining projects get 0 deduction.
  let pendingAimannTotal = 0;
  let simulatedDebtBalance = aimannDebtBalance;
  for (const p of unsettledProjects) {
    const materialTotal = p.materialLineItems.length > 0
      ? p.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0)
      : d(p.materialsCost);
    const subOwedTotal = p.subcontractorPayments.reduce((s, sp) => s + d(sp.amountOwed), 0);
    const calc = calculateCommission({
      projectTotal: d(p.projectTotal),
      paymentMethod: p.paymentMethod as PaymentMethod,
      materialsCost: materialTotal,
      subOwedTotal,
      aimannDebtBalance: simulatedDebtBalance,
    });
    // Cap deduction to remaining debt — calculateCommission doesn't do this internally
    const cappedDeduction = Math.min(calc.aimannDeduction, simulatedDebtBalance);
    pendingAimannTotal += cappedDeduction;
    simulatedDebtBalance = Math.max(0, simulatedDebtBalance - cappedDeduction);
  }

  const pendingAdnaanTotal = roundMoney(pendingAdnaanRows.reduce((s, r) => s + r.commission, 0));
  const pendingAdnaan: CommissionSummaryPerson = {
    name: 'Adnaan',
    rows: pendingAdnaanRows,
    periodTotal: pendingAdnaanTotal,
    aimannDeductions: roundMoney(pendingAimannTotal),
    netPayout: roundMoney(pendingAdnaanTotal - pendingAimannTotal),
  };

  const pendingMemeTotal = roundMoney(pendingMemeRows.reduce((s, r) => s + r.commission, 0));
  const pendingMeme: CommissionSummaryPerson = {
    name: 'Meme',
    rows: pendingMemeRows,
    periodTotal: pendingMemeTotal,
    aimannDeductions: 0, // Aimann deductions don't apply to Meme per spec
    netPayout: pendingMemeTotal,
  };

  return {
    settled: { adnaan: settledAdnaan, meme: settledMeme },
    pending: { adnaan: pendingAdnaan, meme: pendingMeme },
  };
}
```

- [ ] **Step 2: Add Expense Breakdown report**

Append to the same file:

```typescript
// ─── Expense Breakdown Report ────────────────────────────────────────────────

export async function getExpenseBreakdownReport(
  dateFrom: string,
  dateTo: string,
): Promise<ExpenseBreakdownReport> {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  // Material line items in date range
  const materials = await prisma.materialLineItem.findMany({
    where: { purchaseDate: { gte: from, lte: to } },
    select: { category: true, totalCost: true, vendor: true, projectId: true },
  });

  // Expense transactions in date range
  const transactions = await prisma.transaction.findMany({
    where: { type: 'EXPENSE', date: { gte: from, lte: to } },
    include: { materialLineItems: { select: { totalCost: true } } },
  });

  // Subcontractor payments in date range
  const subPayments = await prisma.subcontractorPayment.findMany({
    where: { datePaid: { gte: from, lte: to } },
    select: { amountPaid: true, subcontractorName: true, projectId: true },
  });

  // Operating expenses (synthetic monthly, with effectiveFrom/To)
  const opExItems = await prisma.operatingExpense.findMany({
    where: {
      OR: [
        { isActive: true },
        { effectiveTo: { gte: from } },
      ],
    },
  });

  // Compute operating expense total for the date range (month-by-month with effectiveFrom/To)
  let opExTotal = 0;
  const opExCurrent = new Date(from.getFullYear(), from.getMonth(), 1);
  while (opExCurrent <= to) {
    for (const exp of opExItems) {
      // Normalize effectiveFrom/To to month boundaries for comparison
      const expFrom = exp.effectiveFrom ? new Date(exp.effectiveFrom.getFullYear(), exp.effectiveFrom.getMonth(), 1) : from;
      const expTo = exp.effectiveTo ? new Date(exp.effectiveTo.getFullYear(), exp.effectiveTo.getMonth(), 1) : to;
      if (opExCurrent < expFrom || opExCurrent > expTo) continue;

      let monthlyAmt = d(exp.amount);
      if (exp.frequency === 'QUARTERLY') monthlyAmt /= 3;
      else if (exp.frequency === 'ANNUAL') monthlyAmt /= 12;
      opExTotal += monthlyAmt;
    }
    opExCurrent.setMonth(opExCurrent.getMonth() + 1);
  }

  // By Category — 4 canonical categories per spec
  const categoryMap = new Map<string, { subcategories: Map<string, number>; total: number }>();

  // 1. Materials (from MaterialLineItems only — never from Transaction amounts)
  const materialsEntry = { subcategories: new Map<string, number>(), total: 0 };
  for (const m of materials) {
    const amt = d(m.totalCost);
    materialsEntry.total += amt;
    materialsEntry.subcategories.set(m.category, (materialsEntry.subcategories.get(m.category) ?? 0) + amt);
  }
  if (materialsEntry.total > 0) categoryMap.set('Materials', materialsEntry);

  // 2. Subcontractors
  const subTotal = subPayments.reduce((s, sp) => s + d(sp.amountPaid), 0);
  if (subTotal > 0) {
    categoryMap.set('Subcontractors', { subcategories: new Map(), total: subTotal });
  }

  // 3. Operating Expenses
  if (opExTotal > 0) {
    categoryMap.set('Operating Expenses', { subcategories: new Map(), total: roundMoney(opExTotal) });
  }

  // 4. Other Expenses (transaction remainders after material split)
  const otherEntry = { subcategories: new Map<string, number>(), total: 0 };
  for (const txn of transactions) {
    const linkedTotal = txn.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0);
    const remainder = d(txn.amount) - linkedTotal;
    if (remainder > 0.005) {
      otherEntry.total += remainder;
      const sub = txn.subcategory || txn.category || 'Misc';
      otherEntry.subcategories.set(sub, (otherEntry.subcategories.get(sub) ?? 0) + remainder);
    }
  }
  if (otherEntry.total > 0) categoryMap.set('Other Expenses', otherEntry);

  const byCategory: ExpenseByCategoryRow[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      subcategories: Array.from(data.subcategories.entries()).map(([name, amount]) => ({
        name,
        amount: roundMoney(amount),
      })),
      total: roundMoney(data.total),
    }))
    .sort((a, b) => b.total - a.total);

  // By Vendor — use transaction remainders (not full amounts) to prevent double-counting
  const vendorMap = new Map<string, { totalSpend: number; projects: Set<string>; categories: Map<string, number> }>();

  // Transaction remainders by vendor
  for (const txn of transactions) {
    const linkedTotal = txn.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0);
    const remainder = d(txn.amount) - linkedTotal;
    if (remainder > 0.005) {
      const vendor = txn.payee || 'Unknown';
      const entry = vendorMap.get(vendor) ?? { totalSpend: 0, projects: new Set(), categories: new Map() };
      entry.totalSpend += remainder;
      if (txn.projectId) entry.projects.add(txn.projectId);
      const cat = txn.category || 'Other';
      entry.categories.set(cat, (entry.categories.get(cat) ?? 0) + remainder);
      vendorMap.set(vendor, entry);
    }
  }

  // Material line items by vendor (separate from transaction amounts)
  for (const m of materials) {
    const vendor = m.vendor || 'Unknown';
    const entry = vendorMap.get(vendor) ?? { totalSpend: 0, projects: new Set(), categories: new Map() };
    entry.totalSpend += d(m.totalCost);
    entry.projects.add(m.projectId);
    entry.categories.set('Materials', (entry.categories.get('Materials') ?? 0) + d(m.totalCost));
    vendorMap.set(vendor, entry);
  }

  const byVendor: ExpenseByVendorRow[] = Array.from(vendorMap.entries())
    .map(([vendor, data]) => ({
      vendor,
      totalSpend: roundMoney(data.totalSpend),
      projectCount: data.projects.size,
      topCategories: Array.from(data.categories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat),
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const total = roundMoney(byCategory.reduce((s, c) => s + c.total, 0));

  return { byCategory, byVendor, total };
}
```

- [ ] **Step 3: Add Cash Flow report**

Append to the same file:

```typescript
// ─── Cash Flow Report ────────────────────────────────────────────────────────

export async function getCashFlowReport(
  dateFrom: string,
  dateTo: string,
): Promise<CashFlowRow[]> {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  // All transactions in date range
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: from, lte: to } },
    select: { type: true, amount: true, date: true },
    orderBy: { date: 'asc' },
  });

  // Unlinked material line items (no transaction) in date range
  const unlinkedMaterials = await prisma.materialLineItem.findMany({
    where: {
      purchaseDate: { gte: from, lte: to },
      transactionId: null,
    },
    select: { totalCost: true, purchaseDate: true },
  });

  // Operating expenses (synthetic)
  const opExItems = await prisma.operatingExpense.findMany({
    where: {
      OR: [
        { isActive: true },
        { effectiveTo: { gte: from } },
      ],
    },
  });

  // Build month buckets
  const buckets = new Map<string, { moneyIn: number; moneyOut: number }>();
  const current = new Date(from.getFullYear(), from.getMonth(), 1);
  const monthOrder: string[] = [];
  while (current <= to) {
    const key = monthKey(current);
    buckets.set(key, { moneyIn: 0, moneyOut: 0 });
    monthOrder.push(key);
    current.setMonth(current.getMonth() + 1);
  }

  // Transactions
  for (const txn of transactions) {
    const key = monthKey(txn.date);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (txn.type === 'INCOME') {
      bucket.moneyIn += d(txn.amount);
    } else {
      bucket.moneyOut += d(txn.amount);
    }
  }

  // Unlinked materials
  for (const m of unlinkedMaterials) {
    const key = monthKey(m.purchaseDate);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.moneyOut += d(m.totalCost);
    }
  }

  // Operating expenses — bucket per-month with effectiveFrom/To range check
  for (const [key, bucket] of buckets) {
    const monthDate = new Date(Date.parse('1 ' + key));
    for (const exp of opExItems) {
      // Normalize effectiveFrom/To to month boundaries for comparison
      // An expense starting April 15 should still count for April
      const expFrom = exp.effectiveFrom ? new Date(exp.effectiveFrom.getFullYear(), exp.effectiveFrom.getMonth(), 1) : from;
      const expTo = exp.effectiveTo ? new Date(exp.effectiveTo.getFullYear(), exp.effectiveTo.getMonth(), 1) : to;
      if (monthDate < expFrom || monthDate > expTo) continue;

      let monthlyAmt = d(exp.amount);
      if (exp.frequency === 'QUARTERLY') monthlyAmt /= 3;
      else if (exp.frequency === 'ANNUAL') monthlyAmt /= 12;
      bucket.moneyOut += monthlyAmt;
    }
  }

  // Build rows with running balance
  let runningBalance = 0;
  const rows: CashFlowRow[] = monthOrder.map((key) => {
    const bucket = buckets.get(key)!;
    const moneyIn = roundMoney(bucket.moneyIn);
    const moneyOut = roundMoney(bucket.moneyOut);
    const netCashFlow = roundMoney(moneyIn - moneyOut);
    runningBalance = roundMoney(runningBalance + netCashFlow);
    return { month: key, moneyIn, moneyOut, netCashFlow, runningBalance };
  });

  return rows;
}
```

- [ ] **Step 4: Verify it compiles**

Run:
```bash
cd apps/api && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/financial-report.service.ts
git commit -m "feat: add Commission Summary, Expense Breakdown, and Cash Flow report services"
```

---

### Task 8: Financial Report Routes + CSV Export

**Files:**
- Create: `apps/api/src/routes/financial-reports.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create the financial report routes**

Create `apps/api/src/routes/financial-reports.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  getPnlReport,
  getJobCostingReport,
  getCommissionSummaryReport,
  getExpenseBreakdownReport,
  getCashFlowReport,
} from '../services/financial-report.service';

export const financialReportRouter = Router();

const dateRangeSchema = z.object({
  dateFrom: z.string().min(1, 'dateFrom is required'),
  dateTo: z.string().min(1, 'dateTo is required'),
});

const pnlSchema = dateRangeSchema.extend({
  period: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
});

const jobCostingSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
  fenceType: z.string().optional(),
});

// GET /api/reports/pnl
financialReportRouter.get(
  '/pnl',
  requireAuth,
  validateQuery(pnlSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo, period } = req.query as unknown as { dateFrom: string; dateTo: string; period: 'monthly' | 'quarterly' | 'annual' };
      const data = await getPnlReport(dateFrom, dateTo, period);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/job-costing
financialReportRouter.get(
  '/job-costing',
  requireAuth,
  validateQuery(jobCostingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo, status, fenceType } = req.query as any;
      const data = await getJobCostingReport(dateFrom, dateTo, status, fenceType);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/commissions
financialReportRouter.get(
  '/commissions',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo } = req.query as unknown as { dateFrom: string; dateTo: string };
      const data = await getCommissionSummaryReport(dateFrom, dateTo);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/expenses
financialReportRouter.get(
  '/expenses',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo } = req.query as unknown as { dateFrom: string; dateTo: string };
      const data = await getExpenseBreakdownReport(dateFrom, dateTo);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/cash-flow
financialReportRouter.get(
  '/cash-flow',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo } = req.query as unknown as { dateFrom: string; dateTo: string };
      const data = await getCashFlowReport(dateFrom, dateTo);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/:type/export — CSV export
financialReportRouter.get(
  '/:type/export',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const { dateFrom, dateTo, period } = req.query as unknown as { dateFrom: string; dateTo: string; period?: string };

      let csv = '';
      switch (type) {
        case 'pnl': {
          const data = await getPnlReport(dateFrom, dateTo, (period as any) || 'monthly');
          csv = 'Month,Revenue,COGS,Gross Profit,Operating Expenses,Commissions,Net Profit\n';
          csv += data.rows.map((r) =>
            `${r.month},${r.revenue},${r.cogs},${r.grossProfit},${r.operatingExpenses},${r.commissions},${r.netProfit}`
          ).join('\n');
          break;
        }
        case 'job-costing': {
          const data = await getJobCostingReport(dateFrom, dateTo);
          csv = 'Customer,Address,Status,Fence Type,Revenue,Materials,Subcontractors,Other Expenses,Commission (Adnaan),Commission (Meme),Profit,Margin %\n';
          csv += data.map((r) =>
            `"${r.customer}","${r.address}",${r.status},${r.fenceType},${r.revenue},${r.materials},${r.subcontractors},${r.otherExpenses},${r.commissionsAdnaan},${r.commissionsMeme},${r.profit},${r.marginPct}`
          ).join('\n');
          break;
        }
        case 'commissions': {
          const data = await getCommissionSummaryReport(dateFrom, dateTo);
          csv = 'Section,Person,Customer,Project Total,Commission,Aimann Deduction,Net Payout\n';
          for (const row of data.settled.adnaan.rows) {
            csv += `Settled,Adnaan,"${row.customer}",${row.projectTotal},${row.commission},,\n`;
          }
          csv += `Settled,Adnaan,TOTAL,,${data.settled.adnaan.periodTotal},${data.settled.adnaan.aimannDeductions},${data.settled.adnaan.netPayout}\n`;
          for (const row of data.settled.meme.rows) {
            csv += `Settled,Meme,"${row.customer}",${row.projectTotal},${row.commission},,\n`;
          }
          csv += `Settled,Meme,TOTAL,,${data.settled.meme.periodTotal},0,${data.settled.meme.netPayout}\n`;
          for (const row of data.pending.adnaan.rows) {
            csv += `Pending,Adnaan,"${row.customer}",${row.projectTotal},${row.commission},,\n`;
          }
          csv += `Pending,Adnaan,TOTAL,,${data.pending.adnaan.periodTotal},${data.pending.adnaan.aimannDeductions},${data.pending.adnaan.netPayout}\n`;
          for (const row of data.pending.meme.rows) {
            csv += `Pending,Meme,"${row.customer}",${row.projectTotal},${row.commission},,\n`;
          }
          csv += `Pending,Meme,TOTAL,,${data.pending.meme.periodTotal},0,${data.pending.meme.netPayout}\n`;
          break;
        }
        case 'expenses': {
          const data = await getExpenseBreakdownReport(dateFrom, dateTo);
          csv = 'Category,Total\n';
          csv += data.byCategory.map((r) => `"${r.category}",${r.total}`).join('\n');
          break;
        }
        case 'cash-flow': {
          const data = await getCashFlowReport(dateFrom, dateTo);
          csv = 'Month,Money In,Money Out,Net Cash Flow,Running Balance\n';
          csv += data.map((r) =>
            `${r.month},${r.moneyIn},${r.moneyOut},${r.netCashFlow},${r.runningBalance}`
          ).join('\n');
          break;
        }
        default:
          res.status(400).json({ error: 'Unknown report type' });
          return;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 2: Mount the financial report router**

In `apps/api/src/index.ts`, add the import:

```typescript
import { financialReportRouter } from './routes/financial-reports';
```

Add the mount after `app.use('/api/reports', reportsRouter);`:

```typescript
app.use('/api/reports', financialReportRouter);
```

- [ ] **Step 3: Verify API compiles**

Run:
```bash
cd apps/api && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/financial-reports.ts apps/api/src/index.ts
git commit -m "feat: add financial report API routes with CSV export"
```

---

### Task 9: Frontend — Material Hooks

**Files:**
- Create: `apps/web/src/hooks/use-materials.ts`

- [ ] **Step 1: Create the material hooks**

Create `apps/web/src/hooks/use-materials.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { MaterialLineItem, CreateMaterialLineItemDTO, UpdateMaterialLineItemDTO } from '@fencetastic/shared';

interface UseMaterialsReturn {
  data: MaterialLineItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjectMaterials(projectId: string): UseMaterialsReturn {
  const [data, setData] = useState<MaterialLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/projects/${projectId}/materials`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

export function useCreateMaterials() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (projectId: string, items: CreateMaterialLineItemDTO[]) => {
    try {
      setIsLoading(true);
      const res = await api.post(`/projects/${projectId}/materials`, { items });
      toast.success(`${items.length} material${items.length > 1 ? 's' : ''} added`);
      return res.data.data;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add materials');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading };
}

export function useUpdateMaterial() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (id: string, dto: UpdateMaterialLineItemDTO) => {
    try {
      setIsLoading(true);
      const res = await api.patch(`/materials/${id}`, dto);
      toast.success('Material updated');
      return res.data.data;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update material');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading };
}

export function useDeleteMaterial() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await api.delete(`/materials/${id}`);
      toast.success('Material deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete material');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading };
}

interface MaterialSummary {
  total: number;
  lineItemCount: number;
  isLegacy: boolean;
}

export function useProjectMaterialSummary(projectId: string) {
  const [data, setData] = useState<MaterialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/materials/summary`);
      setData(res.data.data);
    } catch {
      // Silently fail — summary is supplementary
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd apps/web && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-materials.ts
git commit -m "feat: add material CRUD React hooks"
```

---

### Task 10: Frontend — Materials Tab + Financial Summary Card on Project Detail

**Files:**
- Create: `apps/web/src/components/projects/materials-tab.tsx`
- Create: `apps/web/src/components/projects/financial-summary-card.tsx`
- Modify: `apps/web/src/pages/project-detail.tsx`

- [ ] **Step 1: Create the Materials Tab component**

Create `apps/web/src/components/projects/materials-tab.tsx`. This component should:

- Use `useProjectMaterials(projectId)` to fetch materials
- Use `useCreateMaterials()`, `useUpdateMaterial()`, `useDeleteMaterial()` for mutations
- Render a table with columns: Description, Category, Vendor, Qty, Unit Cost, Total, Purchase Date, Actions (edit/delete)
- Show a running total at the bottom
- Have an "Add Material" button that opens a Dialog with fields: description (Input), category (Select with MaterialCategory values), vendor (Input), quantity (Input number), unitCost (Input number), purchaseDate (Input date, default today)
- Auto-compute totalCost display as `quantity * unitCost`
- Support "Add Multiple" with a multi-row inline form
- Follow existing component patterns: shadcn Table, Dialog, Button, Input, Select; lucide-react icons (Plus, Trash2, Pencil); toast from sonner
- Style consistent with existing project detail tabs (expenses tab pattern)

- [ ] **Step 2: Create the Financial Summary Card component**

Create `apps/web/src/components/projects/financial-summary-card.tsx`. This component should:

- Accept props: `projectId: string`, `project: Project` (the project data from the parent)
- Use `useProjectMaterialSummary(projectId)` for material total
- Use `useSubcontractors(projectId)` for sub total (already exists)
- Compute: commissions from `CommissionSnapshot` if settled, else via `calculateCommission()` from shared
- Compute: otherExpenses from project-linked expense transactions minus linked material totals (fetch from API or compute client-side)
- Display as a card with rows: Total Materials, Total Subs, Other Expenses, Total Commissions, Project Profit, Margin %
- Use `formatCurrency` from `@/lib/formatters`
- Color profit green if positive, red if negative

- [ ] **Step 3: Add Materials tab to project-detail.tsx**

In `apps/web/src/pages/project-detail.tsx`:

Add to the TABS array (after the `expenses` entry):

```typescript
  { id: 'materials', label: 'Materials' },
```

Add imports:

```typescript
import { MaterialsTab } from '@/components/projects/materials-tab';
import { FinancialSummaryCard } from '@/components/projects/financial-summary-card';
```

Add the tab render case (find the section with `activeTab === 'expenses'` and add after it):

```typescript
{activeTab === 'materials' && (
  <div className="space-y-6">
    <FinancialSummaryCard projectId={id!} project={project} />
    <MaterialsTab projectId={id!} />
  </div>
)}
```

- [ ] **Step 4: Verify frontend compiles**

Run:
```bash
cd apps/web && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Test in browser**

Run dev server, navigate to a project detail page, click "Materials" tab. Verify:
- Empty state shows "No materials logged yet"
- Add Material opens dialog, submits successfully
- Material appears in table with correct total
- Edit/delete work
- Financial summary card shows project profit and margin

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/projects/materials-tab.tsx apps/web/src/components/projects/financial-summary-card.tsx apps/web/src/pages/project-detail.tsx
git commit -m "feat: add Materials tab and Financial Summary card to Project Detail"
```

---

### Task 11: Frontend — Financial Report Hooks

**Files:**
- Create: `apps/web/src/hooks/use-financial-reports.ts`

- [ ] **Step 1: Create the financial report hooks**

Create `apps/web/src/hooks/use-financial-reports.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  PnlReport, JobCostingRow, CommissionSummaryReport,
  ExpenseBreakdownReport, CashFlowRow,
} from '@fencetastic/shared';

interface DateRange {
  dateFrom: string;
  dateTo: string;
}

function useFetchReport<T>(endpoint: string, params: Record<string, string>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramStr = new URLSearchParams(params).toString();

  const fetch = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await api.get(`/reports/${endpoint}?${paramStr}`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to load ${endpoint} report`);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, paramStr]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

export function usePnlReport(range: DateRange, period: string = 'monthly') {
  return useFetchReport<PnlReport>('pnl', { ...range, period });
}

export function useJobCostingReport(range: DateRange & { status?: string; fenceType?: string }) {
  const params: Record<string, string> = {};
  if (range.dateFrom) params.dateFrom = range.dateFrom;
  if (range.dateTo) params.dateTo = range.dateTo;
  if (range.status) params.status = range.status;
  if (range.fenceType) params.fenceType = range.fenceType;
  return useFetchReport<JobCostingRow[]>('job-costing', params);
}

export function useCommissionReport(range: DateRange) {
  return useFetchReport<CommissionSummaryReport>('commissions', range);
}

export function useExpenseReport(range: DateRange) {
  return useFetchReport<ExpenseBreakdownReport>('expenses', range);
}

export function useCashFlowReport(range: DateRange) {
  return useFetchReport<CashFlowRow[]>('cash-flow', range);
}

export function useExportReport(type: string, range: DateRange) {
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = useCallback(async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams(range).toString();
      const res = await api.get(`/reports/${type}/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [type, range]);

  return { exportCsv, isExporting };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-financial-reports.ts
git commit -m "feat: add React hooks for 5 financial report endpoints + CSV export"
```

---

### Task 12: Frontend — Rebuild Reports Page

**Files:**
- Create: `apps/web/src/components/reports/pnl-report.tsx`
- Create: `apps/web/src/components/reports/job-costing-report.tsx`
- Create: `apps/web/src/components/reports/commission-report.tsx`
- Create: `apps/web/src/components/reports/expense-report.tsx`
- Create: `apps/web/src/components/reports/cash-flow-report.tsx`
- Modify: `apps/web/src/pages/reports.tsx`

- [ ] **Step 1: Create PnlReport component**

Create `apps/web/src/components/reports/pnl-report.tsx`:

- Accept props: `dateFrom: string`, `dateTo: string`, `period: string`
- Use `usePnlReport({ dateFrom, dateTo }, period)` hook
- Render a summary table with rows: Revenue, COGS, Gross Profit, Operating Expenses, Commissions, Net Profit — each showing the period total
- Render a Recharts `BarChart` with monthly data: stacked bars for Revenue vs Expenses, line overlay for Net Profit
- Use `formatCurrency` for all monetary values
- Show loading skeleton while fetching
- Style: glass card wrapper, consistent with unified design system

- [ ] **Step 2: Create JobCostingReport component**

Create `apps/web/src/components/reports/job-costing-report.tsx`:

- Accept props: `dateFrom?: string`, `dateTo?: string`
- Use `useJobCostingReport(...)` hook
- Render a TanStack-style table (or shadcn Table) with columns: Customer, Address, Status, Fence Type, Revenue, Materials, Subs, Other, Commission (A), Commission (M), Profit, Margin %
- Sortable columns (use state for sort field/direction)
- Click row to expand and show line-item breakdown: MaterialLineItems list (description, category, qty, cost) + SubcontractorPayments + linked Transaction remainders. Fetch detail from `/api/projects/:id/materials` and existing sub/transaction data.
- Color profit green if positive, red if negative
- Color margin % with gradient: green > 30%, amber 15-30%, red < 15%
- Add filter dropdowns for status and fence type

- [ ] **Step 3: Create CommissionReport component**

Create `apps/web/src/components/reports/commission-report.tsx`:

- Accept props: `dateFrom: string`, `dateTo: string`
- Use `useCommissionReport(...)` hook
- Two sections: "Settled" and "Pending"
- Each section shows Adnaan and Meme with their per-project rows, period total, Aimann deductions (Adnaan only), and net payout
- Summary cards at top: Total Adnaan payout, Total Meme payout

- [ ] **Step 4: Create ExpenseReport component**

Create `apps/web/src/components/reports/expense-report.tsx`:

- Accept props: `dateFrom: string`, `dateTo: string`
- Use `useExpenseReport(...)` hook
- Two sub-tabs: "By Category" and "By Vendor"
- By Category: Recharts `PieChart`/donut + table with category, subcategories, total
- By Vendor: table sorted by total spend with columns: Vendor, Total Spend, # Projects, Top Categories

- [ ] **Step 5: Create CashFlowReport component**

Create `apps/web/src/components/reports/cash-flow-report.tsx`:

- Accept props: `dateFrom: string`, `dateTo: string`
- Use `useCashFlowReport(...)` hook
- Recharts `ComposedChart` with: green bars = Money In, red bars = Money Out, line = Running Balance
- Summary cards: Total In, Total Out, Net Cash Flow
- Table below chart with monthly breakdown

- [ ] **Step 6: Rebuild the Reports page with tab navigation**

Rewrite `apps/web/src/pages/reports.tsx`:

```typescript
import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePageShell } from '@/components/layout/page-shell';
import { useExportReport } from '@/hooks/use-financial-reports';
import { PnlReport } from '@/components/reports/pnl-report';
import { JobCostingReport } from '@/components/reports/job-costing-report';
import { CommissionReport } from '@/components/reports/commission-report';
import { ExpenseReport } from '@/components/reports/expense-report';
import { CashFlowReport } from '@/components/reports/cash-flow-report';

const TABS = [
  { id: 'pnl', label: 'P&L' },
  { id: 'job-costing', label: 'Job Costing' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'cash-flow', label: 'Cash Flow' },
] as const;

type ReportTab = (typeof TABS)[number]['id'];

function defaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  };
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('pnl');
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [period, setPeriod] = useState<string>('monthly');

  const { exportCsv, isExporting } = useExportReport(activeTab, dateRange);

  // ... usePageShell setup with eyebrow, title, subtitle, utilityActions ...

  usePageShell({
    eyebrow: 'Financial Reports',
    title: 'Reports',
    subtitle: 'P&L, job costing, commissions, expenses, and cash flow.',
  });

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={`rounded-xl px-4 ${
              activeTab === tab.id
                ? 'bg-slate-950 text-white hover:bg-slate-800'
                : 'text-slate-600 hover:bg-white hover:text-slate-950'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Shared controls: date range + export */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.dateFrom}
            onChange={(e) => setDateRange((r) => ({ ...r, dateFrom: e.target.value }))}
            className="w-40"
          />
          <span className="text-sm text-slate-500">to</span>
          <Input
            type="date"
            value={dateRange.dateTo}
            onChange={(e) => setDateRange((r) => ({ ...r, dateTo: e.target.value }))}
            className="w-40"
          />
        </div>

        {activeTab === 'pnl' && (
          <div className="inline-flex items-center rounded-2xl border border-black/5 bg-white/65 p-1 shadow-sm">
            {(['monthly', 'quarterly', 'annual'] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={`rounded-xl px-3 capitalize ${
                  period === p ? 'bg-slate-950 text-white' : 'text-slate-600'
                }`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={isExporting}
          className="ml-auto rounded-2xl border-black/10 bg-white/70 px-4"
        >
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Report content */}
      {activeTab === 'pnl' && <PnlReport {...dateRange} period={period} />}
      {activeTab === 'job-costing' && <JobCostingReport {...dateRange} />}
      {activeTab === 'commissions' && <CommissionReport {...dateRange} />}
      {activeTab === 'expenses' && <ExpenseReport {...dateRange} />}
      {activeTab === 'cash-flow' && <CashFlowReport {...dateRange} />}
    </div>
  );
}
```

- [ ] **Step 7: Verify frontend compiles**

Run:
```bash
cd apps/web && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 8: Test in browser**

Run dev server, navigate to Reports page. Verify:
- Tab navigation switches between 5 reports
- Date range picker updates report data
- P&L shows chart and summary table
- Job Costing shows sortable project table
- Commissions shows settled/pending sections
- Expenses shows category donut and vendor table
- Cash Flow shows bars + running balance line
- CSV export downloads a file

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/reports/ apps/web/src/pages/reports.tsx apps/web/src/hooks/use-financial-reports.ts
git commit -m "feat: rebuild Reports page with P&L, Job Costing, Commission, Expense, Cash Flow views"
```

---

### Task 13: Operating Expense Settings UI + Deactivation Logic

**Files:**
- Modify: `apps/api/src/services/operating-expense.service.ts`
- Modify: `apps/web/src/components/settings/operating-expenses-section.tsx`
- Modify: `apps/web/src/hooks/use-operating-expenses.ts`

- [ ] **Step 1: Auto-set effectiveTo on deactivation**

In `apps/api/src/services/operating-expense.service.ts`, find the deactivation/update logic. When `isActive` is set to `false` and `effectiveTo` is not provided, auto-set `effectiveTo` to today's date:

```typescript
if (dto.isActive === false && !dto.effectiveTo) {
  updateData.effectiveTo = new Date();
}
```

- [ ] **Step 2: Add effectiveFrom/To to Settings UI form**

In `apps/web/src/components/settings/operating-expenses-section.tsx`:

Add two optional date Input fields to the create/edit form:
- "Effective From" — `<Input type="date" />` 
- "Effective To" — `<Input type="date" />`

Display these dates in the operating expenses table when set (show "–" when null).

- [ ] **Step 3: Update hooks to pass effectiveFrom/To**

In `apps/web/src/hooks/use-operating-expenses.ts`, update the create and update mutation functions to include `effectiveFrom` and `effectiveTo` in the POST/PATCH body.

- [ ] **Step 4: Verify and commit**

Run: `cd apps/web && npx tsc --noEmit`

```bash
git add apps/api/src/services/operating-expense.service.ts apps/web/src/components/settings/operating-expenses-section.tsx apps/web/src/hooks/use-operating-expenses.ts
git commit -m "feat: add effectiveFrom/To UI to operating expenses settings + auto-set on deactivation"
```

---

### Task 14: Material Transaction-Link Endpoint + UI

**Files:**
- Modify: `apps/api/src/routes/materials.ts`
- Modify: `apps/web/src/components/projects/materials-tab.tsx`
- Modify: `apps/web/src/hooks/use-materials.ts`

- [ ] **Step 1: Add eligible-transactions endpoint**

Add to `apps/api/src/routes/materials.ts`:

```typescript
// GET /api/projects/:projectId/materials/eligible-transactions
// Returns EXPENSE transactions for this project or with null projectId
materialRouter.get(
  '/projects/:projectId/materials/eligible-transactions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          type: 'EXPENSE',
          OR: [
            { projectId: req.params.projectId },
            { projectId: null },
          ],
        },
        select: { id: true, description: true, amount: true, date: true, payee: true, category: true },
        orderBy: { date: 'desc' },
        take: 100,
      });
      res.json({ data: transactions });
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 2: Add hook for eligible transactions**

Add to `apps/web/src/hooks/use-materials.ts`:

```typescript
export function useEligibleTransactions(projectId: string) {
  const [data, setData] = useState<{ id: string; description: string; amount: number; date: string; payee: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/materials/eligible-transactions`);
      setData(res.data.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [projectId]);

  useEffect(() => { setIsLoading(true); fetch(); }, [fetch]);

  return { data, isLoading, refetch: fetch };
}
```

- [ ] **Step 3: Add transactionId field to materials-tab.tsx form**

In the MaterialsTab add/edit dialog, add an optional "Link to Transaction" Select dropdown that:
- Uses `useEligibleTransactions(projectId)` to populate options
- Displays `${txn.description} — ${formatCurrency(txn.amount)} (${txn.date})` per option
- Sends `transactionId` in the create/update payload

- [ ] **Step 4: Verify and commit**

```bash
git add apps/api/src/routes/materials.ts apps/web/src/hooks/use-materials.ts apps/web/src/components/projects/materials-tab.tsx
git commit -m "feat: add transaction linking to material line items"
```

---

### Task 15: Project Financial Summary Endpoint

**Files:**
- Modify: `apps/api/src/services/material.service.ts`
- Modify: `apps/api/src/routes/materials.ts`

- [ ] **Step 1: Extend the project material summary endpoint to return full financial summary**

Update `getProjectMaterialSummary` in `apps/api/src/services/material.service.ts` to return a complete financial summary:

```typescript
export async function getProjectFinancialSummary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      materialLineItems: { select: { totalCost: true } },
      subcontractorPayments: { select: { amountOwed: true, amountPaid: true } },
      transactions: {
        where: { type: 'EXPENSE' },
        select: { amount: true, materialLineItems: { select: { totalCost: true } } },
      },
      commissionSnapshot: true,
    },
  });

  if (!project) return null;

  // Materials
  const materialTotal = project.materialLineItems.length > 0
    ? project.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0)
    : d(project.materialsCost);

  // Subs
  const subTotal = project.subcontractorPayments.reduce((s, sp) => s + d(sp.amountPaid), 0);

  // Other expenses (transaction remainders)
  let otherExpenses = 0;
  for (const txn of project.transactions) {
    const linkedTotal = txn.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0);
    otherExpenses += d(txn.amount) - linkedTotal;
  }

  // Commissions
  let commissionsAdnaan: number;
  let commissionsMeme: number;
  if (project.commissionSnapshot) {
    commissionsAdnaan = d(project.commissionSnapshot.adnaanCommission);
    commissionsMeme = d(project.commissionSnapshot.memeCommission);
  } else {
    const subOwedTotal = project.subcontractorPayments.reduce((s, sp) => s + d(sp.amountOwed), 0);
    const aimannDebtBalance = await getAimannDebtBalance();
    const calc = calculateCommission({
      projectTotal: d(project.projectTotal),
      paymentMethod: project.paymentMethod as PaymentMethod,
      materialsCost: materialTotal,
      subOwedTotal,
      aimannDebtBalance,
    });
    commissionsAdnaan = calc.adnaanCommission;
    commissionsMeme = calc.memeCommission;
  }

  const revenue = d(project.moneyReceived);
  const totalCommissions = commissionsAdnaan + commissionsMeme;
  const totalCosts = materialTotal + subTotal + otherExpenses + totalCommissions;
  const profit = roundMoney(revenue - totalCosts);
  const marginPct = revenue > 0 ? roundMoney((profit / revenue) * 100) : 0;

  return {
    materials: roundMoney(materialTotal),
    materialLineItemCount: project.materialLineItems.length,
    subcontractors: roundMoney(subTotal),
    otherExpenses: roundMoney(otherExpenses),
    commissionsAdnaan: roundMoney(commissionsAdnaan),
    commissionsMeme: roundMoney(commissionsMeme),
    totalCommissions: roundMoney(totalCommissions),
    revenue: roundMoney(revenue),
    profit,
    marginPct,
    isLegacyMaterials: project.materialLineItems.length === 0,
  };
}
```

Import `calculateCommission` and `PaymentMethod` from `@fencetastic/shared` at the top of material.service.ts. Add a `getAimannDebtBalance` function (same as in financial-report.service.ts) or extract to a shared helper.

- [ ] **Step 2: Update the summary route**

Update the `/projects/:projectId/materials/summary` route in `apps/api/src/routes/materials.ts` to call `getProjectFinancialSummary` instead of `getProjectMaterialSummary`.

- [ ] **Step 3: Update the Financial Summary Card to use the new endpoint**

The `financial-summary-card.tsx` component should call the summary endpoint and directly render the returned fields — no client-side computation needed.

- [ ] **Step 4: Verify and commit**

```bash
git add apps/api/src/services/material.service.ts apps/api/src/routes/materials.ts apps/web/src/components/projects/financial-summary-card.tsx
git commit -m "feat: add project financial summary endpoint with full cost breakdown"
```

---

### Task 16: PDF Export

**Files:**
- Modify: `apps/api/src/routes/financial-reports.ts`

- [ ] **Step 1: Add PDF export route**

Add to `apps/api/src/routes/financial-reports.ts`, using `pdfkit` (already a dependency — used in work-orders.ts):

```typescript
import PDFDocument from 'pdfkit';

// GET /api/reports/:type/pdf — PDF export
financialReportRouter.get(
  '/:type/pdf',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const { dateFrom, dateTo } = req.query as unknown as { dateFrom: string; dateTo: string };

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);
      doc.pipe(res);

      // Header
      doc.fontSize(18).text('Fencetastic Financial Report', { align: 'center' });
      doc.fontSize(10).text(`${type.replace('-', ' ').toUpperCase()} — ${dateFrom} to ${dateTo}`, { align: 'center' });
      doc.moveDown(2);

      switch (type) {
        case 'pnl': {
          const data = await getPnlReport(dateFrom, dateTo, 'monthly');
          doc.fontSize(12).text('Profit & Loss', { underline: true });
          doc.moveDown();
          for (const row of data.rows) {
            doc.fontSize(9).text(
              `${row.month}: Revenue ${row.revenue} | COGS ${row.cogs} | Gross ${row.grossProfit} | OpEx ${row.operatingExpenses} | Comm ${row.commissions} | Net ${row.netProfit}`
            );
          }
          doc.moveDown();
          doc.fontSize(10).text(`TOTALS: Revenue ${data.totals.revenue} | Net Profit ${data.totals.netProfit}`, { bold: true });
          break;
        }
        case 'job-costing': {
          const data = await getJobCostingReport(dateFrom, dateTo);
          doc.fontSize(12).text('Job Costing Report', { underline: true });
          doc.moveDown();
          for (const row of data) {
            doc.fontSize(9).text(
              `${row.customer} — Rev: ${row.revenue} | Mat: ${row.materials} | Sub: ${row.subcontractors} | Profit: ${row.profit} (${row.marginPct}%)`
            );
          }
          break;
        }
        case 'commissions': {
          const data = await getCommissionSummaryReport(dateFrom, dateTo);
          doc.fontSize(12).text('Commission Summary', { underline: true });
          doc.moveDown();
          doc.fontSize(10).text('Settled — Adnaan', { underline: true });
          for (const row of data.settled.adnaan.rows) {
            doc.fontSize(9).text(`  ${row.customer}: ${row.commission}`);
          }
          doc.fontSize(9).text(`  Total: ${data.settled.adnaan.periodTotal} | Aimann: -${data.settled.adnaan.aimannDeductions} | Net: ${data.settled.adnaan.netPayout}`);
          doc.moveDown();
          doc.fontSize(10).text('Settled — Meme', { underline: true });
          for (const row of data.settled.meme.rows) {
            doc.fontSize(9).text(`  ${row.customer}: ${row.commission}`);
          }
          doc.fontSize(9).text(`  Total: ${data.settled.meme.periodTotal} | Net: ${data.settled.meme.netPayout}`);
          doc.moveDown();
          doc.fontSize(10).text('Pending — Adnaan', { underline: true });
          for (const row of data.pending.adnaan.rows) {
            doc.fontSize(9).text(`  ${row.customer}: ${row.commission}`);
          }
          doc.fontSize(9).text(`  Total: ${data.pending.adnaan.periodTotal} | Aimann: -${data.pending.adnaan.aimannDeductions} | Net: ${data.pending.adnaan.netPayout}`);
          doc.moveDown();
          doc.fontSize(10).text('Pending — Meme', { underline: true });
          for (const row of data.pending.meme.rows) {
            doc.fontSize(9).text(`  ${row.customer}: ${row.commission}`);
          }
          doc.fontSize(9).text(`  Total: ${data.pending.meme.periodTotal} | Net: ${data.pending.meme.netPayout}`);
          break;
        }
        case 'expenses': {
          const data = await getExpenseBreakdownReport(dateFrom, dateTo);
          doc.fontSize(12).text('Expense Breakdown', { underline: true });
          doc.moveDown();
          for (const cat of data.byCategory) {
            doc.fontSize(10).text(`${cat.category}: ${cat.total}`);
            for (const sub of cat.subcategories) {
              doc.fontSize(9).text(`  ${sub.name}: ${sub.amount}`);
            }
          }
          doc.moveDown();
          doc.fontSize(10).text(`Total: ${data.total}`);
          break;
        }
        case 'cash-flow': {
          const data = await getCashFlowReport(dateFrom, dateTo);
          doc.fontSize(12).text('Cash Flow Report', { underline: true });
          doc.moveDown();
          for (const row of data) {
            doc.fontSize(9).text(
              `${row.month}: In ${row.moneyIn} | Out ${row.moneyOut} | Net ${row.netCashFlow} | Balance ${row.runningBalance}`
            );
          }
          break;
        }
        default: {
          doc.text('Unknown report type.');
        }
      }

      doc.end();
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 2: Add PDF export button to Reports page UI**

In `apps/web/src/pages/reports.tsx`, add a second export button next to CSV:

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    const params = new URLSearchParams(dateRange).toString();
    window.open(`${import.meta.env.VITE_API_URL}/reports/${activeTab}/pdf?${params}`, '_blank');
  }}
  className="rounded-2xl border-black/10 bg-white/70 px-4"
>
  <Download className="h-4 w-4 mr-1" />
  Export PDF
</Button>
```

- [ ] **Step 3: Verify and commit**

```bash
git add apps/api/src/routes/financial-reports.ts apps/web/src/pages/reports.tsx
git commit -m "feat: add PDF export for financial reports using pdfkit"
```

---

### Task 17: Final Integration Test + Cleanup

- [ ] **Step 1: Run full type check across all packages**

Run:
```bash
npm run build
```

Expected: All packages build successfully.

- [ ] **Step 2: Run all tests**

Run:
```bash
npm run test -w packages/shared && npm run test -w apps/api
```

Expected: All existing tests still pass (no regressions). If `test:api` script doesn't exist, run `cd apps/api && npx vitest run`.

- [ ] **Step 3: Manual smoke test**

Test these flows in the browser:
1. Create a project → add materials via Materials tab (test inline add + "Add Multiple") → link a material to an expense transaction → verify financial summary card shows correct profit/margin including other expenses
2. Go to Reports → P&L tab → verify revenue and costs for the project appear in the correct completion month → test quarterly/annual period toggle
3. Job Costing → verify the project row shows materials, subs, other expenses, commissions → click to expand line-item detail
4. Commission Summary → verify settled projects filtered by settledAt → verify pending section shows all unsettled projects → verify Aimann deductions only on Adnaan
5. Expense Breakdown → verify 4 canonical categories (Materials, Subcontractors, Operating Expenses, Other) → verify vendor view doesn't double-count linked materials
6. Cash Flow → verify income/expense bars and running balance → verify operating expenses only appear in months within their effective date range
7. Export CSV from any report → verify file downloads with correct data
8. Export PDF from any report → verify PDF opens with correct data
9. Settings → Operating Expenses → verify effectiveFrom/To date pickers work → deactivate an expense → verify effectiveTo is auto-set

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete financial reporting & material cost tracking implementation"
```
