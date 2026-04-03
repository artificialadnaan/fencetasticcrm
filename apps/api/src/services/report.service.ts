import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ProjectStatus } from '@fencetastic/shared';

// Helper: Prisma Decimal → number
function d(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Monthly P&L ─────────────────────────────────────────────────────────────

export interface MonthlyPLRow {
  month: string; // "Jan 2026"
  revenue: number;
  expenses: number;
  adnaanCommission: number;
  memeCommission: number;
  aimannDeduction: number;
  operatingExpenses: number;
  netProfit: number;
}

export async function getMonthlyPL(months: number): Promise<MonthlyPLRow[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [snapshots, operatingExpenses] = await Promise.all([
    prisma.commissionSnapshot.findMany({
      where: {
        settledAt: { gte: startDate },
        project: { isDeleted: false },
      },
      select: {
        moneyReceived: true,
        totalExpenses: true,
        adnaanCommission: true,
        memeCommission: true,
        aimannDeduction: true,
        netProfit: true,
        settledAt: true,
      },
    }),
    prisma.operatingExpense.findMany({
      where: { isActive: true },
      select: { amount: true, frequency: true },
    }),
  ]);

  // Compute prorated monthly operating expense total
  let monthlyOpEx = 0;
  for (const exp of operatingExpenses) {
    const amt = d(exp.amount);
    if (exp.frequency === 'MONTHLY') {
      monthlyOpEx += amt;
    } else if (exp.frequency === 'QUARTERLY') {
      monthlyOpEx += amt / 3;
    } else if (exp.frequency === 'ANNUAL') {
      monthlyOpEx += amt / 12;
    }
  }

  // Build month buckets
  const monthLabels: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d2.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
  }

  const map = new Map<string, MonthlyPLRow>();
  for (const label of monthLabels) {
    map.set(label, {
      month: label,
      revenue: 0,
      expenses: 0,
      adnaanCommission: 0,
      memeCommission: 0,
      aimannDeduction: 0,
      operatingExpenses: 0,
      netProfit: 0,
    });
  }

  for (const snap of snapshots) {
    const label = snap.settledAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const row = map.get(label);
    if (row) {
      row.revenue += d(snap.moneyReceived);
      row.expenses += d(snap.totalExpenses);
      row.adnaanCommission += d(snap.adnaanCommission);
      row.memeCommission += d(snap.memeCommission);
      row.aimannDeduction += d(snap.aimannDeduction);
      row.netProfit += d(snap.netProfit);
    }
  }

  return monthLabels.map((label) => {
    const row = map.get(label)!;
    const opEx = Number(monthlyOpEx.toFixed(2));
    return {
      month: row.month,
      revenue: Number(row.revenue.toFixed(2)),
      expenses: Number(row.expenses.toFixed(2)),
      adnaanCommission: Number(row.adnaanCommission.toFixed(2)),
      memeCommission: Number(row.memeCommission.toFixed(2)),
      aimannDeduction: Number(row.aimannDeduction.toFixed(2)),
      operatingExpenses: opEx,
      netProfit: Number((row.netProfit - opEx).toFixed(2)),
    };
  });
}

// ─── Project Stats ────────────────────────────────────────────────────────────

export interface AvgDurationByType {
  fenceType: string;
  avgDays: number;
  count: number;
}

export interface CompletionsPerMonth {
  month: string;
  count: number;
}

export interface ProjectStatsData {
  avgDurationByType: AvgDurationByType[];
  completionsPerMonth: CompletionsPerMonth[];
}

export async function getProjectStats(): Promise<ProjectStatsData> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [completedProjects, recentCompletions] = await Promise.all([
    prisma.project.findMany({
      where: {
        status: ProjectStatus.COMPLETED,
        isDeleted: false,
        contractDate: { not: undefined },
        completedDate: { not: null },
      },
      select: {
        fenceType: true,
        contractDate: true,
        completedDate: true,
      },
    }),
    prisma.project.findMany({
      where: {
        status: ProjectStatus.COMPLETED,
        isDeleted: false,
        completedDate: { gte: sixMonthsAgo },
      },
      select: { completedDate: true },
    }),
  ]);

  // Average duration by fence type
  const typeMap = new Map<string, { totalDays: number; count: number }>();
  for (const p of completedProjects) {
    if (!p.completedDate) continue;
    const days = Math.round(
      (p.completedDate.getTime() - p.contractDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) continue; // skip bad data
    const entry = typeMap.get(p.fenceType) ?? { totalDays: 0, count: 0 };
    entry.totalDays += days;
    entry.count += 1;
    typeMap.set(p.fenceType, entry);
  }

  const avgDurationByType: AvgDurationByType[] = Array.from(typeMap.entries()).map(
    ([fenceType, entry]) => ({
      fenceType,
      avgDays: Number((entry.totalDays / entry.count).toFixed(1)),
      count: entry.count,
    })
  );

  // Completions per month (6-month trailing)
  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d2.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
  }

  const completionMap = new Map<string, number>();
  for (const label of monthLabels) completionMap.set(label, 0);

  for (const p of recentCompletions) {
    if (!p.completedDate) continue;
    const label = p.completedDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (completionMap.has(label)) {
      completionMap.set(label, (completionMap.get(label) ?? 0) + 1);
    }
  }

  const completionsPerMonth: CompletionsPerMonth[] = monthLabels.map((label) => ({
    month: label,
    count: completionMap.get(label) ?? 0,
  }));

  return { avgDurationByType, completionsPerMonth };
}

// ─── Receivables Aging ────────────────────────────────────────────────────────

export interface ReceivablesProject {
  id: string;
  customer: string;
  address: string;
  fenceType: string;
  contractDate: string;
  projectTotal: number;
  customerPaid: number;
  outstanding: number;
  ageDays: number;
}

export interface ReceivablesAgingData {
  bucket0_30: ReceivablesProject[];
  bucket31_60: ReceivablesProject[];
  bucket61_90: ReceivablesProject[];
  bucket90plus: ReceivablesProject[];
  totals: {
    bucket0_30: number;
    bucket31_60: number;
    bucket61_90: number;
    bucket90plus: number;
    overall: number;
  };
}

export async function getReceivablesAging(): Promise<ReceivablesAgingData> {
  const now = new Date();

  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      status: { in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED] },
    },
    select: {
      id: true,
      customer: true,
      address: true,
      fenceType: true,
      contractDate: true,
      installDate: true,
      projectTotal: true,
      customerPaid: true,
    },
  });

  const outstanding: ReceivablesProject[] = [];
  for (const p of projects) {
    const total = d(p.projectTotal);
    const paid = d(p.customerPaid);
    const owed = total - paid;
    if (owed <= 0.005) continue; // fully paid
    const ageDays = Math.floor(
      (now.getTime() - p.installDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    outstanding.push({
      id: p.id,
      customer: p.customer,
      address: p.address,
      fenceType: p.fenceType as string,
      contractDate: toDateString(p.contractDate),
      projectTotal: Number(total.toFixed(2)),
      customerPaid: Number(paid.toFixed(2)),
      outstanding: Number(owed.toFixed(2)),
      ageDays,
    });
  }

  const bucket0_30 = outstanding.filter((p) => p.ageDays <= 30);
  const bucket31_60 = outstanding.filter((p) => p.ageDays > 30 && p.ageDays <= 60);
  const bucket61_90 = outstanding.filter((p) => p.ageDays > 60 && p.ageDays <= 90);
  const bucket90plus = outstanding.filter((p) => p.ageDays > 90);

  const sum = (arr: ReceivablesProject[]) =>
    Number(arr.reduce((s, p) => s + p.outstanding, 0).toFixed(2));

  return {
    bucket0_30,
    bucket31_60,
    bucket61_90,
    bucket90plus,
    totals: {
      bucket0_30: sum(bucket0_30),
      bucket31_60: sum(bucket31_60),
      bucket61_90: sum(bucket61_90),
      bucket90plus: sum(bucket90plus),
      overall: sum(outstanding),
    },
  };
}
