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
      const events = await getCalendarEvents(start, end);
      res.json({ data: events });
    } catch (err) {
      next(err);
    }
  }
);
