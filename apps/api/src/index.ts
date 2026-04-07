import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { projectRouter } from './routes/projects';
import { rateTemplateRouter } from './routes/rate-templates';
import { subcontractorRouter, addSubRoute } from './routes/subcontractors';
import { noteRouter, addNoteRoutes } from './routes/notes';
import { uploadRouter } from './routes/upload';
import { activityRouter } from './routes/activity';
import { calendarRouter } from './routes/calendar';
import { commissionRouter } from './routes/commissions';
import { debtRouter } from './routes/debt';
import { dashboardRouter } from './routes/dashboard';
import { followUpRouter } from './routes/follow-ups';
import { reportsRouter } from './routes/reports';
import { operatingExpenseRouter } from './routes/operating-expenses';
import { transactionRouter } from './routes/transactions';
import { workOrderRouter } from './routes/work-orders';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL.split(',').map(s => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files from local storage (dev only; Phase 8 will use R2)
// Fix 2: nosniff + restrictive CSP to prevent XSS via uploaded files
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
  },
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

// Add nested routes onto projectRouter before mounting
addSubRoute(projectRouter);
addNoteRoutes(projectRouter);

app.use('/api/projects', projectRouter);
app.use('/api/rate-templates', rateTemplateRouter);
app.use('/api/subs', subcontractorRouter);
app.use('/api/notes', noteRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/activity', activityRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/commissions', commissionRouter);
app.use('/api/debt', debtRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/follow-ups', followUpRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/operating-expenses', operatingExpenseRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api', workOrderRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Fencetastic API running on http://localhost:${PORT}`);
});

export default app;
