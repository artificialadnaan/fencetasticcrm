import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
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
    vi.clearAllMocks();
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
        projectId: 'project-1',
        customer: 'Jane Doe',
        address: '123 Fence Lane',
        status: ProjectStatus.ESTIMATE,
        dueDate: '2026-04-07',
        kind: EstimateFollowUpTaskKind.DAY_1,
      },
      {
        id: 'task-2',
        projectId: 'project-2',
        customer: 'John Smith',
        address: '456 Cedar Ave',
        status: ProjectStatus.OPEN,
        dueDate: '2026-04-08',
        kind: EstimateFollowUpTaskKind.DAY_3,
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
    prismaMock.prisma.projectNote.findMany.mockResolvedValue([]);

    const { getDashboardData } = await import('../services/dashboard.service');
    const result = await getDashboardData();

    expect(result.todaysFollowUps).toEqual([]);

    vi.useRealTimers();
  });
});
