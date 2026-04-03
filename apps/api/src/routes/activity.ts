import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getRecentActivity } from '../services/activity.service';

export const activityRouter = Router();

// GET /api/activity
activityRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 20;
      const activities = await getRecentActivity(limit);
      res.json({ data: activities });
    } catch (err) {
      next(err);
    }
  }
);
