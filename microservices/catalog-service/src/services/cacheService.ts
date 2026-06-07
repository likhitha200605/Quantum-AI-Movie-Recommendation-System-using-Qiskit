import redisClient from '../config/redis';

// Base cache times in seconds
const TRENDING_CACHE_TTL = 600; // 10 minutes
const POPULAR_CACHE_TTL = 3600; // 1 hour

/**
 * Calculates a TTL with a jitter (random variation) to prevent cache stampede/thundering herd.
 * Adds a random value between 0 and 60 seconds to the base TTL.
 */
const getJitteredTtl = (baseTtl: number): number => {
  const jitter = Math.floor(Math.random() * 60);
  return baseTtl + jitter;
};

export class CacheService {
  /**
   * Generic Cache-Aside handler
   */
  static async getOrSet<T>(
    key: string,
    ttl: number,
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        // Cache Hit
        return JSON.parse(cachedData) as T;
      }

      // Cache Miss - Query database
      const freshData = await fetchFunction();

      // Store in Redis with jittered TTL
      const jitteredTtl = getJitteredTtl(ttl);
      await redisClient.setEx(key, jitteredTtl, JSON.stringify(freshData));

      return freshData;
    } catch (error) {
      // Fail-safe: If Redis fails, fall back directly to database query
      console.error(`Redis error for key "${key}", falling back to DB:`, error);
      return await fetchFunction();
    }
  }

  /**
   * Get Trending Movies (Cache-Aside)
   */
  static async getTrendingMovies<T>(fetchFromDb: () => Promise<T>): Promise<T> {
    return this.getOrSet<T>('catalog:trending', TRENDING_CACHE_TTL, fetchFromDb);
  }

  /**
   * Get Popular Movies (Cache-Aside)
   */
  static async getPopularMovies<T>(fetchFromDb: () => Promise<T>): Promise<T> {
    return this.getOrSet<T>('catalog:popular', POPULAR_CACHE_TTL, fetchFromDb);
  }

  /**
   * Invalidates all catalog cache keys
   */
  static async invalidateCatalogCache(): Promise<void> {
    try {
      const keys = await redisClient.keys('catalog:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`Successfully invalidated catalog cache keys: ${keys.join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to invalidate catalog cache:', error);
    }
  }
}
