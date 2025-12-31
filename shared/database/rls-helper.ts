/**
 * Row Level Security (RLS) Helper
 * 
 * This module provides utilities to set school_id context for RLS policies.
 * RLS policies automatically filter all queries by school_id, ensuring
 * data isolation between schools at the database level.
 */

import { sequelize } from './config';
import { QueryTypes } from 'sequelize';

/**
 * Set school_id context for the current database session
 * This enables RLS policies to automatically filter queries
 * 
 * @param schoolId - The school UUID to set as context
 * @param connection - Optional Sequelize connection/transaction
 */
export async function setSchoolContext(
  schoolId: string | null,
  connection?: any
): Promise<void> {
  if (!schoolId) {
    // If no school_id, clear the context (for admin/system queries)
    // In production, you might want to require school_id
    return;
  }

  const query = `SELECT set_config('app.school_id', $1, false)`;
  
  if (connection) {
    // Use provided connection (transaction, etc.)
    await connection.query(query, {
      bind: [schoolId],
      type: QueryTypes.SELECT,
    });
  } else {
    // Use default sequelize connection
    await sequelize.query(query, {
      bind: [schoolId],
      type: QueryTypes.SELECT,
    });
  }
}

/**
 * Clear school_id context (for admin/system queries)
 */
export async function clearSchoolContext(connection?: any): Promise<void> {
  const query = `SELECT set_config('app.school_id', NULL, false)`;
  
  if (connection) {
    await connection.query(query, {
      type: QueryTypes.SELECT,
    });
  } else {
    await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });
  }
}

/**
 * Get current school_id from session context
 */
export async function getCurrentSchoolContext(connection?: any): Promise<string | null> {
  const query = `SELECT current_setting('app.school_id', true) as school_id`;
  
  let result: any[];
  if (connection) {
    result = await connection.query(query, {
      type: QueryTypes.SELECT,
    });
  } else {
    result = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });
  }
  
  return result[0]?.school_id || null;
}

/**
 * Sequelize hook to set school_id before queries
 * Use this in your service endpoints after extracting school_id from request
 * 
 * Example:
 * ```typescript
 * app.get('/students', async (req, res) => {
 *   const schoolId = req.user?.school_id;
 *   await setSchoolContext(schoolId);
 *   // Now all queries will be filtered by school_id automatically
 *   const students = await Student.findAll();
 *   // ...
 * });
 * ```
 */

