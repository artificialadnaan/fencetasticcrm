import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getDebtBalance,
  getDebtLedger,
  createDebtAdjustment,
} from '../services/debt.service';

export const debtRouter = Router();

const adjustmentSchema = z.object({
  amount: z.number().refine((v) => v !== 0, { message: 'Amount cannot be zero' }),
  note: z.string().min(1, 'Note is required'),
  // date is ignored — server always uses now() for append-only integrity
});

// GET /api/debt/balance — current running balance
debtRouter.get(
  '/balance',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getDebtBalance();
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/debt/ledger — full ledger history
debtRouter.get(
  '/ledger',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const entries = await getDebtLedger();
      res.json({ data: entries });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/debt/adjustment — manual balance adjustment
debtRouter.post(
  '/adjustment',
  requireAuth,
  validate(adjustmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await createDebtAdjustment(req.body, req.user!.userId);
      res.status(201).json({ data: entry });
    } catch (err) {
      next(err);
    }
  }
);
