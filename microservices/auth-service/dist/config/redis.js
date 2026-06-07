"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = (0, redis_1.createClient)({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            // Exponential backoff with a cap of 3000ms
            const delay = Math.min(retries * 100, 3000);
            console.warn(`Redis disconnected. Reconnecting in ${delay}ms... (Attempt ${retries})`);
            return delay;
        }
    }
});
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected Successfully.'));
// Establish connection on service startup
(async () => {
    try {
        await redisClient.connect();
    }
    catch (error) {
        console.error('Failed to initialize Redis connection:', error);
    }
})();
exports.default = redisClient;
//# sourceMappingURL=redis.js.map