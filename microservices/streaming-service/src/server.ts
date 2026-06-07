import app from './app';
import redisClient from './config/redis';

const PORT = process.env.PORT || 5003;

const server = app.listen(PORT, () => {
  console.log(`Streaming Service listening on port ${PORT}`);
});

const shutdown = async () => {
  console.log('Initiating graceful shutdown of Streaming Service...');
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await redisClient.disconnect();
      console.log('Redis client disconnected.');
      process.exit(0);
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
