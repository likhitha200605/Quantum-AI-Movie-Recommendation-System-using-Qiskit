"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const streamLimitMiddleware_1 = require("./middleware/streamLimitMiddleware");
const metricsMiddleware_1 = require("./middleware/metricsMiddleware");
const streamController_1 = require("./controllers/streamController");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Latency tracker for video manifests/chunks
app.use(metricsMiddleware_1.trackChunkLatency);
// Scrape metrics path exposing custom registry
app.get('/metrics', async (_req, res) => {
    try {
        res.set('Content-Type', metricsMiddleware_1.streamingRegistry.contentType);
        res.end(await metricsMiddleware_1.streamingRegistry.metrics());
    }
    catch (ex) {
        res.status(500).end(ex);
    }
});
// App Health
app.get('/health', (_req, res) => {
    res.json({ status: 'UP', service: 'streaming-service' });
});
// Video Playback Routes
app.get('/api/stream/play/:movieId', streamLimitMiddleware_1.authenticateToken, streamLimitMiddleware_1.checkConcurrentStreamLimit, streamController_1.startPlayback);
app.post('/api/stream/heartbeat', streamLimitMiddleware_1.authenticateToken, streamController_1.processHeartbeat);
app.post('/api/stream/stop', streamLimitMiddleware_1.authenticateToken, streamController_1.terminatePlayback);
// Error Handling
app.use((err, _req, res, _next) => {
    console.error('Unhandled Streaming Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        detail: process.env.NODE_ENV === 'production' ? null : err.message
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map