import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import client from 'prom-client';
import { register, login, refresh, logout } from './controllers/authController';

const app = express();

// Enable Prometheus default metrics collection
const registerMetrics = new client.Registry();
client.collectDefaultMetrics({ register: registerMetrics });

// Security & Parsing Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Scrape target endpoint for Prometheus
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', registerMetrics.contentType);
    res.end(await registerMetrics.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// App Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'auth-service' });
});

// Auth Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/refresh', refresh);
app.post('/api/auth/logout', logout);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Auth Error:', err);
  res.status(500).json({
    message: 'Internal service error',
    detail: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

export default app;
