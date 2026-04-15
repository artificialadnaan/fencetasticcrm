import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getFinanceRiskOverview } from '../services/finance-risk.service';

export const financeRiskRouter = Router();

financeRiskRouter.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getFinanceRiskOverview();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);
