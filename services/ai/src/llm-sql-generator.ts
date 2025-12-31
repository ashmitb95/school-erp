import { sequelize } from '../../../shared/database/config';
import { QueryTypes } from 'sequelize';
import { getSchemaContext, DATABASE_SCHEMA } from './database-schema';

// Use native fetch (Node 18+) or node-fetch
let fetch: any;
if (typeof globalThis.fetch !== 'undefined') {
  fetch = globalThis.fetch;
} else {
  // Fallback for older Node versions
  fetch = require('node-fetch');
}

interface SQLGenerationResult {
  sql: string;
  description: string;
}

interface ExecutionResult {
  success: boolean;
  data?: any[];
  sql?: string;
  formattedResponse?: string;
  error?: string;
}

/**
 * LLM-based SQL Generator
 * Uses database schema + example values to generate SQL from natural language
 */
export class LLMSQLGenerator {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private exampleCache: Map<string, any> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Support multiple LLM providers
    this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    
    // Determine API URL and default model based on provider
    if (process.env.OPENAI_API_KEY) {
      this.apiUrl = 'https://api.openai.com/v1/chat/completions';
      this.model = process.env.LLM_MODEL || 'gpt-4o-mini';
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.apiUrl = 'https://api.anthropic.com/v1/messages';
      this.model = process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022'; // Latest Claude model
    } else if (process.env.LLM_API_URL) {
      this.apiUrl = process.env.LLM_API_URL;
      this.model = process.env.LLM_MODEL || 'gpt-4o-mini';
    } else {
      // Fallback to local/self-hosted model
      this.apiUrl = process.env.LLM_API_URL || 'http://localhost:11434/v1/chat/completions';
      this.model = process.env.LLM_MODEL || 'gpt-4o-mini';
    }
  }

  /**
   * Fetch example values from database to help LLM understand actual data
   */
  private async getExampleValues(): Promise<Record<string, any>> {
    const cacheKey = 'examples';
    const cached = this.exampleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const examples: Record<string, any> = {};

      // Get example class names
      const classExamples = await sequelize.query(
        `SELECT DISTINCT name, level FROM classes WHERE is_active = true LIMIT 10`,
        { type: QueryTypes.SELECT }
      );
      examples.classes = classExamples;

      // Get example student names
      const studentExamples = await sequelize.query(
        `SELECT first_name, last_name, admission_number, roll_number FROM students WHERE is_active = true LIMIT 10`,
        { type: QueryTypes.SELECT }
      );
      examples.students = studentExamples;

      // Get example fee types
      const feeTypes = await sequelize.query(
        `SELECT DISTINCT fee_type FROM fees LIMIT 10`,
        { type: QueryTypes.SELECT }
      );
      examples.feeTypes = feeTypes.map((f: any) => f.fee_type);

      // Get example exam types
      const examTypes = await sequelize.query(
        `SELECT DISTINCT exam_type, name FROM exams LIMIT 10`,
        { type: QueryTypes.SELECT }
      );
      examples.examTypes = examTypes;

      // Get example attendance statuses
      examples.attendanceStatuses = ['present', 'absent', 'late', 'excused'];

      // Get example academic years
      const academicYears = await sequelize.query(
        `SELECT DISTINCT academic_year FROM students ORDER BY academic_year DESC LIMIT 5`,
        { type: QueryTypes.SELECT }
      );
      examples.academicYears = academicYears.map((a: any) => a.academic_year);

      // Get example school names
      const schoolExamples = await sequelize.query(
        `SELECT name, code, city, state FROM schools WHERE is_active = true LIMIT 5`,
        { type: QueryTypes.SELECT }
      );
      examples.schools = schoolExamples;

      this.exampleCache.set(cacheKey, { data: examples, timestamp: Date.now() });
      return examples;
    } catch (error) {
      console.error('Error fetching example values:', error);
      return {};
    }
  }

  /**
   * Build prompt for LLM with schema + examples
   */
  async buildPrompt(query: string, context?: any, conversationHistory?: Array<{ role: string; content: string }>): Promise<string> {
    const schema = getSchemaContext();
    const examples = await this.getExampleValues();

    // Format conversation history for context
    let historyContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historyContext = '\n\nCONVERSATION HISTORY (for context - use this to understand references like "those students", "the fees I mentioned", etc.):\n';
      conversationHistory.slice(-10).forEach((msg) => {
        historyContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      historyContext += '\nUse the conversation history to understand context and references in the current query.\n';
    }

    return `You are an expert SQL query generator for a School ERP system. Your task is to convert natural language queries into safe, accurate PostgreSQL SELECT queries.

DATABASE SCHEMA:
${schema}

EXAMPLE VALUES FROM DATABASE:
${JSON.stringify(examples, null, 2)}
${historyContext}

THINKING PROCESS:
Before generating SQL, think about what the user really wants:
1. If they ask "how many" or "count", they want to SEE the actual records, not just a number. Always return full records with all relevant details.
2. If they ask about students, include student details (name, admission number, class, etc.)
3. If they ask about fees, include fee details (amount, due date, status, fee type)
4. If they ask about attendance, include attendance details (date, status, class)
5. Always include context - if querying students, show their class. If querying fees, show student info.
6. Use DISTINCT when needed to avoid duplicate rows (e.g., when joining fees to students)
7. Order results logically - by date (most recent first), by name (alphabetical), or by amount (highest first)
8. CRITICAL FOR RATIOS/PERCENTAGES: If the user asks for a "ratio" or "percentage", you have two options:
   a) Generate SQL that directly calculates the ratio/percentage using GROUP BY and aggregate functions (preferred)
   b) Generate SQL that returns data grouped by the relevant categories (e.g., stream, type, status) so the ratio can be calculated from the results
   For example, for "ratio of science to arts students", you could:
   - Option A (preferred): SELECT stream, COUNT(DISTINCT student_id) as count FROM (...) GROUP BY stream
   - Option B: Return all records with a 'stream' field that categorizes each record, and the system will calculate the ratio
   Always include a categorization field (like 'stream', 'category', 'type') when the query involves ratios or comparisons

IMPORTANT RULES:
1. Only generate SELECT queries - never INSERT, UPDATE, DELETE, DROP, or ALTER
2. Use proper JOINs based on the relationships defined in the schema
3. Use ILIKE for case-insensitive text matching (PostgreSQL)
4. Use CURRENT_DATE for "today" references, CURRENT_DATE - INTERVAL '1 month' for "last month"
5. Always include relevant JOINs to get related data (e.g., class names when querying students)
6. Use proper table aliases (s for students, c for classes, a for attendances, f for fees, etc.)
7. Return only the SQL query, no explanations, no markdown, just pure SQL
8. CRITICAL: Table names are PLURAL - use 'attendances' (NOT 'attendance'), 'students', 'classes', 'fees', 'exams', 'exam_results', 'staff', 'subjects', 'schools'
9. CRITICAL: For "how many" queries, return FULL RECORDS, not COUNT(*). The user wants to see the actual data.
10. Always include ORDER BY for predictable, useful sorting
11. Use DISTINCT when joining tables that might create duplicates (e.g., students with multiple fees)

EXAMPLES OF QUERIES:
- "show me which students in Class XII are absent today"
  SQL: SELECT DISTINCT s.*, c.name as class_name, a.status, a.date FROM students s JOIN classes c ON s.class_id = c.id LEFT JOIN attendances a ON s.id = a.student_id AND a.date = CURRENT_DATE WHERE s.school_id = '<school_id_from_context>' AND c.name ILIKE '%XII%' AND (a.status = 'absent' OR a.status IS NULL) ORDER BY s.roll_number

- "students with pending fees"
  SQL: SELECT DISTINCT s.*, f.amount, f.due_date, f.fee_type, f.status FROM students s JOIN fees f ON s.id = f.student_id WHERE s.school_id = '<school_id_from_context>' AND f.school_id = '<school_id_from_context>' AND f.status = 'pending' ORDER BY f.due_date DESC, s.last_name

- "how many students have unpaid library fees in the last month?"
  SQL: SELECT DISTINCT s.*, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, f.amount, f.due_date, f.fee_type, f.status FROM students s JOIN fees f ON s.id = f.student_id LEFT JOIN classes c ON s.class_id = c.id WHERE s.school_id = '<school_id_from_context>' AND f.school_id = '<school_id_from_context>' AND f.fee_type = 'library' AND f.status IN ('pending', 'partial') AND f.due_date >= CURRENT_DATE - INTERVAL '1 month' ORDER BY f.due_date DESC, s.last_name

- "top 10 students by exam marks"
  SQL: SELECT s.*, s.first_name, s.last_name, s.admission_number, c.name as class_name, AVG(er.marks_obtained * 100.0 / NULLIF(er.max_marks, 0)) as avg_percentage FROM students s JOIN exam_results er ON s.id = er.student_id JOIN exams e ON er.exam_id = e.id LEFT JOIN classes c ON s.class_id = c.id WHERE s.school_id = '<school_id_from_context>' AND e.school_id = '<school_id_from_context>' GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name ORDER BY avg_percentage DESC LIMIT 10

- "list all students absent today"
  SQL: SELECT DISTINCT s.*, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, a.status, a.date FROM students s JOIN classes c ON s.class_id = c.id JOIN attendances a ON s.id = a.student_id WHERE s.school_id = '<school_id_from_context>' AND a.school_id = '<school_id_from_context>' AND a.date = CURRENT_DATE AND a.status = 'absent' ORDER BY c.name, s.roll_number

- "what is the ratio of science students to arts students?"
  SQL: SELECT 
    CASE 
      WHEN sub.name ILIKE '%science%' OR sub.name ILIKE '%physics%' OR sub.name ILIKE '%chemistry%' OR sub.name ILIKE '%biology%' OR sub.name ILIKE '%mathematics%' THEN 'Science'
      WHEN sub.name ILIKE '%arts%' OR sub.name ILIKE '%english%' OR sub.name ILIKE '%hindi%' OR sub.name ILIKE '%history%' OR sub.name ILIKE '%geography%' OR sub.name ILIKE '%literature%' THEN 'Arts'
      ELSE 'Other'
    END as stream,
    COUNT(DISTINCT s.id) as student_count
  FROM students s
  JOIN exam_results er ON s.id = er.student_id
  JOIN exams e ON er.exam_id = e.id
  JOIN subjects sub ON er.subject_id = sub.id
  WHERE s.school_id = '<school_id_from_context>' AND e.school_id = '<school_id_from_context>' AND sub.school_id = '<school_id_from_context>'
    AND (sub.name ILIKE '%science%' OR sub.name ILIKE '%physics%' OR sub.name ILIKE '%chemistry%' OR sub.name ILIKE '%biology%' OR sub.name ILIKE '%mathematics%' 
         OR sub.name ILIKE '%arts%' OR sub.name ILIKE '%english%' OR sub.name ILIKE '%hindi%' OR sub.name ILIKE '%history%' OR sub.name ILIKE '%geography%' OR sub.name ILIKE '%literature%')
  GROUP BY stream
  HAVING stream IN ('Science', 'Arts')
  ORDER BY stream

USER QUERY: "${query}"

Think about what data the user wants to see. If they ask for ratios, percentages, or comparisons, either:
1. Generate SQL that directly calculates the metric using GROUP BY and aggregates (preferred)
2. Generate SQL that includes a categorization field (like 'stream', 'category', 'type') so the ratio can be calculated from the results

Then generate the SQL query:`;
  }

  /**
   * Call LLM API to generate SQL (streaming version)
   */
  async callLLMStream(prompt: string, onChunk: (chunk: string) => void): Promise<string> {
    if (!this.apiKey && !this.apiUrl.includes('localhost')) {
      throw new Error('LLM API key not configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or LLM_API_URL');
    }

    let fullResponse = '';

    try {
      // OpenAI format with streaming
      if (this.apiUrl.includes('openai.com')) {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: 'You are a SQL query generator. Return only valid PostgreSQL SELECT queries.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 500,
            stream: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'LLM API error');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;
                  onChunk(content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        return fullResponse.trim();
      }

      // Anthropic format with streaming
      if (this.apiUrl.includes('anthropic.com')) {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            messages: [
              { role: 'user', content: prompt }
            ],
            stream: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'LLM API error');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]' || data.trim() === '') continue;

              try {
                const json = JSON.parse(data);
                // Anthropic streaming format
                if (json.type === 'content_block_delta' && json.delta?.text) {
                  const content = json.delta.text;
                  fullResponse += content;
                  onChunk(content);
                } else if (json.type === 'content_block_start' || json.type === 'message_start') {
                  // Initial events, ignore
                  continue;
                } else if (json.type === 'message_delta' && json.delta?.stop_reason) {
                  // End of message
                  break;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        return fullResponse.trim();
      }

      // Generic OpenAI-compatible streaming
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a SQL query generator. Return only valid PostgreSQL SELECT queries.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 500,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'LLM API error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || json.content || '';
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullResponse.trim();
    } catch (error: any) {
      console.error('LLM API call failed:', error);
      throw new Error(`LLM API error: ${error.message}`);
    }
  }

  /**
   * Call LLM API to generate SQL
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.apiKey && !this.apiUrl.includes('localhost')) {
      throw new Error('LLM API key not configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or LLM_API_URL');
    }

    try {
      // OpenAI format
      if (this.apiUrl.includes('openai.com')) {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: 'You are a SQL query generator. Return only valid PostgreSQL SELECT queries.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 500,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'LLM API error');
        }

        return data.choices[0]?.message?.content?.trim() || '';
      }

      // Anthropic format
      if (this.apiUrl.includes('anthropic.com')) {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            messages: [
              { role: 'user', content: prompt }
            ],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'LLM API error');
        }

        return data.content[0]?.text?.trim() || '';
      }

      // Generic OpenAI-compatible API (local models, etc.)
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a SQL query generator. Return only valid PostgreSQL SELECT queries.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'LLM API error');
      }

      return data.choices?.[0]?.message?.content?.trim() || data.content?.[0]?.text?.trim() || '';
    } catch (error: any) {
      console.error('LLM API call failed:', error);
      throw new Error(`LLM API error: ${error.message}`);
    }
  }

  /**
   * Sanitize and validate SQL
   */
  private sanitizeSQL(sql: string): string {
    // Remove markdown code blocks if present
    sql = sql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
    
    // Remove any leading/trailing whitespace and newlines
    sql = sql.trim();

    // Remove dangerous keywords
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

  /**
   * Generate SQL from natural language query
   */
  async generateSQL(query: string, context?: any, conversationHistory?: Array<{ role: string; content: string }>): Promise<SQLGenerationResult | null> {
    try {
      // Extract school_id from context - REQUIRED for all queries
      const schoolId = context?.school_id;
      if (!schoolId) {
        console.error('[LLM SQL Generator] school_id is missing from context');
        throw new Error('school_id is required in context for SQL generation');
      }

      const prompt = await this.buildPrompt(query, context, conversationHistory);
      const rawSQL = await this.callLLM(prompt);
      let sql = this.sanitizeSQL(rawSQL);

      // Post-process: Replace <school_id_from_context> placeholder with actual school_id
      sql = sql.replace(/<school_id_from_context>/g, schoolId);

      return {
        sql,
        description: `Generated SQL for: ${query}`
      };
    } catch (error: any) {
      console.error('SQL generation error:', error);
      return null;
    }
  }

  /**
   * Generate SQL and execute it
   */
  async generateAndExecute(query: string, context?: any): Promise<ExecutionResult> {
    try {
      const result = await this.generateSQL(query, context);
      
      if (!result) {
        return {
          success: false,
          error: 'Could not generate SQL for this query'
        };
      }

      // Execute the SQL
      const data = await sequelize.query(result.sql, {
        type: QueryTypes.SELECT
      });

      // Format response
      const formattedResponse = this.formatResponse(query, data);

      return {
        success: true,
        data,
        sql: result.sql,
        formattedResponse
      };
    } catch (error: any) {
      console.error('SQL execution error:', error);
      return {
        success: false,
        error: error.message || 'Error executing query'
      };
    }
  }

  /**
   * Analyze data and perform calculations (ratios, percentages, etc.)
   */
  analyzeData(query: string, data: any[]): { analysis?: string; insights?: any } {
    if (data.length === 0) {
      return {};
    }

    const queryLower = query.toLowerCase();
    const insights: any = {};

    // Detect ratio queries
    if (queryLower.includes('ratio') || queryLower.includes('ratio of')) {
      // Try to find grouping fields (like 'stream', 'category', 'type', etc.)
      const groupingFields = ['stream', 'category', 'type', 'status', 'class_name', 'subject_name'];
      let groupField: string | null = null;
      
      for (const field of groupingFields) {
        if (data[0] && data[0][field] !== undefined) {
          groupField = field;
          break;
        }
      }

      if (groupField) {
        // Check if data is already aggregated (has count fields)
        const countFields = ['count', 'student_count', 'total_count', 'num_students'];
        let isAggregated = false;
        let countField: string | null = null;
        
        for (const field of countFields) {
          if (data[0] && typeof data[0][field] === 'number') {
            isAggregated = true;
            countField = field;
            break;
          }
        }

        const groups: Record<string, number> = {};
        
        if (isAggregated && countField) {
          // Data is already aggregated (e.g., SQL returned COUNT by group)
          data.forEach((item: any) => {
            const groupValue = item[groupField!];
            const count = item[countField!];
            if (groupValue && count) {
              groups[groupValue] = count;
            }
          });
        } else {
          // Data is raw records - count distinct items by group
          // For students, count distinct student IDs; for other records, count rows
          const idField = data[0].student_id || data[0].id || null;
          const seen = new Set<string>();
          
          data.forEach((item: any) => {
            const groupValue = item[groupField!];
            if (groupValue) {
              const key = idField ? `${groupValue}:${item[idField]}` : `${groupValue}:${JSON.stringify(item)}`;
              if (!seen.has(key)) {
                seen.add(key);
                groups[groupValue] = (groups[groupValue] || 0) + 1;
              }
            }
          });
        }

        const groupEntries = Object.entries(groups).filter(([_, count]) => count > 0);
        if (groupEntries.length >= 2) {
          // Calculate ratio between first two groups
          const [group1, count1] = groupEntries[0];
          const [group2, count2] = groupEntries[1];
          
          const ratio = count1 / count2;
          const ratioFormatted = ratio >= 1 
            ? `${ratio.toFixed(2)}:1` 
            : `1:${(1 / ratio).toFixed(2)}`;
          
          const total = count1 + count2;
          insights.ratio = {
            groups: { [group1]: count1, [group2]: count2 },
            ratio: ratioFormatted,
            percentage1: ((count1 / total) * 100).toFixed(1),
            percentage2: ((count2 / total) * 100).toFixed(1),
          };

          return {
            analysis: `The ratio of ${group1} to ${group2} is ${ratioFormatted} (${insights.ratio.percentage1}% ${group1}, ${insights.ratio.percentage2}% ${group2}). Total: ${total} ${group1} students and ${count2} ${group2} students.`,
            insights
          };
        }
      }
    }

    // Detect percentage queries
    if (queryLower.includes('percentage') || queryLower.includes('percent')) {
      // Similar logic for percentages
      const groupingFields = ['stream', 'category', 'type', 'status'];
      let groupField: string | null = null;
      
      for (const field of groupingFields) {
        if (data[0] && data[0][field] !== undefined) {
          groupField = field;
          break;
        }
      }

      if (groupField) {
        const groups: Record<string, number> = {};
        data.forEach((item: any) => {
          const value = item[groupField!];
          if (value) {
            groups[value] = (groups[value] || 0) + 1;
          }
        });

        const total = Object.values(groups).reduce((sum, count) => sum + count, 0);
        const percentages: Record<string, string> = {};
        
        Object.entries(groups).forEach(([group, count]) => {
          percentages[group] = ((count / total) * 100).toFixed(1);
        });

        insights.percentages = percentages;
        const percentageText = Object.entries(percentages)
          .map(([group, pct]) => `${group}: ${pct}%`)
          .join(', ');

        return {
          analysis: `Breakdown: ${percentageText}`,
          insights
        };
      }
    }

    // Detect average/mean queries
    if (queryLower.includes('average') || queryLower.includes('mean') || queryLower.includes('avg')) {
      const numericFields = ['marks_obtained', 'max_marks', 'amount', 'percentage', 'avg_percentage'];
      for (const field of numericFields) {
        if (data[0] && data[0][field] !== undefined) {
          const values = data.map((item: any) => parseFloat(item[field]) || 0).filter(v => v > 0);
          if (values.length > 0) {
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            insights.average = { field, value: avg.toFixed(2) };
            return {
              analysis: `The average ${field.replace('_', ' ')} is ${avg.toFixed(2)}.`,
              insights
            };
          }
        }
      }
    }

    return {};
  }

  /**
   * Format query results into natural language response
   */
  formatResponse(query: string, data: any[]): string {
    if (data.length === 0) {
      return 'No results found.';
    }

    // Perform data analysis for calculations
    const analysis = this.analyzeData(query, data);
    
    const count = data.length;
    const queryLower = query.toLowerCase();

    // If we have analysis (ratios, percentages, etc.), include it
    if (analysis.analysis) {
      return `${analysis.analysis}\n\nHere are the detailed results (${count} ${count === 1 ? 'record' : 'records'}):`;
    }

    // Focus on the actual data, count is just informational
    if (queryLower.includes('student')) {
      if (queryLower.includes('unpaid') || queryLower.includes('pending') || queryLower.includes('fee')) {
        const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.amount || item.fee_amount || 0) || 0), 0);
        if (totalAmount > 0) {
          return `Here are the students with unpaid fees (${count} ${count === 1 ? 'student' : 'students'}, total: ₹${totalAmount.toLocaleString('en-IN')}):`;
        }
        return `Here are the students with unpaid fees (${count} ${count === 1 ? 'student' : 'students'}):`;
      }
      if (queryLower.includes('absent')) {
        return `Here are the absent students (${count} ${count === 1 ? 'student' : 'students'}):`;
      }
      return `Here are the students (${count} ${count === 1 ? 'student' : 'students'}):`;
    }

    if (queryLower.includes('fee')) {
      const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.amount || item.fee_amount || 0) || 0), 0);
      if (totalAmount > 0) {
        return `Here are the fee records (${count} ${count === 1 ? 'record' : 'records'}, total: ₹${totalAmount.toLocaleString('en-IN')}):`;
      }
      return `Here are the fee records (${count} ${count === 1 ? 'record' : 'records'}):`;
    }

    if (queryLower.includes('exam') || queryLower.includes('result')) {
      return `Here are the exam results (${count} ${count === 1 ? 'result' : 'results'}):`;
    }

    if (queryLower.includes('attendance')) {
      return `Here are the attendance records (${count} ${count === 1 ? 'record' : 'records'}):`;
    }

    // Generic response - focus on showing the data
    return `Here are the results (${count} ${count === 1 ? 'item' : 'items'}):`;
  }

  /**
   * Generate conversational response (non-SQL queries)
   */
  async generateConversationalResponse(message: string, context?: any): Promise<string> {
    // For now, return a simple response
    // In the future, this could also use LLM for general conversation
    return `I can help you query your school data. Try asking things like:
- "Show me students absent today"
- "Which students in Class XII are absent?"
- "List pending fees"
- "Top performing students"
- "Upcoming exams"

What would you like to know?`;
  }
}

