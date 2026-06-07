import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authenticateToken, checkConcurrentStreamLimit } from './middleware/streamLimitMiddleware';
import { trackChunkLatency, streamingRegistry } from './middleware/metricsMiddleware';
import { startPlayback, processHeartbeat, terminatePlayback } from './controllers/streamController';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Latency tracker for video manifests/chunks
app.use(trackChunkLatency);

// Scrape metrics path exposing custom registry
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', streamingRegistry.contentType);
    res.end(await streamingRegistry.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// App Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'streaming-service' });
});

// Video Playback Routes
app.get('/api/stream/play/:movieId', authenticateToken, checkConcurrentStreamLimit, startPlayback);
app.post('/api/stream/heartbeat', authenticateToken, processHeartbeat);
app.post('/api/stream/stop', authenticateToken, terminatePlayback);

// Error Handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Streaming Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    detail: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

export default app;
