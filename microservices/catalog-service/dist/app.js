"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const prom_client_1 = __importDefault(require("prom-client"));
const movieController_1 = require("./controllers/movieController");
const app = (0, express_1.default)();
// Enable Prometheus metrics
const registerMetrics = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register: registerMetrics });
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
// Scrape metrics path
app.get('/metrics', async (_req, res) => {
    try {
        res.set('Content-Type', registerMetrics.contentType);
        res.end(await registerMetrics.metrics());
    }
    catch (ex) {
        res.status(500).end(ex);
    }
});
// App Health
app.get('/health', (_req, res) => {
    res.json({ status: 'UP', service: 'catalog-service' });
});
// Movie API endpoints
app.get('/api/catalog/movies/trending', movieController_1.getTrending);
app.get('/api/catalog/movies/popular', movieController_1.getPopular);
app.get('/api/catalog/movies/:id', movieController_1.getMovieById);
app.post('/api/catalog/movies', movieController_1.createMovie);
// Error Handling
app.use((err, _req, res, _next) => {
    console.error('Unhandled Catalog Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        detail: process.env.NODE_ENV === 'production' ? null : err.message
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map