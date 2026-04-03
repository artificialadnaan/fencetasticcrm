import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listActiveRateTemplates,
  createRateTemplate,
  updateRateTemplate,
  deactivateRateTemplate,
} from '../services/rate-template.service';

export const rateTemplateRouter = Router();

const fenceTypeEnum = z.enum(['WOOD', 'METAL', 'CHAIN_LINK', 'VINYL', 'GATE', 'OTHER']);

const createSchema = z.object({
  fenceType: fenceTypeEnum,
  name: z.string().min(1, 'Name is required'),
  ratePerFoot: z.number().min(0, 'Rate must be >= 0'),
  laborRatePerFoot: z.number().min(0, 'Labor rate must be >= 0'),
  description: z.string().nullable().optional(),
});

const updateSchema = z.object({
  fenceType: fenceTypeEnum.optional(),
  name: z.string().min(1).optional(),
  ratePerFoot: z.number().min(0).optional(),
  laborRatePerFoot: z.number().min(0).optional(),
  description: z.string().nullable().optional(),
});

// GET /api/rate-templates
rateTemplateRouter.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await listActiveRateTemplates();
      res.json({ data: templates });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/rate-templates
rateTemplateRouter.post(
  '/',
  requireAuth,
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const t = await createRateTemplate(req.body);
      res.status(201).json({ data: t });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/rate-templates/:id
rateTemplateRouter.patch(
  '/:id',
  requireAuth,
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const t = await updateRateTemplate(req.params.id, req.body);
      res.json({ data: t });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/rate-templates/:id
rateTemplateRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deactivateRateTemplate(req.params.id);
      res.json({ data: { message: 'Rate template deactivated' } });
    } catch (err) {
      next(err);
    }
  }
);
