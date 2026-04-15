import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getFinanceTrustOverview } from '../services/finance-trust.service';

export const financeTrustRouter = Router();

financeTrustRouter.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getFinanceTrustOverview();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);
