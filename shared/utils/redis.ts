import { createClient } from 'redis';
import dotenv from 'dotenv';
import * as path from 'path';
import logger from './logger';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Support both REDIS_URL (Upstash) and individual env vars
// Upstash uses token-based auth: rediss://default:[TOKEN]@[ENDPOINT]:6379
const redisUrl = process.env.REDIS_URL;

const redisClient = redisUrl
  ? createClient({
      url: redisUrl,
    })
  : createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || process.env.REDIS_TOKEN || undefined,
    });

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

// Lazy connection - connect only when needed
let connectionPromise: Promise<void> | null = null;

export const ensureConnected = async (): Promise<void> => {
  if (redisClient.isOpen) {
    return;
  }
  
  if (connectionPromise) {
    return connectionPromise;
  }
  
  connectionPromise = redisClient.connect().catch((err) => {
    logger.error('Failed to connect to Redis:', err);
    connectionPromise = null; // Reset on error so we can retry
    throw err;
  });
  
  return connectionPromise;
};

// Safe Redis operations wrapper - returns null if Redis is unavailable
export const safeRedisGet = async (key: string): Promise<string | null> => {
  try {
    if (!redisClient.isOpen) {
      await ensureConnected();
    }
    return await redisClient.get(key);
  } catch (err) {
    logger.warn('Redis get operation failed:', err);
    return null;
  }
};

export const safeRedisSetEx = async (key: string, seconds: number, value: string): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await ensureConnected();
    }
    await redisClient.setEx(key, seconds, value);
  } catch (err) {
    logger.warn('Redis setEx operation failed:', err);
    // Silently fail - caching is optional
  }
};

export const safeRedisDel = async (pattern: string): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await ensureConnected();
    }
    // Handle wildcard patterns
    if (pattern.includes('*')) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      await redisClient.del(pattern);
    }
  } catch (err) {
    logger.warn('Redis del operation failed:', err);
    // Silently fail - cache invalidation is optional
  }
};

// Auto-connect in background (non-blocking)
ensureConnected().catch(() => {
  // Silently fail - will retry on first use
});

export default redisClient;

