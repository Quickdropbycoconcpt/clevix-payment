import Redis, { Redis as RedisClient } from 'ioredis';

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
}
