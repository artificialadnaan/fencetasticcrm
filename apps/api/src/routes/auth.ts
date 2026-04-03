import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { loginUser, getUserById, changePassword } from '../services/auth.service';
import { prisma } from '../lib/prisma';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// GET /api/auth/users — public, returns all users for picker
authRouter.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const { token, user } = await loginUser(email, password);
      res.json({ data: { ...user, token } });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({ data: { message: 'Logged out' } });
});

authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getUserById(req.user!.userId);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.patch(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await changePassword(req.user!.userId, currentPassword, newPassword);
      res.json({ data: { message: 'Password updated' } });
    } catch (err) {
      next(err);
    }
  }
);
