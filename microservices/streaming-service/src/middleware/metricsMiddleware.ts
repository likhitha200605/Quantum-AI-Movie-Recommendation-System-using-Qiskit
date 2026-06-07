import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Custom Prometheus metrics registry for Streaming Service
export const streamingRegistry = new client.Registry();

// 1. Counter for total streams initiated
export const streamsInitiatedCounter = new client.Counter({
  name: 'streams_initiated_total',
  help: 'Total number of playback streams initialized',
  labelNames: ['user_role'],
  registers: [streamingRegistry],
});

// 2. Gauge for active stream tracking
export const activeStreamsGauge = new client.Gauge({
  name: 'active_playback_streams',
  help: 'Number of concurrent playback streams currently active',
  registers: [streamingRegistry],
});

// 3. Histogram for measuring video chunk delivery latency
export const chunkLatencyHistogram = new client.Histogram({
  name: 'video_chunk_latency_seconds',
  help: 'Latency distribution for delivering video manifest chunks',
  labelNames: ['route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0], // Tailored buckets for video streaming latency
  registers: [streamingRegistry],
});

// 4. Counter for tracking streaming/playback failures
export const playbackErrorsCounter = new client.Counter({
  name: 'playback_errors_total',
  help: 'Total count of streaming/playback failures',
  labelNames: ['error_type', 'stream_format'],
  registers: [streamingRegistry],
});

// Initialize default metrics
client.collectDefaultMetrics({ register: streamingRegistry });

/**
 * Middleware to track HTTP latency metrics for stream chunks
 */
export const trackChunkLatency = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    // Track metrics for manifest or chunk delivery requests
    if (req.path.includes('/hls') || req.path.includes('/dash') || req.path.includes('/chunk')) {
      chunkLatencyHistogram.observe(
        {
          route: req.baseUrl + req.path,
          status_code: res.statusCode.toString(),
        },
        durationSeconds
      );
    }
  });

  next();
};
