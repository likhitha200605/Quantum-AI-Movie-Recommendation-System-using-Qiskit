"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const app_1 = __importDefault(require("./app"));
const redis_1 = __importDefault(require("./config/redis"));
const client_1 = require("@prisma/client");
const PORT = process.env.PORT || 5002;
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const server = app_1.default.listen(PORT, () => {
    console.log(`Catalog Service listening on port ${PORT}`);
});
const shutdown = async () => {
    console.log('Initiating graceful shutdown of Catalog Service...');
    server.close(async () => {
        console.log('HTTP server closed.');
        try {
            await prisma.$disconnect();
            console.log('Prisma Client disconnected.');
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