import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { listActiveRateTemplates } from '../services/rate-template.service';

export const rateTemplateRouter = Router();

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
