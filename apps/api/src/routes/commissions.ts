import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import {
  getCommissionSummary,
  getCommissionsByProject,
  getCommissionPipeline,
} from '../services/commission.service';

export const commissionRouter = Router();

const byProjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/commissions/summary — MTD + YTD totals per person
commissionRouter.get(
  '/summary',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await getCommissionSummary();
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/commissions/by-project — per-project breakdown (paginated)
commissionRouter.get(
  '/by-project',
  requireAuth,
  validateQuery(byProjectQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await getCommissionsByProject(page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/commissions/pipeline — estimated commissions from open/in-progress projects
commissionRouter.get(
  '/pipeline',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pipeline = await getCommissionPipeline();
      res.json({ data: pipeline });
    } catch (err) {
      next(err);
    }
  }
);
