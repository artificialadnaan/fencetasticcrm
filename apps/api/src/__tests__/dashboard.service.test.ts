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

  it('returns dashboard follow-ups from pending follow-up tasks instead of project.followUpDate', async () => {
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
        id: 'project-1',
        customer: 'Jane Doe',
        address: '123 Fence Lane',
        status: ProjectStatus.ESTIMATE,
        followUpDate: '2026-04-08',
      },
    ]);

    vi.useRealTimers();
  });
});
