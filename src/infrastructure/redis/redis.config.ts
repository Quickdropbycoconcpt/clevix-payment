import { randomUUID } from 'crypto';
import Redis, { Redis as RedisClient } from 'ioredis';

export type LockResult<T> = { acquired: true; result: T } | { acquired: false };

const RELEASE_LOCK_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export class RedisConfig {
  public static readonly host: string = process.env.REDIS_HOST || 'localhost';

  public static readonly port: number = Number.parseInt(
    process.env.REDIS_PORT || '6379',
    10,
  );

  public static readonly password: string = process.env.REDIS_PASSWORD || '';

  private static client: RedisClient;

  private static getClient(): RedisClient {
    if (!RedisConfig.client) {
      RedisConfig.client = new Redis({
        host: RedisConfig.host,
        port: RedisConfig.port,
        password: RedisConfig.password || undefined,
        lazyConnect: false,
        maxRetriesPerRequest: 3,
      });

      RedisConfig.client.on('connect', () => {
        console.log('Redis connected');
      });

      RedisConfig.client.on('error', (err) => {
        console.error('Redis error:', err);
      });
    }

    return RedisConfig.client;
  }

  /**
   * Store data in Redis with optional TTL (seconds)
   */
  async storeData(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    const client = RedisConfig.getClient();

    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
  }

  /**
   * Retrieve data from Redis
   */
  async retrieveData(key: string): Promise<string | null> {
    const client = RedisConfig.getClient();
    return client.get(key);
  }

  /**
   * Delete data from Redis
   */
  async deleteData(key: string): Promise<void> {
    const client = RedisConfig.getClient();
    await client.del(key);
  }

  async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    const client = RedisConfig.getClient();
    const token = randomUUID();
    const acquired = await client.set(key, token, 'PX', ttlMs, 'NX');

    return acquired === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    const client = RedisConfig.getClient();
    await client.eval(RELEASE_LOCK_SCRIPT, 1, key, token);
  }

  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<LockResult<T>> {
    const token = await this.acquireLock(key, ttlMs);

    if (!token) {
      return { acquired: false };
    }

    try {
      return { acquired: true, result: await fn() };
    } finally {
      await this.releaseLock(key, token).catch((err) => {
        console.error(`Redis lock release failed for ${key}:`, err);
      });
    }
  }
}
