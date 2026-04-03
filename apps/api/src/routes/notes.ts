import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} from '../services/note.service';

export const noteRouter = Router();

// Schemas
const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  photoUrls: z.array(z.string().url()).optional(),
});

const updateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
});

// Routes mounted under projectRouter: /api/projects/:id/notes
export function addNoteRoutes(router: Router) {
  // GET /api/projects/:id/notes
  router.get(
    '/:id/notes',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const notes = await listNotes(req.params.id);
        res.json({ data: notes });
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/projects/:id/notes
  router.post(
    '/:id/notes',
    requireAuth,
    validate(createNoteSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const note = await createNote(req.params.id, req.body, req.user!.userId);
        res.status(201).json({ data: note });
      } catch (err) {
        next(err);
      }
    }
  );
}

// PATCH /api/notes/:id
noteRouter.patch(
  '/:id',
  requireAuth,
  validate(updateNoteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const note = await updateNote(req.params.id, req.body, req.user!.userId);
      res.json({ data: note });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/notes/:id
noteRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteNote(req.params.id, req.user!.userId);
      res.json({ data: { message: 'Note deleted' } });
    } catch (err) {
      next(err);
    }
  }
);
