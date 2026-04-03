import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { projectRouter } from './routes/projects';
import { rateTemplateRouter } from './routes/rate-templates';

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/rate-templates', rateTemplateRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Fencetastic API running on http://localhost:${PORT}`);
});

export default app;
