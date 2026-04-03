import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listOperatingExpenses,
  createOperatingExpense,
  updateOperatingExpense,
  deactivateOperatingExpense,
} from '../services/operating-expense.service';

export const operatingExpenseRouter = Router();

const frequencyEnum = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']);

const createSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount must be >= 0'),
  frequency: frequencyEnum,
});

const updateSchema = z.object({
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  frequency: frequencyEnum.optional(),
});

// GET /api/operating-expenses
operatingExpenseRouter.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listOperatingExpenses();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/operating-expenses
operatingExpenseRouter.post(
  '/',
  requireAuth,
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await createOperatingExpense(req.body);
      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/operating-expenses/:id
operatingExpenseRouter.patch(
  '/:id',
  requireAuth,
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await updateOperatingExpense(req.params.id, req.body);
      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/operating-expenses/:id
operatingExpenseRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deactivateOperatingExpense(req.params.id);
      res.json({ data: { message: 'Operating expense deactivated' } });
    } catch (err) {
      next(err);
    }
  }
);
