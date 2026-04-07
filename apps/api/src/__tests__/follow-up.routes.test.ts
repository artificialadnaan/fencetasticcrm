import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
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

async function runRoute(
  route: { stack: Array<{ handle: (req: any, res: any, next: (err?: unknown) => void) => unknown }> },
  req: Record<string, unknown>
) {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };

  for (const stackEntry of route.stack) {
    await new Promise<void>((resolve, reject) => {
      const maybePromise = stackEntry.handle(req, res, (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });

      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        (maybePromise as Promise<unknown>).then(() => resolve(), reject);
      }
    });
  }

  return res;
}

describe('follow-up routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a project follow-up summary from GET /api/follow-ups/projects/:projectId', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const summary = {
      sequence: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        projectId,
        status: EstimateFollowUpSequenceStatus.ACTIVE,
        startedAt: '2026-04-07T09:00:00.000Z',
        closedAt: null,
        closedSummary: null,
        lostReasonCode: null,
        lostReasonNotes: null,
        createdAt: '2026-04-07T09:00:00.000Z',
        updatedAt: '2026-04-07T09:00:00.000Z',
      },
      tasks: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          sequenceId: '550e8400-e29b-41d4-a716-446655440001',
          projectId,
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
        },
      ],
      nextPendingTask: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        sequenceId: '550e8400-e29b-41d4-a716-446655440001',
        projectId,
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
      },
    };
    ensureEstimateFollowUpSequenceMock.mockResolvedValue(summary);

    const { followUpRouter } = await import('../routes/follow-ups');
    const layer = followUpRouter.stack.find(
      (entry: any) => entry.route?.path === '/projects/:projectId' && entry.route?.methods?.get
    );

    if (!layer?.route) {
      throw new Error('GET /projects/:projectId route not registered');
    }

    const res = await runRoute(layer.route, {
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
    const updatedTask = {
      id: taskId,
      sequenceId: '550e8400-e29b-41d4-a716-446655440001',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      kind: EstimateFollowUpTaskKind.DAY_3,
      dueDate: '2026-04-10',
      status: EstimateFollowUpTaskStatus.PENDING,
      ...payload,
      completedAt: null,
      completedByUserId: null,
      createdAt: '2026-04-07T09:00:00.000Z',
      updatedAt: '2026-04-08T09:00:00.000Z',
    };
    updateFollowUpTaskMock.mockResolvedValue(updatedTask);

    const { followUpRouter } = await import('../routes/follow-ups');
    const layer = followUpRouter.stack.find(
      (entry: any) => entry.route?.path === '/tasks/:taskId' && entry.route?.methods?.patch
    );

    if (!layer?.route) {
      throw new Error('PATCH /tasks/:taskId route not registered');
    }

    const res = await runRoute(layer.route, {
      params: { taskId },
      body: payload,
      query: {},
      headers: { authorization: 'Bearer token' },
    });

    expect(updateFollowUpTaskMock).toHaveBeenCalledWith(taskId, payload);
    expect(res.json).toHaveBeenCalledWith({ data: updatedTask });
  });
});
