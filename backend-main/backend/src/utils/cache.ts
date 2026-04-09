import Redis from 'ioredis';
import { env } from '../config/env';

class CacheService {
  private client: Redis | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      // Use REDIS_URL from env or fallback to localhost
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('⚠️ Redis connection failed. Falling back to Database-only mode.');
            this.isEnabled = false;
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        }
      });

      this.client.on('connect', () => {
        console.log('🚀 Redis Connected: Caching enabled.');
        this.isEnabled = true;
      });

      this.client.on('error', (err) => {
        // We don't want to crash the whole app if Redis fails
        console.error('❌ Redis Error:', err.message);
        this.isEnabled = false;
      });
    } catch (err) {
      console.error('❌ Redis Initialization Failed:', err);
      this.isEnabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isEnabled || !this.client) return;
    try {
      const data = JSON.stringify(value);
      await this.client.set(key, data, 'EX', ttlSeconds);
    } catch {
      // Ignore cache set errors
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isEnabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Ignore cache del errors
    }
  }

  async delPrefix(prefix: string): Promise<void> {
    if (!this.isEnabled || !this.client) return;
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // Ignore
    }
  }
}

export const cache = new CacheService();
