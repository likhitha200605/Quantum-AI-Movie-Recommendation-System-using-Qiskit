import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      console.warn(`Redis disconnected. Reconnecting in ${delay}ms... (Attempt ${retries})`);
      return delay;
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Catalog Client Error:', err));
redisClient.on('connect', () => console.log('Redis Catalog Client Connected Successfully.'));

(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to initialize Redis connection for Catalog:', error);
  }
})();

export default redisClient;
