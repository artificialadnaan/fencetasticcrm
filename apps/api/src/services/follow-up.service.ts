import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequence,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTask,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
  ProjectFollowUpSummary,
} from '@fencetastic/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';

type FollowUpDelegate = {
  findFirst: (args: Record<string, unknown>) => Promise<unknown>;
  findUnique: (args: Record<string, unknown>) => Promise<unknown>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  updateMany?: (args: Record<string, unknown>) => Promise<unknown>;
};

type FollowUpTx = {
  project: {
    findUnique: (args: Record<string, unknown>) => Promise<unknown>;
  };
  estimateFollowUpSequence: FollowUpDelegate;
  estimateFollowUpTask: Required<Pick<FollowUpDelegate, 'findUnique' | 'update' | 'updateMany'>>;
};

type FollowUpPrismaClient = FollowUpTx & {
  $transaction: <T>(callback: (tx: FollowUpTx) => Promise<T>) => Promise<T>;
};

type FollowUpProjectRow = {
  id: string;
  customer: string;
  description: string;
  estimateDate: Date | null;
};

type FollowUpTaskRow = {
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
  sequence?: {
    id: string;
    status: EstimateFollowUpSequenceStatus;
  } | null;
};

type FollowUpSequenceRow = {
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
  tasks: FollowUpTaskRow[];
};

export type UpdateEstimateFollowUpTaskInput = {
  draftSubject?: string;
  draftBody?: string;
  notes?: string | null;
};

export type CloseEstimateFollowUpSequenceInput = {
  status: EstimateFollowUpSequenceStatus.WON | EstimateFollowUpSequenceStatus.LOST | EstimateFollowUpSequenceStatus.CLOSED;
  closedSummary?: string | null;
  lostReasonCode?: EstimateFollowUpLostReasonCode | null;
  lostReasonNotes?: string | null;
};

export const FOLLOW_UP_DAY_OFFSETS: Array<[EstimateFollowUpTaskKind, number]> = [
  [EstimateFollowUpTaskKind.DAY_1, 1],
  [EstimateFollowUpTaskKind.DAY_3, 3],
  [EstimateFollowUpTaskKind.DAY_7, 7],
  [EstimateFollowUpTaskKind.DAY_14, 14],
];

export function buildDraftSubject(customer: string, kind: EstimateFollowUpTaskKind) {
  return `Fencetastic estimate follow-up (${kind.replace('_', ' ')}) for ${customer}`;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function buildDraftBody(project: FollowUpProjectRow, kind: EstimateFollowUpTaskKind) {
  const estimateDate = project.estimateDate
    ? startOfUtcDay(project.estimateDate).toISOString().slice(0, 10)
    : 'recently';

  return [
    `Hi ${project.customer},`,
    '',
    `Following up on your ${project.description.toLowerCase()} estimate from ${estimateDate}.`,
    `This is your ${kind.replace('_', ' ').toLowerCase()} follow-up from Fencetastic.`,
    '',
    'Let us know if you have any questions or if you would like to move forward.',
  ].join('\n');
}

function mapTask(row: FollowUpTaskRow): EstimateFollowUpTask {
  return {
    id: row.id,
    sequenceId: row.sequenceId,
    projectId: row.projectId,
    kind: row.kind,
    dueDate: row.dueDate.toISOString(),
    status: row.status,
    draftSubject: row.draftSubject,
    draftBody: row.draftBody,
    completedAt: toIsoString(row.completedAt),
    completedByUserId: row.completedByUserId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSequence(row: FollowUpSequenceRow): EstimateFollowUpSequence {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    closedAt: toIsoString(row.closedAt),
    closedSummary: row.closedSummary,
    lostReasonCode: row.lostReasonCode,
    lostReasonNotes: row.lostReasonNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sortTasks(tasks: FollowUpTaskRow[]) {
  return [...tasks].sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
}

function mapProjectFollowUpSummary(row: FollowUpSequenceRow): ProjectFollowUpSummary {
  const sortedTasks = sortTasks(row.tasks).map(mapTask);

  return {
    sequence: mapSequence(row),
    tasks: sortedTasks,
    nextPendingTask:
      sortedTasks.find((task) => task.status === EstimateFollowUpTaskStatus.PENDING) ?? null,
  };
}

function requireMutableSequence(status: EstimateFollowUpSequenceStatus) {
  if (status !== EstimateFollowUpSequenceStatus.ACTIVE) {
    throw new AppError(400, 'Follow-up sequence is already closed', 'FOLLOW_UP_SEQUENCE_CLOSED');
  }
}

function requireLostReason(input: CloseEstimateFollowUpSequenceInput) {
  if (
    input.status === EstimateFollowUpSequenceStatus.LOST &&
    (!input.lostReasonCode || !input.lostReasonNotes?.trim())
  ) {
    throw new AppError(
      400,
      'Lost follow-up sequences require a reason code and notes',
      'FOLLOW_UP_LOST_REASON_REQUIRED'
    );
  }
}

function getFollowUpClient() {
  return prisma as unknown as FollowUpPrismaClient;
}

export async function ensureEstimateFollowUpSequence(projectId: string, _userId: string) {
  const client = getFollowUpClient();

  return client.$transaction(async (tx) => {
    const existing = await tx.estimateFollowUpSequence.findFirst({
      where: { projectId, status: EstimateFollowUpSequenceStatus.ACTIVE },
      include: { tasks: { orderBy: { dueDate: 'asc' } } },
    });

    if (existing) {
      return mapProjectFollowUpSummary(existing as FollowUpSequenceRow);
    }

    const project = (await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        customer: true,
        description: true,
        estimateDate: true,
      },
    })) as FollowUpProjectRow | null;

    if (!project) {
      throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
    }

    const anchorDate = startOfUtcDay(project.estimateDate ?? new Date());

    const created = await tx.estimateFollowUpSequence.create({
      data: {
        projectId,
        status: EstimateFollowUpSequenceStatus.ACTIVE,
        tasks: {
          create: FOLLOW_UP_DAY_OFFSETS.map(([kind, offset]) => ({
            projectId,
            kind,
            dueDate: addUtcDays(anchorDate, offset),
            draftSubject: buildDraftSubject(project.customer, kind),
            draftBody: buildDraftBody(project as FollowUpProjectRow, kind),
          })),
        },
      },
      include: {
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    return mapProjectFollowUpSummary(created as FollowUpSequenceRow);
  });
}

export async function completeFollowUpTask(taskId: string, userId: string) {
  const client = getFollowUpClient();

  const existing = await client.estimateFollowUpTask.findUnique({
    where: { id: taskId },
    include: {
      sequence: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError(404, 'Follow-up task not found', 'FOLLOW_UP_TASK_NOT_FOUND');
  }

  requireMutableSequence((existing as FollowUpTaskRow).sequence?.status ?? EstimateFollowUpSequenceStatus.ACTIVE);

  const updated = await client.estimateFollowUpTask.update({
    where: { id: taskId },
    data: {
      status: EstimateFollowUpTaskStatus.COMPLETED,
      completedAt: new Date(),
      completedByUserId: userId,
    },
  });

  return mapTask(updated as FollowUpTaskRow);
}

export async function updateFollowUpTask(taskId: string, input: UpdateEstimateFollowUpTaskInput) {
  const client = getFollowUpClient();

  const existing = await client.estimateFollowUpTask.findUnique({
    where: { id: taskId },
    include: {
      sequence: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError(404, 'Follow-up task not found', 'FOLLOW_UP_TASK_NOT_FOUND');
  }

  requireMutableSequence((existing as FollowUpTaskRow).sequence?.status ?? EstimateFollowUpSequenceStatus.ACTIVE);

  const updated = await client.estimateFollowUpTask.update({
    where: { id: taskId },
    data: {
      draftSubject: input.draftSubject,
      draftBody: input.draftBody,
      notes: input.notes,
    },
  });

  return mapTask(updated as FollowUpTaskRow);
}

export async function closeFollowUpSequence(
  sequenceId: string,
  input: CloseEstimateFollowUpSequenceInput
) {
  requireLostReason(input);

  const client = getFollowUpClient();

  return client.$transaction(async (tx) => {
    const closedAt = new Date();
    const existing = await tx.estimateFollowUpSequence.findUnique({
      where: { id: sequenceId },
      include: {
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'Follow-up sequence not found', 'FOLLOW_UP_SEQUENCE_NOT_FOUND');
    }

    requireMutableSequence((existing as FollowUpSequenceRow).status);

    await tx.estimateFollowUpTask.updateMany({
      where: {
        sequenceId,
        status: EstimateFollowUpTaskStatus.PENDING,
        dueDate: {
          gt: closedAt,
        },
      },
      data: {
        status: EstimateFollowUpTaskStatus.SKIPPED,
      },
    });

    const updated = await tx.estimateFollowUpSequence.update({
      where: { id: sequenceId },
      data: {
        status: input.status,
        closedAt,
        closedSummary: input.closedSummary ?? null,
        lostReasonCode:
          input.status === EstimateFollowUpSequenceStatus.LOST ? input.lostReasonCode ?? null : null,
        lostReasonNotes:
          input.status === EstimateFollowUpSequenceStatus.LOST ? input.lostReasonNotes?.trim() ?? null : null,
      },
      include: {
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    return mapProjectFollowUpSummary(updated as FollowUpSequenceRow);
  });
}
