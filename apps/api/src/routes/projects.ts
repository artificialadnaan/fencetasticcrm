import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import XLSX from 'xlsx';
import { validate } from '../middleware/validate';
import { validateQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  softDeleteProject,
  listProjectsGrid,
  bulkUpdateProjects,
} from '../services/project.service';

export const projectRouter = Router();

// --- Zod Schemas ---

const fenceTypeEnum = z.enum(['WOOD', 'METAL', 'CHAIN_LINK', 'VINYL', 'GATE', 'OTHER']);
const projectStatusEnum = z.enum(['ESTIMATE', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'WARRANTY']);
const paymentMethodEnum = z.enum(['CASH', 'CHECK', 'CREDIT_CARD', 'ZELLE', 'FINANCING']);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('installDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: projectStatusEnum.optional(),
  fenceType: fenceTypeEnum.optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createProjectSchema = z.object({
  customer: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  description: z.string().min(1, 'Description is required'),
  fenceType: fenceTypeEnum,
  status: projectStatusEnum.optional(),
  projectTotal: z.number().min(0, 'Project total must be >= 0'),
  paymentMethod: paymentMethodEnum,
  forecastedExpenses: z.number().min(0),
  materialsCost: z.number().min(0),
  contractDate: z.string().min(1).optional(),
  installDate: z.string().min(1).optional(),
  completedDate: z.string().nullable().optional(),
  estimateDate: z.string().nullable().optional(),
  followUpDate: z.string().nullable().optional(),
  linearFeet: z.number().nullable().optional(),
  rateTemplateId: z.string().uuid().nullable().optional(),
  subcontractor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  commissionOwed: z.number().nullable().optional(),
  commissionPaid: z.number().nullable().optional(),
  memesCommission: z.number().nullable().optional(),
  aimannsCommission: z.number().nullable().optional(),
});

const updateProjectSchema = z.object({
  customer: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  fenceType: fenceTypeEnum.optional(),
  status: projectStatusEnum.optional(),
  projectTotal: z.number().min(0).optional(),
  paymentMethod: paymentMethodEnum.optional(),
  forecastedExpenses: z.number().min(0).optional(),
  materialsCost: z.number().min(0).optional(),
  customerPaid: z.number().min(0).optional(),
  contractDate: z.string().optional(),
  installDate: z.string().optional(),
  completedDate: z.string().nullable().optional(),
  estimateDate: z.string().nullable().optional(),
  followUpDate: z.string().nullable().optional(),
  linearFeet: z.number().nullable().optional(),
  rateTemplateId: z.string().uuid().nullable().optional(),
  subcontractor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  commissionOwed: z.number().nullable().optional(),
  commissionPaid: z.number().nullable().optional(),
  memesCommission: z.number().nullable().optional(),
  aimannsCommission: z.number().nullable().optional(),
});

// --- Routes ---

// GET /api/projects — list with filters, pagination, sorting
projectRouter.get(
  '/',
  requireAuth,
  validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await listProjects(req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/projects/grid — grid view with computed columns
projectRouter.get('/grid', requireAuth, validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await listProjectsGrid(req.query as never);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// PATCH /api/projects/bulk — bulk status update
projectRouter.patch('/bulk', requireAuth, validate(z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: projectStatusEnum.optional(),
})),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bulkUpdateProjects(req.body.ids, { status: req.body.status });
      res.json({ data: result });
    } catch (err) { next(err); }
  }
);

// GET /api/projects/export — export to xlsx
projectRouter.get('/export', requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await listProjectsGrid(Object.assign({}, req.query as never, { limit: 10000 }));
      const ws = XLSX.utils.json_to_sheet(result.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Projects');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=projects.xlsx');
      res.send(buffer);
    } catch (err) { next(err); }
  }
);

// GET /api/projects/:id — single project with full details
projectRouter.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await getProjectById(req.params.id);
      res.json({ data: project });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/projects — create project
projectRouter.post(
  '/',
  requireAuth,
  validate(createProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await createProject(req.body, req.user!.userId);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/projects/:id — update project
projectRouter.patch(
  '/:id',
  requireAuth,
  validate(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await updateProject(req.params.id, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/projects/:id — soft delete
projectRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await softDeleteProject(req.params.id);
      res.json({ data: { message: 'Project deleted' } });
    } catch (err) {
      next(err);
    }
  }
);
