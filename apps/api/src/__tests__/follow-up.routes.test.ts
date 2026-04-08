import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
} from '@fencetastic/shared';

const ensureEstimateFollowUpSequenceMock = vi.fn();
const updateFollowUpTaskMock = vi.fn();
const completeFollowUpTaskMock = vi.fn();
const closeFollowUpSequenceMock = vi.fn();

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: { user?: { userId: string } }, _res: unknown, next: () => void) => {
    req.user = { userId: 'user-1' };
    next();
  },
}));

vi.mock('../services/follow-up.service', () => ({
  ensureEstimateFollowUpSequence: ensureEstimateFollowUpSequenceMock,
  updateFollowUpTask: updateFollowUpTaskMock,
  completeFollowUpTask: completeFollowUpTaskMock,
  closeFollowUpSequence: closeFollowUpSequenceMock,
}));

function buildTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440002',
    sequenceId: '550e8400-e29b-41d4-a716-446655440001',
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    kind: EstimateFollowUpTaskKind.DAY_1,
    dueDate: '2026-04-08',
    status: EstimateFollowUpTaskStatus.PENDING,
    draftSubject: 'Subject',
    draftBody: 'Body',
    completedAt: null,
    completedByUserId: null,
    notes: null,
    createdAt: '2026-04-07T09:00:00.000Z',
    updatedAt: '2026-04-07T09:00:00.000Z',
    ...overrides,
  };
}

function buildSummary() {
  const task = buildTask();
  return {
    sequence: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      status: EstimateFollowUpSequenceStatus.ACTIVE,
      startedAt: '2026-04-07T09:00:00.000Z',
      closedAt: null,
      closedSummary: null,
      lostReasonCode: null,
      lostReasonNotes: null,
      createdAt: '2026-04-07T09:00:00.000Z',
      updatedAt: '2026-04-07T09:00:00.000Z',
    },
    tasks: [task],
    nextPendingTask: task,
  };
}

async function runRoute(
  route: { stack: Array<{ handle: (req: any, res: any, next: (err?: unknown) => void) => unknown }> },
  req: Record<string, unknown>
) {
  let responseSent = false;

  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn((payload: unknown) => {
      void payload;
      responseSent = true;
      return res;
    }),
    send: vi.fn((payload?: unknown) => {
      void payload;
      responseSent = true;
      return res;
    }),
  };

  for (const stackEntry of route.stack) {
    if (responseSent) break;

    await new Promise<void>((resolve, reject) => {
      let advanced = false;
      const maybePromise = stackEntry.handle(req, res, (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        advanced = true;
        resolve();
      });

      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        (maybePromise as Promise<unknown>).then(() => resolve(), reject);
        return;
      }

      if (responseSent || advanced) {
        resolve();
      }
    });
  }

  return res;
}

async function getRoute(
  path: string,
  method: 'get' | 'patch' | 'post'
) {
  const { followUpRouter } = await import('../routes/follow-ups');
  const layer = followUpRouter.stack.find(
    (entry: any) => entry.route?.path === path && entry.route?.methods?.[method]
  );

  if (!layer?.route) {
    throw new Error(`${method.toUpperCase()} ${path} route not registered`);
  }

  return layer.route;
}

describe('follow-up routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a project follow-up summary from GET /api/follow-ups/projects/:projectId', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const summary = buildSummary();
    ensureEstimateFollowUpSequenceMock.mockResolvedValue(summary);

    const route = await getRoute('/projects/:projectId', 'get');
    const res = await runRoute(route, {
      params: { projectId },
      body: {},
      query: {},
      headers: { authorization: 'Bearer token' },
    });

    expect(ensureEstimateFollowUpSequenceMock).toHaveBeenCalledWith(projectId, 'user-1');
    expect(res.json).toHaveBeenCalledWith({ data: summary });
  });

  it('updates draft subject/body and notes from PATCH /api/follow-ups/tasks/:taskId', async () => {
    const taskId = '550e8400-e29b-41d4-a716-446655440003';
    const payload = {
      draftSubject: 'Updated subject',
      draftBody: 'Updated body',
      notes: 'Updated notes',
    };
    const updatedTask = buildTask({
      id: taskId,
      kind: EstimateFollowUpTaskKind.DAY_3,
      dueDate: '2026-04-10',
      ...payload,
      updatedAt: '2026-04-08T09:00:00.000Z',
    });
    updateFollowUpTaskMock.mockResolvedValue(updatedTask);

    const route = await getRoute('/tasks/:taskId', 'patch');
    const res = await runRoute(route, {
      params: { taskId },
      body: payload,
      query: {},
      headers: { authorization: 'Bearer token' },
    });

    expect(updateFollowUpTaskMock).toHaveBeenCalledWith(taskId, payload);
    expect(res.json).toHaveBeenCalledWith({ data: updatedTask });
  });

  it('completes a follow-up task from POST /api/follow-ups/tasks/:taskId/complete', async () => {
    const taskId = '550e8400-e29b-41d4-a716-446655440003';
    const completedTask = buildTask({
      id: taskId,
      status: EstimateFollowUpTaskStatus.COMPLETED,
      completedAt: '2026-04-08T12:30:00.000Z',
      completedByUserId: 'user-1',
    });
    completeFollowUpTaskMock.mockResolvedValue(completedTask);

    const route = await getRoute('/tasks/:taskId/complete', 'post');
    const res = await runRoute(route, {
      params: { taskId },
      body: {},
      query: {},
      headers: { authorization: 'Bearer token' },
    });

    expect(completeFollowUpTaskMock).toHaveBeenCalledWith(taskId, 'user-1');
    expect(res.json).toHaveBeenCalledWith({ data: completedTask });
  });

  it('closes a follow-up sequence from POST /api/follow-ups/sequences/:sequenceId/close', async () => {
    const sequenceId = '550e8400-e29b-41d4-a716-446655440001';
    const payload = {
      status: EstimateFollowUpSequenceStatus.LOST,
      closedSummary: 'Customer chose another bid',
      lostReasonCode: EstimateFollowUpLostReasonCode.CHOSE_COMPETITOR,
      lostReasonNotes: 'Went with a lower quote',
    };
    const closedSummary = {
      ...buildSummary(),
      sequence: {
        ...buildSummary().sequence,
        id: sequenceId,
        status: EstimateFollowUpSequenceStatus.LOST,
        closedAt: '2026-04-08T12:30:00.000Z',
        closedSummary: payload.closedSummary,
        lostReasonCode: payload.lostReasonCode,
        lostReasonNotes: payload.lostReasonNotes,
      },
    };
    closeFollowUpSequenceMock.mockResolvedValue(closedSummary);

    const route = await getRoute('/sequences/:sequenceId/close', 'post');
    const res = await runRoute(route, {
      params: { sequenceId },
      body: payload,
      query: {},
      headers: { authorization: 'Bearer token' },
    });

    expect(closeFollowUpSequenceMock).toHaveBeenCalledWith(sequenceId, payload);
    expect(res.json).toHaveBeenCalledWith({ data: closedSummary });
  });

  it('rejects closing a sequence as LOST without lost reason details at the route boundary', async () => {
    const sequenceId = '550e8400-e29b-41d4-a716-446655440001';
    const route = await getRoute('/sequences/:sequenceId/close', 'post');
    const res = await runRoute(route, {
      params: { sequenceId },
      body: {
        status: EstimateFollowUpSequenceStatus.LOST,
        closedSummary: 'Customer stopped replying',
      },
      query: {},
      headers: { authorization: 'Bearer token' },
    });

    expect(closeFollowUpSequenceMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
      })
    );
  });
});
