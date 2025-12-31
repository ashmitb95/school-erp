import { DATABASE_SCHEMA } from './database-schema';

interface QueryPattern {
  pattern: RegExp;
  generateSQL: (match: RegExpMatchArray, context?: any) => string;
  description: string;
}

/**
 * SQL Query Generator
 * Converts natural language queries to SQL
 */
export class SQLGenerator {
  private patterns: QueryPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    // Pattern: "show me which students in Class XII are absent today"
    this.patterns.push({
      pattern: /(?:show|list|find|get|which|who).*students?.*(?:in|from|of).*class\s+([XIV\d]+|twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one|1st|2nd|3rd|\d+th).*(?:absent|not present|missing).*(?:today|now)/i,
      generateSQL: (match) => {
        const className = this.normalizeClassName(match[1]);
        return `SELECT s.*, c.name as class_name, a.status, a.date
                FROM students s
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN attendance a ON s.id = a.student_id AND a.date = CURRENT_DATE
                WHERE c.name ILIKE '%${className}%'
                AND (a.status = 'absent' OR (a.status IS NULL AND CURRENT_DATE IS NOT NULL))
                ORDER BY s.roll_number`;
      },
      description: "Find students absent today in a specific class"
    });

    // Pattern: "students in Class X"
    this.patterns.push({
      pattern: /(?:show|list|find|get|which|who).*students?.*(?:in|from|of).*class\s+([XIV\d]+|twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one|1st|2nd|3rd|\d+th)/i,
      generateSQL: (match) => {
        const className = this.normalizeClassName(match[1]);
        return `SELECT s.*, c.name as class_name
                FROM students s
                JOIN classes c ON s.class_id = c.id
                WHERE c.name ILIKE '%${className}%'
                AND s.is_active = true
                ORDER BY s.roll_number`;
      },
      description: "Find all students in a specific class"
    });

    // Pattern: "students absent today"
    this.patterns.push({
      pattern: /(?:show|list|find|get|which|who).*students?.*(?:absent|not present|missing).*(?:today|now)/i,
      generateSQL: () => {
        return `SELECT s.*, c.name as class_name, a.status, a.date
                FROM students s
                JOIN classes c ON s.class_id = c.id
                JOIN attendance a ON s.id = a.student_id
                WHERE a.date = CURRENT_DATE
                AND a.status = 'absent'
                ORDER BY c.name, s.roll_number`;
      },
      description: "Find all students absent today"
    });

    // Pattern: "pending fees"
    this.patterns.push({
      pattern: /(?:show|list|find|get|which|who).*(?:pending|unpaid|due).*fees?/i,
      generateSQL: () => {
        return `SELECT s.*, f.amount, f.due_date, f.fee_type, f.id as fee_id
                FROM students s
                JOIN fees f ON s.id = f.student_id
                WHERE f.status = 'pending'
                ORDER BY f.due_date, s.first_name`;
      },
      description: "Find students with pending fees"
    });

    // Pattern: "students with low attendance"
    this.patterns.push({
      pattern: /(?:show|list|find|get|which|who).*students?.*(?:low|poor|bad).*attendance/i,
      generateSQL: () => {
        return `SELECT s.*, c.name as class_name,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0) as attendance_percentage
                FROM students s
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN attendance a ON s.id = a.student_id
                WHERE a.date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY s.id, c.name
                HAVING COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0) < 75
                ORDER BY attendance_percentage ASC`;
      },
      description: "Find students with low attendance"
    });

    // Pattern: "top performing students"
    this.patterns.push({
      pattern: /(?:show|list|find|get|which|who).*(?:top|best|highest).*(?:performing|scoring|marks|results?).*students?/i,
      generateSQL: () => {
        return `SELECT s.*, c.name as class_name,
                AVG(er.marks_obtained * 100.0 / NULLIF(er.max_marks, 0)) as average_percentage
                FROM students s
                JOIN classes c ON s.class_id = c.id
                JOIN exam_results er ON s.id = er.student_id
                GROUP BY s.id, c.name
                ORDER BY average_percentage DESC
                LIMIT 10`;
      },
      description: "Find top performing students"
    });

    // Pattern: "upcoming exams"
    this.patterns.push({
      pattern: /(?:show|list|find|get|which|what).*(?:upcoming|future|scheduled).*exams?/i,
      generateSQL: () => {
        return `SELECT e.*, c.name as class_name
                FROM exams e
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE e.start_date >= CURRENT_DATE
                ORDER BY e.start_date ASC`;
      },
      description: "Find upcoming exams"
    });

    // Pattern: "students by class"
    this.patterns.push({
      pattern: /(?:count|number|how many).*students?.*(?:in|from|of).*class\s+([XIV\d]+|twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one|1st|2nd|3rd|\d+th)/i,
      generateSQL: (match) => {
        const className = this.normalizeClassName(match[1]);
        return `SELECT COUNT(*) as student_count, c.name as class_name
                FROM students s
                JOIN classes c ON s.class_id = c.id
                WHERE c.name ILIKE '%${className}%'
                AND s.is_active = true
                GROUP BY c.name`;
      },
      description: "Count students in a class"
    });
  }

  private normalizeClassName(input: string): string {
    const classMap: Record<string, string> = {
      'twelve': 'XII', '12th': 'XII', '12': 'XII',
      'eleven': 'XI', '11th': 'XI', '11': 'XI',
      'ten': 'X', '10th': 'X', '10': 'X',
      'nine': 'IX', '9th': 'IX', '9': 'IX',
      'eight': 'VIII', '8th': 'VIII', '8': 'VIII',
      'seven': 'VII', '7th': 'VII', '7': 'VII',
      'six': 'VI', '6th': 'VI', '6': 'VI',
      'five': 'V', '5th': 'V', '5': 'V',
      'four': 'IV', '4th': 'IV', '4': 'IV',
      'three': 'III', '3rd': 'III', '3': 'III',
      'two': 'II', '2nd': 'II', '2': 'II',
      'one': 'I', '1st': 'I', '1': 'I',
    };

    const normalized = input.toLowerCase().trim();
    return classMap[normalized] || input.toUpperCase();
  }

  generateSQL(query: string, context?: any): { sql: string; description: string } | null {
    const normalizedQuery = query.toLowerCase().trim();

    for (const pattern of this.patterns) {
      const match = normalizedQuery.match(pattern.pattern);
      if (match) {
        try {
          const sql = pattern.generateSQL(match, context);
          return {
            sql: sql.trim(),
            description: pattern.description
          };
        } catch (error) {
          console.error('Error generating SQL:', error);
          return null;
        }
      }
    }

    // Fallback: Try to extract key entities and create a basic query
    return this.generateFallbackSQL(normalizedQuery);
  }

  private generateFallbackSQL(query: string): { sql: string; description: string } | null {
    // Simple fallback - just search for students
    if (query.includes('student')) {
      return {
        sql: `SELECT s.*, c.name as class_name
              FROM students s
              JOIN classes c ON s.class_id = c.id
              WHERE s.is_active = true
              LIMIT 50`,
        description: "General student query"
      };
    }

    return null;
  }

  /**
   * Sanitize SQL to prevent injection
   */
  sanitizeSQL(sql: string): string {
    // Remove dangerous SQL keywords
    const dangerous = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE', 'GRANT', 'REVOKE'];
    const upperSQL = sql.toUpperCase();
    
    for (const keyword of dangerous) {
      if (upperSQL.includes(keyword)) {
        throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
      }
    }

    // Only allow SELECT statements
    if (!upperSQL.trim().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }

    return sql;
  }
}

