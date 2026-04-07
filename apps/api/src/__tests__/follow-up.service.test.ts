import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
} from '@fencetastic/shared';

const prismaMock = vi.hoisted(() => {
  const tx = {
    project: {
      findUnique: vi.fn(),
    },
    estimateFollowUpSequence: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    estimateFollowUpTask: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      project: tx.project,
      estimateFollowUpSequence: tx.estimateFollowUpSequence,
      estimateFollowUpTask: tx.estimateFollowUpTask,
      $transaction: vi.fn(async (callback: (trx: typeof tx) => Promise<unknown>) => callback(tx)),
    },
  };
});

vi.mock('../lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

type SequenceRow = {
  id: string;
  projectId: string;
  status: EstimateFollowUpSequenceStatus;
  startedAt: Date;
  closedAt: Date | null;
  closedSummary: string | null;
  lostReasonCode: EstimateFollowUpLostReasonCode | null;
  lostReasonNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: TaskRow[];
};

type TaskRow = {
  id: string;
  sequenceId: string;
  projectId: string;
  kind: EstimateFollowUpTaskKind;
  dueDate: Date;
  status: EstimateFollowUpTaskStatus;
  draftSubject: string;
  draftBody: string;
  completedAt: Date | null;
  completedByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function buildTaskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    sequenceId: 'sequence-1',
    projectId: 'project-1',
    kind: EstimateFollowUpTaskKind.DAY_1,
    dueDate: new Date('2026-04-08T00:00:00.000Z'),
    status: EstimateFollowUpTaskStatus.PENDING,
    draftSubject: 'Subject',
    draftBody: 'Body',
    completedAt: null,
    completedByUserId: null,
    notes: null,
    createdAt: new Date('2026-04-07T09:00:00.000Z'),
    updatedAt: new Date('2026-04-07T09:00:00.000Z'),
    ...overrides,
  };
}

function buildSequenceRow(overrides: Partial<SequenceRow> = {}): SequenceRow {
  return {
    id: 'sequence-1',
    projectId: 'project-1',
    status: EstimateFollowUpSequenceStatus.ACTIVE,
    startedAt: new Date('2026-04-07T09:00:00.000Z'),
    closedAt: null,
    closedSummary: null,
    lostReasonCode: null,
    lostReasonNotes: null,
    createdAt: new Date('2026-04-07T09:00:00.000Z'),
    updatedAt: new Date('2026-04-07T09:00:00.000Z'),
    tasks: [
      buildTaskRow({
        id: 'task-day-1',
        kind: EstimateFollowUpTaskKind.DAY_1,
        dueDate: new Date('2026-04-08T00:00:00.000Z'),
      }),
      buildTaskRow({
        id: 'task-day-3',
        kind: EstimateFollowUpTaskKind.DAY_3,
        dueDate: new Date('2026-04-10T00:00:00.000Z'),
      }),
      buildTaskRow({
        id: 'task-day-7',
        kind: EstimateFollowUpTaskKind.DAY_7,
        dueDate: new Date('2026-04-14T00:00:00.000Z'),
      }),
      buildTaskRow({
        id: 'task-day-14',
        kind: EstimateFollowUpTaskKind.DAY_14,
        dueDate: new Date('2026-04-21T00:00:00.000Z'),
      }),
    ],
    ...overrides,
  };
}

describe('follow-up.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates one active sequence and day 1/3/7/14 tasks from estimateDate', async () => {
    const estimateDate = new Date('2026-04-07T15:30:00.000Z');

    prismaMock.tx.estimateFollowUpSequence.findFirst.mockResolvedValue(null);
    prismaMock.tx.project.findUnique.mockResolvedValue({
      id: 'project-1',
      customer: 'Jane Doe',
      description: 'Cedar privacy fence',
      estimateDate,
    });
    prismaMock.tx.estimateFollowUpSequence.create.mockResolvedValue(buildSequenceRow());

    const { ensureEstimateFollowUpSequence } = await import('../services/follow-up.service');
    const result = await ensureEstimateFollowUpSequence('project-1', 'user-1');
    const createCall = prismaMock.tx.estimateFollowUpSequence.create.mock.calls[0][0];
    const createdTasks = createCall.data.tasks.create;

    expect(result.sequence?.status).toBe(EstimateFollowUpSequenceStatus.ACTIVE);
    expect(createdTasks.map((task: { kind: EstimateFollowUpTaskKind }) => task.kind)).toEqual([
      EstimateFollowUpTaskKind.DAY_1,
      EstimateFollowUpTaskKind.DAY_3,
      EstimateFollowUpTaskKind.DAY_7,
      EstimateFollowUpTaskKind.DAY_14,
    ]);
    expect(
      createdTasks.map((task: { dueDate: Date }) => task.dueDate.toISOString().slice(0, 10))
    ).toEqual([
      '2026-04-08',
      '2026-04-10',
      '2026-04-14',
      '2026-04-21',
    ]);
    expect(createdTasks[0].dueDate.toISOString()).toBe('2026-04-08T00:00:00.000Z');
    expect(createdTasks[0].dueDate.getTime()).not.toBe(estimateDate.getTime());
    expect(result.tasks.map((task) => task.kind)).toEqual([
      EstimateFollowUpTaskKind.DAY_1,
      EstimateFollowUpTaskKind.DAY_3,
      EstimateFollowUpTaskKind.DAY_7,
      EstimateFollowUpTaskKind.DAY_14,
    ]);
    expect(result.tasks.map((task) => task.dueDate.slice(0, 10))).toEqual([
      '2026-04-08',
      '2026-04-10',
      '2026-04-14',
      '2026-04-21',
    ]);
  });

  it('does not create a duplicate active sequence when called twice', async () => {
    const existing = buildSequenceRow();

    prismaMock.tx.project.findUnique.mockResolvedValue({
      id: 'project-1',
      customer: 'Jane Doe',
      description: 'Cedar privacy fence',
      estimateDate: new Date('2026-04-07T15:30:00.000Z'),
    });
    prismaMock.tx.estimateFollowUpSequence.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    prismaMock.tx.estimateFollowUpSequence.create.mockResolvedValue(existing);

    const { ensureEstimateFollowUpSequence } = await import('../services/follow-up.service');
    await ensureEstimateFollowUpSequence('project-1', 'user-1');
    const result = await ensureEstimateFollowUpSequence('project-1', 'user-1');

    expect(prismaMock.tx.estimateFollowUpSequence.create).toHaveBeenCalledTimes(1);
    expect(result.sequence?.id).toBe('sequence-1');
    expect(result.tasks).toHaveLength(4);
  });

  it('requires lost reason code and notes when closing as LOST', async () => {
    prismaMock.tx.estimateFollowUpSequence.findUnique.mockResolvedValue(
      buildSequenceRow()
    );

    const { closeFollowUpSequence } = await import('../services/follow-up.service');

    await expect(
      closeFollowUpSequence('sequence-1', {
        status: EstimateFollowUpSequenceStatus.LOST,
        closedSummary: 'Lead stopped responding',
      })
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 400,
      code: 'FOLLOW_UP_LOST_REASON_REQUIRED',
    });
  });

  it('marks future pending tasks skipped when closing a sequence', async () => {
    const closureMoment = new Date('2026-04-09T11:00:00.000Z');

    vi.useFakeTimers();
    vi.setSystemTime(closureMoment);

    prismaMock.tx.estimateFollowUpSequence.findUnique.mockResolvedValue(
      buildSequenceRow()
    );
    prismaMock.tx.estimateFollowUpTask.updateMany.mockResolvedValue({ count: 3 });
    prismaMock.tx.estimateFollowUpSequence.update.mockResolvedValue(
      buildSequenceRow({
        status: EstimateFollowUpSequenceStatus.CLOSED,
        closedAt: new Date('2026-04-09T11:00:00.000Z'),
        closedSummary: 'Customer asked to pause',
      })
    );

    const { closeFollowUpSequence } = await import('../services/follow-up.service');
    const result = await closeFollowUpSequence('sequence-1', {
      status: EstimateFollowUpSequenceStatus.CLOSED,
      closedSummary: 'Customer asked to pause',
    });

    try {
      expect(prismaMock.tx.estimateFollowUpTask.updateMany).toHaveBeenCalledWith({
        where: {
          sequenceId: 'sequence-1',
          status: EstimateFollowUpTaskStatus.PENDING,
          dueDate: {
            gt: closureMoment,
          },
        },
        data: {
          status: EstimateFollowUpTaskStatus.SKIPPED,
        },
      });
      expect(result.sequence?.status).toBe(EstimateFollowUpSequenceStatus.CLOSED);
      expect(result.sequence?.closedAt).toBe(closureMoment.toISOString());
    } finally {
      vi.useRealTimers();
    }
  });

  it('records completedAt and completedByUserId when a task is completed', async () => {
    prismaMock.tx.estimateFollowUpTask.findUnique.mockResolvedValue(
      buildTaskRow()
    );
    prismaMock.tx.estimateFollowUpTask.update.mockResolvedValue(
      buildTaskRow({
        status: EstimateFollowUpTaskStatus.COMPLETED,
        completedAt: new Date('2026-04-08T13:45:00.000Z'),
        completedByUserId: 'user-9',
      })
    );

    const { completeFollowUpTask } = await import('../services/follow-up.service');
    const result = await completeFollowUpTask('task-1', 'user-9');

    expect(prismaMock.tx.estimateFollowUpTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        status: EstimateFollowUpTaskStatus.COMPLETED,
        completedByUserId: 'user-9',
        completedAt: expect.any(Date),
      }),
    });
    expect(result.status).toBe(EstimateFollowUpTaskStatus.COMPLETED);
    expect(result.completedAt).not.toBeNull();
    expect(result.completedByUserId).toBe('user-9');
  });
});
