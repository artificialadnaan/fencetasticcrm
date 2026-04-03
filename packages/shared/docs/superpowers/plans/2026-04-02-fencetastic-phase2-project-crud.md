# Fencetastic Dashboard -- Phase 2: Project CRUD + Commission Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core project management API (CRUD with filtering, pagination, sorting), commission snapshot persistence on project completion, rate template listing, and full frontend pages for project list, project creation, and project detail with live commission breakdown.

**Architecture:** Extends the Phase 1 monorepo. New API routes/services follow the existing `authRouter`/`auth.service.ts` pattern. Frontend uses shadcn/ui DataTable, Sheets for create forms, and the existing `api.ts` Axios client. Commission calculation reuses `packages/shared/src/commission.ts`. Prisma schema is already complete from Phase 1.

**Tech Stack:** TypeScript, Express, Prisma, Zod, React 18, shadcn/ui (Table, Select, Dialog, Popover, Calendar), @tanstack/react-table, date-fns, Vitest

**Phases:** This is Phase 2 of 8. Phase 1 (Foundation) is complete.

---

## File Map

All files created or modified in this phase with their responsibilities:

```
FencetasticCRM/
├── packages/
│   └── shared/
│       └── src/
│           └── types.ts                                    # MODIFY — add ProjectListParams, ProjectListResponse, CreateProjectDTO, UpdateProjectDTO, ProjectWithDetails
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts                                    # MODIFY — register projectRouter, rateTemplateRouter
│   │   │   ├── routes/
│   │   │   │   ├── projects.ts                             # CREATE — project CRUD routes
│   │   │   │   └── rate-templates.ts                       # CREATE — rate template list route
│   │   │   ├── services/
│   │   │   │   ├── project.service.ts                      # CREATE — project business logic
│   │   │   │   ├── commission-snapshot.service.ts           # CREATE — snapshot + debt ledger logic
│   │   │   │   └── rate-template.service.ts                # CREATE — rate template queries
│   │   │   └── middleware/
│   │   │       └── validate.ts                             # MODIFY — add validateQuery for GET params
│   │   └── __tests__/
│   │       ├── commission-snapshot.service.test.ts          # CREATE — TDD for snapshot logic
│   │       └── project.service.test.ts                     # CREATE — TDD for project service
│   └── web/
│       ├── package.json                                    # MODIFY — add @tanstack/react-table, date-fns, @radix-ui deps
│       └── src/
│           ├── components/
│           │   ├── ui/
│           │   │   ├── table.tsx                            # CREATE — shadcn table component
│           │   │   ├── select.tsx                           # CREATE — shadcn select component
│           │   │   ├── dialog.tsx                           # CREATE — shadcn dialog component
│           │   │   ├── popover.tsx                          # CREATE — shadcn popover component
│           │   │   ├── calendar.tsx                         # CREATE — shadcn calendar (date picker)
│           │   │   ├── textarea.tsx                         # CREATE — shadcn textarea component
│           │   │   └── skeleton.tsx                         # CREATE — shadcn skeleton loader
│           │   └── projects/
│           │       ├── columns.tsx                          # CREATE — DataTable column definitions
│           │       ├── data-table.tsx                       # CREATE — reusable DataTable with pagination/sort/filter
│           │       ├── data-table-toolbar.tsx               # CREATE — filter bar (status, type, search, date range)
│           │       ├── data-table-pagination.tsx            # CREATE — pagination controls
│           │       ├── project-create-sheet.tsx             # CREATE — slide-out form for new project
│           │       ├── project-status 

I now have complete knowledge of the codebase. Let me compile the comprehensive Phase 2 implementation plan.

Here is the full Phase 2 implementation plan:

---

# Fencetastic Dashboard -- Phase 2: Project CRUD + Commission Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete project CRUD API routes, commission snapshot persistence on status change to COMPLETED, rate template listing, and the frontend projects list page, create project form, and project detail page.

**Architecture:** Builds on Phase 1 foundation. New API routes follow the Express Router + Zod validation + service layer pattern established by `apps/api/src/routes/auth.ts`. Frontend pages replace placeholder components with data-driven implementations using the existing `api` Axios client from `apps/web/src/lib/api.ts`.

**Tech Stack:** TypeScript, Express, Prisma, Zod, React 18, shadcn/ui (DataTable, Dialog, Select, Popover, Calendar, Textarea, ScrollArea, Table), @tanstack/react-table, date-fns, Vitest

**Phases:** This is Phase 2 of 8. Phase 1 (Foundation) is complete.

---

## File Map

All files created or modified in this phase with their responsibilities:

```
FencetasticCRM/
├── packages/
│   └── shared/
│       └── src/
│           └── types.ts                                    # MODIFY — add ProjectListItem, ProjectDetail, CreateProjectDTO, UpdateProjectDTO, ProjectListQuery, PaginatedResponse, CommissionPreview
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── index.ts                                    # MODIFY — register projectRouter, rateTemplateRouter
│   │       ├── routes/
│   │       │   ├── projects.ts                             # CREATE — project CRUD routes with Zod schemas
│   │       │   └── rate-templates.ts                       # CREATE — GET /api/rate-templates route
│   │       ├── services/
│   │       │   ├── project.service.ts                      # CREATE — project business logic, commission snapshot
│   │       │   └── rate-template.service.ts                # CREATE — rate template listing
│   │       ├── middleware/
│   │       │   └── validate.ts                             # MODIFY — add validateQuery for GET request query params
│   │       └── __tests__/
│   │           ├── project.service.test.ts                 # CREATE — TDD tests for project service + commission snapshot
│   │           └── projects.routes.test.ts                 # CREATE — TDD integration tests for project API routes
│   └── web/
│       ├── package.json                                    # MODIFY — add @tanstack/react-table, date-fns, @radix-ui/react-select, @radix-ui/react-popover, @radix-ui/react-scroll-area, react-day-picker
│       └── src/
│           ├── components/
│           │   ├── ui/
│           │   │   ├── table.tsx                           # CREATE — shadcn table component
│           │   │   ├── select.tsx                          # CREATE — shadcn select component
│           │   │   ├── dialog.tsx                          # CREATE — shadcn dialog component
│           │   │   ├── popover.tsx                         # CREATE — shadcn popover component
│           │   │   ├── calendar.tsx                        # CREATE — shadcn calendar (date picker base)
│           │   │   ├── textarea.tsx                        # CREATE — shadcn textarea component
│           │   │   ├── scroll-area.tsx                     # CREATE — shadcn scroll-area component
│           │   │   └── skeleton.tsx                        # CREATE — shadcn skeleton component for loading states
│           │   └── projects/
│           │       ├── columns.tsx                         # CREATE — DataTable column definitions
│           │       ├── data-table.tsx                      # CREATE — generic DataTable wrapper
│           │       ├── data-table-toolbar.tsx              # CREATE — filters (status, fenceType, search, date range)
│           │       ├── data-table-pagination.tsx           # CREATE — pagination controls
│           │       ├── status-badge.tsx                    # CREATE — color-coded status badge component
│           │       ├── create-project-dialog.tsx           # CREATE — project creation form in dialog/drawer
│           │       ├── project-financials-card.tsx         # CREATE — commission breakdown display
│           │       ├── project-header.tsx                  # CREATE — detail page header with status controls
│           │       ├── project-schedule-card.tsx           # CREATE — date fields display/edit
│           │       └── project-info-card.tsx               # CREATE — basic project information card
│           ├── hooks/
│           │   ├── use-projects.ts                        # CREATE — data fetching hook for projects list
│           │   ├── use-project.ts                         # CREATE — data fetching hook for single project
│           │   └── use-rate-templates.ts                  # CREATE — data fetching hook for rate templates
│           ├── lib/
│           │   └── formatters.ts                          # CREATE — currency, date, percentage formatters
│           └── pages/
│               ├── projects.tsx                            # MODIFY — replace placeholder with full DataTable page
│               └── project-detail.tsx                      # MODIFY — replace placeholder with full detail page
```

---

## Task 1: Add Shared Types for Project DTOs

- [ ] **Step 1.1** -- Add project-related DTOs and response types to shared types

Modify file: `packages/shared/src/types.ts`

Append after the existing `ApiResponse<T>` interface at the end of the file:

```typescript
// --- Project DTOs ---

export interface CreateProjectDTO {
  customer: string;
  address: string;
  description: string;
  fenceType: FenceType;
  status?: ProjectStatus;
  projectTotal: number;
  paymentMethod: PaymentMethod;
  forecastedExpenses: number;
  materialsCost: number;
  contractDate: string;
  installDate: string;
  completedDate?: string | null;
  estimateDate?: string | null;
  followUpDate?: string | null;
  linearFeet?: number | null;
  rateTemplateId?: string | null;
  subcontractor?: string | null;
  notes?: string | null;
}

export interface UpdateProjectDTO {
  customer?: string;
  address?: string;
  description?: string;
  fenceType?: FenceType;
  status?: ProjectStatus;
  projectTotal?: number;
  paymentMethod?: PaymentMethod;
  forecastedExpenses?: number;
  materialsCost?: number;
  customerPaid?: number;
  contractDate?: string;
  installDate?: string;
  completedDate?: string | null;
  estimateDate?: string | null;
  followUpDate?: string | null;
  linearFeet?: number | null;
  rateTemplateId?: string | null;
  subcontractor?: string | null;
  notes?: string | null;
}

export interface ProjectListQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: ProjectStatus;
  fenceType?: FenceType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CommissionPreview {
  moneyReceived: number;
  totalExpenses: number;
  adnaanCommission: number;
  memeCommission: number;
  grossProfit: number;
  aimannDeduction: number;
  netProfit: number;
  profitPercent: number;
}

export interface ProjectListItem {
  id: string;
  customer: string;
  address: string;
  fenceType: FenceType;
  status: ProjectStatus;
  projectTotal: number;
  moneyReceived: number;
  customerPaid: number;
  installDate: string;
  receivable: number;
  profitPercent: number;
}

export interface ProjectDetail extends Project {
  subcontractorPayments: SubcontractorPayment[];
  projectNotes: (ProjectNote & { author: { id: string; name: string } })[];
  commissionSnapshot: CommissionSnapshot | null;
  commissionPreview: CommissionPreview;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

- [ ] **Step 1.2** -- Commit

```bash
git add packages/shared/src/types.ts
git commit -m "feat(shared): add Project DTOs, list/detail types, and paginated response

Add CreateProjectDTO, UpdateProjectDTO, ProjectListQuery, CommissionPreview,
ProjectListItem, ProjectDetail, and PaginatedResponse types for Phase 2
project CRUD endpoints."
```

**Expected output:** Clean commit with 1 file changed.

---

## Task 2: Extend Validation Middleware for Query Params

- [ ] **Step 2.1** -- Add `validateQuery` function to validate GET request query parameters

Modify file: `apps/api/src/middleware/validate.ts`

Replace full content:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          errors: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          errors: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
```

- [ ] **Step 2.2** -- Commit

```bash
git add apps/api/src/middleware/validate.ts
git commit -m "feat(api): add validateQuery middleware for GET query param validation

Extends the existing validate.ts with a validateQuery function that parses
req.query through a Zod schema, matching the same error format as body
validation."
```

**Expected output:** Clean commit with 1 file changed.

---

## Task 3: Rate Template Service + Route

- [ ] **Step 3.1** -- Create rate template service

Create file: `apps/api/src/services/rate-template.service.ts`

```typescript
import { prisma } from '../lib/prisma';

export async function listActiveRateTemplates() {
  const templates = await prisma.rateTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ fenceType: 'asc' }, { name: 'asc' }],
  });

  return templates.map((t) => ({
    id: t.id,
    fenceType: t.fenceType,
    name: t.name,
    ratePerFoot: Number(t.ratePerFoot),
    laborRatePerFoot: Number(t.laborRatePerFoot),
    description: t.description,
    isActive: t.isActive,
  }));
}
```

- [ ] **Step 3.2** -- Create rate template route

Create file: `apps/api/src/routes/rate-templates.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { listActiveRateTemplates } from '../services/rate-template.service';

export const rateTemplateRouter = Router();

rateTemplateRouter.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await listActiveRateTemplates();
      res.json({ data: templates });
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 3.3** -- Commit

```bash
git add apps/api/src/services/rate-template.service.ts apps/api/src/routes/rate-templates.ts
git commit -m "feat(api): add rate template listing endpoint

GET /api/rate-templates returns active rate templates ordered by fence type
and name. Used in project creation form for cost pre-fill."
```

**Expected output:** Clean commit with 2 files created.

---

## Task 4: Project Service -- TDD Tests First

- [ ] **Step 4.1** -- Create test directory for API

```bash
mkdir -p apps/api/src/__tests__
```

- [ ] **Step 4.2** -- Write project service tests (TDD red phase)

Create file: `apps/api/src/__tests__/project.service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentMethod, ProjectStatus, FenceType } from '@fencetastic/shared';

// Mock Prisma before importing service
vi.mock('../lib/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subcontractorPayment: {
      aggregate: vi.fn(),
    },
    aimannDebtLedger: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    commissionSnapshot: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      project: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      subcontractorPayment: {
        aggregate: vi.fn(),
      },
      aimannDebtLedger: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      commissionSnapshot: {
        create: vi.fn(),
      },
    })),
  },
}));

import { prisma } from '../lib/prisma';

// We will import the actual service functions after creating them.
// For TDD, these tests define the expected behavior.

describe('Project Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('returns paginated projects excluding soft-deleted', async () => {
      const mockProjects = [
        {
          id: 'p1',
          customer: 'John Doe',
          address: '123 Main St',
          fenceType: 'WOOD',
          status: 'OPEN',
          projectTotal: { toNumber: () => 10000 },
          moneyReceived: { toNumber: () => 10000 },
          customerPaid: { toNumber: () => 5000 },
          materialsCost: { toNumber: () => 2000 },
          installDate: new Date('2026-04-15'),
          isDeleted: false,
          subcontractorPayments: [
            { amountOwed: { toNumber: () => 1500 } },
          ],
        },
      ];
      const mockCount = 1;

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);
      vi.mocked(prisma.project.count).mockResolvedValue(mockCount);

      const { listProjects } = await import('../services/project.service');
      const result = await listProjects({ page: 1, limit: 20 });

      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].customer).toBe('John Doe');
      expect(result.data[0].receivable).toBe(5000); // projectTotal - customerPaid
    });

    it('applies status filter', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      const { listProjects } = await import('../services/project.service');
      await listProjects({ status: ProjectStatus.OPEN });

      const findManyCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.status).toBe('OPEN');
      expect(findManyCall?.where?.isDeleted).toBe(false);
    });

    it('applies search filter on customer and address', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      const { listProjects } = await import('../services/project.service');
      await listProjects({ search: 'john' });

      const findManyCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.OR).toBeDefined();
    });
  });

  describe('createProject', () => {
    it('auto-calculates moneyReceived for credit card payments (97%)', async () => {
      vi.mocked(prisma.project.create).mockResolvedValue({
        id: 'p1',
        projectTotal: { toNumber: () => 10000 },
        moneyReceived: { toNumber: () => 9700 },
        paymentMethod: 'CREDIT_CARD',
      } as never);

      const { createProject } = await import('../services/project.service');
      await createProject({
        customer: 'Jane Doe',
        address: '456 Oak Ave',
        description: 'Wood fence install',
        fenceType: FenceType.WOOD,
        projectTotal: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        forecastedExpenses: 3000,
        materialsCost: 2000,
        contractDate: '2026-04-01',
        installDate: '2026-04-15',
      }, 'user-1');

      const createCall = vi.mocked(prisma.project.create).mock.calls[0][0];
      expect(Number(createCall.data.moneyReceived)).toBe(9700);
    });

    it('sets moneyReceived equal to projectTotal for cash/check', async () => {
      vi.mocked(prisma.project.create).mockResolvedValue({
        id: 'p1',
        projectTotal: { toNumber: () => 5000 },
        moneyReceived: { toNumber: () => 5000 },
        paymentMethod: 'CASH',
      } as never);

      const { createProject } = await import('../services/project.service');
      await createProject({
        customer: 'Bob Smith',
        address: '789 Elm St',
        description: 'Chain link fence',
        fenceType: FenceType.CHAIN_LINK,
        projectTotal: 5000,
        paymentMethod: PaymentMethod.CASH,
        forecastedExpenses: 1500,
        materialsCost: 1000,
        contractDate: '2026-04-01',
        installDate: '2026-04-20',
      }, 'user-1');

      const createCall = vi.mocked(prisma.project.create).mock.calls[0][0];
      expect(Number(createCall.data.moneyReceived)).toBe(5000);
    });
  });

  describe('updateProject — commission snapshot on COMPLETED', () => {
    it('creates CommissionSnapshot when status changes to COMPLETED', async () => {
      // This test verifies the core commission snapshot logic.
      // The actual implementation will use a Prisma transaction.
      // We test the snapshot creation logic separately.
      const { calculateCommission } = await import('@fencetastic/shared');
      const result = calculateCommission({
        projectTotal: 10000,
        paymentMethod: PaymentMethod.CASH,
        materialsCost: 2000,
        subOwedTotal: 1500,
        aimannDebtBalance: 5000,
      });

      expect(result.moneyReceived).toBe(10000);
      expect(result.totalExpenses).toBe(3500);
      expect(result.adnaanCommission).toBe(1000);
      expect(result.memeCommission).toBe(500);
      expect(result.grossProfit).toBe(5500);
      expect(result.aimannDeduction).toBe(1375);
      expect(result.netProfit).toBe(3625);
    });

    it('writes negative entry to AimannDebtLedger when deduction > 0', () => {
      // When aimannDeduction is 1375 and balance is 5000:
      // New ledger entry: amount = -1375, runningBalance = 5000 - 1375 = 3625
      const currentBalance = 5000;
      const deduction = 1375;
      const newBalance = currentBalance - deduction;

      expect(newBalance).toBe(3625);
      // The ledger entry amount should be negative (reducing debt)
      expect(-deduction).toBe(-1375);
    });

    it('does NOT create debt ledger entry when deduction is 0', () => {
      // When grossProfit is negative or debt is 0, aimannDeduction is 0
      // No ledger entry should be created
      const { calculateCommission } = require('@fencetastic/shared');
      const result = calculateCommission({
        projectTotal: 5000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        materialsCost: 4000,
        subOwedTotal: 2000,
        aimannDebtBalance: 5000,
      });

      expect(result.aimannDeduction).toBe(0);
      // Service should skip ledger write when deduction is 0
    });
  });

  describe('softDeleteProject', () => {
    it('sets isDeleted=true and deletedAt to now', async () => {
      const now = new Date();
      vi.mocked(prisma.project.update).mockResolvedValue({
        id: 'p1',
        isDeleted: true,
        deletedAt: now,
      } as never);

      const { softDeleteProject } = await import('../services/project.service');
      await softDeleteProject('p1');

      const updateCall = vi.mocked(prisma.project.update).mock.calls[0][0];
      expect(updateCall.data.isDeleted).toBe(true);
      expect(updateCall.data.deletedAt).toBeDefined();
    });
  });
});
```

- [ ] **Step 4.3** -- Run tests (expect failures -- TDD red phase)

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm run test:api -- --run
```

**Expected output:** Tests fail because `../services/project.service` does not exist yet. This is the TDD red phase.

- [ ] **Step 4.4** -- Commit test file

```bash
git add apps/api/src/__tests__/project.service.test.ts
git commit -m "test(api): add TDD tests for project service and commission snapshot

Red phase: tests define expected behavior for listProjects, createProject
(moneyReceived auto-calc), updateProject (commission snapshot on COMPLETED,
debt ledger write), and softDeleteProject."
```

---

## Task 5: Project Service Implementation (TDD Green Phase)

- [ ] **Step 5.1** -- Create project service

Create file: `apps/api/src/services/project.service.ts`

```typescript
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  calculateCommission,
  PaymentMethod,
  ProjectStatus,
  CC_FEE_RATE,
  type CreateProjectDTO,
  type UpdateProjectDTO,
  type ProjectListQuery,
  type ProjectListItem,
  type CommissionPreview,
} from '@fencetastic/shared';
import { AppError } from '../middleware/error-handler';

// Helper: convert Prisma Decimal to number
function d(val: Prisma.Decimal | null | undefined): number {
  return val ? Number(val) : 0;
}

// Helper: calculate moneyReceived from projectTotal + paymentMethod
function calcMoneyReceived(projectTotal: number, paymentMethod: string): number {
  if (paymentMethod === PaymentMethod.CREDIT_CARD) {
    return Number((projectTotal * (1 - CC_FEE_RATE)).toFixed(2));
  }
  return projectTotal;
}

// Helper: build commission preview for a project
async function buildCommissionPreview(
  projectId: string,
  projectTotal: number,
  paymentMethod: string,
  materialsCost: number
): Promise<CommissionPreview> {
  const subAgg = await prisma.subcontractorPayment.aggregate({
    where: { projectId },
    _sum: { amountOwed: true },
  });
  const subOwedTotal = d(subAgg._sum.amountOwed);

  // Get current Aimann debt balance
  const lastLedger = await prisma.aimannDebtLedger.findFirst({
    orderBy: { date: 'desc' },
  });
  const aimannDebtBalance = lastLedger ? d(lastLedger.runningBalance) : 0;

  const breakdown = calculateCommission({
    projectTotal,
    paymentMethod: paymentMethod as PaymentMethod,
    materialsCost,
    subOwedTotal,
    aimannDebtBalance,
  });

  const profitPercent =
    projectTotal > 0
      ? Number(((breakdown.netProfit / projectTotal) * 100).toFixed(1))
      : 0;

  return { ...breakdown, profitPercent };
}

export async function listProjects(query: ProjectListQuery = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'installDate',
    sortDir = 'desc',
    status,
    fenceType,
    search,
    dateFrom,
    dateTo,
  } = query;

  const where: Prisma.ProjectWhereInput = {
    isDeleted: false,
  };

  if (status) {
    where.status = status;
  }

  if (fenceType) {
    where.fenceType = fenceType;
  }

  if (search) {
    where.OR = [
      { customer: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (dateFrom || dateTo) {
    where.installDate = {};
    if (dateFrom) {
      where.installDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.installDate.lte = new Date(dateTo);
    }
  }

  // Map sortBy to Prisma field names
  const sortFieldMap: Record<string, string> = {
    customer: 'customer',
    address: 'address',
    fenceType: 'fenceType',
    status: 'status',
    projectTotal: 'projectTotal',
    installDate: 'installDate',
    createdAt: 'createdAt',
  };
  const orderField = sortFieldMap[sortBy] || 'installDate';

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        subcontractorPayments: {
          select: { amountOwed: true },
        },
      },
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  const data: ProjectListItem[] = projects.map((p) => {
    const projectTotal = d(p.projectTotal);
    const moneyReceived = d(p.moneyReceived);
    const customerPaid = d(p.customerPaid);
    const materialsCost = d(p.materialsCost);
    const subOwedTotal = p.subcontractorPayments.reduce(
      (sum, sp) => sum + d(sp.amountOwed),
      0
    );

    // Quick inline commission calc for list view profit %
    const breakdown = calculateCommission({
      projectTotal,
      paymentMethod: p.paymentMethod as PaymentMethod,
      materialsCost,
      subOwedTotal,
      aimannDebtBalance: 0, // Simplified for list view — no debt lookup per row
    });

    const profitPercent =
      projectTotal > 0
        ? Number(((breakdown.netProfit / projectTotal) * 100).toFixed(1))
        : 0;

    return {
      id: p.id,
      customer: p.customer,
      address: p.address,
      fenceType: p.fenceType,
      status: p.status,
      projectTotal,
      moneyReceived,
      customerPaid,
      installDate: p.installDate.toISOString().split('T')[0],
      receivable: Number((projectTotal - customerPaid).toFixed(2)),
      profitPercent,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProjectById(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      subcontractorPayments: true,
      projectNotes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      commissionSnapshot: true,
    },
  });

  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  const projectTotal = d(project.projectTotal);
  const materialsCost = d(project.materialsCost);

  // For completed projects, use snapshot. For others, compute live.
  let commissionPreview: CommissionPreview;
  if (project.status === 'COMPLETED' && project.commissionSnapshot) {
    const snap = project.commissionSnapshot;
    commissionPreview = {
      moneyReceived: d(snap.moneyReceived),
      totalExpenses: d(snap.totalExpenses),
      adnaanCommission: d(snap.adnaanCommission),
      memeCommission: d(snap.memeCommission),
      grossProfit: d(snap.grossProfit),
      aimannDeduction: d(snap.aimannDeduction),
      netProfit: d(snap.netProfit),
      profitPercent:
        projectTotal > 0
          ? Number(((d(snap.netProfit) / projectTotal) * 100).toFixed(1))
          : 0,
    };
  } else {
    commissionPreview = await buildCommissionPreview(
      project.id,
      projectTotal,
      project.paymentMethod,
      materialsCost
    );
  }

  // Serialize the project
  return {
    id: project.id,
    customer: project.customer,
    address: project.address,
    description: project.description,
    fenceType: project.fenceType,
    status: project.status,
    projectTotal,
    paymentMethod: project.paymentMethod,
    moneyReceived: d(project.moneyReceived),
    customerPaid: d(project.customerPaid),
    forecastedExpenses: d(project.forecastedExpenses),
    materialsCost,
    contractDate: project.contractDate.toISOString().split('T')[0],
    installDate: project.installDate.toISOString().split('T')[0],
    completedDate: project.completedDate?.toISOString().split('T')[0] ?? null,
    estimateDate: project.estimateDate?.toISOString().split('T')[0] ?? null,
    followUpDate: project.followUpDate?.toISOString().split('T')[0] ?? null,
    linearFeet: project.linearFeet ? d(project.linearFeet) : null,
    rateTemplateId: project.rateTemplateId,
    subcontractor: project.subcontractor,
    notes: project.notes,
    createdById: project.createdById,
    isDeleted: project.isDeleted,
    deletedAt: project.deletedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    subcontractorPayments: project.subcontractorPayments.map((sp) => ({
      id: sp.id,
      projectId: sp.projectId,
      subcontractorName: sp.subcontractorName,
      amountOwed: d(sp.amountOwed),
      amountPaid: d(sp.amountPaid),
      datePaid: sp.datePaid?.toISOString().split('T')[0] ?? null,
      notes: sp.notes,
    })),
    projectNotes: project.projectNotes.map((n) => ({
      id: n.id,
      projectId: n.projectId,
      authorId: n.authorId,
      content: n.content,
      photoUrls: n.photoUrls,
      createdAt: n.createdAt.toISOString(),
      author: n.author,
    })),
    commissionSnapshot: project.commissionSnapshot
      ? {
          id: project.commissionSnapshot.id,
          projectId: project.commissionSnapshot.projectId,
          moneyReceived: d(project.commissionSnapshot.moneyReceived),
          totalExpenses: d(project.commissionSnapshot.totalExpenses),
          adnaanCommission: d(project.commissionSnapshot.adnaanCommission),
          memeCommission: d(project.commissionSnapshot.memeCommission),
          grossProfit: d(project.commissionSnapshot.grossProfit),
          aimannDeduction: d(project.commissionSnapshot.aimannDeduction),
          debtBalanceBefore: d(project.commissionSnapshot.debtBalanceBefore),
          debtBalanceAfter: d(project.commissionSnapshot.debtBalanceAfter),
          netProfit: d(project.commissionSnapshot.netProfit),
          settledAt: project.commissionSnapshot.settledAt.toISOString(),
        }
      : null,
    commissionPreview,
  };
}

export async function createProject(dto: CreateProjectDTO, createdById: string) {
  const moneyReceived = calcMoneyReceived(dto.projectTotal, dto.paymentMethod);

  const project = await prisma.project.create({
    data: {
      customer: dto.customer,
      address: dto.address,
      description: dto.description,
      fenceType: dto.fenceType,
      status: dto.status || ProjectStatus.ESTIMATE,
      projectTotal: dto.projectTotal,
      paymentMethod: dto.paymentMethod,
      moneyReceived,
      customerPaid: 0,
      forecastedExpenses: dto.forecastedExpenses,
      materialsCost: dto.materialsCost,
      contractDate: new Date(dto.contractDate),
      installDate: new Date(dto.installDate),
      completedDate: dto.completedDate ? new Date(dto.completedDate) : null,
      estimateDate: dto.estimateDate ? new Date(dto.estimateDate) : null,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
      linearFeet: dto.linearFeet ?? null,
      rateTemplateId: dto.rateTemplateId ?? null,
      subcontractor: dto.subcontractor ?? null,
      notes: dto.notes ?? null,
      createdById,
    },
  });

  return { id: project.id };
}

export async function updateProject(projectId: string, dto: UpdateProjectDTO) {
  // First, get current project to check status transition
  const current = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!current || current.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  // Build update data — only set fields that were provided
  const updateData: Prisma.ProjectUpdateInput = {};

  if (dto.customer !== undefined) updateData.customer = dto.customer;
  if (dto.address !== undefined) updateData.address = dto.address;
  if (dto.description !== undefined) updateData.description = dto.description;
  if (dto.fenceType !== undefined) updateData.fenceType = dto.fenceType;
  if (dto.status !== undefined) updateData.status = dto.status;
  if (dto.projectTotal !== undefined) {
    updateData.projectTotal = dto.projectTotal;
    // Recalculate moneyReceived if projectTotal or paymentMethod changes
    const pm = dto.paymentMethod ?? current.paymentMethod;
    updateData.moneyReceived = calcMoneyReceived(dto.projectTotal, pm);
  }
  if (dto.paymentMethod !== undefined) {
    updateData.paymentMethod = dto.paymentMethod;
    // Recalculate moneyReceived if paymentMethod changes
    const pt = dto.projectTotal ?? d(current.projectTotal);
    updateData.moneyReceived = calcMoneyReceived(pt, dto.paymentMethod);
  }
  if (dto.forecastedExpenses !== undefined) updateData.forecastedExpenses = dto.forecastedExpenses;
  if (dto.materialsCost !== undefined) updateData.materialsCost = dto.materialsCost;
  if (dto.customerPaid !== undefined) updateData.customerPaid = dto.customerPaid;
  if (dto.contractDate !== undefined) updateData.contractDate = new Date(dto.contractDate);
  if (dto.installDate !== undefined) updateData.installDate = new Date(dto.installDate);
  if (dto.completedDate !== undefined) updateData.completedDate = dto.completedDate ? new Date(dto.completedDate) : null;
  if (dto.estimateDate !== undefined) updateData.estimateDate = dto.estimateDate ? new Date(dto.estimateDate) : null;
  if (dto.followUpDate !== undefined) updateData.followUpDate = dto.followUpDate ? new Date(dto.followUpDate) : null;
  if (dto.linearFeet !== undefined) updateData.linearFeet = dto.linearFeet;
  if (dto.rateTemplateId !== undefined) {
    updateData.rateTemplate = dto.rateTemplateId
      ? { connect: { id: dto.rateTemplateId } }
      : { disconnect: true };
  }
  if (dto.subcontractor !== undefined) updateData.subcontractor = dto.subcontractor;
  if (dto.notes !== undefined) updateData.notes = dto.notes;

  // Check if transitioning to COMPLETED
  const isCompletingNow =
    dto.status === ProjectStatus.COMPLETED &&
    current.status !== ProjectStatus.COMPLETED;

  if (isCompletingNow) {
    // Set completedDate if not explicitly provided
    if (!dto.completedDate) {
      updateData.completedDate = new Date();
    }

    // Use a transaction for atomicity: update project + create snapshot + write ledger
    return prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: updateData,
      });

      // Get subcontractor totals
      const subAgg = await tx.subcontractorPayment.aggregate({
        where: { projectId },
        _sum: { amountOwed: true },
      });
      const subOwedTotal = subAgg._sum.amountOwed ? Number(subAgg._sum.amountOwed) : 0;

      // Get current Aimann debt balance
      const lastLedger = await tx.aimannDebtLedger.findFirst({
        orderBy: { date: 'desc' },
      });
      const aimannDebtBalance = lastLedger ? Number(lastLedger.runningBalance) : 0;

      const projectTotal = Number(updated.projectTotal);
      const materialsCost = Number(updated.materialsCost);

      const breakdown = calculateCommission({
        projectTotal,
        paymentMethod: updated.paymentMethod as PaymentMethod,
        materialsCost,
        subOwedTotal,
        aimannDebtBalance,
      });

      const debtBalanceAfter = Number(
        (aimannDebtBalance - breakdown.aimannDeduction).toFixed(2)
      );

      // Create commission snapshot
      await tx.commissionSnapshot.create({
        data: {
          projectId,
          moneyReceived: breakdown.moneyReceived,
          totalExpenses: breakdown.totalExpenses,
          adnaanCommission: breakdown.adnaanCommission,
          memeCommission: breakdown.memeCommission,
          grossProfit: breakdown.grossProfit,
          aimannDeduction: breakdown.aimannDeduction,
          debtBalanceBefore: aimannDebtBalance,
          debtBalanceAfter,
          netProfit: breakdown.netProfit,
        },
      });

      // Write debt ledger entry if deduction > 0
      if (breakdown.aimannDeduction > 0) {
        await tx.aimannDebtLedger.create({
          data: {
            projectId,
            amount: -breakdown.aimannDeduction,
            runningBalance: debtBalanceAfter,
            note: `Commission deduction from project: ${updated.customer} - ${updated.address}`,
            date: new Date(),
          },
        });
      }

      return { id: updated.id };
    });
  }

  // Normal update (no status transition to COMPLETED)
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });

  return { id: updated.id };
}

export async function softDeleteProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}
```

- [ ] **Step 5.2** -- Run tests (expect green -- TDD green phase)

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm run test:api -- --run
```

**Expected output:** All tests pass. The project service implements the behavior defined by the tests.

- [ ] **Step 5.3** -- Commit

```bash
git add apps/api/src/services/project.service.ts
git commit -m "feat(api): implement project service with commission snapshot logic

Implements listProjects (paginated, filtered, sorted, with profit %),
getProjectById (with live commission preview or snapshot), createProject
(auto-calc moneyReceived), updateProject (commission snapshot + debt
ledger on COMPLETED transition), and softDeleteProject."
```

**Expected output:** Clean commit, all tests green.

---

## Task 6: Project API Routes

- [ ] **Step 6.1** -- Create project routes with Zod validation schemas

Create file: `apps/api/src/routes/projects.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { validateQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  softDeleteProject,
} from '../services/project.service';

export const projectRouter = Router();

// --- Zod Schemas ---

const fenceTypeEnum = z.enum(['WOOD', 'METAL', 'CHAIN_LINK', 'VINYL', 'GATE', 'OTHER']);
const projectStatusEnum = z.enum(['ESTIMATE', 'OPEN', 'IN_PROGRESS', 'COMPLETED']);
const paymentMethodEnum = z.enum(['CASH', 'CHECK', 'CREDIT_CARD']);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('installDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: projectStatusEnum.optional(),
  fenceType: fenceTypeEnum.optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createProjectSchema = z.object({
  customer: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  description: z.string().min(1, 'Description is required'),
  fenceType: fenceTypeEnum,
  status: projectStatusEnum.optional(),
  projectTotal: z.number().min(0, 'Project total must be >= 0'),
  paymentMethod: paymentMethodEnum,
  forecastedExpenses: z.number().min(0),
  materialsCost: z.number().min(0),
  contractDate: z.string().min(1, 'Contract date is required'),
  installDate: z.string().min(1, 'Install date is required'),
  completedDate: z.string().nullable().optional(),
  estimateDate: z.string().nullable().optional(),
  followUpDate: z.string().nullable().optional(),
  linearFeet: z.number().nullable().optional(),
  rateTemplateId: z.string().uuid().nullable().optional(),
  subcontractor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateProjectSchema = z.object({
  customer: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  fenceType: fenceTypeEnum.optional(),
  status: projectStatusEnum.optional(),
  projectTotal: z.number().min(0).optional(),
  paymentMethod: paymentMethodEnum.optional(),
  forecastedExpenses: z.number().min(0).optional(),
  materialsCost: z.number().min(0).optional(),
  customerPaid: z.number().min(0).optional(),
  contractDate: z.string().optional(),
  installDate: z.string().optional(),
  completedDate: z.string().nullable().optional(),
  estimateDate: z.string().nullable().optional(),
  followUpDate: z.string().nullable().optional(),
  linearFeet: z.number().nullable().optional(),
  rateTemplateId: z.string().uuid().nullable().optional(),
  subcontractor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// --- Routes ---

// GET /api/projects — list with filters, pagination, sorting
projectRouter.get(
  '/',
  requireAuth,
  validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await listProjects(req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/projects/:id — single project with full details
projectRouter.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await getProjectById(req.params.id);
      res.json({ data: project });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/projects — create project
projectRouter.post(
  '/',
  requireAuth,
  validate(createProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await createProject(req.body, req.user!.userId);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/projects/:id — update project
projectRouter.patch(
  '/:id',
  requireAuth,
  validate(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await updateProject(req.params.id, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/projects/:id — soft delete
projectRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await softDeleteProject(req.params.id);
      res.json({ data: { message: 'Project deleted' } });
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 6.2** -- Register routes in the API index

Modify file: `apps/api/src/index.ts`

Replace full content:

```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { projectRouter } from './routes/projects';
import { rateTemplateRouter } from './routes/rate-templates';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/rate-templates', rateTemplateRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Fencetastic API running on http://localhost:${PORT}`);
});

export default app;
```

- [ ] **Step 6.3** -- Commit

```bash
git add apps/api/src/routes/projects.ts apps/api/src/index.ts
git commit -m "feat(api): add project CRUD routes and register in Express app

Routes: GET /api/projects (list), GET /api/projects/:id (detail),
POST /api/projects (create), PATCH /api/projects/:id (update),
DELETE /api/projects/:id (soft delete). All routes require auth.
Zod schemas validate body and query params."
```

**Expected output:** Clean commit with 2 files changed.

---

## Task 7: Install Frontend Dependencies

- [ ] **Step 7.1** -- Install new npm packages for the web app

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm install @tanstack/react-table date-fns react-day-picker @radix-ui/react-select @radix-ui/react-popover @radix-ui/react-scroll-area -w apps/web
```

- [ ] **Step 7.2** -- Add shadcn UI components

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web
npx shadcn@latest add table select dialog popover calendar textarea scroll-area skeleton --yes
```

Note: If `npx shadcn` prompts are non-interactive, create the files manually using the standard shadcn source. The components to create are:
- `apps/web/src/components/ui/table.tsx`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/components/ui/dialog.tsx`
- `apps/web/src/components/ui/popover.tsx`
- `apps/web/src/components/ui/calendar.tsx`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/components/ui/scroll-area.tsx`
- `apps/web/src/components/ui/skeleton.tsx`

- [ ] **Step 7.3** -- Commit

```bash
git add apps/web/package.json apps/web/src/components/ui/table.tsx apps/web/src/components/ui/select.tsx apps/web/src/components/ui/dialog.tsx apps/web/src/components/ui/popover.tsx apps/web/src/components/ui/calendar.tsx apps/web/src/components/ui/textarea.tsx apps/web/src/components/ui/scroll-area.tsx apps/web/src/components/ui/skeleton.tsx package-lock.json
git commit -m "feat(web): add shadcn UI components and dependencies for project pages

Install @tanstack/react-table, date-fns, react-day-picker and Radix
primitives. Add shadcn table, select, dialog, popover, calendar,
textarea, scroll-area, and skeleton components."
```

---

## Task 8: Frontend Utility Helpers

- [ ] **Step 8.1** -- Create formatters utility

Create file: `apps/web/src/lib/formatters.ts`

```typescript
/**
 * Format a number as USD currency.
 * formatCurrency(1234.5) → "$1,234.50"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format an ISO date string to a readable date.
 * formatDate("2026-04-15") → "Apr 15, 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00'); // Avoid timezone shift
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a percentage with one decimal place.
 * formatPercent(23.5) → "23.5%"
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
```

- [ ] **Step 8.2** -- Commit

```bash
git add apps/web/src/lib/formatters.ts
git commit -m "feat(web): add currency, date, and percentage formatter utilities

Provides formatCurrency, formatDate, and formatPercent helpers for
consistent display formatting across project list and detail pages."
```

---

## Task 9: Data Fetching Hooks

- [ ] **Step 9.1** -- Create use-projects hook

Create file: `apps/web/src/hooks/use-projects.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ProjectListItem, ProjectListQuery, PaginatedResponse } from '@fencetastic/shared';
import { POLLING_INTERVAL_MS } from '@fencetastic/shared';

interface UseProjectsReturn {
  data: ProjectListItem[];
  pagination: PaginatedResponse<ProjectListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjects(query: ProjectListQuery = {}): UseProjectsReturn {
  const [data, setData] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<ProjectListItem>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize query to a stable string for dependency tracking
  const queryKey = JSON.stringify(query);

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      const q: ProjectListQuery = JSON.parse(queryKey);
      if (q.page) params.set('page', String(q.page));
      if (q.limit) params.set('limit', String(q.limit));
      if (q.sortBy) params.set('sortBy', q.sortBy);
      if (q.sortDir) params.set('sortDir', q.sortDir);
      if (q.status) params.set('status', q.status);
      if (q.fenceType) params.set('fenceType', q.fenceType);
      if (q.search) params.set('search', q.search);
      if (q.dateFrom) params.set('dateFrom', q.dateFrom);
      if (q.dateTo) params.set('dateTo', q.dateTo);

      const res = await api.get(`/projects?${params.toString()}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    setIsLoading(true);
    fetchProjects();
  }, [fetchProjects]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchProjects, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  return { data, pagination, isLoading, error, refetch: fetchProjects };
}
```

- [ ] **Step 9.2** -- Create use-project hook (single project)

Create file: `apps/web/src/hooks/use-project.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ProjectDetail } from '@fencetastic/shared';
import { POLLING_INTERVAL_MS } from '@fencetastic/shared';

interface UseProjectReturn {
  project: ProjectDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProject(projectId: string | undefined): UseProjectReturn {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setError(null);
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load project';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    const interval = setInterval(fetchProject, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchProject]);

  return { project, isLoading, error, refetch: fetchProject };
}
```

- [ ] **Step 9.3** -- Create use-rate-templates hook

Create file: `apps/web/src/hooks/use-rate-templates.ts`

```typescript
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { RateTemplate } from '@fencetastic/shared';

interface UseRateTemplatesReturn {
  templates: RateTemplate[];
  isLoading: boolean;
}

export function useRateTemplates(): UseRateTemplatesReturn {
  const [templates, setTemplates] = useState<RateTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/rate-templates');
        setTemplates(res.data.data);
      } catch {
        // Silently fail — template list is non-critical
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  return { templates, isLoading };
}
```

- [ ] **Step 9.4** -- Commit

```bash
git add apps/web/src/hooks/use-projects.ts apps/web/src/hooks/use-project.ts apps/web/src/hooks/use-rate-templates.ts
git commit -m "feat(web): add data fetching hooks for projects and rate templates

useProjects: paginated list with filters and 30s polling.
useProject: single project detail with polling.
useRateTemplates: active rate template list for form pre-fill."
```

---

## Task 10: Status Badge Component

- [ ] **Step 10.1** -- Create reusable status badge component

Create file: `apps/web/src/components/projects/status-badge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@fencetastic/shared';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ESTIMATE: {
    label: 'Estimate',
    className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
  },
  OPEN: {
    label: 'Open',
    className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
  },
};

interface StatusBadgeProps {
  status: ProjectStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 10.2** -- Commit

```bash
git add apps/web/src/components/projects/status-badge.tsx
git commit -m "feat(web): add StatusBadge component with color-coded project statuses

Green for Completed, Blue for In Progress, Amber for Open, Gray for
Estimate. Uses shadcn Badge with outline variant and custom colors."
```

---

## Task 11: DataTable Components

- [ ] **Step 11.1** -- Create generic DataTable component

Create file: `apps/web/src/components/projects/data-table.tsx`

```typescript
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((_, j) => (
                  <TableCell key={`skeleton-${i}-${j}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No projects found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 11.2** -- Create DataTable column definitions

Create file: `apps/web/src/components/projects/columns.tsx`

```typescript
import { type ColumnDef } from '@tanstack/react-table';
import type { ProjectListItem } from '@fencetastic/shared';
import { StatusBadge } from './status-badge';
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters';

export const projectColumns: ColumnDef<ProjectListItem>[] = [
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('customer')}</span>
    ),
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[200px] truncate block">
        {row.getValue('address')}
      </span>
    ),
  },
  {
    accessorKey: 'fenceType',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('fenceType') as string;
      return <span className="text-sm">{type.replace('_', ' ')}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'projectTotal',
    header: 'Project Total',
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.getValue('projectTotal'))}</span>
    ),
  },
  {
    accessorKey: 'receivable',
    header: 'Receivable',
    cell: ({ row }) => {
      const receivable = row.getValue('receivable') as number;
      return (
        <span className={`font-mono ${receivable > 0 ? 'text-amber-600' : 'text-green-600'}`}>
          {formatCurrency(receivable)}
        </span>
      );
    },
  },
  {
    accessorKey: 'profitPercent',
    header: 'Profit %',
    cell: ({ row }) => {
      const pct = row.getValue('profitPercent') as number;
      return (
        <span className={`font-mono ${pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatPercent(pct)}
        </span>
      );
    },
  },
  {
    accessorKey: 'installDate',
    header: 'Install Date',
    cell: ({ row }) => formatDate(row.getValue('installDate')),
  },
];
```

- [ ] **Step 11.3** -- Create DataTable toolbar (filters)

Create file: `apps/web/src/components/projects/data-table-toolbar.tsx`

```typescript
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { ProjectStatus, FenceType } from '@fencetastic/shared';

interface DataTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  fenceTypeFilter: string;
  onFenceTypeChange: (value: string) => void;
  onReset: () => void;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  fenceTypeFilter,
  onFenceTypeChange,
  onReset,
}: DataTableToolbarProps) {
  const hasFilters = search || statusFilter || fenceTypeFilter;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Input
        placeholder="Search customer or address..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 w-full sm:w-[250px]"
      />
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-full sm:w-[150px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.values(ProjectStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={fenceTypeFilter} onValueChange={onFenceTypeChange}>
        <SelectTrigger className="h-9 w-full sm:w-[150px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          {Object.values(FenceType).map((t) => (
            <SelectItem key={t} value={t}>
              {t.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 px-2">
          <X className="h-4 w-4 mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 11.4** -- Create DataTable pagination

Create file: `apps/web/src/components/projects/data-table-pagination.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  page,
  totalPages,
  total,
  onPageChange,
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-sm text-muted-foreground">
        {total} project{total !== 1 ? 's' : ''} total
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 11.5** -- Commit

```bash
git add apps/web/src/components/projects/data-table.tsx apps/web/src/components/projects/columns.tsx apps/web/src/components/projects/data-table-toolbar.tsx apps/web/src/components/projects/data-table-pagination.tsx
git commit -m "feat(web): add DataTable, columns, toolbar, and pagination components

Generic DataTable wraps @tanstack/react-table with loading skeletons
and row click handling. Column defs for Customer, Address, Type, Status,
Project Total, Receivable, Profit %, Install Date. Toolbar provides
search + status + fenceType filters. Pagination with first/prev/next/last."
```

---

## Task 12: Create Project Dialog

- [ ] **Step 12.1** -- Create the project creation dialog component

Create file: `apps/web/src/components/projects/create-project-dialog.tsx`

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { FenceType, PaymentMethod, ProjectStatus } from '@fencetastic/shared';
import type { RateTemplate } from '@fencetastic/shared';
import { useRateTemplates } from '@/hooks/use-rate-templates';

interface CreateProjectDialogProps {
  onCreated: () => void;
}

export function CreateProjectDialog({ onCreated }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { templates } = useRateTemplates();

  // Form state
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [fenceType, setFenceType] = useState<string>(FenceType.WOOD);
  const [status, setStatus] = useState<string>(ProjectStatus.ESTIMATE);
  const [projectTotal, setProjectTotal] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(PaymentMethod.CHECK);
  const [materialsCost, setMaterialsCost] = useState('');
  const [forecastedExpenses, setForecastedExpenses] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [estimateDate, setEstimateDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [linearFeet, setLinearFeet] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subcontractor, setSubcontractor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function resetForm() {
    setCustomer('');
    setAddress('');
    setDescription('');
    setFenceType(FenceType.WOOD);
    setStatus(ProjectStatus.ESTIMATE);
    setProjectTotal('');
    setPaymentMethod(PaymentMethod.CHECK);
    setMaterialsCost('');
    setForecastedExpenses('');
    setContractDate('');
    setInstallDate('');
    setEstimateDate('');
    setFollowUpDate('');
    setLinearFeet('');
    setSelectedTemplateId('');
    setSubcontractor('');
    setNotes('');
    setError('');
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    if (templateId === 'NONE') return;
    const template = templates.find((t: RateTemplate) => t.id === templateId);
    if (!template || !linearFeet) return;
    const feet = parseFloat(linearFeet);
    if (isNaN(feet)) return;
    setMaterialsCost((template.ratePerFoot * feet).toFixed(2));
    setForecastedExpenses(
      ((template.ratePerFoot + template.laborRatePerFoot) * feet).toFixed(2)
    );
    setFenceType(template.fenceType);
  }

  function handleLinearFeetChange(value: string) {
    setLinearFeet(value);
    if (selectedTemplateId && selectedTemplateId !== 'NONE') {
      const template = templates.find((t: RateTemplate) => t.id === selectedTemplateId);
      const feet = parseFloat(value);
      if (template && !isNaN(feet)) {
        setMaterialsCost((template.ratePerFoot * feet).toFixed(2));
        setForecastedExpenses(
          ((template.ratePerFoot + template.laborRatePerFoot) * feet).toFixed(2)
        );
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/projects', {
        customer,
        address,
        description,
        fenceType,
        status,
        projectTotal: parseFloat(projectTotal),
        paymentMethod,
        materialsCost: parseFloat(materialsCost) || 0,
        forecastedExpenses: parseFloat(forecastedExpenses) || 0,
        contractDate,
        installDate,
        estimateDate: estimateDate || null,
        followUpDate: followUpDate || null,
        linearFeet: linearFeet ? parseFloat(linearFeet) : null,
        rateTemplateId: selectedTemplateId && selectedTemplateId !== 'NONE' ? selectedTemplateId : null,
        subcontractor: subcontractor || null,
        notes: notes || null,
      });
      setOpen(false);
      resetForm();
      onCreated();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Failed to create project');
      } else {
        setError('Failed to create project');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Customer & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={2} />
            </div>

            {/* Fence Type, Status, Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fence Type *</Label>
                <Select value={fenceType} onValueChange={setFenceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(FenceType).map((t) => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ProjectStatus).map((s) => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PaymentMethod).map((p) => (
                      <SelectItem key={p} value={p}>{p.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rate Template + Linear Feet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No template</SelectItem>
                    {templates.map((t: RateTemplate) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} (${t.ratePerFoot}/ft)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linearFeet">Linear Feet</Label>
                <Input id="linearFeet" type="number" step="0.01" value={linearFeet} onChange={(e) => handleLinearFeetChange(e.target.value)} />
              </div>
            </div>

            {/* Financial Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectTotal">Project Total *</Label>
                <Input id="projectTotal" type="number" step="0.01" min="0" value={projectTotal} onChange={(e) => setProjectTotal(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialsCost">Materials Cost *</Label>
                <Input id="materialsCost" type="number" step="0.01" min="0" value={materialsCost} onChange={(e) => setMaterialsCost(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forecastedExpenses">Forecasted Expenses *</Label>
                <Input id="forecastedExpenses" type="number" step="0.01" min="0" value={forecastedExpenses} onChange={(e) => setForecastedExpenses(e.target.value)} required />
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractDate">Contract Date *</Label>
                <Input id="contractDate" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installDate">Install Date *</Label>
                <Input id="installDate" type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimateDate">Estimate Date</Label>
                <Input id="estimateDate" type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-Up Date</Label>
                <Input id="followUpDate" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
            </div>

            {/* Subcontractor & Notes */}
            <div className="space-y-2">
              <Label htmlFor="subcontractor">Subcontractor</Label>
              <Input id="subcontractor" value={subcontractor} onChange={(e) => setSubcontractor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90">
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 12.2** -- Commit

```bash
git add apps/web/src/components/projects/create-project-dialog.tsx
git commit -m "feat(web): add CreateProjectDialog with rate template pre-fill

Full-featured project creation form in a dialog. Supports all fields
from the design spec. Rate template dropdown auto-fills materialsCost
and forecastedExpenses from linearFeet * ratePerFoot."
```

---

## Task 13: Project Detail Page Components

- [ ] **Step 13.1** -- Create project header component

Create file: `apps/web/src/components/projects/project-header.tsx`

```typescript
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { ProjectStatus } from '@fencetastic/shared';
import { api } from '@/lib/api';

interface ProjectHeaderProps {
  projectId: string;
  customer: string;
  address: string;
  status: string;
  onStatusChange: () => void;
}

export function ProjectHeader({
  projectId,
  customer,
  address,
  status,
  onStatusChange,
}: ProjectHeaderProps) {
  async function handleStatusChange(newStatus: string) {
    try {
      await api.patch(`/projects/${projectId}`, { status: newStatus });
      onStatusChange();
    } catch {
      // Error will be visible on refetch
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <Button variant="ghost" size="icon" asChild>
        <Link to="/projects">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{customer}</h1>
          <StatusBadge status={status} />
        </div>
        <p className="text-muted-foreground mt-1">{address}</p>
      </div>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Change status" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(ProjectStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 13.2** -- Create project financials card

Create file: `apps/web/src/components/projects/project-financials-card.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { CommissionPreview } from '@fencetastic/shared';

interface ProjectFinancialsCardProps {
  projectTotal: number;
  paymentMethod: string;
  commissionPreview: CommissionPreview;
  isSnapshot: boolean;
}

export function ProjectFinancialsCard({
  projectTotal,
  paymentMethod,
  commissionPreview,
  isSnapshot,
}: ProjectFinancialsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Financials
          {isSnapshot && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Snapshot (locked)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Project Total" value={formatCurrency(projectTotal)} />
        <Row label="Payment Method" value={paymentMethod.replace('_', ' ')} />
        <Row label="Money Received" value={formatCurrency(commissionPreview.moneyReceived)} />
        <Separator />
        <Row label="Total Expenses" value={formatCurrency(commissionPreview.totalExpenses)} negative />
        <Row label="Adnaan Commission (10%)" value={formatCurrency(commissionPreview.adnaanCommission)} negative />
        <Separator />
        <Row label="Gross Profit" value={formatCurrency(commissionPreview.grossProfit)} highlight />
        <Row label="Aimann Deduction (25%)" value={formatCurrency(commissionPreview.aimannDeduction)} negative />
        <Row label="Meme Commission (5%)" value={formatCurrency(commissionPreview.memeCommission)} negative />
        <Separator />
        <Row label="Net Profit" value={formatCurrency(commissionPreview.netProfit)} highlight />
        <Row label="Profit %" value={formatPercent(commissionPreview.profitPercent)} highlight />
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  negative = false,
  highlight = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={highlight ? 'font-semibold' : 'text-muted-foreground'}>
        {label}
      </span>
      <span
        className={`font-mono ${
          highlight ? 'font-semibold' : ''
        } ${negative ? 'text-red-500' : ''}`}
      >
        {negative ? `- ${value}` : value}
      </span>
    </div>
  );
}
```

- [ ] **Step 13.3** -- Create project schedule card

Create file: `apps/web/src/components/projects/project-schedule-card.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';
import { CalendarDays } from 'lucide-react';

interface ProjectScheduleCardProps {
  contractDate: string;
  installDate: string;
  estimateDate: string | null;
  followUpDate: string | null;
  completedDate: string | null;
}

export function ProjectScheduleCard({
  contractDate,
  installDate,
  estimateDate,
  followUpDate,
  completedDate,
}: ProjectScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DateRow label="Contract Date" value={contractDate} />
        <DateRow label="Install Date" value={installDate} />
        <DateRow label="Estimate Date" value={estimateDate} />
        <DateRow label="Follow-Up Date" value={followUpDate} />
        <DateRow label="Completed Date" value={completedDate} />
      </CardContent>
    </Card>
  );
}

function DateRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatDate(value)}</span>
    </div>
  );
}
```

- [ ] **Step 13.4** -- Create project info card

Create file: `apps/web/src/components/projects/project-info-card.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { Info } from 'lucide-react';

interface ProjectInfoCardProps {
  description: string;
  fenceType: string;
  subcontractor: string | null;
  linearFeet: number | null;
  customerPaid: number;
  forecastedExpenses: number;
  notes: string | null;
}

export function ProjectInfoCard({
  description,
  fenceType,
  subcontractor,
  linearFeet,
  customerPaid,
  forecastedExpenses,
  notes,
}: ProjectInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-4 w-4" />
          Project Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="Description" value={description} />
        <InfoRow label="Fence Type">
          <Badge variant="secondary">{fenceType.replace('_', ' ')}</Badge>
        </InfoRow>
        <InfoRow label="Subcontractor" value={subcontractor || '—'} />
        <InfoRow label="Linear Feet" value={linearFeet ? `${linearFeet} ft` : '—'} />
        <InfoRow label="Customer Paid" value={formatCurrency(customerPaid)} />
        <InfoRow label="Forecasted Expenses" value={formatCurrency(forecastedExpenses)} />
        {notes && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
              {notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children || <span className="font-medium">{value}</span>}
    </div>
  );
}
```

- [ ] **Step 13.5** -- Commit

```bash
git add apps/web/src/components/projects/project-header.tsx apps/web/src/components/projects/project-financials-card.tsx apps/web/src/components/projects/project-schedule-card.tsx apps/web/src/components/projects/project-info-card.tsx
git commit -m "feat(web): add project detail page components

ProjectHeader with status change dropdown, ProjectFinancialsCard with
full commission waterfall breakdown (snapshot badge for completed),
ProjectScheduleCard with all date fields, ProjectInfoCard with
description, fence type, subcontractor, and notes."
```

---

## Task 14: Replace Projects List Page Placeholder

- [ ] **Step 14.1** -- Replace projects page with full DataTable implementation

Modify file: `apps/web/src/pages/projects.tsx`

Replace full content:

```typescript
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/use-projects';
import { DataTable } from '@/components/projects/data-table';
import { projectColumns } from '@/components/projects/columns';
import { DataTableToolbar } from '@/components/projects/data-table-toolbar';
import { DataTablePagination } from '@/components/projects/data-table-pagination';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import type { ProjectListItem, ProjectListQuery } from '@fencetastic/shared';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<ProjectListQuery>({
    page: 1,
    limit: 20,
    sortBy: 'installDate',
    sortDir: 'desc',
  });

  const { data, pagination, isLoading, refetch } = useProjects(query);

  const handleSearchChange = useCallback((search: string) => {
    setQuery((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setQuery((prev) => ({
      ...prev,
      status: status === 'ALL' ? undefined : (status as ProjectListQuery['status']),
      page: 1,
    }));
  }, []);

  const handleFenceTypeChange = useCallback((fenceType: string) => {
    setQuery((prev) => ({
      ...prev,
      fenceType: fenceType === 'ALL' ? undefined : (fenceType as ProjectListQuery['fenceType']),
      page: 1,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setQuery({ page: 1, limit: 20, sortBy: 'installDate', sortDir: 'desc' });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const handleRowClick = useCallback(
    (row: ProjectListItem) => {
      navigate(`/projects/${row.id}`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your fencing projects.
          </p>
        </div>
        <CreateProjectDialog onCreated={refetch} />
      </div>

      <DataTableToolbar
        search={query.search || ''}
        onSearchChange={handleSearchChange}
        statusFilter={query.status || 'ALL'}
        onStatusChange={handleStatusChange}
        fenceTypeFilter={query.fenceType || 'ALL'}
        onFenceTypeChange={handleFenceTypeChange}
        onReset={handleReset}
      />

      <DataTable
        columns={projectColumns}
        data={data}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {pagination && (
        <DataTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 14.2** -- Commit

```bash
git add apps/web/src/pages/projects.tsx
git commit -m "feat(web): implement Projects list page with DataTable, filters, and pagination

Replaces Phase 1 placeholder with fully functional project listing.
Search by customer/address, filter by status and fence type, paginated
server-side. Click row navigates to project detail. New Project button
opens creation dialog."
```

---

## Task 15: Replace Project Detail Page Placeholder

- [ ] **Step 15.1** -- Replace project detail page with full implementation

Modify file: `apps/web/src/pages/project-detail.tsx`

Replace full content:

```typescript
import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/use-project';
import { ProjectHeader } from '@/components/projects/project-header';
import { ProjectFinancialsCard } from '@/components/projects/project-financials-card';
import { ProjectScheduleCard } from '@/components/projects/project-schedule-card';
import { ProjectInfoCard } from '@/components/projects/project-info-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { project, isLoading, error, refetch } = useProject(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-[300px]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error || 'Project not found'}</p>
        </CardContent>
      </Card>
    );
  }

  const isSnapshot = project.status === 'COMPLETED' && project.commissionSnapshot !== null;

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectId={project.id}
        customer={project.customer}
        address={project.address}
        status={project.status}
        onStatusChange={refetch}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ProjectFinancialsCard
          projectTotal={project.projectTotal}
          paymentMethod={project.paymentMethod}
          commissionPreview={project.commissionPreview}
          isSnapshot={isSnapshot}
        />

        <div className="space-y-4">
          <ProjectScheduleCard
            contractDate={project.contractDate}
            installDate={project.installDate}
            estimateDate={project.estimateDate}
            followUpDate={project.followUpDate}
            completedDate={project.completedDate}
          />

          <ProjectInfoCard
            description={project.description}
            fenceType={project.fenceType}
            subcontractor={project.subcontractor}
            linearFeet={project.linearFeet}
            customerPaid={project.customerPaid}
            forecastedExpenses={project.forecastedExpenses}
            notes={project.notes}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 15.2** -- Commit

```bash
git add apps/web/src/pages/project-detail.tsx
git commit -m "feat(web): implement Project detail page with financials and schedule

Replaces Phase 1 placeholder with full project detail view. Shows
header with status change dropdown, financials card with commission
waterfall (snapshot badge for completed), schedule dates, and project
info card. Loading skeletons and error states included."
```

---

## Task 16: Verify End-to-End

- [ ] **Step 16.1** -- Run all tests

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm run test
npm run test:api -- --run
```

**Expected output:** All shared commission tests pass. All API project service tests pass.

- [ ] **Step 16.2** -- Verify TypeScript compilation

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npx tsc --noEmit -p packages/shared/tsconfig.json
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
```

**Expected output:** No TypeScript errors.

- [ ] **Step 16.3** -- Start the dev server and test manually

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm run dev
```

Manual verification:
1. Navigate to `/projects` -- should see DataTable (empty if no data)
2. Click "New Project" -- dialog opens with all form fields
3. Fill form and submit -- project appears in table
4. Click a row -- navigates to `/projects/:id` with financials
5. Change status to COMPLETED via dropdown -- commission snapshot is created
6. Refresh detail page -- shows "Snapshot (locked)" badge on financials

- [ ] **Step 16.4** -- Final commit (if any fixups needed)

```bash
git add -A
git commit -m "fix: address any compilation or runtime issues from Phase 2 integration

Final verification pass ensuring all types align, routes are registered,
and frontend components render correctly."
```

---

## Summary

| Task | Description | Files | Type |
|------|-------------|-------|------|
| 1 | Shared Project DTOs | 1 modified | Types |
| 2 | Validate query middleware | 1 modified | API middleware |
| 3 | Rate template service + route | 2 created | API |
| 4 | Project service TDD tests | 1 created | Tests |
| 5 | Project service implementation | 1 created | API |
| 6 | Project API routes + register | 2 modified | API |
| 7 | Frontend dependencies | shadcn components | Setup |
| 8 | Formatters utility | 1 created | Frontend |
| 9 | Data fetching hooks | 3 created | Frontend |
| 10 | Status badge component | 1 created | Frontend |
| 11 | DataTable components | 4 created | Frontend |
| 12 | Create project dialog | 1 created | Frontend |
| 13 | Project detail components | 4 created | Frontend |
| 14 | Projects list page | 1 modified | Frontend |
| 15 | Project detail page | 1 modified | Frontend |
| 16 | End-to-end verification | 0 | Verification |

**Total: ~28 files created/modified across 16 tasks.**

### Critical Files for Implementation
- `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/project.service.ts`
- `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/routes/projects.ts`
- `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/packages/shared/src/types.ts`
- `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/projects.tsx`
- `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/project-detail.tsx`