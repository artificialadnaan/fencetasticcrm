import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery, validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { getCalendarEvents } from '../services/calendar.service';
import { prisma } from '../lib/prisma';

export const calendarRouter = Router();

const calendarQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start must be YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end must be YYYY-MM-DD'),
});

const createEventSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  eventType: z.string().min(1),
  color: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  eventType: z.string().optional(),
  color: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD
calendarRouter.get(
  '/events',
  requireAuth,
  validateQuery(calendarQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query as { start: string; end: string };

      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date values', code: 'INVALID_DATE' });
      }

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

// POST /api/calendar/events — create custom event
calendarRouter.post(
  '/events',
  requireAuth,
  validate(createEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createEventSchema.parse(req.body);
      const event = await prisma.calendarEvent.create({
        data: {
          title: body.title,
          date: new Date(body.date),
          endDate: body.endDate ? new Date(body.endDate) : null,
          eventType: body.eventType,
          color: body.color ?? '#3B82F6',
          projectId: body.projectId ?? null,
          notes: body.notes ?? null,
        },
      });
      res.status(201).json({ data: event });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/calendar/events/:id — update event
calendarRouter.patch(
  '/events/:id',
  requireAuth,
  validate(updateEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const body = updateEventSchema.parse(req.body);

      const existing = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: 'Event not found', code: 'NOT_FOUND' });
      }

      const updated = await prisma.calendarEvent.update({
        where: { id },
        data: {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.date !== undefined && { date: new Date(body.date) }),
          ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
          ...(body.eventType !== undefined && { eventType: body.eventType }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.projectId !== undefined && { projectId: body.projectId ?? null }),
          ...(body.notes !== undefined && { notes: body.notes ?? null }),
        },
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/calendar/events/:id — delete event
calendarRouter.delete(
  '/events/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existing = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: 'Event not found', code: 'NOT_FOUND' });
      }

      await prisma.calendarEvent.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
