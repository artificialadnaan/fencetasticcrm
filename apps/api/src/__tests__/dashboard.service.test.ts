import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
  FinanceFieldSource,
  ProjectStatus,
} from '@fencetastic/shared';

const prismaMock = vi.hoisted(() => ({
  prisma: {
    commissionSnapshot: {
      findMany: vi.fn(),
    },
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    aimannDebtLedger: {
      findFirst: vi.fn(),
    },
    estimateFollowUpTask: {
      findMany: vi.fn(),
    },
    calendarEvent: {
      findMany: vi.fn(),
    },
    projectNote: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

describe('dashboard.service follow-up reads', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T10:30:00.000Z'));
  });

  it('returns task-shaped dashboard follow-ups from the earliest pending task per project and ignores legacy project.followUpDate', async () => {
    prismaMock.prisma.commissionSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.project.count.mockResolvedValue(0);
    prismaMock.prisma.project.findMany
      .mockResolvedValueOnce([
        {
          projectTotal: 0,
          customerPaid: 0,
          followUpDate: new Date('2026-04-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.aimannDebtLedger.findFirst.mockResolvedValue(null);
    prismaMock.prisma.project.groupBy.mockResolvedValue([]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([
      {
        id: 'task-1',
        sequenceId: 'sequence-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_3,
        dueDate: new Date('2026-04-08T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        sequence: {
          id: 'sequence-1',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-1',
          customer: 'Jane Doe',
          address: '123 Fence Lane',
          status: ProjectStatus.ESTIMATE,
          isDeleted: false,
        },
      },
      {
        id: 'task-0',
        sequenceId: 'sequence-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_1,
        dueDate: new Date('2026-04-07T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        sequence: {
          id: 'sequence-1',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-1',
          customer: 'Jane Doe',
          address: '123 Fence Lane',
          status: ProjectStatus.ESTIMATE,
          isDeleted: false,
        },
      },
      {
        id: 'task-2',
        sequenceId: 'sequence-2',
        projectId: 'project-2',
        kind: EstimateFollowUpTaskKind.DAY_3,
        dueDate: new Date('2026-04-08T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        sequence: {
          id: 'sequence-2',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-2',
          customer: 'John Smith',
          address: '456 Cedar Ave',
          status: ProjectStatus.OPEN,
          isDeleted: false,
        },
      },
    ]);
    prismaMock.prisma.calendarEvent.findMany.mockResolvedValue([]);
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(prismaMock.prisma.estimateFollowUpTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EstimateFollowUpTaskStatus.PENDING,
          dueDate: expect.objectContaining({
            lte: expect.any(Date),
          }),
          sequence: {
            status: EstimateFollowUpSequenceStatus.ACTIVE,
          },
          project: {
            isDeleted: false,
          },
        }),
      })
    );
    expect(result.todaysFollowUps).toEqual([
      {
        id: 'task-0',
        actionId: 'task-0',
        projectId: 'project-1',
        customer: 'Jane Doe',
        address: '123 Fence Lane',
        status: ProjectStatus.ESTIMATE,
        dueDate: '2026-04-07',
        kind: EstimateFollowUpTaskKind.DAY_1,
        title: null,
        notes: null,
        href: '/projects/project-1?tab=follow-up',
        assignedToUserId: null,
        source: 'ESTIMATE_FOLLOW_UP',
      },
      {
        id: 'task-2',
        actionId: 'task-2',
        projectId: 'project-2',
        customer: 'John Smith',
        address: '456 Cedar Ave',
        status: ProjectStatus.OPEN,
        dueDate: '2026-04-08',
        kind: EstimateFollowUpTaskKind.DAY_3,
        title: null,
        notes: null,
        href: '/projects/project-2?tab=follow-up',
        assignedToUserId: null,
        source: 'ESTIMATE_FOLLOW_UP',
      },
    ]);
    expect(
      prismaMock.prisma.estimateFollowUpTask.findMany.mock.calls[0][0]
    ).toEqual(
      expect.objectContaining({
        orderBy: [{ dueDate: 'asc' }, { projectId: 'asc' }],
      })
    );

    vi.useRealTimers();
  });

  it('excludes skipped, closed-sequence, and deleted-project follow-up tasks from the dashboard list', async () => {
    prismaMock.prisma.commissionSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.project.count.mockResolvedValue(0);
    prismaMock.prisma.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.aimannDebtLedger.findFirst.mockResolvedValue(null);
    prismaMock.prisma.project.groupBy.mockResolvedValue([]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([
      {
        id: 'task-skipped',
        sequenceId: 'sequence-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_1,
        dueDate: new Date('2026-04-08T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.SKIPPED,
        sequence: {
          id: 'sequence-1',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-1',
          customer: 'Skipped Lead',
          address: '1 Elm St',
          status: ProjectStatus.ESTIMATE,
          isDeleted: false,
        },
      },
      {
        id: 'task-closed',
        sequenceId: 'sequence-2',
        projectId: 'project-2',
        kind: EstimateFollowUpTaskKind.DAY_3,
        dueDate: new Date('2026-04-08T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        sequence: {
          id: 'sequence-2',
          status: EstimateFollowUpSequenceStatus.CLOSED,
        },
        project: {
          id: 'project-2',
          customer: 'Closed Lead',
          address: '2 Oak St',
          status: ProjectStatus.ESTIMATE,
          isDeleted: false,
        },
      },
      {
        id: 'task-deleted',
        sequenceId: 'sequence-3',
        projectId: 'project-3',
        kind: EstimateFollowUpTaskKind.DAY_7,
        dueDate: new Date('2026-04-08T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        sequence: {
          id: 'sequence-3',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-3',
          customer: 'Deleted Lead',
          address: '3 Pine St',
          status: ProjectStatus.ESTIMATE,
          isDeleted: true,
        },
      },
    ]);
    prismaMock.prisma.calendarEvent.findMany.mockResolvedValue([]);
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(result.todaysFollowUps).toEqual([]);

    vi.useRealTimers();
  });

  it('includes manual follow-up calendar events in dashboard tasks and command queue', async () => {
    prismaMock.prisma.commissionSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.project.count.mockResolvedValue(0);
    prismaMock.prisma.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.aimannDebtLedger.findFirst.mockResolvedValue(null);
    prismaMock.prisma.project.groupBy.mockResolvedValue([]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([]);
    prismaMock.prisma.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        title: 'Collect signed HOA form',
        date: new Date('2026-04-08T00:00:00.000Z'),
        eventType: 'followup',
        notes: 'Need this before install scheduling.',
        projectId: 'project-77',
        project: {
          id: 'project-77',
          customer: 'Sharon Harbach',
          address: '321 River Meadows Ln',
          status: ProjectStatus.OPEN,
          isDeleted: false,
        },
      },
      {
        id: 'event-2',
        title: 'Already completed',
        date: new Date('2026-04-08T00:00:00.000Z'),
        eventType: 'followup',
        notes: 'Should stay off the dashboard.',
        projectId: 'project-78',
        isWorkflowTask: false,
        taskStatus: 'COMPLETED',
        completedAt: new Date('2026-04-08T12:00:00.000Z'),
        assignedToUserId: null,
        assignedToUser: null,
        project: {
          id: 'project-78',
          customer: 'Completed Reminder',
          address: '999 Archive Rd',
          status: ProjectStatus.OPEN,
          isDeleted: false,
        },
      },
    ]);
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(prismaMock.prisma.calendarEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: 'followup',
          date: expect.objectContaining({
            lte: expect.any(Date),
          }),
        }),
      }),
    );
    expect(result.todaysFollowUps).toEqual([
      {
        id: 'manual-event-1',
        actionId: 'event-1',
        projectId: 'project-77',
        customer: 'Sharon Harbach',
        address: '321 River Meadows Ln',
        status: ProjectStatus.OPEN,
        dueDate: '2026-04-08',
        kind: 'MANUAL',
        title: 'Collect signed HOA form',
        notes: 'Need this before install scheduling.',
        href: '/calendar?date=2026-04-08&eventId=event-1',
        assignedToUserId: null,
        assignedToName: null,
        source: 'MANUAL_TASK',
      },
    ]);
    expect(result.commandQueue.actionNeeded).toContainEqual({
      id: 'followup-manual-event-1',
      actionId: 'event-1',
      projectId: 'project-77',
      customer: 'Sharon Harbach',
      address: '321 River Meadows Ln',
      title: 'Collect signed HOA form',
      reason: 'Need this before install scheduling.',
      urgency: 'MEDIUM',
      financeProjectMode: null,
      href: '/calendar?date=2026-04-08&eventId=event-1',
      source: 'MANUAL_TASK',
      assignedToUserId: null,
      dueDate: '2026-04-08',
      assignedToName: null,
    });
    expect(result.todaysFollowUps.find((task) => task.id === 'manual-event-2')).toBeUndefined();

    vi.useRealTimers();
  });

  it('uses pending workflow tasks as owned dashboard actions and excludes completed ones', async () => {
    prismaMock.prisma.commissionSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.project.count.mockResolvedValue(0);
    prismaMock.prisma.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.aimannDebtLedger.findFirst.mockResolvedValue(null);
    prismaMock.prisma.project.groupBy.mockResolvedValue([]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([]);
    prismaMock.prisma.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        title: 'Collect HOA approval',
        date: new Date('2026-04-08T00:00:00.000Z'),
        eventType: 'followup',
        notes: 'Needed before install lock-in.',
        projectId: 'project-77',
        isWorkflowTask: true,
        taskStatus: 'PENDING',
        completedAt: null,
        assignedToUserId: 'user-2',
        assignedToUser: {
          id: 'user-2',
          name: 'Office Admin',
        },
        project: {
          id: 'project-77',
          customer: 'Sharon Harbach',
          address: '321 River Meadows Ln',
          status: ProjectStatus.OPEN,
          isDeleted: false,
        },
      },
      {
        id: 'event-2',
        title: 'Already done',
        date: new Date('2026-04-08T00:00:00.000Z'),
        eventType: 'followup',
        notes: 'Should not show in action needed.',
        projectId: 'project-77',
        isWorkflowTask: true,
        taskStatus: 'COMPLETED',
        completedAt: new Date('2026-04-08T15:00:00.000Z'),
        assignedToUserId: 'user-2',
        assignedToUser: {
          id: 'user-2',
          name: 'Office Admin',
        },
        project: {
          id: 'project-77',
          customer: 'Sharon Harbach',
          address: '321 River Meadows Ln',
          status: ProjectStatus.OPEN,
          isDeleted: false,
        },
      },
    ]);
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(result.todaysFollowUps).toEqual([
      {
        id: 'manual-event-1',
        actionId: 'event-1',
        projectId: 'project-77',
        customer: 'Sharon Harbach',
        address: '321 River Meadows Ln',
        status: ProjectStatus.OPEN,
        dueDate: '2026-04-08',
        kind: 'MANUAL',
        title: 'Collect HOA approval',
        notes: 'Needed before install lock-in.',
        href: '/calendar?date=2026-04-08&eventId=event-1',
        assignedToUserId: 'user-2',
        assignedToName: 'Office Admin',
        source: 'WORKFLOW_TASK',
      },
    ]);
    expect(result.commandQueue.actionNeeded).toContainEqual({
      id: 'followup-manual-event-1',
      actionId: 'event-1',
      projectId: 'project-77',
      customer: 'Sharon Harbach',
      address: '321 River Meadows Ln',
      title: 'Collect HOA approval',
      reason: 'Needed before install lock-in.',
      urgency: 'MEDIUM',
      financeProjectMode: null,
      href: '/calendar?date=2026-04-08&eventId=event-1',
      source: 'WORKFLOW_TASK',
      assignedToUserId: 'user-2',
      assignedToName: 'Office Admin',
      dueDate: '2026-04-08',
    });

    vi.useRealTimers();
  });

  it('uses imported receivables truth for the outstanding receivables KPI', async () => {
    prismaMock.prisma.commissionSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.project.count.mockResolvedValue(2);
    prismaMock.prisma.project.findMany
      .mockResolvedValueOnce([
        {
          projectTotal: 10000,
          customerPaid: 9800,
          importedOutstandingReceivables: 0,
          receivablesSource: FinanceFieldSource.IMPORTED_ACTUAL,
        },
        {
          projectTotal: 12000,
          customerPaid: 11000,
          importedOutstandingReceivables: 3500,
          receivablesSource: FinanceFieldSource.IMPORTED_ACTUAL,
        },
        {
          projectTotal: 5000,
          customerPaid: 4500,
          importedOutstandingReceivables: null,
          receivablesSource: FinanceFieldSource.CRM_COMPUTED,
        },
        {
          projectTotal: 9000,
          customerPaid: 7000,
          importedOutstandingReceivables: null,
          receivablesSource: FinanceFieldSource.IMPORTED_ACTUAL,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'p-imported-missing',
          customer: 'Imported Missing',
          address: '77 Ledger St',
          projectTotal: 9000,
          customerPaid: 7000,
          importedOutstandingReceivables: null,
          receivablesSource: FinanceFieldSource.IMPORTED_ACTUAL,
          financeProjectMode: 'IMPORTED',
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.aimannDebtLedger.findFirst.mockResolvedValue(null);
    prismaMock.prisma.project.groupBy.mockResolvedValue([]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([]);
    prismaMock.prisma.calendarEvent.findMany.mockResolvedValue([]);
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(result.kpis.outstandingReceivables).toBe(6000);
    expect(result.commandQueue.moneyAtRisk.find((item) => item.title === 'Imported receivable needs reconciliation')).toEqual(
      expect.objectContaining({
        title: 'Imported receivable needs reconciliation',
      })
    );
    expect(prismaMock.prisma.project.findMany.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        select: expect.objectContaining({
          importedOutstandingReceivables: true,
          receivablesSource: true,
        }),
      })
    );

    vi.useRealTimers();
  });

  it('builds schedule blocker lane items from install readiness blockers', async () => {
    prismaMock.prisma.commissionSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.project.count.mockResolvedValue(0);
    prismaMock.prisma.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'project-blocked',
          customer: 'Blocked Install',
          address: '500 Delay Dr',
          status: ProjectStatus.OPEN,
          installDate: new Date('2026-04-12T00:00:00.000Z'),
          customerPaid: 0,
          materialsCost: 0,
          subcontractor: null,
          financeProjectMode: 'MIXED',
          _count: {
            materialLineItems: 0,
            workOrders: 0,
          },
        }, {
          id: 'project-ready',
          customer: 'Ready Install',
          address: '501 Go Ln',
          status: ProjectStatus.IN_PROGRESS,
          installDate: new Date('2026-04-20T00:00:00.000Z'),
          customerPaid: 2500,
          materialsCost: 1200,
          subcontractor: 'Froilan',
          financeProjectMode: 'COMPUTED',
          _count: {
            materialLineItems: 2,
            workOrders: 1,
          },
        },
      ]);
    prismaMock.prisma.aimannDebtLedger.findFirst.mockResolvedValue(null);
    prismaMock.prisma.project.groupBy.mockResolvedValue([]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([]);
    prismaMock.prisma.calendarEvent.findMany.mockResolvedValue([]);
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(result.commandQueue.scheduleBlockers).toEqual([
      {
        id: 'schedule-project-blocked',
        projectId: 'project-blocked',
        customer: 'Blocked Install',
        address: '500 Delay Dr',
        title: '4 readiness blockers',
        reason: 'Missing deposit, materials, crew, and work order',
        urgency: 'HIGH',
        financeProjectMode: 'MIXED',
      },
    ]);
    expect(
      prismaMock.prisma.project.findMany.mock.calls.some(([args]) =>
        Array.isArray(args?.where?.status?.in)
        && args.where.status.in.includes(ProjectStatus.OPEN)
        && args.where.status.in.includes(ProjectStatus.IN_PROGRESS)
        && !('take' in args)
      )
    ).toBe(true);
  });

  it('builds a workflow overview from pending workflow tasks with overdue, due-today, upcoming, and unassigned counts', async () => {
    prismaMock.prisma.commissionSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.project.count.mockResolvedValue(0);
    prismaMock.prisma.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.aimannDebtLedger.findFirst.mockResolvedValue(null);
    prismaMock.prisma.project.groupBy.mockResolvedValue([]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([]);
    prismaMock.prisma.calendarEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'wf-overdue',
          title: 'Collect deposit',
          date: new Date('2026-04-07T00:00:00.000Z'),
          eventType: 'followup',
          notes: 'Need before ordering materials.',
          projectId: 'project-1',
          isWorkflowTask: true,
          taskStatus: 'PENDING',
          completedAt: null,
          assignedToUserId: 'user-2',
          assignedToUser: {
            id: 'user-2',
            name: 'Office Admin',
          },
          project: {
            id: 'project-1',
            customer: 'Sharon Harbach',
            address: '321 River Meadows Ln',
            status: ProjectStatus.OPEN,
            isDeleted: false,
          },
        },
        {
          id: 'wf-today',
          title: 'Confirm crew',
          date: new Date('2026-04-08T00:00:00.000Z'),
          eventType: 'followup',
          notes: 'Need subcontractor confirmation.',
          projectId: 'project-2',
          isWorkflowTask: true,
          taskStatus: 'PENDING',
          completedAt: null,
          assignedToUserId: null,
          assignedToUser: null,
          project: {
            id: 'project-2',
            customer: 'Joshu Dunn. Honda Dealership',
            address: '601 S Central Expressway',
            status: ProjectStatus.IN_PROGRESS,
            isDeleted: false,
          },
        },
        {
          id: 'wf-upcoming',
          title: 'Send install reminder',
          date: new Date('2026-04-10T00:00:00.000Z'),
          eventType: 'followup',
          notes: 'Customer reminder call.',
          projectId: 'project-3',
          isWorkflowTask: true,
          taskStatus: 'PENDING',
          completedAt: null,
          assignedToUserId: 'user-3',
          assignedToUser: {
            id: 'user-3',
            name: 'Adnaan',
          },
          project: {
            id: 'project-3',
            customer: 'Will & Marta (phase 1)',
            address: '1141 Macgregor Ln',
            status: ProjectStatus.OPEN,
            isDeleted: false,
          },
        },
      ]);
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(result.workflowOverview).toEqual({
      overdueCount: 1,
      dueTodayCount: 1,
      upcomingCount: 1,
      unassignedCount: 1,
      ownerBreakdown: [
        { ownerName: 'Office Admin', count: 1 },
        { ownerName: 'Adnaan', count: 1 },
        { ownerName: 'Unassigned', count: 1 },
      ],
      tasks: [
        {
          id: 'wf-overdue',
          projectId: 'project-1',
          customer: 'Sharon Harbach',
          address: '321 River Meadows Ln',
          title: 'Collect deposit',
          dueDate: '2026-04-07',
          assignedToUserId: 'user-2',
          assignedToName: 'Office Admin',
          href: '/calendar?date=2026-04-07&eventId=wf-overdue',
          urgency: 'HIGH',
        },
        {
          id: 'wf-today',
          projectId: 'project-2',
          customer: 'Joshu Dunn. Honda Dealership',
          address: '601 S Central Expressway',
          title: 'Confirm crew',
          dueDate: '2026-04-08',
          assignedToUserId: null,
          assignedToName: null,
          href: '/calendar?date=2026-04-08&eventId=wf-today',
          urgency: 'MEDIUM',
        },
        {
          id: 'wf-upcoming',
          projectId: 'project-3',
          customer: 'Will & Marta (phase 1)',
          address: '1141 Macgregor Ln',
          title: 'Send install reminder',
          dueDate: '2026-04-10',
          assignedToUserId: 'user-3',
          assignedToName: 'Adnaan',
          href: '/calendar?date=2026-04-10&eventId=wf-upcoming',
          urgency: 'LOW',
        },
      ],
      topTasks: [
        {
          id: 'wf-overdue',
          projectId: 'project-1',
          customer: 'Sharon Harbach',
          address: '321 River Meadows Ln',
          title: 'Collect deposit',
          dueDate: '2026-04-07',
          assignedToUserId: 'user-2',
          assignedToName: 'Office Admin',
          href: '/calendar?date=2026-04-07&eventId=wf-overdue',
          urgency: 'HIGH',
        },
        {
          id: 'wf-today',
          projectId: 'project-2',
          customer: 'Joshu Dunn. Honda Dealership',
          address: '601 S Central Expressway',
          title: 'Confirm crew',
          dueDate: '2026-04-08',
          assignedToUserId: null,
          assignedToName: null,
          href: '/calendar?date=2026-04-08&eventId=wf-today',
          urgency: 'MEDIUM',
        },
        {
          id: 'wf-upcoming',
          projectId: 'project-3',
          customer: 'Will & Marta (phase 1)',
          address: '1141 Macgregor Ln',
          title: 'Send install reminder',
          dueDate: '2026-04-10',
          assignedToUserId: 'user-3',
          assignedToName: 'Adnaan',
          href: '/calendar?date=2026-04-10&eventId=wf-upcoming',
          urgency: 'LOW',
        },
      ],
    });

    vi.useRealTimers();
  });
});
