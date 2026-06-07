import { Response } from 'express';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import redisClient from '../config/redis';
import { AuthenticatedRequest } from '../middleware/streamLimitMiddleware';
import {
  streamsInitiatedCounter,
  activeStreamsGauge,
  playbackErrorsCounter,
} from '../middleware/metricsMiddleware';

const CDN_DOMAIN = process.env.CDN_DOMAIN || 'https://cdn.quantumflix.com';
const CLOUDFRONT_KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID || 'KXXXXXXXXXXXXX';
const CLOUDFRONT_PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY || ''; // PEM private key string

// Helper to update Prometheus Active Stream Gauge based on Redis ground truth
const syncActiveStreamsGauge = async () => {
  try {
    const keys = await redisClient.keys('active_stream:*');
    activeStreamsGauge.set(keys.length);
  } catch (error) {
    console.error('Failed to sync active streams gauge:', error);
  }
};

/**
 * Initiates playback by verifying access rights and generating a secure signed CDN URL.
 */
export const startPlayback = async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role || 'user';
  const { movieId } = req.params;
  const { format } = req.query; // 'hls' or 'dash'

  if (!movieId) {
    return res.status(400).json({ message: 'Movie ID required' });
  }

  try {
    // In production, we'd query the Catalog Database via RPC or DB Pool to get the movie stream path.
    // For this template, we assume a structured folder matching the movieId.
    const fileExtension = format === 'dash' ? 'manifest.mpd' : 'master.m3u8';
    const rawUrl = `${CDN_DOMAIN}/movies/${movieId}/${fileExtension}`;

    let signedUrl = rawUrl;

    // Generate signed URL if CloudFront credentials are provided
    if (CLOUDFRONT_PRIVATE_KEY && CLOUDFRONT_KEY_PAIR_ID !== 'KXXXXXXXXXXXXX') {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 3); // 3-hour expiry link

      signedUrl = getSignedUrl({
        url: rawUrl,
        keyPairId: CLOUDFRONT_KEY_PAIR_ID,
        privateKey: CLOUDFRONT_PRIVATE_KEY,
        dateLessThan: expirationDate.toISOString(),
      });
    } else {
      console.warn('AWS CloudFront signing configs missing. Serving raw CDN URL (non-secure mode).');
    }

    // Increment Prometheus metrics
    streamsInitiatedCounter.inc({ user_role: role });
    await syncActiveStreamsGauge();

    return res.json({
      message: 'Stream URL successfully signed',
      streamUrl: signedUrl,
      format: format || 'hls',
      expiresInSeconds: 3 * 60 * 60,
    });
  } catch (error: any) {
    console.error('Playback initiation error:', error);
    playbackErrorsCounter.inc({
      error_type: 'signing_error',
      stream_format: (format as string) || 'hls',
    });
    return res.status(500).json({ message: 'Failed to initialize secure stream', error: error.message });
  }
};

/**
 * Heartbeat hook hit by client player every 15 seconds to maintain concurrent stream session.
 */
export const processHeartbeat = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const { streamId } = req.body;

  if (!userId || !streamId) {
    return res.status(400).json({ message: 'userId and streamId required' });
  }

  try {
    const activeStreamKey = `active_stream:${userId}:${streamId}`;

    // Renew key with 30s TTL
    const wasExtended = await redisClient.setEx(activeStreamKey, 30, 'active');
    
    await syncActiveStreamsGauge();

    return res.json({
      success: wasExtended === 'OK',
      message: 'Playback heartbeat acknowledged',
      streamId,
    });
  } catch (error: any) {
    console.error('Heartbeat processing error:', error);
    return res.status(500).json({ message: 'Heartbeat error', error: error.message });
  }
};

/**
 * Explicitly terminates the stream session (e.g. when user clicks close or navigates away).
 */
export const terminatePlayback = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const { streamId } = req.body;

  if (!userId || !streamId) {
    return res.status(400).json({ message: 'userId and streamId required' });
  }

  try {
    const activeStreamKey = `active_stream:${userId}:${streamId}`;
    await redisClient.del(activeStreamKey);
    
    await syncActiveStreamsGauge();

    return res.json({
      success: true,
      message: 'Stream session terminated successfully',
    });
  } catch (error: any) {
    console.error('Stream termination error:', error);
    return res.status(500).json({ message: 'Shutdown error', error: error.message });
  }
};
