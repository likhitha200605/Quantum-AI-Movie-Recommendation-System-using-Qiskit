import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import client from 'prom-client';
import { getTrending, getPopular, getMovieById, createMovie } from './controllers/movieController';

const app = express();

// Enable Prometheus metrics
const registerMetrics = new client.Registry();
client.collectDefaultMetrics({ register: registerMetrics });

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Scrape metrics path
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', registerMetrics.contentType);
    res.end(await registerMetrics.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// App Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'catalog-service' });
});

// Movie API endpoints
app.get('/api/catalog/movies/trending', getTrending);
app.get('/api/catalog/movies/popular', getPopular);
app.get('/api/catalog/movies/:id', getMovieById);
app.post('/api/catalog/movies', createMovie);

// Error Handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Catalog Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    detail: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

export default app;
