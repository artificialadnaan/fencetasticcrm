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

const dateRangeFields = z.object({
  dateFrom: z.string().min(1, 'dateFrom is required'),
  dateTo: z.string().min(1, 'dateTo is required'),
});

const dateRangeRefine = <T extends { dateFrom: string; dateTo: string }>(data: T) =>
  new Date(data.dateFrom) <= new Date(data.dateTo);

const dateRangeSchema = dateRangeFields.refine(dateRangeRefine, {
  message: 'dateFrom must be before or equal to dateTo',
});

const pnlSchema = dateRangeFields
  .extend({ period: z.enum(['monthly', 'quarterly', 'annual']).default('monthly') })
  .refine(dateRangeRefine, { message: 'dateFrom must be before or equal to dateTo' });

const jobCostingSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['ESTIMATE', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'WARRANTY']).optional(),
  fenceType: z.enum(['WOOD', 'METAL', 'CHAIN_LINK', 'VINYL', 'GATE', 'OTHER']).optional(),
}).refine(
  (data) => {
    if (data.dateFrom != null && data.dateTo != null) {
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
  },
  { message: 'dateFrom must be before or equal to dateTo' }
);

const exportSchema = dateRangeFields
  .extend({ period: z.enum(['monthly', 'quarterly', 'annual']).default('monthly').optional() })
  .refine(dateRangeRefine, { message: 'dateFrom must be before or equal to dateTo' });

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

// GET /api/reports/:type/pdf
financialReportRouter.get(
  '/:type/pdf',
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

      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);
      doc.pipe(res);

      // Header
      doc.fontSize(18).text('Fencetastic Financial Report', { align: 'center' });
      doc
        .fontSize(10)
        .text(
          `${type.replace(/-/g, ' ').toUpperCase()} — ${dateFrom} to ${dateTo}`,
          { align: 'center' }
        );
      doc.moveDown(2);

      switch (type) {
        case 'pnl': {
          const data = await getPnlReport(
            new Date(dateFrom),
            new Date(dateTo),
            (period ?? 'monthly') as 'monthly' | 'quarterly' | 'annual'
          );
          doc.fontSize(14).text('Profit & Loss', { underline: true });
          doc.moveDown();
          for (const row of data.rows) {
            doc.fontSize(9).text(
              `${row.month}:  Revenue $${row.revenue.toLocaleString()}  |  COGS $${row.cogs.toLocaleString()}  |  Gross $${row.grossProfit.toLocaleString()}  |  OpEx $${row.operatingExpenses.toLocaleString()}  |  Comm $${row.commissions.toLocaleString()}  |  Net $${row.netProfit.toLocaleString()}`
            );
          }
          doc.moveDown();
          const t = data.totals;
          doc
            .fontSize(11)
            .text(
              `TOTALS:  Revenue $${t.revenue.toLocaleString()}  |  Net Profit $${t.netProfit.toLocaleString()}`
            );
          break;
        }
        case 'job-costing': {
          const data = await getJobCostingReport(new Date(dateFrom), new Date(dateTo));
          doc.fontSize(14).text('Job Costing Report', { underline: true });
          doc.moveDown();
          for (const row of data) {
            doc.fontSize(9).text(
              `${row.customer} (${row.address}) — Rev: $${row.revenue.toLocaleString()} | Mat: $${row.materials.toLocaleString()} | Sub: $${row.subcontractors.toLocaleString()} | Profit: $${row.profit.toLocaleString()} (${row.marginPct}%)`
            );
          }
          break;
        }
        case 'commissions': {
          const data = await getCommissionSummaryReport(new Date(dateFrom), new Date(dateTo));
          doc.fontSize(14).text('Commission Summary', { underline: true });
          doc.moveDown();

          doc.fontSize(11).text('Settled — Adnaan', { underline: true });
          for (const row of data.settled.adnaan.rows) {
            doc.fontSize(9).text(`  ${row.customer}: $${row.commission.toLocaleString()}`);
          }
          doc
            .fontSize(9)
            .text(
              `  Total: $${data.settled.adnaan.periodTotal.toLocaleString()} | Aimann: -$${data.settled.adnaan.aimannDeductions.toLocaleString()} | Net: $${data.settled.adnaan.netPayout.toLocaleString()}`
            );
          doc.moveDown(0.5);

          doc.fontSize(11).text('Settled — Meme', { underline: true });
          for (const row of data.settled.meme.rows) {
            doc.fontSize(9).text(`  ${row.customer}: $${row.commission.toLocaleString()}`);
          }
          doc
            .fontSize(9)
            .text(
              `  Total: $${data.settled.meme.periodTotal.toLocaleString()} | Net: $${data.settled.meme.netPayout.toLocaleString()}`
            );
          doc.moveDown(0.5);

          doc.fontSize(11).text('Pending — Adnaan', { underline: true });
          for (const row of data.pending.adnaan.rows) {
            doc.fontSize(9).text(`  ${row.customer}: $${row.commission.toLocaleString()}`);
          }
          doc
            .fontSize(9)
            .text(
              `  Total: $${data.pending.adnaan.periodTotal.toLocaleString()} | Aimann: -$${data.pending.adnaan.aimannDeductions.toLocaleString()} | Net: $${data.pending.adnaan.netPayout.toLocaleString()}`
            );
          doc.moveDown(0.5);

          doc.fontSize(11).text('Pending — Meme', { underline: true });
          for (const row of data.pending.meme.rows) {
            doc.fontSize(9).text(`  ${row.customer}: $${row.commission.toLocaleString()}`);
          }
          doc
            .fontSize(9)
            .text(
              `  Total: $${data.pending.meme.periodTotal.toLocaleString()} | Net: $${data.pending.meme.netPayout.toLocaleString()}`
            );
          break;
        }
        case 'expenses': {
          const data = await getExpenseBreakdownReport(new Date(dateFrom), new Date(dateTo));
          doc.fontSize(14).text('Expense Breakdown', { underline: true });
          doc.moveDown();
          for (const cat of data.byCategory) {
            doc.fontSize(10).text(`${cat.category}: $${cat.total.toLocaleString()}`);
            for (const sub of cat.subcategories) {
              doc.fontSize(9).text(`    ${sub.name}: $${sub.amount.toLocaleString()}`);
            }
          }
          doc.moveDown();
          doc.fontSize(11).text(`Total Expenses: $${data.total.toLocaleString()}`);
          break;
        }
        case 'cash-flow': {
          const data = await getCashFlowReport(new Date(dateFrom), new Date(dateTo));
          doc.fontSize(14).text('Cash Flow Report', { underline: true });
          doc.moveDown();
          for (const row of data) {
            doc.fontSize(9).text(
              `${row.month}:  In $${row.moneyIn.toLocaleString()}  |  Out $${row.moneyOut.toLocaleString()}  |  Net $${row.netCashFlow.toLocaleString()}  |  Balance $${row.runningBalance.toLocaleString()}`
            );
          }
          break;
        }
        default: {
          doc.fontSize(12).text('Unknown report type.');
        }
      }

      doc.end();
    } catch (err) {
      next(err);
    }
  }
);
