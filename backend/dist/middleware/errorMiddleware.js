"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errorHandler = (err, req, res, next) => {
    console.error('[Error Handler]:', err);
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }
    // Handle Prisma unique constraint violation or record not found
    if (err.code === 'P2002') {
        const targets = err.meta?.target || [];
        return res.status(409).json({
            error: `Conflict: ${targets.join(', ')} already exists`,
        });
    }
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({
        error: message,
    });
};
exports.errorHandler = errorHandler;
