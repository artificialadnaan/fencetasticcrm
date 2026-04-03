import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  addSubcontractorPayment,
  updateSubcontractorPayment,
  deleteSubcontractorPayment,
} from '../services/subcontractor.service';

export const subcontractorRouter = Router();

// Schemas
const createSubSchema = z.object({
  subcontractorName: z.string().min(1, 'Subcontractor name is required'),
  amountOwed: z.number().min(0, 'Amount owed must be >= 0'),
  amountPaid: z.number().min(0).optional(),
  datePaid: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateSubSchema = z.object({
  subcontractorName: z.string().min(1).optional(),
  amountOwed: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
  datePaid: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// POST /api/projects/:id/subs — add sub payment (mounted under projectRouter)
export function addSubRoute(router: Router) {
  router.post(
    '/:id/subs',
    requireAuth,
    validate(createSubSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await addSubcontractorPayment(req.params.id, req.body);
        res.status(201).json({ data: result });
      } catch (err) {
        next(err);
      }
    }
  );
}

// PATCH /api/subs/:id
subcontractorRouter.patch(
  '/:id',
  requireAuth,
  validate(updateSubSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await updateSubcontractorPayment(req.params.id, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/subs/:id
subcontractorRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteSubcontractorPayment(req.params.id);
      res.json({ data: { message: 'Subcontractor payment deleted' } });
    } catch (err) {
      next(err);
    }
  }
);
