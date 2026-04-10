import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateCommission, PaymentMethod } from '@fencetastic/shared';
import type {
  PnlReport,
  PnlRow,
  JobCostingRow,
  CommissionSummaryReport,
  CommissionSummaryPerson,
  ExpenseBreakdownReport,
  ExpenseByCategoryRow,
  ExpenseByVendorRow,
  CashFlowRow,
} from '@fencetastic/shared';
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

// ─── Commission Summary Report ────────────────────────────────────────────────

export async function getCommissionSummaryReport(
  dateFrom: Date,
  dateTo: Date
): Promise<CommissionSummaryReport> {
  // Settled: CommissionSnapshot.settledAt in date range, project not deleted
  const settledSnapshots = await prisma.commissionSnapshot.findMany({
    where: {
      settledAt: { gte: dateFrom, lte: dateTo },
      project: { isDeleted: false },
    },
    select: {
      projectId: true,
      adnaanCommission: true,
      memeCommission: true,
      aimannDeduction: true,
      project: {
        select: {
          customer: true,
          projectTotal: true,
        },
      },
    },
    orderBy: { settledAt: 'asc' },
  });

  // Pending: non-ESTIMATE projects with no commissionSnapshot
  const pendingProjects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      status: { not: ProjectStatus.ESTIMATE },
      commissionSnapshot: null,
    },
    select: {
      id: true,
      customer: true,
      projectTotal: true,
      paymentMethod: true,
      materialsCost: true,
      materialLineItems: { select: { totalCost: true } },
      subcontractorPayments: { select: { amountOwed: true, amountPaid: true } },
    },
  });

  const aimannDebt = await getAimannDebtBalance();

  // Build settled person summaries
  const settledAdnaanRows: CommissionSummaryPerson['rows'] = [];
  const settledMemeRows: CommissionSummaryPerson['rows'] = [];
  let settledAdnaanTotal = 0;
  let settledAdnaanDeductions = 0;
  let settledMemeTotal = 0;

  for (const snap of settledSnapshots) {
    const adnaan = d(snap.adnaanCommission);
    const meme = d(snap.memeCommission);
    const deduction = d(snap.aimannDeduction);
    const projectTotal = d(snap.project.projectTotal);

    settledAdnaanRows.push({
      projectId: snap.projectId,
      customer: snap.project.customer,
      projectTotal,
      commission: roundMoney(adnaan),
    });
    settledMemeRows.push({
      projectId: snap.projectId,
      customer: snap.project.customer,
      projectTotal,
      commission: roundMoney(meme),
    });

    settledAdnaanTotal += adnaan;
    settledAdnaanDeductions += deduction;
    settledMemeTotal += meme;
  }

  const settledAdnaan: CommissionSummaryPerson = {
    name: 'Adnaan',
    rows: settledAdnaanRows,
    periodTotal: roundMoney(settledAdnaanTotal),
    aimannDeductions: roundMoney(settledAdnaanDeductions),
    netPayout: roundMoney(settledAdnaanTotal - settledAdnaanDeductions),
  };

  const settledMeme: CommissionSummaryPerson = {
    name: 'Meme',
    rows: settledMemeRows,
    periodTotal: roundMoney(settledMemeTotal),
    aimannDeductions: 0,
    netPayout: roundMoney(settledMemeTotal),
  };

  // Build pending person summaries — simulate debt paydown across projects
  const pendingAdnaanRows: CommissionSummaryPerson['rows'] = [];
  const pendingMemeRows: CommissionSummaryPerson['rows'] = [];
  let pendingAdnaanTotal = 0;
  let pendingAdnaanDeductions = 0;
  let pendingMemeTotal = 0;
  let simulatedDebtBalance = aimannDebt;

  for (const project of pendingProjects) {
    const hasMaterialLineItems = project.materialLineItems.length > 0;
    const materials = hasMaterialLineItems
      ? project.materialLineItems.reduce((s, li) => s + d(li.totalCost), 0)
      : d(project.materialsCost);
    const subOwedTotal = project.subcontractorPayments.reduce(
      (s, sp) => s + d(sp.amountOwed),
      0
    );

    const calc = calculateCommission({
      projectTotal: d(project.projectTotal),
      paymentMethod: project.paymentMethod as PaymentMethod,
      materialsCost: materials,
      subOwedTotal,
      aimannDebtBalance: simulatedDebtBalance,
    });

    // Cap deduction to remaining simulated debt
    const cappedDeduction = Math.min(calc.aimannDeduction, simulatedDebtBalance);
    simulatedDebtBalance = Math.max(simulatedDebtBalance - cappedDeduction, 0);

    const projectTotal = d(project.projectTotal);

    pendingAdnaanRows.push({
      projectId: project.id,
      customer: project.customer,
      projectTotal,
      commission: roundMoney(calc.adnaanCommission),
    });
    pendingMemeRows.push({
      projectId: project.id,
      customer: project.customer,
      projectTotal,
      commission: roundMoney(calc.memeCommission),
    });

    pendingAdnaanTotal += calc.adnaanCommission;
    pendingAdnaanDeductions += cappedDeduction;
    pendingMemeTotal += calc.memeCommission;
  }

  const pendingAdnaan: CommissionSummaryPerson = {
    name: 'Adnaan',
    rows: pendingAdnaanRows,
    periodTotal: roundMoney(pendingAdnaanTotal),
    aimannDeductions: roundMoney(pendingAdnaanDeductions),
    netPayout: roundMoney(pendingAdnaanTotal - pendingAdnaanDeductions),
  };

  const pendingMeme: CommissionSummaryPerson = {
    name: 'Meme',
    rows: pendingMemeRows,
    periodTotal: roundMoney(pendingMemeTotal),
    aimannDeductions: 0,
    netPayout: roundMoney(pendingMemeTotal),
  };

  return {
    settled: { adnaan: settledAdnaan, meme: settledMeme },
    pending: { adnaan: pendingAdnaan, meme: pendingMeme },
  };
}

// ─── Expense Breakdown Report ─────────────────────────────────────────────────

export async function getExpenseBreakdownReport(
  dateFrom: Date,
  dateTo: Date
): Promise<ExpenseBreakdownReport> {
  const [materialLineItems, expenseTransactions, subcontractorPayments, operatingExpenses] =
    await Promise.all([
      // All material line items with purchaseDate in range
      prisma.materialLineItem.findMany({
        where: { purchaseDate: { gte: dateFrom, lte: dateTo } },
        select: {
          totalCost: true,
          category: true,
          vendor: true,
          projectId: true,
          transactionId: true,
        },
      }),
      // EXPENSE transactions in range, including linked material line items
      prisma.transaction.findMany({
        where: {
          type: TransactionType.EXPENSE,
          date: { gte: dateFrom, lte: dateTo },
        },
        select: {
          id: true,
          amount: true,
          category: true,
          subcategory: true,
          payee: true,
          projectId: true,
          materialLineItems: {
            select: { totalCost: true, vendor: true, category: true, projectId: true },
          },
        },
      }),
      // Subcontractor payments with datePaid in range
      prisma.subcontractorPayment.findMany({
        where: {
          datePaid: { gte: dateFrom, lte: dateTo },
          amountPaid: { gt: 0 },
        },
        select: { amountPaid: true, subcontractorName: true, projectId: true },
      }),
      // Operating expenses (active or effectiveTo >= dateFrom)
      prisma.operatingExpense.findMany({
        where: {
          OR: [
            { isActive: true },
            { effectiveTo: { gte: dateFrom } },
          ],
        },
        select: { amount: true, frequency: true, effectiveFrom: true, effectiveTo: true, category: true, description: true },
      }),
    ]);

  // ── byCategory ──────────────────────────────────────────────────────────────

  // 1. Materials — by MaterialCategory
  const materialsByCat = new Map<string, number>();
  let materialsTotal = 0;
  for (const li of materialLineItems) {
    const cat = li.category as string;
    materialsByCat.set(cat, (materialsByCat.get(cat) ?? 0) + d(li.totalCost));
    materialsTotal += d(li.totalCost);
  }
  const materialsRow: ExpenseByCategoryRow = {
    category: 'Materials',
    subcategories: Array.from(materialsByCat.entries()).map(([name, amount]) => ({
      name,
      amount: roundMoney(amount),
    })),
    total: roundMoney(materialsTotal),
  };

  // 2. Subcontractors
  const subsBySub = new Map<string, number>();
  let subsTotal = 0;
  for (const sp of subcontractorPayments) {
    subsBySub.set(sp.subcontractorName, (subsBySub.get(sp.subcontractorName) ?? 0) + d(sp.amountPaid));
    subsTotal += d(sp.amountPaid);
  }
  const subsRow: ExpenseByCategoryRow = {
    category: 'Subcontractors',
    subcategories: Array.from(subsBySub.entries()).map(([name, amount]) => ({
      name,
      amount: roundMoney(amount),
    })),
    total: roundMoney(subsTotal),
  };

  // 3. Operating Expenses — month-by-month attribution
  const buckets = buildMonthBuckets(dateFrom, dateTo);
  const opExByCat = new Map<string, number>();
  let opExTotal = 0;
  for (const exp of operatingExpenses) {
    const expFrom = exp.effectiveFrom
      ? new Date(exp.effectiveFrom.getFullYear(), exp.effectiveFrom.getMonth(), 1)
      : new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1);
    const expTo = exp.effectiveTo
      ? new Date(exp.effectiveTo.getFullYear(), exp.effectiveTo.getMonth(), 1)
      : new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);

    for (const bucket of buckets) {
      if (bucket < expFrom || bucket > expTo) continue;
      const monthAmt = monthlyAmountForOpEx(d(exp.amount), exp.frequency, exp.effectiveFrom, exp.effectiveTo, bucket);
      opExByCat.set(exp.category, (opExByCat.get(exp.category) ?? 0) + monthAmt);
      opExTotal += monthAmt;
    }
  }
  const opExRow: ExpenseByCategoryRow = {
    category: 'Operating Expenses',
    subcategories: Array.from(opExByCat.entries()).map(([name, amount]) => ({
      name,
      amount: roundMoney(amount),
    })),
    total: roundMoney(opExTotal),
  };

  // 4. Other Expenses — transaction remainders (amount minus linked material costs)
  const otherBySub = new Map<string, number>();
  let otherTotal = 0;
  for (const tx of expenseTransactions) {
    const linkedMaterials = tx.materialLineItems.reduce((s, li) => s + d(li.totalCost), 0);
    const remainder = Math.max(d(tx.amount) - linkedMaterials, 0);
    if (remainder <= 0) continue;
    const subcat = tx.subcategory ?? tx.category ?? 'Uncategorized';
    otherBySub.set(subcat, (otherBySub.get(subcat) ?? 0) + remainder);
    otherTotal += remainder;
  }
  const otherRow: ExpenseByCategoryRow = {
    category: 'Other Expenses',
    subcategories: Array.from(otherBySub.entries()).map(([name, amount]) => ({
      name,
      amount: roundMoney(amount),
    })),
    total: roundMoney(otherTotal),
  };

  // ── byVendor ─────────────────────────────────────────────────────────────────

  // Map: vendor -> { totalSpend, projectIds, categories }
  const vendorMap = new Map<string, { spend: number; projectIds: Set<string>; cats: Map<string, number> }>();

  const ensureVendor = (vendor: string) => {
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, { spend: 0, projectIds: new Set(), cats: new Map() });
    }
    return vendorMap.get(vendor)!;
  };

  // Add material line item amounts by vendor
  for (const li of materialLineItems) {
    const vendor = li.vendor ?? 'Unknown';
    const entry = ensureVendor(vendor);
    const amt = d(li.totalCost);
    entry.spend += amt;
    if (li.projectId) entry.projectIds.add(li.projectId);
    const cat = li.category as string;
    entry.cats.set(cat, (entry.cats.get(cat) ?? 0) + amt);
  }

  // Add transaction REMAINDERS by payee (not full amounts to avoid double-counting linked materials)
  for (const tx of expenseTransactions) {
    const vendor = tx.payee ?? 'Unknown';
    const linkedMaterials = tx.materialLineItems.reduce((s, li) => s + d(li.totalCost), 0);
    const remainder = Math.max(d(tx.amount) - linkedMaterials, 0);
    if (remainder <= 0) continue;
    const entry = ensureVendor(vendor);
    entry.spend += remainder;
    if (tx.projectId) entry.projectIds.add(tx.projectId);
    const cat = tx.subcategory ?? tx.category ?? 'Other';
    entry.cats.set(cat, (entry.cats.get(cat) ?? 0) + remainder);
  }

  const byVendor: ExpenseByVendorRow[] = Array.from(vendorMap.entries())
    .map(([vendor, data]) => {
      const topCategories = Array.from(data.cats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      return {
        vendor,
        totalSpend: roundMoney(data.spend),
        projectCount: data.projectIds.size,
        topCategories,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const total = roundMoney(materialsTotal + subsTotal + opExTotal + otherTotal);

  return {
    byCategory: [materialsRow, subsRow, opExRow, otherRow],
    byVendor,
    total,
  };
}

// ─── Cash Flow Report ─────────────────────────────────────────────────────────

export async function getCashFlowReport(
  dateFrom: Date,
  dateTo: Date
): Promise<CashFlowRow[]> {
  const [incomeTransactions, expenseTransactions, unlinkedMaterials, operatingExpenses] =
    await Promise.all([
      // INCOME transactions by date
      prisma.transaction.findMany({
        where: {
          type: TransactionType.INCOME,
          date: { gte: dateFrom, lte: dateTo },
        },
        select: { amount: true, date: true },
      }),
      // EXPENSE transactions by date
      prisma.transaction.findMany({
        where: {
          type: TransactionType.EXPENSE,
          date: { gte: dateFrom, lte: dateTo },
        },
        select: { amount: true, date: true },
      }),
      // Unlinked material line items (no transaction) by purchaseDate
      prisma.materialLineItem.findMany({
        where: {
          transactionId: null,
          purchaseDate: { gte: dateFrom, lte: dateTo },
        },
        select: { totalCost: true, purchaseDate: true },
      }),
      // Operating expenses for range
      prisma.operatingExpense.findMany({
        where: {
          OR: [
            { isActive: true },
            { effectiveTo: { gte: dateFrom } },
          ],
        },
        select: { amount: true, frequency: true, effectiveFrom: true, effectiveTo: true },
      }),
    ]);

  const buckets = buildMonthBuckets(dateFrom, dateTo);
  const inMap = new Map<string, number>();
  const outMap = new Map<string, number>();

  for (const bucket of buckets) {
    const key = monthKey(bucket);
    inMap.set(key, 0);
    outMap.set(key, 0);
  }

  // Money In: INCOME transactions bucketed by month
  for (const tx of incomeTransactions) {
    const key = monthKey(tx.date);
    if (inMap.has(key)) inMap.set(key, inMap.get(key)! + d(tx.amount));
  }

  // Money Out: EXPENSE transactions
  for (const tx of expenseTransactions) {
    const key = monthKey(tx.date);
    if (outMap.has(key)) outMap.set(key, outMap.get(key)! + d(tx.amount));
  }

  // Money Out: unlinked material line items by purchaseDate
  for (const li of unlinkedMaterials) {
    const key = monthKey(li.purchaseDate);
    if (outMap.has(key)) outMap.set(key, outMap.get(key)! + d(li.totalCost));
  }

  // Money Out: operating expenses per month
  for (const exp of operatingExpenses) {
    const expFrom = exp.effectiveFrom
      ? new Date(exp.effectiveFrom.getFullYear(), exp.effectiveFrom.getMonth(), 1)
      : new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1);
    const expTo = exp.effectiveTo
      ? new Date(exp.effectiveTo.getFullYear(), exp.effectiveTo.getMonth(), 1)
      : new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);

    for (const bucket of buckets) {
      if (bucket < expFrom || bucket > expTo) continue;
      const monthAmt = monthlyAmountForOpEx(d(exp.amount), exp.frequency, exp.effectiveFrom, exp.effectiveTo, bucket);
      const key = monthKey(bucket);
      if (outMap.has(key)) outMap.set(key, outMap.get(key)! + monthAmt);
    }
  }

  // Build rows with running balance
  let runningBalance = 0;
  return buckets.map((bucket) => {
    const key = monthKey(bucket);
    const moneyIn = roundMoney(inMap.get(key) ?? 0);
    const moneyOut = roundMoney(outMap.get(key) ?? 0);
    const netCashFlow = roundMoney(moneyIn - moneyOut);
    runningBalance = roundMoney(runningBalance + netCashFlow);
    return { month: key, moneyIn, moneyOut, netCashFlow, runningBalance };
  });
}
