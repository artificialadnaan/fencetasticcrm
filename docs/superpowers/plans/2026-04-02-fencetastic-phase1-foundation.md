# Fencetastic Dashboard — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the monorepo, implement auth, commission logic, Prisma schema, and the React app shell with dark sidebar layout.

**Architecture:** Monorepo with npm workspaces. apps/api (Express + Prisma), apps/web (Vite + React + Tailwind + shadcn/ui), packages/shared (types + commission math). JWT auth with httpOnly cookies.

**Tech Stack:** TypeScript, React 18, Vite, Tailwind CSS, shadcn/ui, Express, Prisma, PostgreSQL, bcrypt, jsonwebtoken

**Phases:** This is Phase 1 of 8. Subsequent phases will be separate plans.

---

## File Map

All files created in this phase with their responsibilities:

```
FencetasticCRM/
├── package.json                          # Workspace root with npm workspaces config
├── tsconfig.base.json                    # Shared TypeScript config
├── .gitignore                            # Node, Prisma, env, dist ignores
├── .env.example                          # Template for environment variables
├── packages/
│   └── shared/
│       ├── package.json                  # Package config with main/types exports
│       ├── tsconfig.json                 # Extends base tsconfig
│       ├── src/
│       │   ├── index.ts                  # Barrel export
│       │   ├── types.ts                  # All TypeScript interfaces and enums
│       │   ├── constants.ts              # Commission rates, CC fee, etc.
│       │   └── commission.ts             # Commission waterfall calculation
│       └── __tests__/
│           └── commission.test.ts        # TDD tests for commission waterfall
├── apps/
│   ├── api/
│   │   ├── package.json                  # API dependencies
│   │   ├── tsconfig.json                 # API TypeScript config
│   │   ├── prisma/
│   │   │   └── schema.prisma             # Full database schema
│   │   └── src/
│   │       ├── index.ts                  # Express server entry point
│   │       ├── middleware/
│   │       │   ├── auth.ts               # JWT authentication middleware
│   │       │   ├── error-handler.ts      # Global error handling middleware
│   │       │   └── validate.ts           # Request validation middleware
│   │       ├── routes/
│   │       │   └── auth.ts               # Auth routes (login, logout, me, password)
│   │       ├── services/
│   │       │   └── auth.service.ts       # Auth business logic
│   │       ├── lib/
│   │       │   ├── prisma.ts             # Prisma client singleton
│   │       │   └── jwt.ts               # JWT sign/verify helpers
│   │       └── scripts/
│   │           └── seed-users.ts         # Seed Adnaan + Meme accounts
│   └── web/
│       ├── package.json                  # Web dependencies
│       ├── tsconfig.json                 # Web TypeScript config
│       ├── tsconfig.node.json            # Vite node config
│       ├── vite.config.ts                # Vite configuration
│       ├── tailwind.config.ts            # Tailwind configuration
│       ├── postcss.config.js             # PostCSS config for Tailwind
│       ├── index.html                    # HTML entry point
│       ├── components.json               # shadcn/ui configuration
│       └── src/
│           ├── main.tsx                  # React entry point
│           ├── App.tsx                   # Router setup
│           ├── index.css                 # Tailwind imports + custom styles
│           ├── lib/
│           │   ├── api.ts               # Axios API client with credentials
│           │   ├── utils.ts             # shadcn/ui cn() utility
│           │   └── auth-context.tsx      # Auth context provider
│           ├── components/
│           │   ├── ui/                   # shadcn/ui components (auto-generated)
│           │   │   ├── button.tsx
│           │   │   ├── input.tsx
│           │   │   ├── card.tsx
│           │   │   ├── badge.tsx
│           │   │   ├── label.tsx
│           │   │   ├── separator.tsx
│           │   │   ├── avatar.tsx
│           │   │   ├── dropdown-menu.tsx
│           │   │   ├── sheet.tsx
│           │   │   └── tooltip.tsx
│           │   └── layout/
│           │       ├── sidebar.tsx        # Dark sidebar with brand gradient
│           │       ├── app-layout.tsx     # Layout wrapper with sidebar + content
│           │       └── protected-route.tsx # Auth guard component
│           └── pages/
│               ├── login.tsx             # Login page
│               ├── dashboard.tsx         # Dashboard placeholder
│               ├── projects.tsx          # Projects list placeholder
│               ├── project-detail.tsx    # Project detail placeholder
│               ├── calendar.tsx          # Calendar placeholder
│               ├── commissions.tsx       # Commissions placeholder
│               ├── reports.tsx           # Reports placeholder
│               └── settings.tsx          # Settings placeholder
```

---

## Task 1: Initialize Monorepo Root

- [ ] **Step 1.1** — Create root `package.json` with npm workspaces

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
```

Create file: `package.json`

```json
{
  "name": "fencetastic-crm",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev:api": "npm run dev -w apps/api",
    "dev:web": "npm run dev -w apps/web",
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "build": "npm run build -w packages/shared && npm run build -w apps/api && npm run build -w apps/web",
    "test": "npm run test -w packages/shared",
    "test:api": "npm run test -w apps/api",
    "lint": "echo 'lint placeholder'"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 1.2** — Create root `tsconfig.base.json`

Create file: `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

- [ ] **Step 1.3** — Create `.gitignore`

Create file: `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build output
dist/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Prisma
apps/api/prisma/migrations/

# Vite
apps/web/dist/

# Logs
*.log
npm-debug.log*
```

- [ ] **Step 1.4** — Create `.env.example`

Create file: `.env.example`

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/fencetastic?schema=public"

# Auth
JWT_SECRET="change-me-to-a-random-64-char-string"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"

# API Port
PORT=3001

# Cloudflare R2 (Phase 5)
# R2_ACCOUNT_ID=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=
```

- [ ] **Step 1.5** — Create directory structure

```bash
mkdir -p packages/shared/src packages/shared/__tests__
mkdir -p apps/api/src/{routes,services,middleware,lib,scripts} apps/api/prisma
mkdir -p apps/web/src/{pages,components/{ui,layout},lib,hooks}
```

- [ ] **Step 1.6** — Commit

```bash
git init
git add -A
git commit -m "chore: initialize monorepo with npm workspaces

Scaffold root package.json with workspaces config, base tsconfig,
gitignore, and directory structure for apps/api, apps/web, and
packages/shared."
```

**Expected output:** Clean commit with 4 files.

---

## Task 2: Shared Package — Types, Constants, Barrel Export

- [ ] **Step 2.1** — Create `packages/shared/package.json`

Create file: `packages/shared/package.json`

```json
{
  "name": "@fencetastic/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2.2** — Create `packages/shared/tsconfig.json`

Create file: `packages/shared/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "__tests__/**/*"]
}
```

- [ ] **Step 2.3** — Create `packages/shared/src/types.ts`

Create file: `packages/shared/src/types.ts`

```typescript
// ============================================================
// Fencetastic Shared Types
// All enums, interfaces, and DTOs used across API and Web
// ============================================================

// --- Enums ---

export enum FenceType {
  WOOD = 'WOOD',
  METAL = 'METAL',
  CHAIN_LINK = 'CHAIN_LINK',
  VINYL = 'VINYL',
  GATE = 'GATE',
  OTHER = 'OTHER',
}

export enum ProjectStatus {
  ESTIMATE = 'ESTIMATE',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
}

export enum ExpenseFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

// --- Domain Models ---

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  customer: string;
  address: string;
  description: string;
  fenceType: FenceType;
  status: ProjectStatus;
  projectTotal: number;
  paymentMethod: PaymentMethod;
  moneyReceived: number;
  customerPaid: number;
  forecastedExpenses: number;
  materialsCost: number;
  contractDate: string;
  installDate: string;
  completedDate: string | null;
  estimateDate: string | null;
  followUpDate: string | null;
  linearFeet: number | null;
  rateTemplateId: string | null;
  subcontractor: string | null;
  notes: string | null;
  createdById: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractorPayment {
  id: string;
  projectId: string;
  subcontractorName: string;
  amountOwed: number;
  amountPaid: number;
  datePaid: string | null;
  notes: string | null;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  authorId: string;
  content: string;
  photoUrls: string[];
  createdAt: string;
}

export interface RateTemplate {
  id: string;
  fenceType: FenceType;
  name: string;
  ratePerFoot: number;
  laborRatePerFoot: number;
  description: string | null;
  isActive: boolean;
}

export interface AimannDebtLedgerEntry {
  id: string;
  projectId: string | null;
  amount: number;
  runningBalance: number;
  note: string;
  date: string;
}

export interface CommissionSnapshot {
  id: string;
  projectId: string;
  moneyReceived: number;
  totalExpenses: number;
  adnaanCommission: number;
  memeCommission: number;
  grossProfit: number;
  aimannDeduction: number;
  debtBalanceBefore: number;
  debtBalanceAfter: number;
  netProfit: number;
  settledAt: string;
}

export interface OperatingExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: ExpenseFrequency;
  isActive: boolean;
}

// --- Commission Calculation Types ---

export interface CommissionInput {
  projectTotal: number;
  paymentMethod: PaymentMethod;
  materialsCost: number;
  subOwedTotal: number;
  aimannDebtBalance: number;
}

export interface CommissionBreakdown {
  moneyReceived: number;
  totalExpenses: number;
  adnaanCommission: number;
  memeCommission: number;
  grossProfit: number;
  aimannDeduction: number;
  netProfit: number;
}

// --- Auth Types ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// --- API Response Types ---

export interface ApiError {
  message: string;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
}
```

- [ ] **Step 2.4** — Create `packages/shared/src/constants.ts`

Create file: `packages/shared/src/constants.ts`

```typescript
// ============================================================
// Fencetastic Shared Constants
// Commission rates, fees, and business rules
// ============================================================

/** Credit card processing fee percentage (3%) — customer pays via CC, we receive 97% */
export const CC_FEE_RATE = 0.03;

/** Adnaan's commission rate — 10% of project total */
export const ADNAAN_COMMISSION_RATE = 0.10;

/** Meme's commission rate — 5% of project total */
export const MEME_COMMISSION_RATE = 0.05;

/** Aimann's debt deduction rate — 25% of gross profit when debt exists */
export const AIMANN_DEDUCTION_RATE = 0.25;

/** Initial Aimann debt balance from Payout sheet */
export const AIMANN_INITIAL_DEBT = 5988.41;

/** JWT token expiry duration */
export const JWT_EXPIRY = '7d';

/** Polling interval for frontend data refresh (milliseconds) */
export const POLLING_INTERVAL_MS = 30_000;

/** Status badge color mapping */
export const STATUS_COLORS: Record<string, string> = {
  ESTIMATE: 'gray',
  OPEN: 'amber',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
} as const;

/** Sidebar navigation items */
export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Projects', path: '/projects', icon: 'FolderOpen' },
  { label: 'Calendar', path: '/calendar', icon: 'Calendar' },
  { label: 'Commissions', path: '/commissions', icon: 'DollarSign' },
  { label: 'Reports', path: '/reports', icon: 'BarChart3' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;
```

- [ ] **Step 2.5** — Create barrel export `packages/shared/src/index.ts`

Create file: `packages/shared/src/index.ts`

```typescript
export * from './types';
export * from './constants';
export * from './commission';
```

- [ ] **Step 2.6** — Commit

```bash
git add packages/shared/package.json packages/shared/tsconfig.json packages/shared/src/types.ts packages/shared/src/constants.ts packages/shared/src/index.ts
git commit -m "feat(shared): add TypeScript types, enums, and constants

Define all domain models (User, Project, SubcontractorPayment, etc.),
enums (FenceType, ProjectStatus, PaymentMethod, ExpenseFrequency),
commission calculation types, and business constants (rates, fees)."
```

**Expected output:** Clean commit. Note: `index.ts` exports `./commission` which does not exist yet — this is intentional; we write tests first (TDD).

---

## Task 3: Commission Waterfall — TDD

- [ ] **Step 3.1** — Write commission tests FIRST (TDD red phase)

Create file: `packages/shared/__tests__/commission.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateCommission } from '../src/commission';
import { PaymentMethod } from '../src/types';

describe('calculateCommission', () => {
  it('calculates correctly for a cash project with positive profit', () => {
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 2000,
      subOwedTotal: 1500,
      aimannDebtBalance: 5000,
    });

    // Step 1: moneyReceived = 10000 (cash, no CC fee)
    expect(result.moneyReceived).toBe(10000);

    // Step 2: totalExpenses = 2000 + 1500 = 3500
    expect(result.totalExpenses).toBe(3500);

    // Step 3: adnaanCommission = 10000 * 0.10 = 1000
    expect(result.adnaanCommission).toBe(1000);

    // Step 3: memeCommission = 10000 * 0.05 = 500
    expect(result.memeCommission).toBe(500);

    // Step 4: grossProfit = 10000 - 3500 - 1000 = 5500
    expect(result.grossProfit).toBe(5500);

    // Step 5: aimannDeduction = max(5500, 0) * 0.25 = 1375
    expect(result.aimannDeduction).toBe(1375);

    // Step 6: netProfit = 5500 - 1375 - 500 = 3625
    expect(result.netProfit).toBe(3625);
  });

  it('applies 3% CC fee for credit card payments', () => {
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      materialsCost: 2000,
      subOwedTotal: 1500,
      aimannDebtBalance: 5000,
    });

    // Step 1: moneyReceived = 10000 * 0.97 = 9700
    expect(result.moneyReceived).toBe(9700);

    // Step 2: totalExpenses = 3500 (same)
    expect(result.totalExpenses).toBe(3500);

    // Step 3: commissions based on projectTotal, not moneyReceived
    expect(result.adnaanCommission).toBe(1000);
    expect(result.memeCommission).toBe(500);

    // Step 4: grossProfit = 9700 - 3500 - 1000 = 5200
    expect(result.grossProfit).toBe(5200);

    // Step 5: aimannDeduction = 5200 * 0.25 = 1300
    expect(result.aimannDeduction).toBe(1300);

    // Step 6: netProfit = 5200 - 1300 - 500 = 3400
    expect(result.netProfit).toBe(3400);
  });

  it('applies no CC fee for check payments', () => {
    const result = calculateCommission({
      projectTotal: 5000,
      paymentMethod: PaymentMethod.CHECK,
      materialsCost: 1000,
      subOwedTotal: 500,
      aimannDebtBalance: 1000,
    });

    expect(result.moneyReceived).toBe(5000);
  });

  it('sets aimannDeduction to 0 when debt balance is zero', () => {
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 2000,
      subOwedTotal: 1500,
      aimannDebtBalance: 0,
    });

    expect(result.aimannDeduction).toBe(0);

    // netProfit = grossProfit - 0 - memeCommission
    // grossProfit = 10000 - 3500 - 1000 = 5500
    // netProfit = 5500 - 0 - 500 = 5000
    expect(result.netProfit).toBe(5000);
  });

  it('guards aimannDeduction to 0 when grossProfit is negative', () => {
    // Expenses exceed revenue — grossProfit will be negative
    const result = calculateCommission({
      projectTotal: 5000,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      materialsCost: 4000,
      subOwedTotal: 2000,
      aimannDebtBalance: 5000,
    });

    // moneyReceived = 5000 * 0.97 = 4850
    expect(result.moneyReceived).toBe(4850);

    // totalExpenses = 4000 + 2000 = 6000
    expect(result.totalExpenses).toBe(6000);

    // adnaanCommission = 5000 * 0.10 = 500
    expect(result.adnaanCommission).toBe(500);

    // grossProfit = 4850 - 6000 - 500 = -1650
    expect(result.grossProfit).toBe(-1650);

    // aimannDeduction = max(-1650, 0) * 0.25 = 0 (guarded)
    expect(result.aimannDeduction).toBe(0);

    // memeCommission = 5000 * 0.05 = 250
    expect(result.memeCommission).toBe(250);

    // netProfit = -1650 - 0 - 250 = -1900
    expect(result.netProfit).toBe(-1900);
  });

  it('handles zero subcontractor costs', () => {
    const result = calculateCommission({
      projectTotal: 8000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 1500,
      subOwedTotal: 0,
      aimannDebtBalance: 3000,
    });

    expect(result.totalExpenses).toBe(1500);

    // grossProfit = 8000 - 1500 - 800 = 5700
    expect(result.grossProfit).toBe(5700);

    // aimannDeduction = 5700 * 0.25 = 1425
    expect(result.aimannDeduction).toBe(1425);

    // netProfit = 5700 - 1425 - 400 = 3875
    expect(result.netProfit).toBe(3875);
  });

  it('handles zero materials cost', () => {
    const result = calculateCommission({
      projectTotal: 3000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 0,
      subOwedTotal: 500,
      aimannDebtBalance: 0,
    });

    expect(result.totalExpenses).toBe(500);
    expect(result.aimannDeduction).toBe(0);

    // grossProfit = 3000 - 500 - 300 = 2200
    expect(result.grossProfit).toBe(2200);

    // netProfit = 2200 - 0 - 150 = 2050
    expect(result.netProfit).toBe(2050);
  });

  it('rounds all monetary values to 2 decimal places', () => {
    const result = calculateCommission({
      projectTotal: 3333,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      materialsCost: 1111,
      subOwedTotal: 222,
      aimannDebtBalance: 1000,
    });

    // moneyReceived = 3333 * 0.97 = 3233.01
    expect(result.moneyReceived).toBe(3233.01);

    // adnaanCommission = 3333 * 0.10 = 333.30
    expect(result.adnaanCommission).toBe(333.3);

    // memeCommission = 3333 * 0.05 = 166.65
    expect(result.memeCommission).toBe(166.65);

    // totalExpenses = 1111 + 222 = 1333
    expect(result.totalExpenses).toBe(1333);

    // grossProfit = 3233.01 - 1333 - 333.30 = 1566.71
    expect(result.grossProfit).toBe(1566.71);

    // aimannDeduction = 1566.71 * 0.25 = 391.68 (rounded)
    expect(result.aimannDeduction).toBe(391.68);

    // netProfit = 1566.71 - 391.68 - 166.65 = 1008.38
    expect(result.netProfit).toBe(1008.38);
  });

  it('handles a very small project', () => {
    const result = calculateCommission({
      projectTotal: 100,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 50,
      subOwedTotal: 0,
      aimannDebtBalance: 100,
    });

    expect(result.moneyReceived).toBe(100);
    expect(result.adnaanCommission).toBe(10);
    expect(result.memeCommission).toBe(5);
    expect(result.grossProfit).toBe(40); // 100 - 50 - 10
    expect(result.aimannDeduction).toBe(10); // 40 * 0.25
    expect(result.netProfit).toBe(25); // 40 - 10 - 5
  });

  it('handles negative debt balance gracefully (overpaid)', () => {
    // If debt is negative (overpaid), treat as no debt
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 2000,
      subOwedTotal: 1000,
      aimannDebtBalance: -500,
    });

    // Debt balance <= 0 means no deduction
    expect(result.aimannDeduction).toBe(0);
  });
});
```

- [ ] **Step 3.2** — Run tests (expect failure — red phase)

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm install
npx vitest run --config packages/shared/vitest.config.ts 2>&1 || echo "EXPECTED: Tests fail because commission.ts does not exist yet"
```

Note: vitest needs a config. We can run it from the shared package directly:

```bash
cd packages/shared && npx vitest run 2>&1 || echo "EXPECTED FAILURE - TDD red phase"
```

- [ ] **Step 3.3** — Implement commission waterfall (TDD green phase)

Create file: `packages/shared/src/commission.ts`

```typescript
import {
  type CommissionInput,
  type CommissionBreakdown,
  PaymentMethod,
} from './types';
import {
  CC_FEE_RATE,
  ADNAAN_COMMISSION_RATE,
  MEME_COMMISSION_RATE,
  AIMANN_DEDUCTION_RATE,
} from './constants';

/**
 * Round a number to 2 decimal places using "round half-up" strategy.
 * This matches standard financial rounding.
 */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate the full commission waterfall for a project.
 *
 * This function is shared between API (for persistence/reports)
 * and frontend (for live preview calculations).
 *
 * Calculation order:
 * 1. Money Received (apply CC fee if credit card)
 * 2. Total Expenses (materials + subcontractor owed)
 * 3. Commissions (Adnaan 10%, Meme 5% — based on projectTotal)
 * 4. Gross Profit (moneyReceived - totalExpenses - adnaanCommission)
 * 5. Aimann Deduction (25% of max(grossProfit, 0) if debt > 0)
 * 6. Net Profit (grossProfit - aimannDeduction - memeCommission)
 */
export function calculateCommission(input: CommissionInput): CommissionBreakdown {
  const {
    projectTotal,
    paymentMethod,
    materialsCost,
    subOwedTotal,
    aimannDebtBalance,
  } = input;

  // Step 1: Money Received
  const moneyReceived = roundMoney(
    paymentMethod === PaymentMethod.CREDIT_CARD
      ? projectTotal * (1 - CC_FEE_RATE)
      : projectTotal
  );

  // Step 2: Total Expenses
  const totalExpenses = roundMoney(materialsCost + subOwedTotal);

  // Step 3: Commissions (based on projectTotal, not moneyReceived)
  const adnaanCommission = roundMoney(projectTotal * ADNAAN_COMMISSION_RATE);
  const memeCommission = roundMoney(projectTotal * MEME_COMMISSION_RATE);

  // Step 4: Gross Profit
  const grossProfit = roundMoney(moneyReceived - totalExpenses - adnaanCommission);

  // Step 5: Aimann Deduction
  // Only deduct if there is outstanding debt (balance > 0)
  // Guard: if grossProfit is negative, deduction is $0
  const aimannDeduction =
    aimannDebtBalance > 0
      ? roundMoney(Math.max(grossProfit, 0) * AIMANN_DEDUCTION_RATE)
      : 0;

  // Step 6: Net Profit
  const netProfit = roundMoney(grossProfit - aimannDeduction - memeCommission);

  return {
    moneyReceived,
    totalExpenses,
    adnaanCommission,
    memeCommission,
    grossProfit,
    aimannDeduction,
    netProfit,
  };
}
```

- [ ] **Step 3.4** — Run tests (expect all green)

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
cd packages/shared && npx vitest run
```

**Expected output:**

```
 ✓ __tests__/commission.test.ts (10 tests)

Test Files  1 passed (1)
Tests       10 passed (10)
```

- [ ] **Step 3.5** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add packages/shared/src/commission.ts packages/shared/__tests__/commission.test.ts
git commit -m "feat(shared): implement commission waterfall with TDD

Add calculateCommission() implementing the 6-step waterfall:
money received (CC fee), expenses, commissions (10%/5%), gross profit,
Aimann deduction (25% if debt > 0, guarded at 0 for negative profit),
and net profit. 10 passing tests cover all edge cases."
```

---

## Task 4: Prisma Schema

- [ ] **Step 4.1** — Create `apps/api/package.json`

Create file: `apps/api/package.json`

```json
{
  "name": "@fencetastic/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx src/scripts/seed-users.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fencetastic/shared": "*",
    "@prisma/client": "^5.14.0",
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.2",
    "prisma": "^5.14.0",
    "tsx": "^4.15.1",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 4.2** — Create `apps/api/tsconfig.json`

Create file: `apps/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4.3** — Create `apps/api/prisma/schema.prisma`

Create file: `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// User
// ============================================================
model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  projects     Project[]
  projectNotes ProjectNote[]

  @@map("users")
}

// ============================================================
// Project
// ============================================================
model Project {
  id                 String        @id @default(uuid()) @db.Uuid
  customer           String
  address            String
  description        String
  fenceType          FenceType     @map("fence_type")
  status             ProjectStatus @default(ESTIMATE)
  projectTotal       Decimal       @map("project_total") @db.Decimal(10, 2)
  paymentMethod      PaymentMethod @map("payment_method")
  moneyReceived      Decimal       @map("money_received") @db.Decimal(10, 2)
  customerPaid       Decimal       @default(0) @map("customer_paid") @db.Decimal(10, 2)
  forecastedExpenses Decimal       @map("forecasted_expenses") @db.Decimal(10, 2)
  materialsCost      Decimal       @map("materials_cost") @db.Decimal(10, 2)
  contractDate       DateTime      @map("contract_date") @db.Date
  installDate        DateTime      @map("install_date") @db.Date
  completedDate      DateTime?     @map("completed_date") @db.Date
  estimateDate       DateTime?     @map("estimate_date") @db.Date
  followUpDate       DateTime?     @map("follow_up_date") @db.Date
  linearFeet         Decimal?      @map("linear_feet") @db.Decimal(10, 2)
  rateTemplateId     String?       @map("rate_template_id") @db.Uuid
  subcontractor      String?
  notes              String?       @db.Text
  createdById        String        @map("created_by_id") @db.Uuid
  isDeleted          Boolean       @default(false) @map("is_deleted")
  deletedAt          DateTime?     @map("deleted_at") @db.Timestamptz
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  createdBy              User                  @relation(fields: [createdById], references: [id])
  rateTemplate           RateTemplate?         @relation(fields: [rateTemplateId], references: [id])
  subcontractorPayments  SubcontractorPayment[]
  projectNotes           ProjectNote[]
  commissionSnapshot     CommissionSnapshot?
  aimannDebtLedgerEntries AimannDebtLedger[]

  @@map("projects")
}

// ============================================================
// SubcontractorPayment
// ============================================================
model SubcontractorPayment {
  id                String   @id @default(uuid()) @db.Uuid
  projectId         String   @map("project_id") @db.Uuid
  subcontractorName String   @map("subcontractor_name")
  amountOwed        Decimal  @map("amount_owed") @db.Decimal(10, 2)
  amountPaid        Decimal  @default(0) @map("amount_paid") @db.Decimal(10, 2)
  datePaid          DateTime? @map("date_paid") @db.Date
  notes             String?

  // Relations
  project Project @relation(fields: [projectId], references: [id])

  @@map("subcontractor_payments")
}

// ============================================================
// ProjectNote
// ============================================================
model ProjectNote {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @map("project_id") @db.Uuid
  authorId  String   @map("author_id") @db.Uuid
  content   String   @db.Text
  photoUrls String[] @map("photo_urls")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  project Project @relation(fields: [projectId], references: [id])
  author  User    @relation(fields: [authorId], references: [id])

  @@map("project_notes")
}

// ============================================================
// RateTemplate
// ============================================================
model RateTemplate {
  id               String    @id @default(uuid()) @db.Uuid
  fenceType        FenceType @map("fence_type")
  name             String
  ratePerFoot      Decimal   @map("rate_per_foot") @db.Decimal(10, 2)
  laborRatePerFoot Decimal   @map("labor_rate_per_foot") @db.Decimal(10, 2)
  description      String?
  isActive         Boolean   @default(true) @map("is_active")

  // Relations
  projects Project[]

  @@map("rate_templates")
}

// ============================================================
// AimannDebtLedger
// ============================================================
model AimannDebtLedger {
  id             String   @id @default(uuid()) @db.Uuid
  projectId      String?  @map("project_id") @db.Uuid
  amount         Decimal  @db.Decimal(10, 2)
  runningBalance Decimal  @map("running_balance") @db.Decimal(10, 2)
  note           String
  date           DateTime @db.Timestamptz

  // Relations
  project Project? @relation(fields: [projectId], references: [id])

  @@map("aimann_debt_ledger")
}

// ============================================================
// CommissionSnapshot
// ============================================================
model CommissionSnapshot {
  id                String   @id @default(uuid()) @db.Uuid
  projectId         String   @unique @map("project_id") @db.Uuid
  moneyReceived     Decimal  @map("money_received") @db.Decimal(10, 2)
  totalExpenses     Decimal  @map("total_expenses") @db.Decimal(10, 2)
  adnaanCommission  Decimal  @map("adnaan_commission") @db.Decimal(10, 2)
  memeCommission    Decimal  @map("meme_commission") @db.Decimal(10, 2)
  grossProfit       Decimal  @map("gross_profit") @db.Decimal(10, 2)
  aimannDeduction   Decimal  @map("aimann_deduction") @db.Decimal(10, 2)
  debtBalanceBefore Decimal  @map("debt_balance_before") @db.Decimal(10, 2)
  debtBalanceAfter  Decimal  @map("debt_balance_after") @db.Decimal(10, 2)
  netProfit         Decimal  @map("net_profit") @db.Decimal(10, 2)
  settledAt         DateTime @default(now()) @map("settled_at") @db.Timestamptz

  // Relations
  project Project @relation(fields: [projectId], references: [id])

  @@map("commission_snapshots")
}

// ============================================================
// OperatingExpense
// ============================================================
model OperatingExpense {
  id          String           @id @default(uuid()) @db.Uuid
  category    String
  description String
  amount      Decimal          @db.Decimal(10, 2)
  frequency   ExpenseFrequency
  isActive    Boolean          @default(true) @map("is_active")

  @@map("operating_expenses")
}

// ============================================================
// Enums
// ============================================================
enum FenceType {
  WOOD
  METAL
  CHAIN_LINK
  VINYL
  GATE
  OTHER
}

enum ProjectStatus {
  ESTIMATE
  OPEN
  IN_PROGRESS
  COMPLETED
}

enum PaymentMethod {
  CASH
  CHECK
  CREDIT_CARD
}

enum ExpenseFrequency {
  MONTHLY
  QUARTERLY
  ANNUAL
}
```

- [ ] **Step 4.4** — Install dependencies and generate Prisma client

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm install
cd apps/api && npx prisma generate
```

**Expected output:** Prisma Client generated successfully.

- [ ] **Step 4.5** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/api/package.json apps/api/tsconfig.json apps/api/prisma/schema.prisma
git commit -m "feat(api): add Prisma schema with all tables

Define User, Project, SubcontractorPayment, ProjectNote, RateTemplate,
AimannDebtLedger, CommissionSnapshot, and OperatingExpense models with
proper relations, column mappings, and enum types."
```

---

## Task 5: Express API Server Scaffold

- [ ] **Step 5.1** — Create Prisma client singleton

Create file: `apps/api/src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5.2** — Create JWT helpers

Create file: `apps/api/src/lib/jwt.ts`

```typescript
import jwt from 'jsonwebtoken';
import { JWT_EXPIRY } from '@fencetastic/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
```

- [ ] **Step 5.3** — Create error handling middleware

Create file: `apps/api/src/middleware/error-handler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma known errors
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      message: 'Database error',
      code: 'DB_ERROR',
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      message: 'Invalid or expired token',
      code: 'AUTH_ERROR',
    });
    return;
  }

  // Fallback
  res.status(500).json({
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

- [ ] **Step 5.4** — Create request validation middleware

Create file: `apps/api/src/middleware/validate.ts`

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
```

- [ ] **Step 5.5** — Create Express server entry point

Create file: `apps/api/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- Middleware ---
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/auth', authRouter);

// --- Error handling (must be last) ---
app.use(errorHandler);

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Fencetastic API running on http://localhost:${PORT}`);
});

export default app;
```

- [ ] **Step 5.6** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/api/src/index.ts apps/api/src/lib/prisma.ts apps/api/src/lib/jwt.ts apps/api/src/middleware/error-handler.ts apps/api/src/middleware/validate.ts
git commit -m "feat(api): scaffold Express server with middleware

Add Express entry point with CORS (credentials), cookie-parser,
JSON parsing, health check endpoint, error handler (AppError,
Prisma, JWT errors), Zod validation middleware, Prisma singleton,
and JWT sign/verify helpers."
```

---

## Task 6: Auth Service + Routes

- [ ] **Step 6.1** — Create auth service

Create file: `apps/api/src/services/auth.service.ts`

```typescript
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { AppError } from '../middleware/error-handler';

const SALT_ROUNDS = 12;

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password', 'AUTH_FAILED');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError(401, 'Invalid email or password', 'AUTH_FAILED');
  }

  const token = signToken({ userId: user.id, email: user.email });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return user;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError(401, 'Current password is incorrect', 'WRONG_PASSWORD');
  }

  if (newPassword.length < 8) {
    throw new AppError(400, 'New password must be at least 8 characters', 'WEAK_PASSWORD');
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
```

- [ ] **Step 6.2** — Create auth middleware

Create file: `apps/api/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { AppError } from './error-handler';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw new AppError(401, 'Authentication required', 'NO_TOKEN');
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }
}
```

- [ ] **Step 6.3** — Create auth routes

Create file: `apps/api/src/routes/auth.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { loginUser, getUserById, changePassword } from '../services/auth.service';

export const authRouter = Router();

// --- Validation Schemas ---
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Cookie options for JWT token
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

// --- POST /api/auth/login ---
authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const { token, user } = await loginUser(email, password);

      res.cookie('token', token, COOKIE_OPTIONS);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }
);

// --- POST /api/auth/logout ---
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
    path: '/',
  });
  res.json({ data: { message: 'Logged out' } });
});

// --- GET /api/auth/me ---
authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getUserById(req.user!.userId);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }
);

// --- PATCH /api/auth/password ---
authRouter.patch(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await changePassword(req.user!.userId, currentPassword, newPassword);
      res.json({ data: { message: 'Password updated' } });
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 6.4** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/api/src/services/auth.service.ts apps/api/src/middleware/auth.ts apps/api/src/routes/auth.ts
git commit -m "feat(api): implement auth routes and middleware

Add POST /login (email+password, JWT in httpOnly cookie), POST /logout
(clear cookie), GET /me (current user), PATCH /password (change with
current password verification). Includes requireAuth middleware,
Zod validation, and auth service with bcrypt."
```

---

## Task 7: User Seed Script

- [ ] **Step 7.1** — Create seed script

Create file: `apps/api/src/scripts/seed-users.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

interface SeedUser {
  email: string;
  name: string;
  password: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'adnaan@fencetastic.com',
    name: 'Adnaan',
    password: 'Fencetastic2024!',
  },
  {
    email: 'meme@fencetastic.com',
    name: 'Meme',
    password: 'Fencetastic2024!',
  },
];

async function main() {
  console.log('🌱 Seeding users...\n');

  for (const user of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`  ⏭️  User ${user.email} already exists, skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

    const created = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash,
      },
    });

    console.log(`  ✅ Created user: ${created.name} (${created.email}) — id: ${created.id}`);
  }

  // Seed initial Aimann debt balance
  const existingDebt = await prisma.aimannDebtLedger.findFirst();
  if (!existingDebt) {
    await prisma.aimannDebtLedger.create({
      data: {
        amount: 5988.41,
        runningBalance: 5988.41,
        note: 'Initial balance from Payout sheet — old owner credit card debt',
        date: new Date('2024-01-01T00:00:00Z'),
      },
    });
    console.log('\n  ✅ Seeded initial Aimann debt balance: $5,988.41');
  } else {
    console.log('\n  ⏭️  Aimann debt ledger already has entries, skipping seed.');
  }

  console.log('\n🌱 Seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 7.2** — Test the seed script works (requires running database)

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api

# First, push the schema to the database
npx prisma db push

# Then run the seed
npx tsx src/scripts/seed-users.ts
```

**Expected output:**

```
🌱 Seeding users...

  ✅ Created user: Adnaan (adnaan@fencetastic.com) — id: <uuid>
  ✅ Created user: Meme (meme@fencetastic.com) — id: <uuid>

  ✅ Seeded initial Aimann debt balance: $5,988.41

🌱 Seed complete!
```

- [ ] **Step 7.3** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/api/src/scripts/seed-users.ts
git commit -m "feat(api): add user seed script with initial debt balance

Seed Adnaan and Meme user accounts with bcrypt-hashed passwords,
plus the initial Aimann debt ledger entry ($5,988.41). Script is
idempotent — skips existing records on re-run."
```

---

## Task 8: Vite + React + TypeScript + Tailwind Scaffold

- [ ] **Step 8.1** — Create `apps/web/package.json`

Create file: `apps/web/package.json`

```json
{
  "name": "@fencetastic/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@fencetastic/shared": "*",
    "axios": "^1.7.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.378.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "tailwind-merge": "^2.3.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.2.13"
  }
}
```

- [ ] **Step 8.2** — Create `apps/web/tsconfig.json`

Create file: `apps/web/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 8.3** — Create `apps/web/tsconfig.node.json`

Create file: `apps/web/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 8.4** — Create `apps/web/vite.config.ts`

Create file: `apps/web/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 8.5** — Create `apps/web/tailwind.config.ts`

Create file: `apps/web/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: '#0F172A',
          foreground: '#E2E8F0',
          accent: '#1E293B',
          border: '#1E293B',
        },
        brand: {
          purple: '#7C3AED',
          cyan: '#06B6D4',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

- [ ] **Step 8.6** — Create `apps/web/postcss.config.js`

Create file: `apps/web/postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8.7** — Create `apps/web/index.html`

Create file: `apps/web/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fencetastic Dashboard</title>
  </head>
  <body class="min-h-screen bg-background font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8.8** — Create `apps/web/src/index.css`

Create file: `apps/web/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 262.1 83.3% 57.8%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 262.1 83.3% 57.8%;

    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
}
```

- [ ] **Step 8.9** — Create `apps/web/src/main.tsx`

Create file: `apps/web/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 8.10** — Install dependencies

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm install
```

- [ ] **Step 8.11** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/web/package.json apps/web/tsconfig.json apps/web/tsconfig.node.json apps/web/vite.config.ts apps/web/tailwind.config.ts apps/web/postcss.config.js apps/web/index.html apps/web/src/index.css apps/web/src/main.tsx
git commit -m "feat(web): scaffold Vite + React + TypeScript + Tailwind

Configure Vite with React plugin and path aliases, Tailwind with
shadcn/ui CSS variables and brand colors (purple #7C3AED, cyan
#06B6D4, sidebar #0F172A), PostCSS, and React entry point with
BrowserRouter and AuthProvider."
```

---

## Task 9: shadcn/ui Setup

- [ ] **Step 9.1** — Create `apps/web/components.json`

Create file: `apps/web/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 9.2** — Create `apps/web/src/lib/utils.ts` (shadcn/ui utility)

Create file: `apps/web/src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 9.3** — Add shadcn/ui components

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web
npx shadcn@latest add button input card badge label separator avatar dropdown-menu sheet tooltip
```

**Expected output:** Components installed to `src/components/ui/`. Each component is a local file we own and can customize.

- [ ] **Step 9.4** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/web/components.json apps/web/src/lib/utils.ts apps/web/src/components/ui/
git commit -m "feat(web): configure shadcn/ui with base components

Initialize shadcn/ui with slate base color and CSS variables. Add
Button, Input, Card, Badge, Label, Separator, Avatar, DropdownMenu,
Sheet, and Tooltip components."
```

---

## Task 10: API Client + Auth Context

- [ ] **Step 10.1** — Create API client

Create file: `apps/web/src/lib/api.ts`

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor: unwrap { data } envelope
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401, redirect to login
    if (error.response?.status === 401) {
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 10.2** — Create Auth Context

Create file: `apps/web/src/lib/auth-context.tsx`

```typescript
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { AuthUser } from '@fencetastic/shared';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.data);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 10.3** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/web/src/lib/api.ts apps/web/src/lib/auth-context.tsx
git commit -m "feat(web): add API client and auth context

Create axios client with credentials, 401 redirect interceptor,
and AuthProvider context with login/logout/refreshUser. Checks
auth status on mount via GET /api/auth/me."
```

---

## Task 11: Login Page

- [ ] **Step 11.1** — Create login page

Create file: `apps/web/src/pages/login.tsx`

```typescript
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Login failed');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Brand gradient text */}
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">
            Fencetastic
          </CardTitle>
          <CardDescription>
            Sign in to your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@fencetastic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90 transition-opacity"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 11.2** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/web/src/pages/login.tsx
git commit -m "feat(web): add login page with brand gradient

Full login form with email/password inputs, error handling,
loading state, and brand gradient (purple to cyan) on the
submit button and title text."
```

---

## Task 12: Dark Sidebar Layout

- [ ] **Step 12.1** — Create protected route component

Create file: `apps/web/src/components/layout/protected-route.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 12.2** — Create sidebar component

Create file: `apps/web/src/components/layout/sidebar.tsx`

```typescript
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: FolderOpen },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Commissions', path: '/commissions', icon: DollarSign },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

function NavItem({
  item,
  collapsed,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[number];
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          'hover:bg-sidebar-accent hover:text-white',
          isActive
            ? 'bg-gradient-to-r from-brand-purple/20 to-brand-cyan/20 text-white border-l-2 border-brand-purple'
            : 'text-sidebar-foreground/70'
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// --- Desktop Sidebar ---
function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-sidebar sticky top-0 border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && (
          <h1 className="text-lg font-bold bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">
            Fencetastic
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent h-8 w-8"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <TooltipProvider>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </TooltipProvider>
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User section */}
      <div className="px-3 py-4">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-sidebar-foreground">
              {user.name}
            </p>
            <p className="text-xs text-sidebar-foreground/50">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

// --- Mobile Sidebar (Sheet) ---
function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    setOpen(false);
    navigate('/login');
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-3 left-3 z-50 bg-sidebar text-white hover:bg-sidebar-accent"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[260px] p-0 bg-sidebar border-sidebar-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5">
          <h1 className="text-lg font-bold bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">
            Fencetastic
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent h-8 w-8"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              collapsed={false}
              onClick={() => setOpen(false)}
            />
          ))}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User section */}
        <div className="px-3 py-4">
          {user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-sidebar-foreground">
                {user.name}
              </p>
              <p className="text-xs text-sidebar-foreground/50">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Exported Sidebar ---
export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <DesktopSidebar collapsed={collapsed} onToggle={onToggle} />
      <MobileSidebar />
    </>
  );
}
```

- [ ] **Step 12.3** — Create app layout wrapper

Create file: `apps/web/src/components/layout/app-layout.tsx`

```typescript
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 12.4** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/web/src/components/layout/protected-route.tsx apps/web/src/components/layout/sidebar.tsx apps/web/src/components/layout/app-layout.tsx
git commit -m "feat(web): add dark sidebar layout with brand gradient

Implement collapsible sidebar (#0F172A background) with brand gradient
logo (purple #7C3AED to cyan #06B6D4), NavLink active states, tooltip
on collapsed items, user info + sign out. Mobile uses Sheet (hamburger).
AppLayout wraps content with Outlet. ProtectedRoute redirects to /login."
```

---

## Task 13: Placeholder Pages

- [ ] **Step 13.1** — Create dashboard placeholder

Create file: `apps/web/src/pages/dashboard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your fencing projects and financials.
        </p>
      </div>

      {/* KPI Cards placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['Revenue MTD', 'Open Projects', 'Outstanding Receivables', 'Aimann Debt Balance'].map(
          (title) => (
            <Card key={title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Placeholder notice */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Badge variant="secondary" className="mb-2">Phase 2</Badge>
            <p className="text-muted-foreground">
              Charts, widgets, and live data coming in the next phase.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 13.2** — Create projects list placeholder

Create file: `apps/web/src/pages/projects.tsx`

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your fencing projects.
          </p>
        </div>
        <Button className="bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 2</Badge>
          <p className="text-muted-foreground">
            Filterable project data table with status badges coming in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 13.3** — Create project detail placeholder

Create file: `apps/web/src/pages/project-detail.tsx`

```typescript
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Detail</h1>
          <p className="text-muted-foreground mt-1">
            Project ID: {id}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {['Financials', 'Expenses Breakdown', 'Schedule', 'Notes Timeline'].map(
          (section) => (
            <Card key={section} className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">{section}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <Badge variant="secondary">Phase 3</Badge>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 13.4** — Create calendar placeholder

Create file: `apps/web/src/pages/calendar.tsx`

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Schedule installs, estimates, and follow-ups.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 4</Badge>
          <p className="text-muted-foreground">
            react-big-calendar with color-coded events coming in a future phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 13.5** — Create commissions placeholder

Create file: `apps/web/src/pages/commissions.tsx`

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

export default function CommissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground mt-1">
          Track commission payouts and Aimann debt balance.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 5</Badge>
          <p className="text-muted-foreground">
            Commission summaries, debt tracker, and pipeline projections coming in a future phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 13.6** — Create reports placeholder

Create file: `apps/web/src/pages/reports.tsx`

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Monthly P&L, project stats, and receivables aging.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 6</Badge>
          <p className="text-muted-foreground">
            Recharts reports with date range pickers and PDF export coming in a future phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 13.7** — Create settings placeholder

Create file: `apps/web/src/pages/settings.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon } from 'lucide-react';
import {
  ADNAAN_COMMISSION_RATE,
  MEME_COMMISSION_RATE,
  AIMANN_DEDUCTION_RATE,
} from '@fencetastic/shared';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Rate templates, operating expenses, and commission rates.
        </p>
      </div>

      {/* Commission rates — read-only, always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Adnaan</p>
              <p className="text-2xl font-bold">{(ADNAAN_COMMISSION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of project total</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Meme</p>
              <p className="text-2xl font-bold">{(MEME_COMMISSION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of project total</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Aimann Deduction</p>
              <p className="text-2xl font-bold">{(AIMANN_DEDUCTION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of gross profit (when debt &gt; 0)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {['Rate Templates', 'Operating Expenses'].map((section) => (
          <Card key={section} className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">{section}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <SettingsIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <Badge variant="secondary">Phase 7</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 13.8** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/web/src/pages/
git commit -m "feat(web): add placeholder pages for all 7 routes

Create Dashboard, Projects, ProjectDetail, Calendar, Commissions,
Reports, and Settings pages with structured placeholders showing
which phase each section will be implemented. Settings page shows
live commission rates from shared constants."
```

---

## Task 14: React Router Setup + App Component

- [ ] **Step 14.1** — Create `apps/web/src/App.tsx`

Create file: `apps/web/src/App.tsx`

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import AppLayout from '@/components/layout/app-layout';
import ProtectedRoute from '@/components/layout/protected-route';
import LoginPage from '@/pages/login';
import DashboardPage from '@/pages/dashboard';
import ProjectsPage from '@/pages/projects';
import ProjectDetailPage from '@/pages/project-detail';
import CalendarPage from '@/pages/calendar';
import CommissionsPage from '@/pages/commissions';
import ReportsPage from '@/pages/reports';
import SettingsPage from '@/pages/settings';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Protected routes with sidebar layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/commissions" element={<CommissionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 14.2** — Commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add apps/web/src/App.tsx
git commit -m "feat(web): configure React Router with all routes

Set up Routes for /, /projects, /projects/:id, /calendar,
/commissions, /reports, /settings (protected with sidebar layout),
/login (public, redirects to / if authed), and catch-all redirect."
```

---

## Task 15: Final Wiring + Smoke Test

- [ ] **Step 15.1** — Create `.env` file for local development

Create file: `apps/api/.env` (DO NOT commit — in .gitignore)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/fencetastic?schema=public"
JWT_SECRET="dev-secret-at-least-32-characters-long-for-local-testing"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

- [ ] **Step 15.2** — Push Prisma schema to local database

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api
npx prisma db push
```

**Expected output:** All tables created in PostgreSQL.

- [ ] **Step 15.3** — Run seed script

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api
npx tsx src/scripts/seed-users.ts
```

**Expected output:**

```
🌱 Seeding users...
  ✅ Created user: Adnaan (adnaan@fencetastic.com)
  ✅ Created user: Meme (meme@fencetastic.com)
  ✅ Seeded initial Aimann debt balance: $5,988.41
🌱 Seed complete!
```

- [ ] **Step 15.4** — Start API server and verify health check

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm run dev:api &

# Wait for startup, then test:
curl http://localhost:3001/api/health
```

**Expected output:** `{"status":"ok","timestamp":"..."}`

- [ ] **Step 15.5** — Start web dev server and verify it loads

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm run dev:web &

# Open browser to http://localhost:5173
# Expected: redirected to /login, login form visible with "Fencetastic" brand gradient title
```

- [ ] **Step 15.6** — Test login flow end-to-end

1. Open `http://localhost:5173/login`
2. Enter `adnaan@fencetastic.com` / `Fencetastic2024!`
3. Click "Sign In"
4. **Expected:** Redirect to `/` with Dashboard page visible, dark sidebar on left with navigation items
5. Click "Projects" in sidebar — navigates to `/projects`
6. Click "Sign Out" — returns to `/login`

- [ ] **Step 15.7** — Run shared package tests

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
npm test
```

**Expected output:**

```
 ✓ __tests__/commission.test.ts (10 tests)
Test Files  1 passed (1)
Tests       10 passed (10)
```

- [ ] **Step 15.8** — Final commit

```bash
cd /Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM
git add -A
git commit -m "chore: Phase 1 complete — foundation, auth, commission logic

Monorepo scaffold with npm workspaces, shared types/constants/commission
waterfall (10 passing tests), full Prisma schema (8 tables), Express
API with JWT auth (login/logout/me/password), user seed script,
Vite+React+Tailwind+shadcn/ui frontend with dark sidebar layout,
auth context, login page, and placeholder pages for all 7 routes."
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `npm test` — 10 commission waterfall tests pass
- [ ] `npm run dev:api` — API starts on port 3001, `/api/health` returns OK
- [ ] `npm run dev:web` — Web starts on port 5173
- [ ] Login with `adnaan@fencetastic.com` / `Fencetastic2024!` works
- [ ] Dark sidebar shows 6 nav items, collapses on click, hamburger on mobile
- [ ] All 7 routes render their placeholder pages
- [ ] Logout clears session and redirects to `/login`
- [ ] Unauthenticated access to `/` redirects to `/login`
- [ ] Brand gradient (purple to cyan) visible on sidebar logo and login button
- [ ] Prisma schema has all 8 tables (users, projects, subcontractor_payments, project_notes, rate_templates, aimann_debt_ledger, commission_snapshots, operating_expenses)

---

## Dependencies Summary

### Root
- `concurrently` — run API + Web dev servers simultaneously
- `typescript` — shared compiler

### packages/shared
- `vitest` — test runner for commission tests

### apps/api
- `express`, `cors`, `cookie-parser` — HTTP server
- `@prisma/client`, `prisma` — ORM
- `bcrypt` — password hashing
- `jsonwebtoken` — JWT tokens
- `zod` — request validation
- `tsx` — TypeScript execution for dev/scripts

### apps/web
- `react`, `react-dom` — UI framework
- `react-router-dom` — client-side routing
- `axios` — HTTP client with credentials
- `tailwindcss`, `postcss`, `autoprefixer` — styling
- `tailwindcss-animate` — animation utilities for shadcn
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn/ui utilities
- `lucide-react` — icon library
- `@vitejs/plugin-react`, `vite` — dev server and bundler

---

## What Comes Next (Phase 2 Preview)

Phase 2 will implement Project CRUD:
- `GET /api/projects` with filters (status, fenceType, search, dateRange)
- `GET /api/projects/:id` with subs, notes, computed commissions
- `POST /api/projects` — create project
- `PATCH /api/projects/:id` — update (triggers commission snapshot on COMPLETED)
- `DELETE /api/projects/:id` — soft delete
- Frontend: DataTable with filters, project creation modal, project detail page with financials