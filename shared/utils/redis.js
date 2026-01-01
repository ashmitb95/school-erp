"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeRedisDel = exports.safeRedisSetEx = exports.safeRedisGet = exports.ensureConnected = void 0;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("./logger"));
// Load .env from project root
dotenv_1.default.config({ path: path.resolve(__dirname, '../../.env') });
// Support both REDIS_URL (Upstash) and individual env vars
// Upstash uses token-based auth: rediss://default:[TOKEN]@[ENDPOINT]:6379
const redisUrl = process.env.REDIS_URL;
const redisClient = redisUrl
    ? (0, redis_1.createClient)({
        url: redisUrl,
    })
    : (0, redis_1.createClient)({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD || process.env.REDIS_TOKEN || undefined,
    });
redisClient.on('error', (err) => {
    logger_1.default.error('Redis Client Error:', err);
});
redisClient.on('connect', () => {
    logger_1.default.info('Redis Client Connected');
});
// Lazy connection - connect only when needed
let connectionPromise = null;
const ensureConnected = async () => {
    if (redisClient.isOpen) {
        return;
    }
    if (connectionPromise) {
        await connectionPromise;
        return;
    }
    connectionPromise = redisClient.connect().catch((err) => {
        logger_1.default.error('Failed to connect to Redis:', err);
        connectionPromise = null; // Reset on error so we can retry
        throw err;
    });
    await connectionPromise;
};
exports.ensureConnected = ensureConnected;
// Safe Redis operations wrapper - returns null if Redis is unavailable
const safeRedisGet = async (key) => {
    try {
        if (!redisClient.isOpen) {
            await (0, exports.ensureConnected)();
        }
        return await redisClient.get(key);
    }
    catch (err) {
        logger_1.default.warn('Redis get operation failed:', err);
        return null;
    }
};
exports.safeRedisGet = safeRedisGet;
const safeRedisSetEx = async (key, seconds, value) => {
    try {
        if (!redisClient.isOpen) {
            await (0, exports.ensureConnected)();
        }
        await redisClient.setEx(key, seconds, value);
    }
    catch (err) {
        logger_1.default.warn('Redis setEx operation failed:', err);
        // Silently fail - caching is optional
    }
};
exports.safeRedisSetEx = safeRedisSetEx;
const safeRedisDel = async (pattern) => {
    try {
        if (!redisClient.isOpen) {
            await (0, exports.ensureConnected)();
        }
        // Handle wildcard patterns
        if (pattern.includes('*')) {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        }
        else {
            await redisClient.del(pattern);
        }
    }
    catch (err) {
        logger_1.default.warn('Redis del operation failed:', err);
        // Silently fail - cache invalidation is optional
    }
};
exports.safeRedisDel = safeRedisDel;
// Auto-connect in background (non-blocking)
(0, exports.ensureConnected)().catch(() => {
    // Silently fail - will retry on first use
});
exports.default = redisClient;
//# sourceMappingURL=redis.js.map