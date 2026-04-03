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
      // Fix 4: Handle NaN and negative values; cap at 100
      const rawLimit = parseInt(req.query.limit as string, 10);
      const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
      const activities = await getRecentActivity(limit);
      res.json({ data: activities });
    } catch (err) {
      next(err);
    }
  }
);
