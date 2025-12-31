"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.z = exports.dateRangeSchema = exports.paginationSchema = exports.phoneSchema = exports.emailSchema = exports.uuidSchema = void 0;
const zod_1 = require("zod");
Object.defineProperty(exports, "z", { enumerable: true, get: function () { return zod_1.z; } });
// Common validation schemas
exports.uuidSchema = zod_1.z.string().uuid();
exports.emailSchema = zod_1.z.string().email();
exports.phoneSchema = zod_1.z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number');
// Pagination schema
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(10000).default(20),
});
// Date range schema
exports.dateRangeSchema = zod_1.z.object({
    start_date: zod_1.z.string().date(),
    end_date: zod_1.z.string().date(),
});
