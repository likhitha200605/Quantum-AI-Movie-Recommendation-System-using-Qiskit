"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkConcurrentStreamLimit = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = __importDefault(require("../config/redis"));
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_123_change_in_prod';
const MAX_CONCURRENT_STREAMS = 3;
/**
 * Middleware to authenticate user and verify JWT access token
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
        req.user = decoded;
        return next();
    }
    catch (err) {
        return res.status(403).json({ message: 'Invalid or expired access token' });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware enforcing maximum concurrent streams using Redis-based tracking
 */
const checkConcurrentStreamLimit = async (req, res, next) => {
    const userId = req.user?.userId;
    const { streamId } = req.body || req.query; // Client must provide a unique identifier for this playback session
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!streamId) {
        return res.status(400).json({ message: 'Unique streamId required to track concurrent streams' });
    }
    try {
        const activeStreamKey = `active_stream:${userId}:${streamId}`;
        // Find all active streams for the user
        const userKeys = await redis_1.default.keys(`active_stream:${userId}:*`);
        const activeStreamCount = userKeys.length;
        // Check if the current stream session is already registered
        const isAlreadyStreamingThisSession = userKeys.includes(activeStreamKey);
        if (activeStreamCount >= MAX_CONCURRENT_STREAMS && !isAlreadyStreamingThisSession) {
            return res.status(403).json({
                message: 'Concurrent stream limit reached',
                limit: MAX_CONCURRENT_STREAMS,
                detail: `You are currently streaming on ${activeStreamCount} devices. Please stop playback on one device to proceed.`
            });
        }
        // Register/Heartbeat the stream key (TTL of 30 seconds)
        // The player client must hit the heartbeat endpoint every 15s to keep it alive
        await redis_1.default.setEx(activeStreamKey, 30, 'active');
        return next();
    }
    catch (error) {
        console.error('Error in concurrent stream limit middleware:', error);
        // Fail-safe: allow streaming if Redis fails, but log the alert
        return next();
    }
};
exports.checkConcurrentStreamLimit = checkConcurrentStreamLimit;
//# sourceMappingURL=streamLimitMiddleware.js.map