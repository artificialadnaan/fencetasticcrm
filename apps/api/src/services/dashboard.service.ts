import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  type DashboardFollowUpTask,
  type DashboardCommandItem,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
  ProjectStatus,
} from '@fencetastic/shared';

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

function resolveOutstandingReceivables(project: {
  projectTotal: Prisma.Decimal | null;
  customerPaid: Prisma.Decimal | null;
  importedOutstandingReceivables?: Prisma.Decimal | null;
  receivablesSource?: string | null;
}) : { amount: number; unresolvedImported: boolean } {
  const computedOutstanding = Math.max(d(project.projectTotal) - d(project.customerPaid), 0);

  if (
    (project.receivablesSource === 'IMPORTED_ACTUAL' ||
      project.receivablesSource === 'RECONCILIATION_REQUIRED')
  ) {
    if (
      project.importedOutstandingReceivables !== null &&
      project.importedOutstandingReceivables !== undefined
    ) {
      return {
        amount: Math.max(d(project.importedOutstandingReceivables), 0),
        unresolvedImported: false,
      };
    }
    return {
      amount: computedOutstanding,
      unresolvedImported: true,
    };
  }

  return {
    amount: computedOutstanding,
    unresolvedImported: false,
  };
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

type DashboardFollowUpTaskRow = {
  id: string;
  projectId: string;
  kind: EstimateFollowUpTaskKind;
  dueDate: Date;
  status: EstimateFollowUpTaskStatus;
  sequence: {
    status: EstimateFollowUpSequenceStatus;
  };
  project: {
    id: string;
    customer: string;
    address: string;
    status: ProjectStatus;
    isDeleted: boolean;
  };
};

type DashboardFollowUpTaskClient = {
  estimateFollowUpTask: {
    findMany: (args: {
      where: {
        status: EstimateFollowUpTaskStatus;
        dueDate: { lte: Date };
        sequence: {
          status: EstimateFollowUpSequenceStatus;
        };
        project: {
          isDeleted: false;
        };
      };
      select: {
        id: true;
        projectId: true;
        kind: true;
        dueDate: true;
        status: true;
        sequence: {
          select: {
            status: true;
          };
        };
        project: {
          select: {
            id: true;
            customer: true;
            address: true;
            status: true;
            isDeleted: true;
          };
        };
      };
      orderBy: Array<{ dueDate: 'asc' } | { projectId: 'asc' }>;
    }) => Promise<DashboardFollowUpTaskRow[]>;
  };
};

function isDashboardFollowUpTaskVisible(task: DashboardFollowUpTaskRow) {
  return (
    task.status === EstimateFollowUpTaskStatus.PENDING
    && task.sequence.status === EstimateFollowUpSequenceStatus.ACTIVE
    && !task.project.isDeleted
  );
}

function selectEarliestPendingFollowUps(tasks: DashboardFollowUpTaskRow[]): DashboardFollowUpTaskRow[] {
  const earliestByProject = new Map<string, DashboardFollowUpTaskRow>();

  for (const task of tasks) {
    if (!isDashboardFollowUpTaskVisible(task)) {
      continue;
    }

    const existing = earliestByProject.get(task.projectId);
    if (!existing || task.dueDate.getTime() < existing.dueDate.getTime()) {
      earliestByProject.set(task.projectId, task);
    }
  }

  return [...earliestByProject.values()].sort((left, right) => {
    const dueDateDiff = left.dueDate.getTime() - right.dueDate.getTime();
    if (dueDateDiff !== 0) return dueDateDiff;
    return left.projectId.localeCompare(right.projectId);
  });
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
  commandQueue: {
    actionNeeded: DashboardCommandItem[];
    moneyAtRisk: DashboardCommandItem[];
    scheduleBlockers: DashboardCommandItem[];
  };
  monthlyRevenueExpenses: MonthlyRevenueExpense[];
  projectTypeBreakdown: ProjectTypeBreakdown[];
  todaysFollowUps: DashboardFollowUpTask[];
  recentActivity: RecentActivityItem[];
  upcomingInstalls: UpcomingInstall[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const followUpTaskClient = prisma as unknown as DashboardFollowUpTaskClient;

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
    moneyRiskProjects,
    scheduleBlockerProjects,
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
      select: {
        projectTotal: true,
        customerPaid: true,
        importedOutstandingReceivables: true,
        receivablesSource: true,
      },
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

    // Today's and overdue follow-ups from active pending follow-up tasks
    (() => {
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      return followUpTaskClient.estimateFollowUpTask.findMany({
        where: {
          status: EstimateFollowUpTaskStatus.PENDING,
          dueDate: { lte: endOfToday },
          sequence: {
            status: EstimateFollowUpSequenceStatus.ACTIVE,
          },
          project: {
            isDeleted: false,
          },
        },
        select: {
          id: true,
          projectId: true,
          kind: true,
          dueDate: true,
          status: true,
          sequence: {
            select: {
              status: true,
            },
          },
          project: {
            select: {
              id: true,
              customer: true,
              address: true,
              status: true,
              isDeleted: true,
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { projectId: 'asc' }],
      });
    })(),

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
        status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] },
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
    prisma.project.findMany({
      where: {
        isDeleted: false,
        status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED] },
      },
      select: {
        id: true,
        customer: true,
        address: true,
        projectTotal: true,
        customerPaid: true,
        importedOutstandingReceivables: true,
        receivablesSource: true,
        financeProjectMode: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.project.findMany({
      where: {
        isDeleted: false,
        status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] },
        subcontractor: null,
      },
      select: {
        id: true,
        customer: true,
        address: true,
        financeProjectMode: true,
      },
      take: 5,
      orderBy: { installDate: 'asc' },
    }),
  ]);

  // KPIs
  const revenueMTD = Number(
    mtdSnapshots.reduce((sum, s) => sum + d(s.moneyReceived), 0).toFixed(2)
  );

  const outstandingReceivables = Number(
    receivablesAgg
      .reduce((sum, p) => sum + resolveOutstandingReceivables(p).amount, 0)
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
  const todaysFollowUps: DashboardFollowUpTask[] = selectEarliestPendingFollowUps(followUpProjects)
    .map((task) => ({
      id: task.id,
      projectId: task.projectId,
      customer: task.project.customer,
      address: task.project.address,
      status: task.project.status,
      dueDate: toDateString(task.dueDate),
      kind: task.kind,
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

  const actionNeeded: DashboardCommandItem[] = todaysFollowUps.slice(0, 5).map((task) => ({
    id: `followup-${task.id}`,
    projectId: task.projectId,
    customer: task.customer,
    address: task.address,
    title: 'Follow-up due',
    reason: `${task.kind.replaceAll('_', ' ')} follow-up due ${task.dueDate}`,
    urgency: task.dueDate < toDateString(now) ? 'HIGH' : 'MEDIUM',
    financeProjectMode: null,
  }));

  const moneyAtRisk: DashboardCommandItem[] = (moneyRiskProjects ?? [])
    .map((project) => {
      const receivableState = resolveOutstandingReceivables(project);
      const outstanding = receivableState.amount;
      const urgency: DashboardCommandItem['urgency'] =
        outstanding >= 5000
          ? 'HIGH'
          : outstanding >= 1500
            ? 'MEDIUM'
            : 'LOW';
      return {
        id: `risk-${project.id}`,
        projectId: project.id,
        customer: project.customer,
        address: project.address,
        title: receivableState.unresolvedImported ? 'Imported receivable needs reconciliation' : 'Outstanding receivable',
        reason: receivableState.unresolvedImported
          ? `Spreadsheet receivable missing; computed fallback ${outstanding.toFixed(2)}`
          : `Balance due ${outstanding.toFixed(2)}`,
        urgency,
        financeProjectMode: project.financeProjectMode as DashboardCommandItem['financeProjectMode'],
        outstanding,
      };
    })
    .filter((project) => project.outstanding > 0)
    .sort((left, right) => right.outstanding - left.outstanding)
    .slice(0, 5)
    .map(({ outstanding: _outstanding, ...item }) => item);

  const scheduleBlockers: DashboardCommandItem[] = (scheduleBlockerProjects ?? []).map((project) => ({
    id: `schedule-${project.id}`,
    projectId: project.id,
    customer: project.customer,
    address: project.address,
    title: 'Crew assignment missing',
    reason: 'Project is active with no subcontractor assigned',
    urgency: 'MEDIUM',
    financeProjectMode: project.financeProjectMode as DashboardCommandItem['financeProjectMode'],
  }));

  return {
    kpis: {
      revenueMTD,
      openProjects: openProjectsCount,
      outstandingReceivables,
      aimannDebtBalance,
    },
    commandQueue: {
      actionNeeded,
      moneyAtRisk,
      scheduleBlockers,
    },
    monthlyRevenueExpenses,
    projectTypeBreakdown,
    todaysFollowUps,
    recentActivity,
    upcomingInstalls,
  };
}
