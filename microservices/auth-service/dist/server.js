"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const redis_1 = __importDefault(require("./config/redis"));
const PORT = process.env.PORT || 5001;
const server = app_1.default.listen(PORT, () => {
    console.log(`Auth Service listening on port ${PORT}`);
});
// Graceful Shutdown Handler
const shutdown = async () => {
    console.log('Initiating graceful shutdown of Auth Service...');
    server.close(async () => {
        console.log('HTTP server closed.');
        try {
            await db_1.default.end();
            console.log('PostgreSQL pool disconnected.');
            await redis_1.default.disconnect();
            console.log('Redis client disconnected.');
            process.exit(0);
        }
        catch (err) {
            console.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
//# sourceMappingURL=server.js.map