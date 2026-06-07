import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff with a cap of 3000ms
      const delay = Math.min(retries * 100, 3000);
      console.warn(`Redis disconnected. Reconnecting in ${delay}ms... (Attempt ${retries})`);
      return delay;
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected Successfully.'));

// Establish connection on service startup
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to initialize Redis connection:', error);
  }
})();

export default redisClient;
