"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackChunkLatency = exports.playbackErrorsCounter = exports.chunkLatencyHistogram = exports.activeStreamsGauge = exports.streamsInitiatedCounter = exports.streamingRegistry = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
// Custom Prometheus metrics registry for Streaming Service
exports.streamingRegistry = new prom_client_1.default.Registry();
// 1. Counter for total streams initiated
exports.streamsInitiatedCounter = new prom_client_1.default.Counter({
    name: 'streams_initiated_total',
    help: 'Total number of playback streams initialized',
    labelNames: ['user_role'],
    registers: [exports.streamingRegistry],
});
// 2. Gauge for active stream tracking
exports.activeStreamsGauge = new prom_client_1.default.Gauge({
    name: 'active_playback_streams',
    help: 'Number of concurrent playback streams currently active',
    registers: [exports.streamingRegistry],
});
// 3. Histogram for measuring video chunk delivery latency
exports.chunkLatencyHistogram = new prom_client_1.default.Histogram({
    name: 'video_chunk_latency_seconds',
    help: 'Latency distribution for delivering video manifest chunks',
    labelNames: ['route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0], // Tailored buckets for video streaming latency
    registers: [exports.streamingRegistry],
});
// 4. Counter for tracking streaming/playback failures
exports.playbackErrorsCounter = new prom_client_1.default.Counter({
    name: 'playback_errors_total',
    help: 'Total count of streaming/playback failures',
    labelNames: ['error_type', 'stream_format'],
    registers: [exports.streamingRegistry],
});
// Initialize default metrics
prom_client_1.default.collectDefaultMetrics({ register: exports.streamingRegistry });
/**
 * Middleware to track HTTP latency metrics for stream chunks
 */
const trackChunkLatency = (req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const durationSeconds = diff[0] + diff[1] / 1e9;
        // Track metrics for manifest or chunk delivery requests
        if (req.path.includes('/hls') || req.path.includes('/dash') || req.path.includes('/chunk')) {
            exports.chunkLatencyHistogram.observe({
                route: req.baseUrl + req.path,
                status_code: res.statusCode.toString(),
            }, durationSeconds);
        }
    });
    next();
};
exports.trackChunkLatency = trackChunkLatency;
//# sourceMappingURL=metricsMiddleware.js.map