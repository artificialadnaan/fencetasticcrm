import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { saveUploadedFile } from '../services/upload.service';
import multer from 'multer';

export const uploadRouter = Router();

// Use memory storage so we have the buffer to stream to R2 later
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB hard limit
});

// POST /api/upload?projectId=<uuid>
uploadRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) {
        res.status(400).json({ message: 'projectId query param is required', code: 'MISSING_PROJECT_ID' });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ message: 'No file uploaded', code: 'NO_FILE' });
        return;
      }

      const url = await saveUploadedFile(
        projectId,
        file.originalname,
        file.buffer,
        file.mimetype
      );

      res.status(201).json({ data: { url, filename: file.originalname } });
    } catch (err) {
      next(err);
    }
  }
);
