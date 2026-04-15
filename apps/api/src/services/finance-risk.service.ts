import { Prisma } from '@prisma/client';
import { ProjectStatus, type FinanceRiskOverview } from '@fencetastic/shared';
import { prisma } from '../lib/prisma';
import { getDebtBalance } from './debt.service';
import { getReceivablesAging } from './report.service';

function d(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

export async function getFinanceRiskOverview(): Promise<FinanceRiskOverview> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [receivables, payableProjects, debtBalance, recentDebtEntries] = await Promise.all([
    getReceivablesAging(),
    prisma.project.findMany({
      where: {
        isDeleted: false,
        status: { not: ProjectStatus.ESTIMATE },
      },
      select: {
        id: true,
        customer: true,
        address: true,
        status: true,
        commissionOwed: true,
        commissionPaid: true,
      },
    }),
    getDebtBalance(),
    prisma.aimannDebtLedger.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      select: {
        amount: true,
        note: true,
        date: true,
      },
    }),
  ]);

  const debtEntriesInWindow = recentDebtEntries.filter((entry) => entry.date.getTime() >= thirtyDaysAgo.getTime());

  const topAtRisk = [
    ...receivables.bucket90plus,
    ...receivables.bucket61_90,
    ...receivables.bucket31_60,
    ...receivables.bucket0_30,
  ]
    .sort((left, right) => {
      if (right.outstanding !== left.outstanding) {
        return right.outstanding - left.outstanding;
      }
      return right.ageDays - left.ageDays;
    })
    .slice(0, 5)
    .map((project) => ({
      projectId: project.id,
      customer: project.customer,
      address: project.address,
      amount: project.outstanding,
      ageDays: project.ageDays,
    }));

  const unpaidProjects = payableProjects
    .map((project) => {
      const amountDue = Math.max(d(project.commissionOwed) - d(project.commissionPaid), 0);
      return {
        projectId: project.id,
        customer: project.customer,
        address: project.address,
        status: project.status as ProjectStatus,
        amountDue: Number(amountDue.toFixed(2)),
      };
    })
    .filter((project) => project.amountDue > 0)
    .sort((left, right) => right.amountDue - left.amountDue);

  const topUnpaid = unpaidProjects.slice(0, 5);

  const outstandingCommissions = Number(
    unpaidProjects
      .reduce((sum, project) => sum + project.amountDue, 0)
      .toFixed(2),
  );

  const paidDownLast30Days = Number(
    debtEntriesInWindow
      .filter((entry) => d(entry.amount) < 0)
      .reduce((sum, entry) => sum + Math.abs(d(entry.amount)), 0)
      .toFixed(2),
  );

  const adjustmentsLast30Days = Number(
    debtEntriesInWindow
      .filter((entry) => d(entry.amount) > 0)
      .reduce((sum, entry) => sum + d(entry.amount), 0)
      .toFixed(2),
  );

  const netMovementLast30Days = Number(
    debtEntriesInWindow
      .reduce((sum, entry) => sum + d(entry.amount), 0)
      .toFixed(2),
  );

  return {
    receivables: {
      overallOutstanding: receivables.totals.overall,
      over60Outstanding: Number((receivables.totals.bucket61_90 + receivables.totals.bucket90plus).toFixed(2)),
      buckets: [
        { label: '0-30 days', amount: receivables.totals.bucket0_30, count: receivables.bucket0_30.length },
        { label: '31-60 days', amount: receivables.totals.bucket31_60, count: receivables.bucket31_60.length },
        { label: '61-90 days', amount: receivables.totals.bucket61_90, count: receivables.bucket61_90.length },
        { label: '90+ days', amount: receivables.totals.bucket90plus, count: receivables.bucket90plus.length },
      ],
      topAtRisk,
    },
    payables: {
      outstandingCommissions,
      projectCount: unpaidProjects.length,
      topUnpaid,
    },
    debt: {
      currentBalance: debtBalance.balance,
      paidDownLast30Days,
      adjustmentsLast30Days,
      netMovementLast30Days,
    },
  };
}
