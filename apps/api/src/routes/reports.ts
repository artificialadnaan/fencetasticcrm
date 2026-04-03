import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { getMonthlyPL, getProjectStats, getReceivablesAging } from '../services/report.service';

export const reportsRouter = Router();

const monthlyPLSchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

// GET /api/reports/monthly-pl?months=6
reportsRouter.get(
  '/monthly-pl',
  requireAuth,
  validateQuery(monthlyPLSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { months } = req.query as unknown as { months: number };
      const data = await getMonthlyPL(months);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/project-stats
reportsRouter.get(
  '/project-stats',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getProjectStats();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/receivables
reportsRouter.get(
  '/receivables',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getReceivablesAging();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);
