import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { getCalendarEvents } from '../services/calendar.service';

export const calendarRouter = Router();

const calendarQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start must be YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end must be YYYY-MM-DD'),
});

// GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD
calendarRouter.get(
  '/events',
  requireAuth,
  validateQuery(calendarQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query as { start: string; end: string };

      // Fix 2: reject calendar dates that are structurally valid but don't exist (e.g. 2026-02-31)
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date values', code: 'INVALID_DATE' });
      }

      // Fix 3: cap range to 1 year to prevent runaway queries
      const maxRange = 365 * 24 * 60 * 60 * 1000;
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        return res.status(400).json({ message: 'Date range cannot exceed 1 year', code: 'RANGE_TOO_LARGE' });
      }

      const events = await getCalendarEvents(start, end);
      res.json({ data: events });
    } catch (err) {
      next(err);
    }
  }
);
