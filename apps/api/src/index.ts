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

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files from local storage (dev only; Phase 8 will use R2)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Fencetastic API running on http://localhost:${PORT}`);
});

export default app;
