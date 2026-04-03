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

export interface MonthlyRevenueExpense {
  month: string; // "Jan 2026"
  revenue: number;
  expenses: number;
}

export interface ProjectTypeBreakdown {
  fenceType: string;
  count: number;
}

export interface FollowUpProject {
  id: string;
  customer: string;
  address: string;
  status: string;
  followUpDate: string;
}

export interface RecentActivityItem {
  id: string;
  projectId: string;
  customer: string;
  description: string;
  createdAt: string;
}

export interface UpcomingInstall {
  id: string;
  customer: string;
  address: string;
  fenceType: string;
  status: string;
  installDate: string;
}

export interface DashboardData {
  kpis: {
    revenueMTD: number;
    openProjects: number;
    outstandingReceivables: number;
    aimannDebtBalance: number;
  };
  monthlyRevenueExpenses: MonthlyRevenueExpense[];
  projectTypeBreakdown: ProjectTypeBreakdown[];
  todaysFollowUps: FollowUpProject[];
  recentActivity: RecentActivityItem[];
  upcomingInstalls: UpcomingInstall[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = toDateString(now);

  // Build 6-month trailing date range
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    mtdSnapshots,
    openProjectsCount,
    receivablesAgg,
    latestDebt,
    completedSnapshots,
    projectTypeRows,
    followUpProjects,
    recentNotes,
    upcomingInstallProjects,
  ] = await Promise.all([
    // Revenue MTD: sum moneyReceived from snapshots for COMPLETED this month
    prisma.commissionSnapshot.findMany({
      where: {
        settledAt: { gte: startOfMonth },
        project: { isDeleted: false },
      },
      select: { moneyReceived: true },
    }),

    // Open projects count
    prisma.project.count({
      where: {
        status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] },
        isDeleted: false,
      },
    }),

    // Outstanding receivables: sum(projectTotal - customerPaid) where customerPaid < projectTotal
    prisma.project.findMany({
      where: {
        isDeleted: false,
        status: { not: ProjectStatus.ESTIMATE },
      },
      select: { projectTotal: true, customerPaid: true },
    }),

    // Aimann debt balance
    prisma.aimannDebtLedger.findFirst({
      orderBy: { date: 'desc' },
      select: { runningBalance: true },
    }),

    // Monthly revenue & expenses: 6-month trailing from CommissionSnapshot
    prisma.commissionSnapshot.findMany({
      where: {
        settledAt: { gte: sixMonthsAgo },
        project: { isDeleted: false },
      },
      select: { moneyReceived: true, totalExpenses: true, settledAt: true },
    }),

    // Project type breakdown for COMPLETED
    prisma.project.groupBy({
      by: ['fenceType'],
      where: {
        status: ProjectStatus.COMPLETED,
        isDeleted: false,
      },
      _count: { id: true },
    }),

    // Today's follow-ups
    prisma.project.findMany({
      where: {
        followUpDate: new Date(todayStr),
        isDeleted: false,
      },
      select: {
        id: true,
        customer: true,
        address: true,
        status: true,
        followUpDate: true,
      },
      orderBy: { customer: 'asc' },
    }),

    // Recent activity: last 5 notes
    prisma.projectNote.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, customer: true, isDeleted: true } },
        author: { select: { name: true } },
      },
    }),

    // Upcoming installs: next 5 by installDate (future only)
    prisma.project.findMany({
      where: {
        installDate: { gt: now },
        isDeleted: false,
        status: { not: ProjectStatus.COMPLETED },
      },
      select: {
        id: true,
        customer: true,
        address: true,
        fenceType: true,
        status: true,
        installDate: true,
      },
      orderBy: { installDate: 'asc' },
      take: 5,
    }),
  ]);

  // KPIs
  const revenueMTD = Number(
    mtdSnapshots.reduce((sum, s) => sum + d(s.moneyReceived), 0).toFixed(2)
  );

  const outstandingReceivables = Number(
    receivablesAgg
      .reduce((sum, p) => {
        const owed = d(p.projectTotal) - d(p.customerPaid);
        return sum + (owed > 0 ? owed : 0);
      }, 0)
      .toFixed(2)
  );

  const aimannDebtBalance = latestDebt ? Number(d(latestDebt.runningBalance).toFixed(2)) : 0;

  // Monthly revenue vs expenses — build 6-month buckets
  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(
      d2.toLocaleString('en-US', { month: 'short', year: 'numeric' })
    );
  }

  const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
  for (const label of monthLabels) {
    monthlyMap.set(label, { revenue: 0, expenses: 0 });
  }

  for (const snap of completedSnapshots) {
    const label = snap.settledAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (monthlyMap.has(label)) {
      const entry = monthlyMap.get(label)!;
      entry.revenue += d(snap.moneyReceived);
      entry.expenses += d(snap.totalExpenses);
    }
  }

  const monthlyRevenueExpenses: MonthlyRevenueExpense[] = monthLabels.map((label) => {
    const entry = monthlyMap.get(label)!;
    return {
      month: label,
      revenue: Number(entry.revenue.toFixed(2)),
      expenses: Number(entry.expenses.toFixed(2)),
    };
  });

  // Project type breakdown
  const projectTypeBreakdown: ProjectTypeBreakdown[] = projectTypeRows.map((row) => ({
    fenceType: row.fenceType,
    count: row._count.id,
  }));

  // Today's follow-ups
  const todaysFollowUps: FollowUpProject[] = followUpProjects.map((p) => ({
    id: p.id,
    customer: p.customer,
    address: p.address,
    status: p.status,
    followUpDate: p.followUpDate ? toDateString(p.followUpDate) : todayStr,
  }));

  // Recent activity
  const recentActivity: RecentActivityItem[] = recentNotes
    .filter((n) => !n.project.isDeleted)
    .slice(0, 5)
    .map((n) => ({
      id: `note-${n.id}`,
      projectId: n.project.id,
      customer: n.project.customer,
      description: `${n.author.name}: "${n.content.length > 80 ? n.content.slice(0, 80) + '…' : n.content}"`,
      createdAt: n.createdAt.toISOString(),
    }));

  // Upcoming installs
  const upcomingInstalls: UpcomingInstall[] = upcomingInstallProjects.map((p) => ({
    id: p.id,
    customer: p.customer,
    address: p.address,
    fenceType: p.fenceType,
    status: p.status,
    installDate: toDateString(p.installDate),
  }));

  return {
    kpis: {
      revenueMTD,
      openProjects: openProjectsCount,
      outstandingReceivables,
      aimannDebtBalance,
    },
    monthlyRevenueExpenses,
    projectTypeBreakdown,
    todaysFollowUps,
    recentActivity,
    upcomingInstalls,
  };
}
