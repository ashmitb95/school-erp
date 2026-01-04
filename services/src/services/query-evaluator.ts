import { SemanticQuery } from './query-disambiguator';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  message: string;
}

/**
 * Stage 5: Query Evaluator
 * Validates SQL and suggests improvements
 */
export class QueryEvaluator {
  /**
   * Evaluate semantic query before SQL generation
   */
  evaluateSemanticQuery(semanticQuery: SemanticQuery): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check for required fields
    if (!semanticQuery.primaryTable) {
      errors.push('Primary table is not specified');
    }

    if (semanticQuery.conditions.length === 0) {
      warnings.push('No conditions specified - query may return all records');
      suggestions.push('Consider adding filters to limit results');
    }

    // Check for school_id filter
    const hasSchoolId = semanticQuery.conditions.some(c => c.includes('school_id'));
    if (!hasSchoolId) {
      errors.push('Missing school_id filter - this is required for data isolation');
    }

    // Check joins
    if (semanticQuery.joins.length > 0) {
      // Verify join conditions are present
      for (const join of semanticQuery.joins) {
        if (!join.on || join.on.trim() === '') {
          errors.push(`Join to ${join.table} is missing ON condition`);
        }
      }
    }

    // Check for DISTINCT when needed
    if (semanticQuery.joins.length > 0 && !semanticQuery.isCount) {
      // Multiple joins might create duplicates
      if (!semanticQuery.selectFields.some(f => f.includes('DISTINCT'))) {
        suggestions.push('Consider using DISTINCT to avoid duplicate rows from joins');
      }
    }

    // Check for proper ordering
    if (!semanticQuery.orderBy && !semanticQuery.isCount) {
      suggestions.push('Consider adding ORDER BY for predictable result ordering');
    }

    // Check limit for large result sets
    if (!semanticQuery.limit && !semanticQuery.isCount) {
      warnings.push('No LIMIT specified - query may return many rows');
      suggestions.push('Consider adding LIMIT for better performance');
    }

    const valid = errors.length === 0;
    const message = valid
      ? 'Query structure is valid. Ready to generate SQL.'
      : `Query has ${errors.length} error(s) that must be fixed.`;

    return {
      valid,
      warnings,
      errors,
      suggestions,
      message,
    };
  }

  /**
   * Evaluate generated SQL
   */
  evaluateSQL(sql: string): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    const sqlUpper = sql.toUpperCase().trim();

    // Security checks
    if (!sqlUpper.startsWith('SELECT')) {
      errors.push('Only SELECT queries are allowed');
    }

    const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE'];
    for (const keyword of dangerousKeywords) {
      if (sqlUpper.includes(keyword)) {
        errors.push(`Dangerous keyword detected: ${keyword}`);
      }
    }

    // Check for school_id filter
    if (!sql.includes('school_id')) {
      errors.push('Missing school_id filter - required for data isolation');
    }

    // Check for proper joins
    if (sqlUpper.includes('JOIN') && !sqlUpper.includes('ON')) {
      errors.push('JOIN statement missing ON condition');
    }

    // Check for potential performance issues
    if (sqlUpper.includes('SELECT *') && sqlUpper.includes('JOIN')) {
      warnings.push('Using SELECT * with JOINs may return duplicate columns');
      suggestions.push('Consider selecting specific columns');
    }

    // Check for missing WHERE clause with multiple tables
    const tableCount = (sqlUpper.match(/\bFROM\b|\bJOIN\b/g) || []).length;
    if (tableCount > 1 && !sqlUpper.includes('WHERE')) {
      warnings.push('Multiple tables without WHERE clause may create Cartesian product');
      suggestions.push('Add WHERE clause to filter results');
    }

    // Check for proper use of DISTINCT
    if (sqlUpper.includes('JOIN') && !sqlUpper.includes('DISTINCT') && !sqlUpper.includes('COUNT')) {
      warnings.push('JOINs without DISTINCT may create duplicate rows');
    }

    const valid = errors.length === 0;
    const message = valid
      ? 'SQL query is valid and safe to execute.'
      : `SQL query has ${errors.length} error(s) that must be fixed.`;

    return {
      valid,
      warnings,
      errors,
      suggestions,
      message,
    };
  }
}






