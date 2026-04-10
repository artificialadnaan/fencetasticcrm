import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  getPnlReport,
  getJobCostingReport,
  getCommissionSummaryReport,
  getExpenseBreakdownReport,
  getCashFlowReport,
} from '../services/financial-report.service';

export const financialReportRouter = Router();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const dateRangeSchema = z.object({
  dateFrom: z.string().min(1, 'dateFrom is required'),
  dateTo: z.string().min(1, 'dateTo is required'),
});

const pnlSchema = dateRangeSchema.extend({
  period: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
});

const jobCostingSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
  fenceType: z.string().optional(),
});

const exportSchema = dateRangeSchema.extend({
  period: z.enum(['monthly', 'quarterly', 'annual']).default('monthly').optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/reports/pnl
financialReportRouter.get(
  '/pnl',
  requireAuth,
  validateQuery(pnlSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo, period } = req.query as unknown as {
        dateFrom: string;
        dateTo: string;
        period: 'monthly' | 'quarterly' | 'annual';
      };
      const data = await getPnlReport(new Date(dateFrom), new Date(dateTo), period);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/job-costing
financialReportRouter.get(
  '/job-costing',
  requireAuth,
  validateQuery(jobCostingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo, status, fenceType } = req.query as unknown as {
        dateFrom?: string;
        dateTo?: string;
        status?: string;
        fenceType?: string;
      };
      const data = await getJobCostingReport(
        dateFrom != null ? new Date(dateFrom) : undefined,
        dateTo != null ? new Date(dateTo) : undefined,
        status as never,
        fenceType as never
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/commissions
financialReportRouter.get(
  '/commissions',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo } = req.query as unknown as {
        dateFrom: string;
        dateTo: string;
      };
      const data = await getCommissionSummaryReport(new Date(dateFrom), new Date(dateTo));
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/expenses
financialReportRouter.get(
  '/expenses',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo } = req.query as unknown as {
        dateFrom: string;
        dateTo: string;
      };
      const data = await getExpenseBreakdownReport(new Date(dateFrom), new Date(dateTo));
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/cash-flow
financialReportRouter.get(
  '/cash-flow',
  requireAuth,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo } = req.query as unknown as {
        dateFrom: string;
        dateTo: string;
      };
      const data = await getCashFlowReport(new Date(dateFrom), new Date(dateTo));
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/:type/export
financialReportRouter.get(
  '/:type/export',
  requireAuth,
  validateQuery(exportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const { dateFrom, dateTo, period } = req.query as unknown as {
        dateFrom: string;
        dateTo: string;
        period?: 'monthly' | 'quarterly' | 'annual';
      };

      let csv = '';

      if (type === 'pnl') {
        const report = await getPnlReport(
          new Date(dateFrom),
          new Date(dateTo),
          period ?? 'monthly'
        );
        csv = 'Month,Revenue,COGS,Gross Profit,Operating Expenses,Commissions,Net Profit\n';
        for (const row of report.rows) {
          csv += `${row.month},${row.revenue},${row.cogs},${row.grossProfit},${row.operatingExpenses},${row.commissions},${row.netProfit}\n`;
        }
      } else if (type === 'job-costing') {
        const rows = await getJobCostingReport(new Date(dateFrom), new Date(dateTo));
        csv =
          'Customer,Address,Status,Fence Type,Revenue,Materials,Subcontractors,Other Expenses,Commission (Adnaan),Commission (Meme),Profit,Margin %\n';
        for (const row of rows) {
          const customer = `"${(row.customer ?? '').replace(/"/g, '""')}"`;
          const address = `"${(row.address ?? '').replace(/"/g, '""')}"`;
          csv += `${customer},${address},${row.status},${row.fenceType},${row.revenue},${row.materials},${row.subcontractors},${row.otherExpenses},${row.commissionsAdnaan},${row.commissionsMeme},${row.profit},${row.marginPct}\n`;
        }
      } else if (type === 'commissions') {
        const report = await getCommissionSummaryReport(new Date(dateFrom), new Date(dateTo));
        csv = 'Section,Person,Customer,Project Total,Commission,Aimann Deduction,Net Payout\n';

        for (const row of report.settled.adnaan.rows) {
          csv += `Settled,Adnaan,"${(row.customer ?? '').replace(/"/g, '""')}",${row.projectTotal},${row.commission},,\n`;
        }
        csv += `Settled Total,Adnaan,,,${report.settled.adnaan.periodTotal},${report.settled.adnaan.aimannDeductions},${report.settled.adnaan.netPayout}\n`;

        for (const row of report.settled.meme.rows) {
          csv += `Settled,Meme,"${(row.customer ?? '').replace(/"/g, '""')}",${row.projectTotal},${row.commission},,\n`;
        }
        csv += `Settled Total,Meme,,,${report.settled.meme.periodTotal},${report.settled.meme.aimannDeductions},${report.settled.meme.netPayout}\n`;

        for (const row of report.pending.adnaan.rows) {
          csv += `Pending,Adnaan,"${(row.customer ?? '').replace(/"/g, '""')}",${row.projectTotal},${row.commission},,\n`;
        }
        csv += `Pending Total,Adnaan,,,${report.pending.adnaan.periodTotal},${report.pending.adnaan.aimannDeductions},${report.pending.adnaan.netPayout}\n`;

        for (const row of report.pending.meme.rows) {
          csv += `Pending,Meme,"${(row.customer ?? '').replace(/"/g, '""')}",${row.projectTotal},${row.commission},,\n`;
        }
        csv += `Pending Total,Meme,,,${report.pending.meme.periodTotal},${report.pending.meme.aimannDeductions},${report.pending.meme.netPayout}\n`;
      } else if (type === 'expenses') {
        const report = await getExpenseBreakdownReport(new Date(dateFrom), new Date(dateTo));
        csv = 'Category,Total\n';
        for (const row of report.byCategory) {
          csv += `${row.category},${row.total}\n`;
        }
      } else if (type === 'cash-flow') {
        const rows = await getCashFlowReport(new Date(dateFrom), new Date(dateTo));
        csv = 'Month,Money In,Money Out,Net Cash Flow,Running Balance\n';
        for (const row of rows) {
          csv += `${row.month},${row.moneyIn},${row.moneyOut},${row.netCashFlow},${row.runningBalance}\n`;
        }
      } else {
        res.status(400).json({ error: 'Unknown report type' });
        return;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);
