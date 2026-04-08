import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
} from '@fencetastic/shared';

const prismaMock = vi.hoisted(() => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
    estimateFollowUpTask: {
      findMany: vi.fn(),
    },
    calendarEvent: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

describe('calendar.service follow-up reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns calendar follow-up events from pending follow-up tasks and ignores legacy project.followUpDate', async () => {
    prismaMock.prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-legacy',
        customer: 'Legacy Lead',
        estimateDate: null,
        installDate: null,
        completedDate: null,
        followUpDate: new Date('2026-04-12T00:00:00.000Z'),
      },
    ]);
    prismaMock.prisma.estimateFollowUpTask.findMany.mockResolvedValue([
      {
        id: 'task-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_7,
        dueDate: new Date('2026-04-14T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        notes: 'Call after lunch',
        sequence: {
          id: 'sequence-1',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-1',
          customer: 'Jane Doe',
          isDeleted: false,
        },
      },
      {
        id: 'task-skipped',
        projectId: 'project-2',
        kind: EstimateFollowUpTaskKind.DAY_3,
        dueDate: new Date('2026-04-11T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.SKIPPED,
        notes: 'Should be excluded',
        sequence: {
          id: 'sequence-2',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-2',
          customer: 'Skipped Lead',
          isDeleted: false,
        },
      },
      {
        id: 'task-closed',
        projectId: 'project-3',
        kind: EstimateFollowUpTaskKind.DAY_3,
        dueDate: new Date('2026-04-12T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        notes: 'Closed sequence',
        sequence: {
          id: 'sequence-3',
          status: EstimateFollowUpSequenceStatus.CLOSED,
        },
        project: {
          id: 'project-3',
          customer: 'Closed Lead',
          isDeleted: false,
        },
      },
      {
        id: 'task-deleted',
        projectId: 'project-4',
        kind: EstimateFollowUpTaskKind.DAY_14,
        dueDate: new Date('2026-04-13T00:00:00.000Z'),
        status: EstimateFollowUpTaskStatus.PENDING,
        notes: 'Deleted project',
        sequence: {
          id: 'sequence-4',
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          id: 'project-4',
          customer: 'Deleted Lead',
          isDeleted: true,
        },
      },
    ]);
    prismaMock.prisma.calendarEvent.findMany.mockResolvedValue([]);

    const { getCalendarEvents } = await import('../services/calendar.service');
    const result = await getCalendarEvents('2026-04-01', '2026-04-30');

    expect(prismaMock.prisma.estimateFollowUpTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EstimateFollowUpTaskStatus.PENDING,
          dueDate: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
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
    expect(result).toContainEqual({
      id: 'followup-task-1',
      title: 'Jane Doe — Follow-Up',
      start: '2026-04-14',
      end: '2026-04-14',
      type: 'followup',
      projectId: 'project-1',
      color: '#F59E0B',
      notes: 'Call after lunch',
    });
    expect(result).toHaveLength(1);
    expect(result.find((event) => event.id === 'followup-project-legacy')).toBeUndefined();
  });
});
