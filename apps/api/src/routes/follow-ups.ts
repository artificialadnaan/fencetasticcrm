import { NextFunction, Request, Response, Router } from 'express';
import { z, type ZodSchema } from 'zod';
import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequenceStatus,
} from '@fencetastic/shared';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  closeFollowUpSequence,
  completeFollowUpTask,
  ensureEstimateFollowUpSequence,
  updateFollowUpTask,
} from '../services/follow-up.service';

export const followUpRouter = Router();

function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors: parsed.error.errors.map((error) => ({
          field: error.path.join('.'),
          message: error.message,
        })),
      });
      return;
    }

    req.params = parsed.data;
    next();
  };
}

const projectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

const taskParamsSchema = z.object({
  taskId: z.string().uuid(),
});

const sequenceParamsSchema = z.object({
  sequenceId: z.string().uuid(),
});

const updateTaskSchema = z
  .object({
    draftSubject: z.string().optional(),
    draftBody: z.string().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.draftSubject !== undefined
      || value.draftBody !== undefined
      || value.notes !== undefined,
    {
      message: 'At least one follow-up task field must be provided',
      path: [],
    }
  );

const closeSequenceSchema = z
  .object({
    status: z.enum([
      EstimateFollowUpSequenceStatus.WON,
      EstimateFollowUpSequenceStatus.LOST,
      EstimateFollowUpSequenceStatus.CLOSED,
    ]),
    closedSummary: z.string().nullable().optional(),
    lostReasonCode: z.nativeEnum(EstimateFollowUpLostReasonCode).nullable().optional(),
    lostReasonNotes: z.string().nullable().optional(),
  })
  .strict();

followUpRouter.get(
  '/projects/:projectId',
  requireAuth,
  validateParams(projectParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await ensureEstimateFollowUpSequence(req.params.projectId, req.user!.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

followUpRouter.patch(
  '/tasks/:taskId',
  requireAuth,
  validateParams(taskParamsSchema),
  validate(updateTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await updateFollowUpTask(req.params.taskId, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

followUpRouter.post(
  '/tasks/:taskId/complete',
  requireAuth,
  validateParams(taskParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await completeFollowUpTask(req.params.taskId, req.user!.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

followUpRouter.post(
  '/sequences/:sequenceId/close',
  requireAuth,
  validateParams(sequenceParamsSchema),
  validate(closeSequenceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await closeFollowUpSequence(req.params.sequenceId, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);
