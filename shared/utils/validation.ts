import { z } from 'zod';

// Common validation schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number');

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
});

// Date range schema
export const dateRangeSchema = z.object({
  start_date: z.string().date(),
  end_date: z.string().date(),
});

export { z };


