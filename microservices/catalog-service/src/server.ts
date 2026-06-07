import app from './app';
import redisClient from './config/redis';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 5002;
const prisma = new PrismaClient();

const server = app.listen(PORT, () => {
  console.log(`Catalog Service listening on port ${PORT}`);
});

const shutdown = async () => {
  console.log('Initiating graceful shutdown of Catalog Service...');
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Prisma Client disconnected.');
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
export { prisma };
