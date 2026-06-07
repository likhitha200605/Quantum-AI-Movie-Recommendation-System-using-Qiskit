"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = __importDefault(require("../config/redis"));
// Base cache times in seconds
const TRENDING_CACHE_TTL = 600; // 10 minutes
const POPULAR_CACHE_TTL = 3600; // 1 hour
/**
 * Calculates a TTL with a jitter (random variation) to prevent cache stampede/thundering herd.
 * Adds a random value between 0 and 60 seconds to the base TTL.
 */
const getJitteredTtl = (baseTtl) => {
    const jitter = Math.floor(Math.random() * 60);
    return baseTtl + jitter;
};
class CacheService {
    /**
     * Generic Cache-Aside handler
     */
    static async getOrSet(key, ttl, fetchFunction) {
        try {
            const cachedData = await redis_1.default.get(key);
            if (cachedData) {
                // Cache Hit
                return JSON.parse(cachedData);
            }
            // Cache Miss - Query database
            const freshData = await fetchFunction();
            // Store in Redis with jittered TTL
            const jitteredTtl = getJitteredTtl(ttl);
            await redis_1.default.setEx(key, jitteredTtl, JSON.stringify(freshData));
            return freshData;
        }
        catch (error) {
            // Fail-safe: If Redis fails, fall back directly to database query
            console.error(`Redis error for key "${key}", falling back to DB:`, error);
            return await fetchFunction();
        }
    }
    /**
     * Get Trending Movies (Cache-Aside)
     */
    static async getTrendingMovies(fetchFromDb) {
        return this.getOrSet('catalog:trending', TRENDING_CACHE_TTL, fetchFromDb);
    }
    /**
     * Get Popular Movies (Cache-Aside)
     */
    static async getPopularMovies(fetchFromDb) {
        return this.getOrSet('catalog:popular', POPULAR_CACHE_TTL, fetchFromDb);
    }
    /**
     * Invalidates all catalog cache keys
     */
    static async invalidateCatalogCache() {
        try {
            const keys = await redis_1.default.keys('catalog:*');
            if (keys.length > 0) {
                await redis_1.default.del(keys);
                console.log(`Successfully invalidated catalog cache keys: ${keys.join(', ')}`);
            }
        }
        catch (error) {
            console.error('Failed to invalidate catalog cache:', error);
        }
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cacheService.js.map