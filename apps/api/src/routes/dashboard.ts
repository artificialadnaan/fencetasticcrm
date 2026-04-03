import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDashboardData } from '../services/dashboard.service';

export const dashboardRouter = Router();

// GET /api/dashboard — aggregated KPIs, charts, widgets
dashboardRouter.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getDashboardData();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);
