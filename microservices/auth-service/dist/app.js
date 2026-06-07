"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const prom_client_1 = __importDefault(require("prom-client"));
const authController_1 = require("./controllers/authController");
const app = (0, express_1.default)();
// Enable Prometheus default metrics collection
const registerMetrics = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register: registerMetrics });
// Security & Parsing Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Scrape target endpoint for Prometheus
app.get('/metrics', async (_req, res) => {
    try {
        res.set('Content-Type', registerMetrics.contentType);
        res.end(await registerMetrics.metrics());
    }
    catch (ex) {
        res.status(500).end(ex);
    }
});
// App Health Check
app.get('/health', (_req, res) => {
    res.json({ status: 'UP', service: 'auth-service' });
});
// Auth Routes
app.post('/api/auth/register', authController_1.register);
app.post('/api/auth/login', authController_1.login);
app.post('/api/auth/refresh', authController_1.refresh);
app.post('/api/auth/logout', authController_1.logout);
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled Auth Error:', err);
    res.status(500).json({
        message: 'Internal service error',
        detail: process.env.NODE_ENV === 'production' ? null : err.message
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map