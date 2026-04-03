import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  getWorkOrder,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  getWorkOrderForPdf,
} from '../services/workorder.service';

export const workOrderRouter = Router();

// --- Zod Schemas ---

const fenceStyleEnum = z.enum(['NORMAL', 'STEPPED']);

const segmentSchema = z.object({
  segmentNumber: z.number().int().min(1),
  fenceType: z.string().min(1),
  style: fenceStyleEnum,
  height: z.number().min(0),
  linearFeet: z.number().min(0),
  steps: z
    .array(z.object({ position: z.number(), height: z.number() }))
    .nullable()
    .optional(),
  additions: z.array(z.string()),
  customAdditions: z.array(z.string()),
  notes: z.string().nullable().optional(),
});

const createSchema = z.object({
  drawingData: z.record(z.unknown()),
  propertyNotes: z.string().nullable().optional(),
  segments: z.array(segmentSchema),
});

const updateSchema = z.object({
  drawingData: z.record(z.unknown()).optional(),
  propertyNotes: z.string().nullable().optional(),
  segments: z.array(segmentSchema).optional(),
});

// --- Routes ---

// GET /api/projects/:id/work-order
workOrderRouter.get(
  '/projects/:id/work-order',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getWorkOrder(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Work order not found', code: 'WORK_ORDER_NOT_FOUND' });
        return;
      }
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/projects/:id/work-order
workOrderRouter.post(
  '/projects/:id/work-order',
  requireAuth,
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await createWorkOrder(req.params.id, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/work-orders/:id
workOrderRouter.patch(
  '/work-orders/:id',
  requireAuth,
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await updateWorkOrder(req.params.id, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/work-orders/:id
workOrderRouter.delete(
  '/work-orders/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteWorkOrder(req.params.id);
      res.json({ data: { message: 'Work order deleted' } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/work-orders/:id/pdf
workOrderRouter.post(
  '/work-orders/:id/pdf',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const PDFDocument = (await import('pdfkit')).default;
      const workOrder = await getWorkOrderForPdf(req.params.id);

      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="work-order-${workOrder.id}.pdf"`
      );
      doc.pipe(res);

      // --- Header ---
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Fencetastic', { align: 'center' });
      doc
        .fontSize(16)
        .font('Helvetica')
        .text('Work Order', { align: 'center' });
      doc.moveDown(0.5);

      // Customer / address / date
      doc.fontSize(11).font('Helvetica-Bold').text('Customer: ', { continued: true })
        .font('Helvetica').text(workOrder.project.customer);
      doc.font('Helvetica-Bold').text('Address: ', { continued: true })
        .font('Helvetica').text(workOrder.project.address);
      if (workOrder.project.description) {
        doc.font('Helvetica-Bold').text('Description: ', { continued: true })
          .font('Helvetica').text(workOrder.project.description);
      }
      doc.font('Helvetica-Bold').text('Date: ', { continued: true })
        .font('Helvetica').text(new Date().toLocaleDateString());
      doc.moveDown(1);

      // --- Drawing image ---
      const drawingImage = req.body?.drawingImage as string | undefined;
      if (drawingImage) {
        try {
          const imgBuffer = Buffer.from(
            drawingImage.replace(/^data:image\/\w+;base64,/, ''),
            'base64'
          );
          doc.image(imgBuffer, { fit: [500, 300], align: 'center' });
          doc.moveDown(1);
        } catch {
          // Skip image on decode error
        }
      }

      // --- Fence Schedule Table ---
      doc.fontSize(13).font('Helvetica-Bold').text('Fence Schedule');
      doc.moveDown(0.3);

      const colWidths = [35, 80, 60, 50, 65, 175];
      const headers = ['Seg#', 'Type', 'Style', 'Height', 'Linear Ft', 'Additions'];
      const tableLeft = 50;
      let tableY = doc.y;

      // Header row
      doc.fontSize(9).font('Helvetica-Bold');
      let colX = tableLeft;
      headers.forEach((h, i) => {
        doc.text(h, colX, tableY, { width: colWidths[i], lineBreak: false });
        colX += colWidths[i];
      });
      doc.moveDown(0.2);
      tableY = doc.y;
      doc
        .moveTo(tableLeft, tableY)
        .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableY)
        .stroke();
      doc.moveDown(0.2);

      // Segment rows
      doc.font('Helvetica').fontSize(9);
      for (const seg of workOrder.segments) {
        const allAdditions = [
          ...seg.additions,
          ...seg.customAdditions,
        ].join(', ');

        tableY = doc.y;
        colX = tableLeft;
        const rowValues = [
          String(seg.segmentNumber),
          seg.fenceType,
          seg.style,
          `${seg.height} ft`,
          `${seg.linearFeet} lf`,
          allAdditions || '—',
        ];
        rowValues.forEach((v, i) => {
          doc.text(v, colX, tableY, { width: colWidths[i], lineBreak: false });
          colX += colWidths[i];
        });
        doc.moveDown(0.5);
      }

      doc.moveDown(0.5);

      // --- Step details for STEPPED segments ---
      const steppedSegs = workOrder.segments.filter(
        (s) => s.style === 'STEPPED' && s.steps && s.steps.length > 0
      );
      if (steppedSegs.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('Step Details');
        doc.moveDown(0.3);
        for (const seg of steppedSegs) {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`Segment ${seg.segmentNumber} — Steps:`);
          doc.font('Helvetica');
          if (seg.steps) {
            seg.steps.forEach((step, idx) => {
              doc.text(`  Step ${idx + 1}: position ${step.position} ft, height ${step.height} ft`);
            });
          }
          doc.moveDown(0.3);
        }
        doc.moveDown(0.5);
      }

      // --- Property notes ---
      if (workOrder.propertyNotes) {
        doc.fontSize(11).font('Helvetica-Bold').text('Property Notes');
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').text(workOrder.propertyNotes);
        doc.moveDown(1);
      }

      // --- Segment notes ---
      const segsWithNotes = workOrder.segments.filter((s) => s.notes);
      if (segsWithNotes.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('Segment Notes');
        doc.moveDown(0.3);
        for (const seg of segsWithNotes) {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`Segment ${seg.segmentNumber}: `, { continued: true })
            .font('Helvetica')
            .text(seg.notes!);
        }
        doc.moveDown(1);
      }

      // --- Footer ---
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Fencetastic — Quality Fence Installation', { align: 'center' });

      doc.end();
    } catch (err) {
      next(err);
    }
  }
);
