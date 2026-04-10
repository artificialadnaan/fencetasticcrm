import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listByProject,
  createMaterialLineItems,
  updateMaterialLineItem,
  deleteMaterialLineItem,
  getProjectMaterialSummary,
} from '../services/material.service';
import { prisma } from '../lib/prisma';

export const materialRouter = Router();

// --- Zod Schemas ---

const materialCategoryEnum = z.enum([
  'LUMBER', 'CONCRETE', 'HARDWARE', 'FASTENERS', 'GATES', 'PANELS', 'OTHER',
]);

const createItemSchema = z.object({
  description: z.string().min(1).max(500),
  category: materialCategoryEnum,
  vendor: z.string().max(200).nullable().optional(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
  purchaseDate: z.string().min(1),
  transactionId: z.string().uuid().nullable().optional(),
});

const bulkCreateSchema = z.object({
  items: z.array(createItemSchema).min(1).max(50),
});

const updateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  category: materialCategoryEnum.optional(),
  vendor: z.string().max(200).nullable().optional(),
  quantity: z.number().positive().optional(),
  unitCost: z.number().nonnegative().optional(),
  purchaseDate: z.string().optional(),
  transactionId: z.string().uuid().nullable().optional(),
});

// --- Routes ---

// GET /api/projects/:projectId/materials/eligible-transactions
// Returns EXPENSE transactions for this project or with null projectId
materialRouter.get(
  '/projects/:projectId/materials/eligible-transactions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const transactions = await prisma.transaction.findMany({
        where: {
          type: 'EXPENSE',
          OR: [
            { projectId },
            { projectId: null },
          ],
        },
        select: { id: true, description: true, amount: true, date: true, payee: true, category: true },
        orderBy: { date: 'desc' },
        take: 100,
      });
      const mapped = transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
        date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date,
      }));
      res.json({ data: mapped });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/projects/:projectId/materials — list material line items for a project
materialRouter.get(
  '/projects/:projectId/materials',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listByProject(req.params.projectId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/projects/:projectId/materials/summary — material cost summary for a project
materialRouter.get(
  '/projects/:projectId/materials/summary',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getProjectMaterialSummary(req.params.projectId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/projects/:projectId/materials — bulk create material line items
materialRouter.post(
  '/projects/:projectId/materials',
  requireAuth,
  validate(bulkCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await createMaterialLineItems(req.params.projectId, req.body.items);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/materials/:id — update a material line item
materialRouter.patch(
  '/materials/:id',
  requireAuth,
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await updateMaterialLineItem(req.params.id, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/materials/:id — delete a material line item
materialRouter.delete(
  '/materials/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteMaterialLineItem(req.params.id);
      res.json({ data: { message: 'Material line item deleted' } });
    } catch (err) {
      next(err);
    }
  }
);
