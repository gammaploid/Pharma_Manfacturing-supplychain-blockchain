const Redis = require('ioredis');
const config = require('../config/cache-config');

class CacheService {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            keyPrefix: 'pharma:'
        });

        this.defaultTTL = 3600; // 1 hour default TTL
    }

    async get(key) {
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Cache get error: ${error.message}`);
            return null;
        }
    }

    async set(key, value, ttl = this.defaultTTL) {
        try {
            await this.redis.set(
                key,
                JSON.stringify(value),
                'EX',
                ttl
            );
            return true;
        } catch (error) {
            console.error(`Cache set error: ${error.message}`);
            return false;
        }
    }

    async del(key) {
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error(`Cache delete error: ${error.message}`);
            return false;
        }
    }

    generateKey(prefix, params) {
        return `${prefix}:${JSON.stringify(params)}`;
    }

    async invalidatePattern(pattern) {
        try {
            const keys = await this.redis.keys(`pharma:${pattern}*`);
            if (keys.length > 0) {
                await this.redis.del(keys);
            }
            return true;
        } catch (error) {
            console.error(`Cache pattern invalidation error: ${error.message}`);
            return false;
        }
    }
}