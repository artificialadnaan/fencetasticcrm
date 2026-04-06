import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  calculateCommission,
  PaymentMethod,
  ProjectStatus,
  type CommissionSummary,
  type CommissionByProject,
  type PipelineProjectionSummary,
  type PipelineProjection,
} from '@fencetastic/shared';

// Helper: Prisma Decimal → number
function d(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

async function getExpenseBasisByProjectIds(
  projectIds: string[],
  fallbackByProjectId: Map<string, number>
) {
  if (projectIds.length === 0) {
    return fallbackByProjectId;
  }

  const groupedExpenses = await prisma.transaction.groupBy({
    by: ['projectId'],
    where: {
      projectId: { in: projectIds },
      type: TransactionType.EXPENSE,
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const result = new Map(fallbackByProjectId);
  for (const row of groupedExpenses) {
    if (!row.projectId) continue;
    if ((row._count?._all ?? 0) > 0) {
      result.set(row.projectId, d(row._sum.amount));
    }
  }

  return result;
}

export async function getCommissionSummary(): Promise<CommissionSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [mtdSnapshots, ytdSnapshots] = await Promise.all([
    prisma.commissionSnapshot.findMany({
      where: {
        settledAt: { gte: startOfMonth },
        project: { isDeleted: false },
      },
      select: { adnaanCommission: true, memeCommission: true },
    }),
    prisma.commissionSnapshot.findMany({
      where: {
        settledAt: { gte: startOfYear },
        project: { isDeleted: false },
      },
      select: { adnaanCommission: true, memeCommission: true },
    }),
  ]);

  const sum = (snapshots: Array<{ adnaanCommission: Prisma.Decimal; memeCommission: Prisma.Decimal }>) =>
    snapshots.reduce(
      (acc, s) => ({
        adnaan: acc.adnaan + d(s.adnaanCommission),
        meme: acc.meme + d(s.memeCommission),
      }),
      { adnaan: 0, meme: 0 }
    );

  const mtd = sum(mtdSnapshots);
  const ytd = sum(ytdSnapshots);

  return {
    adnaanMTD: Number(mtd.adnaan.toFixed(2)),
    adnaanYTD: Number(ytd.adnaan.toFixed(2)),
    memeMTD: Number(mtd.meme.toFixed(2)),
    memeYTD: Number(ytd.meme.toFixed(2)),
  };
}

export async function getCommissionsByProject(page: number, limit: number): Promise<{
  data: CommissionByProject[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const [snapshots, total] = await Promise.all([
    prisma.commissionSnapshot.findMany({
      where: { project: { isDeleted: false } },
      include: { project: { select: { customer: true, completedDate: true, projectTotal: true } } },
      orderBy: { settledAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.commissionSnapshot.count({
      where: { project: { isDeleted: false } },
    }),
  ]);

  const data: CommissionByProject[] = snapshots.map((s) => ({
    projectId: s.projectId,
    customer: s.project.customer,
    projectTotal: d(s.project.projectTotal),
    adnaanCommission: d(s.adnaanCommission),
    memeCommission: d(s.memeCommission),
    aimannDeduction: d(s.aimannDeduction),
    netProfit: d(s.netProfit),
    completedDate: s.project.completedDate?.toISOString().split('T')[0] ?? s.settledAt.toISOString().split('T')[0],
  }));

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

export async function getCommissionPipeline(): Promise<PipelineProjectionSummary> {
  const [pipelineProjects, latestDebt] = await Promise.all([
    prisma.project.findMany({
      where: {
        status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] },
        isDeleted: false,
      },
      include: {
        subcontractorPayments: { select: { amountOwed: true } },
      },
      orderBy: { installDate: 'asc' },
    }),
    prisma.aimannDebtLedger.findFirst({
      orderBy: { date: 'desc' },
      select: { runningBalance: true },
    }),
  ]);

  const currentDebtBalance = latestDebt ? d(latestDebt.runningBalance) : 0;
  const expenseBasisByProjectId = await getExpenseBasisByProjectIds(
    pipelineProjects.map((project) => project.id),
    new Map(pipelineProjects.map((project) => [project.id, d(project.forecastedExpenses)]))
  );

  let simulatedDebtBalance = currentDebtBalance;
  const projects: PipelineProjection[] = pipelineProjects.map((p) => {
    const projectTotal = d(p.projectTotal);
    const materialsCost = d(p.materialsCost);
    const forecastedExpenses = d(p.forecastedExpenses);
    const subOwedTotal = p.subcontractorPayments.reduce((sum, sp) => sum + d(sp.amountOwed), 0);

    const breakdown = calculateCommission({
      projectTotal,
      paymentMethod: p.paymentMethod as PaymentMethod,
      materialsCost,
      subOwedTotal,
      expenseOverride: expenseBasisByProjectId.get(p.id) ?? forecastedExpenses,
      aimannDebtBalance: simulatedDebtBalance,
    });

    // Simulate debt paydown as projects complete sequentially
    if (simulatedDebtBalance > 0) {
      simulatedDebtBalance = Math.max(0, simulatedDebtBalance - breakdown.aimannDeduction);
    }

    return {
      projectId: p.id,
      customer: p.customer,
      status: p.status,
      projectTotal,
      adnaanCommission: breakdown.adnaanCommission,
      memeCommission: breakdown.memeCommission,
      aimannDeduction: breakdown.aimannDeduction,
      netProfit: breakdown.netProfit,
    };
  });

  const totals = projects.reduce(
    (acc, p) => ({
      adnaan: acc.adnaan + p.adnaanCommission,
      meme: acc.meme + p.memeCommission,
      aimann: acc.aimann + p.aimannDeduction,
      net: acc.net + p.netProfit,
    }),
    { adnaan: 0, meme: 0, aimann: 0, net: 0 }
  );

  return {
    projects,
    totalAdnaan: Number(totals.adnaan.toFixed(2)),
    totalMeme: Number(totals.meme.toFixed(2)),
    totalAimann: Number(totals.aimann.toFixed(2)),
    totalNetProfit: Number(totals.net.toFixed(2)),
  };
}
