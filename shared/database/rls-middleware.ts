/**
 * RLS Middleware for Express
 * 
 * This middleware extracts school_id from the request (JWT token, query params, or body)
 * and sets it as a database session variable for Row Level Security policies.
 * 
 * Usage:
 * ```typescript
 * import { rlsMiddleware } from '../../../shared/database/rls-middleware';
 * app.use(rlsMiddleware);
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { setSchoolContext } from './rls-helper';

/**
 * Extract school_id from various sources in the request
 */
function extractSchoolId(req: Request): string | null {
  // 1. Try from authenticated user (if JWT middleware sets req.user)
  if ((req as any).user?.school_id) {
    return (req as any).user.school_id;
  }

  // 2. Try from query parameters
  if (req.query.school_id && typeof req.query.school_id === 'string') {
    return req.query.school_id;
  }

  // 3. Try from request body
  if (req.body?.school_id && typeof req.body.school_id === 'string') {
    return req.body.school_id;
  }

  // 4. Try from Authorization header (if token contains school_id)
  // This would require decoding the JWT, which is usually done by auth middleware
  // For now, we'll rely on req.user being set by auth middleware

  return null;
}

/**
 * Express middleware to set school_id context for RLS
 * 
 * This should be used AFTER authentication middleware that sets req.user
 * but BEFORE route handlers that execute database queries.
 */
export function rlsMiddleware(req: Request, res: Response, next: NextFunction) {
  const schoolId = extractSchoolId(req);
  
  // Set school_id context asynchronously
  // Note: This sets it for the current connection pool, which might be shared
  // For production, consider using connection-per-request or transactions
  if (schoolId) {
    setSchoolContext(schoolId).catch((err) => {
      console.error('Failed to set school context:', err);
      // Continue anyway - RLS will fail if school_id is required
    });
  }

  next();
}

/**
 * Manual function to set school context for a specific request
 * Use this in route handlers when you need to set context explicitly
 */
export async function setRequestSchoolContext(
  req: Request,
  schoolId?: string
): Promise<void> {
  const id = schoolId || extractSchoolId(req);
  if (id) {
    await setSchoolContext(id);
  }
}

