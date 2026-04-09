import Redis from 'ioredis';
import { env } from './env';

let redis: Redis | null = null;

try {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  redis.connect().then(() => {
    console.log('✅ Redis connected');
  }).catch(() => {
    console.log('⚠️  Redis not available (optional)');
    redis = null;
  });

  redis.on('error', () => {
    // Silently handle Redis errors
  });
} catch (error) {
  console.log('⚠️  Redis not available (optional)');
  redis = null;
}

export default redis;
