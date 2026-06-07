import app from './app';
import pool from './config/db';
import redisClient from './config/redis';

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Auth Service listening on port ${PORT}`);
});

// Graceful Shutdown Handler
const shutdown = async () => {
  console.log('Initiating graceful shutdown of Auth Service...');
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL pool disconnected.');
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
