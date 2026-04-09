import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import prisma from './config/database';
import redis from './config/redis';

const MAX_DB_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectWithRetry = async (attempt = 1): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    if (attempt >= MAX_DB_RETRIES) {
      logger.error(`❌ Database connection failed after ${MAX_DB_RETRIES} attempts. Exiting.`);
      process.exit(1);
    }
    logger.warn(`⚠️  DB connection attempt ${attempt}/${MAX_DB_RETRIES} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    return connectWithRetry(attempt + 1);
  }
};

const startServer = async () => {
  try {
    await connectWithRetry();

    // Redis is optional — log but don't block startup
    if (redis) {
      try {
        await redis.ping();
        logger.info('✅ Redis connected — caching enabled');
      } catch {
        logger.warn('⚠️  Redis not available — running in DB-only mode');
      }
    } else {
      logger.warn('⚠️  Redis not configured — running in DB-only mode');
    }

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 PRAXIS backend running on port ${env.PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${env.PORT}/api/v1`);
      logger.info(`🐳 Docker execution: ${env.DOCKER_ENABLED ? 'enabled' : 'disabled (local mode)'}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${env.PORT} is already in use.`);
        process.exit(1);
      }
      logger.error('Server error:', err);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  await prisma.$disconnect();
  if (redis) await redis.quit().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

startServer();
