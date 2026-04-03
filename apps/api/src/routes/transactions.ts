import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { validateQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listTransactions,
  getTransactionSummary,
  getMonthlyBreakdown,
  getCategoryBreakdown,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/transaction.service';

export const transactionRouter = Router();

// --- Zod Schemas ---

const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE']);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: transactionTypeEnum.optional(),
  category: z.string().optional(),
  projectId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createSchema = z.object({
  type: transactionTypeEnum,
  amount: z.number().min(0, 'Amount must be >= 0'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  payee: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

const updateSchema = z.object({
  type: transactionTypeEnum.optional(),
  amount: z.number().min(0).optional(),
  date: z.string().optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  payee: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

// --- Routes ---

// GET /api/transactions — list with filters
transactionRouter.get(
  '/',
  requireAuth,
  validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await listTransactions(req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/transactions/summary — MTD/YTD summary
transactionRouter.get(
  '/summary',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as string) === 'ytd' ? 'ytd' : 'mtd';
      const result = await getTransactionSummary(period);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/transactions/monthly — monthly breakdown chart data
transactionRouter.get(
  '/monthly',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getMonthlyBreakdown();
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/transactions/categories — category breakdown chart data
transactionRouter.get(
  '/categories',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getCategoryBreakdown();
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/transactions — create manual transaction
transactionRouter.post(
  '/',
  requireAuth,
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await createTransaction(req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/transactions/:id — update transaction
transactionRouter.patch(
  '/:id',
  requireAuth,
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await updateTransaction(req.params.id, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/transactions/:id — delete transaction
transactionRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteTransaction(req.params.id);
      res.json({ data: { message: 'Transaction deleted' } });
    } catch (err) {
      next(err);
    }
  }
);
