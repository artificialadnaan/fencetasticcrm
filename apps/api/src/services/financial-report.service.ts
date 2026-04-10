import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateCommission, PaymentMethod } from '@fencetastic/shared';
import type { PnlReport, PnlRow, JobCostingRow } from '@fencetastic/shared';
import { TransactionType, ProjectStatus, FenceType } from '@fencetastic/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getProjectAttributionDate(project: {
  completedDate: Date | null;
  contractDate: Date;
}): Date {
  return project.completedDate ?? project.contractDate;
}

async function getAimannDebtBalance(): Promise<number> {
  const lastLedger = await prisma.aimannDebtLedger.findFirst({
    orderBy: { date: 'desc' },
  });
  return lastLedger ? d(lastLedger.runningBalance) : 0;
}

// Build a sorted list of month-start Dates covering [dateFrom, dateTo]
function buildMonthBuckets(dateFrom: Date, dateTo: Date): Date[] {
  const buckets: Date[] = [];
  const cur = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1);
  const end = new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);
  while (cur <= end) {
    buckets.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

// Monthly operating-expense prorated amount for a single expense entry
function monthlyAmountForOpEx(
  amt: number,
  frequency: string,
  effectiveFrom: Date | null,
  effectiveTo: Date | null,
  bucketStart: Date
): number {
  // Normalize effectiveFrom/To to month boundaries
  const bucketEnd = new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 0); // last day of month

  // Expense not yet effective
  if (effectiveFrom) {
    const fromMonth = new Date(effectiveFrom.getFullYear(), effectiveFrom.getMonth(), 1);
    if (fromMonth > bucketStart) return 0;
  }
  // Expense already expired
  if (effectiveTo) {
    const toMonth = new Date(effectiveTo.getFullYear(), effectiveTo.getMonth(), 1);
    if (toMonth < bucketStart) return 0;
  }
  void bucketEnd; // used implicitly via range check above

  if (frequency === 'MONTHLY') return amt;
  if (frequency === 'QUARTERLY') return amt / 3;
  if (frequency === 'ANNUAL') return amt / 12;
  return 0;
}

function groupByPeriod(monthlyRows: PnlRow[], period: 'quarterly' | 'annual'): PnlRow[] {
  const groups = new Map<string, PnlRow>();
  for (const row of monthlyRows) {
    const date = new Date(Date.parse('1 ' + row.month));
    const key =
      period === 'quarterly'
        ? `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
        : `${date.getFullYear()}`;
    const existing = groups.get(key) ?? {
      month: key,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      commissions: 0,
      netProfit: 0,
    };
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

// ─── P&L Report ───────────────────────────────────────────────────────────────

export async function getPnlReport(
  dateFrom: Date,
  dateTo: Date,
  period: 'monthly' | 'quarterly' | 'annual' = 'monthly'
): Promise<PnlReport> {
  const [projects, nonProjectExpenses, operatingExpenses, aimannDebt] = await Promise.all([
    prisma.project.findMany({
      where: {
        isDeleted: false,
        OR: [
          { completedDate: { gte: dateFrom, lte: dateTo } },
          {
            completedDate: null,
            contractDate: { gte: dateFrom, lte: dateTo },
          },
        ],
      },
      select: {
        id: true,
        customer: true,
        projectTotal: true,
        paymentMethod: true,
        moneyReceived: true,
        materialsCost: true,
        completedDate: true,
        contractDate: true,
        materialLineItems: {
          select: { totalCost: true },
        },
        subcontractorPayments: {
          select: { amountOwed: true, amountPaid: true },
        },
        transactions: {
          where: { type: TransactionType.EXPENSE },
          select: {
            amount: true,
            materialLineItems: {
              select: { totalCost: true },
            },
          },
        },
        commissionSnapshot: {
          select: {
            adnaanCommission: true,
            memeCommission: true,
            totalExpenses: true,
            moneyReceived: true,
            grossProfit: true,
            aimannDeduction: true,
            netProfit: true,
          },
        },
      },
    }),
    // Non-project-linked EXPENSE transactions in range
    prisma.transaction.findMany({
      where: {
        type: TransactionType.EXPENSE,
        projectId: null,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: { amount: true, date: true },
    }),
    prisma.operatingExpense.findMany({
      where: { isActive: true },
      select: { amount: true, frequency: true, effectiveFrom: true, effectiveTo: true },
    }),
    getAimannDebtBalance(),
  ]);

  // Build monthly buckets
  const buckets = buildMonthBuckets(dateFrom, dateTo);
  const rowMap = new Map<string, PnlRow>();
  for (const bucket of buckets) {
    const key = monthKey(bucket);
    rowMap.set(key, {
      month: key,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      commissions: 0,
      netProfit: 0,
    });
  }

  // Attribute each project to its completion month
  for (const project of projects) {
    const attrDate = getProjectAttributionDate({
      completedDate: project.completedDate,
      contractDate: project.contractDate,
    });
    const key = monthKey(attrDate);
    const row = rowMap.get(key);
    if (!row) continue;

    const revenue = d(project.moneyReceived);

    // Materials: use line items if present, else legacy field
    const hasMaterialLineItems = project.materialLineItems.length > 0;
    const materials = hasMaterialLineItems
      ? project.materialLineItems.reduce((s, li) => s + d(li.totalCost), 0)
      : d(project.materialsCost);

    // Subs: use amountPaid (actual cash out)
    const subs = project.subcontractorPayments.reduce((s, sp) => s + d(sp.amountPaid), 0);

    // Other expenses: transaction amount minus the portion covered by linked material line items
    const otherExpenses = project.transactions.reduce((s, tx) => {
      const txAmt = d(tx.amount);
      const linkedMaterials = tx.materialLineItems.reduce((ms, li) => ms + d(li.totalCost), 0);
      return s + Math.max(txAmt - linkedMaterials, 0);
    }, 0);

    const cogs = materials + subs + otherExpenses;

    // Commissions: snapshot if settled, live calc if not
    let commissionsAdnaan: number;
    let commissionsMeme: number;
    if (project.commissionSnapshot) {
      commissionsAdnaan = d(project.commissionSnapshot.adnaanCommission);
      commissionsMeme = d(project.commissionSnapshot.memeCommission);
    } else {
      const subOwedTotal = project.subcontractorPayments.reduce(
        (s, sp) => s + d(sp.amountOwed),
        0
      );
      const breakdown = calculateCommission({
        projectTotal: d(project.projectTotal),
        paymentMethod: project.paymentMethod as PaymentMethod,
        materialsCost: materials,
        subOwedTotal,
        aimannDebtBalance: aimannDebt,
      });
      commissionsAdnaan = breakdown.adnaanCommission;
      commissionsMeme = breakdown.memeCommission;
    }
    const commissions = commissionsAdnaan + commissionsMeme;

    row.revenue += revenue;
    row.cogs += cogs;
    row.commissions += commissions;
  }

  // Add non-project expenses by transaction date
  for (const tx of nonProjectExpenses) {
    const key = monthKey(tx.date);
    const row = rowMap.get(key);
    if (!row) continue;
    row.cogs += d(tx.amount);
  }

  // Add operating expenses per month
  for (const bucket of buckets) {
    const key = monthKey(bucket);
    const row = rowMap.get(key);
    if (!row) continue;
    let totalOpEx = 0;
    for (const opEx of operatingExpenses) {
      totalOpEx += monthlyAmountForOpEx(
        d(opEx.amount),
        opEx.frequency,
        opEx.effectiveFrom,
        opEx.effectiveTo,
        bucket
      );
    }
    row.operatingExpenses += totalOpEx;
  }

  // Compute grossProfit and netProfit, then round
  const monthlyRows: PnlRow[] = buckets.map((bucket) => {
    const row = rowMap.get(monthKey(bucket))!;
    const grossProfit = row.revenue - row.cogs;
    const netProfit = grossProfit - row.operatingExpenses - row.commissions;
    return {
      month: row.month,
      revenue: roundMoney(row.revenue),
      cogs: roundMoney(row.cogs),
      grossProfit: roundMoney(grossProfit),
      operatingExpenses: roundMoney(row.operatingExpenses),
      commissions: roundMoney(row.commissions),
      netProfit: roundMoney(netProfit),
    };
  });

  const rows = period === 'monthly' ? monthlyRows : groupByPeriod(monthlyRows, period);

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cogs: acc.cogs + r.cogs,
      grossProfit: acc.grossProfit + r.grossProfit,
      operatingExpenses: acc.operatingExpenses + r.operatingExpenses,
      commissions: acc.commissions + r.commissions,
      netProfit: acc.netProfit + r.netProfit,
    }),
    { revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, commissions: 0, netProfit: 0 }
  );

  return {
    rows,
    totals: {
      revenue: roundMoney(totals.revenue),
      cogs: roundMoney(totals.cogs),
      grossProfit: roundMoney(totals.grossProfit),
      operatingExpenses: roundMoney(totals.operatingExpenses),
      commissions: roundMoney(totals.commissions),
      netProfit: roundMoney(totals.netProfit),
    },
  };
}

// ─── Job Costing Report ───────────────────────────────────────────────────────

export async function getJobCostingReport(
  dateFrom?: Date,
  dateTo?: Date,
  status?: ProjectStatus,
  fenceType?: FenceType
): Promise<JobCostingRow[]> {
  const where: Prisma.ProjectWhereInput = { isDeleted: false };

  if (dateFrom != null || dateTo != null) {
    where.OR = [
      ...(dateFrom != null || dateTo != null
        ? [
            {
              completedDate: {
                ...(dateFrom != null ? { gte: dateFrom } : {}),
                ...(dateTo != null ? { lte: dateTo } : {}),
              },
            },
            {
              completedDate: null,
              contractDate: {
                ...(dateFrom != null ? { gte: dateFrom } : {}),
                ...(dateTo != null ? { lte: dateTo } : {}),
              },
            },
          ]
        : []),
    ];
  }

  if (status != null) where.status = status;
  if (fenceType != null) where.fenceType = fenceType;

  const [projects, aimannDebt] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        customer: true,
        address: true,
        status: true,
        fenceType: true,
        projectTotal: true,
        paymentMethod: true,
        moneyReceived: true,
        materialsCost: true,
        completedDate: true,
        contractDate: true,
        materialLineItems: {
          select: { totalCost: true },
        },
        subcontractorPayments: {
          select: { amountOwed: true, amountPaid: true },
        },
        transactions: {
          where: { type: TransactionType.EXPENSE },
          select: {
            amount: true,
            materialLineItems: {
              select: { totalCost: true },
            },
          },
        },
        commissionSnapshot: {
          select: {
            adnaanCommission: true,
            memeCommission: true,
          },
        },
      },
    }),
    getAimannDebtBalance(),
  ]);

  return projects.map((project) => {
    const revenue = d(project.moneyReceived);

    const hasMaterialLineItems = project.materialLineItems.length > 0;
    const materials = hasMaterialLineItems
      ? project.materialLineItems.reduce((s, li) => s + d(li.totalCost), 0)
      : d(project.materialsCost);

    const subcontractors = project.subcontractorPayments.reduce(
      (s, sp) => s + d(sp.amountPaid),
      0
    );

    const otherExpenses = project.transactions.reduce((s, tx) => {
      const txAmt = d(tx.amount);
      const linkedMaterials = tx.materialLineItems.reduce((ms, li) => ms + d(li.totalCost), 0);
      return s + Math.max(txAmt - linkedMaterials, 0);
    }, 0);

    let commissionsAdnaan: number;
    let commissionsMeme: number;
    if (project.commissionSnapshot) {
      commissionsAdnaan = d(project.commissionSnapshot.adnaanCommission);
      commissionsMeme = d(project.commissionSnapshot.memeCommission);
    } else {
      const subOwedTotal = project.subcontractorPayments.reduce(
        (s, sp) => s + d(sp.amountOwed),
        0
      );
      const breakdown = calculateCommission({
        projectTotal: d(project.projectTotal),
        paymentMethod: project.paymentMethod as PaymentMethod,
        materialsCost: materials,
        subOwedTotal,
        aimannDebtBalance: aimannDebt,
      });
      commissionsAdnaan = breakdown.adnaanCommission;
      commissionsMeme = breakdown.memeCommission;
    }

    const totalCosts = materials + subcontractors + otherExpenses + commissionsAdnaan + commissionsMeme;
    const profit = revenue - totalCosts;
    const marginPct = revenue > 0 ? roundMoney((profit / revenue) * 100) : 0;

    return {
      projectId: project.id,
      customer: project.customer,
      address: project.address,
      status: project.status as ProjectStatus,
      fenceType: project.fenceType as string,
      revenue: roundMoney(revenue),
      materials: roundMoney(materials),
      subcontractors: roundMoney(subcontractors),
      otherExpenses: roundMoney(otherExpenses),
      commissionsAdnaan: roundMoney(commissionsAdnaan),
      commissionsMeme: roundMoney(commissionsMeme),
      profit: roundMoney(profit),
      marginPct,
    };
  });
}
