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
  async getExampleValues(): Promise<Record<string, any>> {
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

    return `You are an expert SQL query generator for a Praxis ERP system. Your task is to convert natural language queries into safe, accurate PostgreSQL SELECT queries.

DATABASE SCHEMA:
${schema}

IMPORTANT: The schema above contains detailed column metadata with descriptions. Use these descriptions to intelligently match user queries to relevant columns. For example:
- If a query mentions "contact" or "phone", look for columns with "phone" in their description
- If a query mentions "parent", look for columns with "father" or "mother" in their description
- If a query mentions "email", look for columns with "email" in their description
- If a query mentions "address" or "location", look for columns with "address", "city", "state", "pincode" in their descriptions
- Always read the column descriptions to understand what data each column contains

EXAMPLE VALUES FROM DATABASE:
${JSON.stringify(examples, null, 2)}
${historyContext}

CRITICAL QUERY TYPE UNDERSTANDING:
You must distinguish between COUNT queries and LIST queries based on the user's intent:

COUNT QUERIES (use COUNT(DISTINCT ...)):
- ONLY use COUNT when the query explicitly asks for "how many", "number of", or "count" WITHOUT asking for specific fields
- "how many students are absent today" → SELECT COUNT(DISTINCT s.id) as count FROM ...
- "number of students with pending fees" → SELECT COUNT(DISTINCT s.id) as count FROM ...
- "count the students" → SELECT COUNT(DISTINCT s.id) as count FROM ...
- These queries want ONLY a number, not the actual records

LIST QUERIES (return full records with specific fields):
- If the query asks for SPECIFIC FIELDS (like "contact numbers", "names", "addresses"), it's ALWAYS a LIST query, NOT a count
- "contact numbers of students absent today" → SELECT DISTINCT s.first_name, s.last_name, s.father_name, s.father_phone, s.mother_name, s.mother_phone, s.emergency_contact_name, s.emergency_contact_phone, c.name as class_name FROM ...
- "which students are absent today" → SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, a.status, a.date FROM ...
- "show me students absent today" → SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name FROM ...
- "list students with pending fees" → SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, f.amount, f.due_date, f.fee_type FROM ...
- "give me parent contact numbers of students absent today" → SELECT DISTINCT s.first_name, s.last_name, s.father_name, s.father_phone, s.mother_name, s.mother_phone, s.emergency_contact_name, s.emergency_contact_phone, c.name as class_name FROM ...
- These queries want the ACTUAL RECORDS with relevant fields

COLUMN SELECTION FOR LIST QUERIES:
You must intelligently analyze the query and select ONLY the relevant columns from the schema metadata above. Follow these steps:

1. ANALYZE THE QUERY:
   - Identify what specific information the user is requesting (e.g., "contact numbers", "addresses", "names", "parent details", "guardian info")
   - Look for keywords that indicate specific data needs (contact, phone, email, address, location, parent, guardian, name, etc.)

2. MAP TO COLUMN METADATA:
   - Review the column descriptions in the DATABASE SCHEMA section above
   - Match the query intent to relevant columns based on their descriptions
   - For example:
     * "contact numbers" or "phone" → Look for columns with "phone" in description (father_phone, mother_phone, guardian_phone, emergency_contact_phone)
     * "parent" → Look for columns with "father" or "mother" in description (father_name, father_phone, mother_name, mother_phone, father_email, mother_email)
     * "guardian" → Look for columns with "guardian" in description (guardian_name, guardian_phone, guardian_email)
     * "address" or "location" → Look for columns with "address", "city", "state", "pincode" in descriptions
     * "email" → Look for columns with "email" in description (father_email, mother_email, guardian_email)

3. SELECT COLUMNS INTELLIGENTLY:
   - Include ALL columns that match the query intent (don't miss related fields)
   - Always include basic identifiers for context: id, first_name, last_name, admission_number, roll_number (when querying students)
   - Always include class_name (c.name) when querying students by joining with classes table
   - DO NOT use SELECT * - explicitly list only the fields needed
   - Use DISTINCT to avoid duplicates when joining multiple tables

4. EXAMPLES OF INTELLIGENT COLUMN SELECTION:
   - Query: "contact numbers of students absent today"
     * Analyze: User wants phone numbers
     * Map: Find all phone-related columns in students table: father_phone, mother_phone, emergency_contact_phone, guardian_phone
     * Select: s.first_name, s.last_name, s.father_name, s.father_phone, s.mother_name, s.mother_phone, s.emergency_contact_name, s.emergency_contact_phone, s.guardian_name, s.guardian_phone, c.name as class_name
   
   - Query: "parent email addresses of students with pending fees"
     * Analyze: User wants parent email addresses
     * Map: Find email columns related to parents: father_email, mother_email
     * Select: s.first_name, s.last_name, s.father_name, s.father_email, s.mother_name, s.mother_email, c.name as class_name, f.amount, f.due_date, f.fee_type
   
   - Query: "addresses of students in Class XII"
     * Analyze: User wants address information
     * Map: Find address-related columns: address, city, state, pincode
     * Select: s.first_name, s.last_name, s.admission_number, s.address, s.city, s.state, s.pincode, c.name as class_name

THINKING PROCESS:
1. First, check if the query asks for SPECIFIC FIELDS (contact numbers, names, addresses, emails, etc.)
   - If YES → It's a LIST query, NOT a count query, even if it says "how many"
   - If NO and query says "how many"/"number of"/"count" → It's a COUNT query
2. For COUNT queries: Use COUNT(DISTINCT id) and return only the count field
3. For LIST queries: 
   a. Analyze the query to understand what specific information is requested
   b. Review the DATABASE SCHEMA column metadata to find columns that match the query intent
   c. Select ALL relevant columns based on their descriptions (not just exact keyword matches)
   d. Always include basic identifiers (id, first_name, last_name, admission_number, roll_number) for context
   e. Always include class_name when querying students by joining with classes table
   f. Include related fields that provide context (e.g., if querying fees, include fee amount, due_date, fee_type)
4. Use DISTINCT when joining tables that might create duplicates
5. Order results logically - by date (most recent first), by name (alphabetical), or by amount (highest first)

IMPORTANT RULES:
1. Only generate SELECT queries - never INSERT, UPDATE, DELETE, DROP, or ALTER
2. Use proper JOINs based on the relationships defined in the schema
3. Use ILIKE for case-insensitive text matching (PostgreSQL)
4. Use CURRENT_DATE for "today" references, CURRENT_DATE - INTERVAL '1 month' for "last month"
5. Always include relevant JOINs to get related data (e.g., class names when querying students)
6. Use proper table aliases (s for students, c for classes, a for attendances, f for fees, etc.)
7. Return only the SQL query, no explanations, no markdown, just pure SQL
8. CRITICAL: Table names are PLURAL - use 'attendances' (NOT 'attendance'), 'students', 'classes', 'fees', 'exams', 'exam_results', 'staff', 'subjects', 'schools'
9. Always include ORDER BY for predictable, useful sorting
10. Use DISTINCT when joining tables that might create duplicates (e.g., students with multiple fees)

EXAMPLES OF QUERIES:

COUNT QUERY EXAMPLE:
- "how many students are absent today"
  SQL: SELECT COUNT(DISTINCT s.id) as count FROM students s JOIN attendances a ON s.id = a.student_id WHERE s.school_id = '<school_id_from_context>' AND a.school_id = '<school_id_from_context>' AND a.date = CURRENT_DATE AND a.status = 'absent'

LIST QUERY EXAMPLES:
- "which students are absent today"
  SQL: SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, a.status, a.date FROM students s JOIN classes c ON s.class_id = c.id JOIN attendances a ON s.id = a.student_id WHERE s.school_id = '<school_id_from_context>' AND a.school_id = '<school_id_from_context>' AND a.date = CURRENT_DATE AND a.status = 'absent' ORDER BY c.name, s.roll_number

- "contact numbers of students absent today"
  Analysis: Query requests phone numbers. From schema metadata, students table has: father_phone, mother_phone, emergency_contact_phone, guardian_phone (all phone-related columns)
  SQL: SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, s.father_name, s.father_phone, s.mother_name, s.mother_phone, s.emergency_contact_name, s.emergency_contact_phone, s.guardian_name, s.guardian_phone FROM students s JOIN classes c ON s.class_id = c.id JOIN attendances a ON s.id = a.student_id WHERE s.school_id = '<school_id_from_context>' AND a.school_id = '<school_id_from_context>' AND a.date = CURRENT_DATE AND a.status = 'absent' ORDER BY c.name, s.roll_number

- "give me the parent contact numbers of the students who are absent today"
  Analysis: Query specifically requests "parent" contact numbers. From schema metadata, parent-related phone columns are: father_phone, mother_phone. Also include parent names for context.
  SQL: SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, s.father_name, s.father_phone, s.mother_name, s.mother_phone FROM students s JOIN classes c ON s.class_id = c.id JOIN attendances a ON s.id = a.student_id WHERE s.school_id = '<school_id_from_context>' AND a.school_id = '<school_id_from_context>' AND a.date = CURRENT_DATE AND a.status = 'absent' ORDER BY c.name, s.roll_number

- "parent email addresses of students with pending fees"
  Analysis: Query requests parent email addresses. From schema metadata, parent email columns are: father_email, mother_email. Include parent names and fee details for context.
  SQL: SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, s.father_name, s.father_email, s.mother_name, s.mother_email, f.amount, f.due_date, f.fee_type FROM students s JOIN classes c ON s.class_id = c.id JOIN fees f ON s.id = f.student_id WHERE s.school_id = '<school_id_from_context>' AND f.school_id = '<school_id_from_context>' AND f.status = 'pending' ORDER BY f.due_date DESC, s.last_name

- "students with pending fees"
  SQL: SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name as class_name, f.amount, f.due_date, f.fee_type, f.status FROM students s JOIN classes c ON s.class_id = c.id JOIN fees f ON s.id = f.student_id WHERE s.school_id = '<school_id_from_context>' AND f.school_id = '<school_id_from_context>' AND f.status = 'pending' ORDER BY f.due_date DESC, s.last_name

- "how many students have unpaid library fees in the last month?"
  SQL: SELECT COUNT(DISTINCT s.id) as count FROM students s JOIN fees f ON s.id = f.student_id WHERE s.school_id = '<school_id_from_context>' AND f.school_id = '<school_id_from_context>' AND f.fee_type = 'library' AND f.status IN ('pending', 'partial') AND f.due_date >= CURRENT_DATE - INTERVAL '1 month'

- "top 10 students by exam marks"
  SQL: SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name as class_name, AVG(er.marks_obtained * 100.0 / NULLIF(er.max_marks, 0)) as avg_percentage FROM students s JOIN exam_results er ON s.id = er.student_id JOIN exams e ON er.exam_id = e.id LEFT JOIN classes c ON s.class_id = c.id WHERE s.school_id = '<school_id_from_context>' AND e.school_id = '<school_id_from_context>' GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name ORDER BY avg_percentage DESC LIMIT 10

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

ANALYSIS REQUIRED:
1. Does the query ask for SPECIFIC FIELDS (contact numbers, names, addresses, phone, parent, etc.)?
   - If YES → It's a LIST query, return those specific fields (NOT a count)
   - If NO → Check if it says "how many"/"number of"/"count" → Then it's a COUNT query
2. If COUNT: Use COUNT(DISTINCT id) as count and return only the count field
3. If LIST: 
   - Identify ALL fields mentioned or implied in the query
   - "contact numbers" → Include: father_phone, mother_phone, emergency_contact_phone, father_name, mother_name, emergency_contact_name
   - "names" or "student names" → Include: first_name, last_name
   - "address" → Include: address, city, state, pincode
   - Always include: id, first_name, last_name, admission_number, roll_number, class_name
   - DO NOT use SELECT * - explicitly list only the needed fields
   - Join necessary tables to get related data
4. Always filter by school_id = '<school_id_from_context>' for data isolation
5. Use DISTINCT when joining multiple tables to avoid duplicates
6. Add ORDER BY for logical sorting (usually by class_name, then roll_number for students)

CRITICAL: If the query asks for specific fields like "contact numbers", it's ALWAYS a LIST query, never a COUNT query.

Generate the SQL query now:`;
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
  async callLLM(prompt: string): Promise<string> {
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
    // Remove markdown code blocks if present (handle various formats)
    sql = sql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
    
    // Remove any leading/trailing whitespace and newlines
    sql = sql.trim();

    // Extract SQL from text if LLM added explanations
    // Look for SQL statement starting with SELECT
    const selectMatch = sql.match(/(SELECT[\s\S]*?)(?:;|$)/i);
    if (selectMatch) {
      sql = selectMatch[1].trim();
    }

    // Remove any trailing semicolons
    sql = sql.replace(/;+$/, '').trim();

    // Remove dangerous keywords
    const dangerous = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE', 'GRANT', 'REVOKE'];
    const upperSQL = sql.toUpperCase();
    
    for (const keyword of dangerous) {
      if (upperSQL.includes(keyword)) {
        throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
      }
    }

    // Only allow SELECT statements
    const trimmedUpperSQL = upperSQL.trim();
    if (!trimmedUpperSQL.startsWith('SELECT')) {
      console.error('[LLM SQL Generator] Invalid SQL received (does not start with SELECT):', sql.substring(0, 200));
      throw new Error('Only SELECT queries are allowed. The generated SQL must start with SELECT.');
    }

    return sql;
  }

  /**
   * Build a retry prompt with error feedback
   */
  private async buildRetryPrompt(
    query: string,
    context?: any,
    conversationHistory?: Array<{ role: string; content: string }>,
    previousError?: string,
    previousSQL?: string,
    attemptNumber: number = 1
  ): Promise<string> {
    const schema = getSchemaContext();
    const examples = await this.getExampleValues();
    
    let historyContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historyContext = '\n\nCONVERSATION HISTORY:\n';
      conversationHistory.slice(-10).forEach((msg) => {
        historyContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    return `You previously generated SQL for this query, but it failed with an error. Please fix the SQL query.

DATABASE SCHEMA:
${schema}

EXAMPLE VALUES FROM DATABASE:
${JSON.stringify(examples, null, 2)}
${historyContext}

ORIGINAL USER QUERY: "${query}"

PREVIOUS SQL (ATTEMPT ${attemptNumber - 1}) THAT FAILED:
${previousSQL}

ERROR MESSAGE:
${previousError}

INSTRUCTIONS:
1. Analyze the error message carefully
2. Fix the SQL syntax or logic issue
3. Ensure all table names are PLURAL (students, attendances, classes, fees, exams, exam_results, staff, subjects, schools)
4. Ensure all column names match the schema exactly
5. Ensure all JOINs are correct
6. Ensure all WHERE conditions use proper syntax
7. Return ONLY the corrected SQL query, no explanations, no markdown, just pure SQL
8. The query must start with SELECT
9. Always include school_id filters: s.school_id = '<school_id_from_context>' for all relevant tables

Generate the CORRECTED SQL query now:`;
  }

  /**
   * Generate SQL from natural language query with error retry capability
   * IMPORTANT: This should ONLY be called when we've determined the query needs data
   * If SQL is generated, it MUST be executed and data MUST be returned
   */
  async generateSQL(
    query: string, 
    context?: any, 
    conversationHistory?: Array<{ role: string; content: string }>,
    previousError?: string,
    previousSQL?: string,
    attemptNumber: number = 1
  ): Promise<SQLGenerationResult | null> {
    try {
      // Extract school_id from context - REQUIRED for all queries
      const schoolId = context?.school_id;
      if (!schoolId) {
        console.error('[LLM SQL Generator] school_id is missing from context');
        throw new Error('school_id is required in context for SQL generation');
      }

      // If this is a retry after an error, include error feedback in the prompt
      let prompt: string;
      if (previousError && previousSQL && attemptNumber > 1) {
        console.log(`[LLM SQL Generator] Retry attempt ${attemptNumber} with error feedback`);
        // Build a retry prompt with error feedback
        prompt = await this.buildRetryPrompt(query, context, conversationHistory, previousError, previousSQL, attemptNumber);
      } else {
        prompt = await this.buildPrompt(query, context, conversationHistory);
      }
      
      const rawSQL = await this.callLLM(prompt);
      
      // Log the raw SQL response for debugging
      console.log('[LLM SQL Generator] Raw SQL response (first 500 chars):', rawSQL?.substring(0, 500));
      
      // If LLM returns empty or indicates it's not a data query, return null
      if (!rawSQL || rawSQL.trim() === '' || rawSQL.toLowerCase().includes('this is not a data query')) {
        console.log('[LLM SQL Generator] LLM indicated this is not a data query');
        return null;
      }
      
      let sql: string;
      try {
        sql = this.sanitizeSQL(rawSQL);
        console.log('[LLM SQL Generator] Sanitized SQL (first 200 chars):', sql.substring(0, 200));
      } catch (error: any) {
        console.error('[LLM SQL Generator] SQL sanitization failed:', error.message);
        console.error('[LLM SQL Generator] Raw SQL that failed (first 500 chars):', rawSQL?.substring(0, 500));
        throw error;
      }

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
   * Generate SQL and execute it with retry on error (up to 3 attempts)
   */
  async generateAndExecute(query: string, context?: any, conversationHistory?: Array<{ role: string; content: string }>): Promise<ExecutionResult> {
    const maxRetries = 3;
    let lastError: string | undefined;
    let lastSQL: string | undefined;
    let attemptNumber = 1;

    while (attemptNumber <= maxRetries) {
      try {
        console.log(`[LLM SQL Generator] Attempt ${attemptNumber} of ${maxRetries}`);
        
        const result = await this.generateSQL(
          query, 
          context, 
          conversationHistory,
          lastError,
          lastSQL,
          attemptNumber
        );
        
        if (!result) {
          return {
            success: false,
            error: 'Could not generate SQL for this query'
          };
        }

        lastSQL = result.sql;

        // Execute the SQL
        console.log(`[LLM SQL Generator] Executing SQL (attempt ${attemptNumber}):`, result.sql.substring(0, 200));
        const data = await sequelize.query(result.sql, {
          type: QueryTypes.SELECT
        });

        // Success! Format response and return
        const formattedResponse = this.formatResponse(query, data);
        console.log(`[LLM SQL Generator] SQL executed successfully on attempt ${attemptNumber}`);

        return {
          success: true,
          data,
          sql: result.sql,
          formattedResponse
        };
      } catch (error: any) {
        lastError = error.message || 'Error executing query';
        console.error(`[LLM SQL Generator] SQL execution error on attempt ${attemptNumber}:`, lastError);
        console.error(`[LLM SQL Generator] Failed SQL:`, lastSQL?.substring(0, 500));

        // If this was the last attempt, return error
        if (attemptNumber >= maxRetries) {
          console.error(`[LLM SQL Generator] All ${maxRetries} attempts failed. Giving up.`);
          return {
            success: false,
            error: lastError,
            sql: lastSQL
          };
        }

        // Increment attempt and retry
        attemptNumber++;
        console.log(`[LLM SQL Generator] Retrying with error feedback...`);
      }
    }

    // Should never reach here, but just in case
    return {
      success: false,
      error: lastError || 'Failed to generate and execute SQL after multiple attempts'
    };
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
   * Uses actual data to generate accurate responses
   */
  formatResponse(query: string, data: any[], count?: number): string {
    if (!data || data.length === 0) {
      return 'No results found.';
    }

    const queryLower = query.toLowerCase();
    
    // Check if this is a COUNT query result (has count field)
    const isCountResult = data.length > 0 && data[0].count !== undefined;
    
    if (isCountResult) {
      // COUNT query - extract the actual count value
      const totalCount = Number(data[0].count);
      
      if (queryLower.includes('absent')) {
        return `${totalCount} ${totalCount === 1 ? 'student is' : 'students are'} absent today.`;
      }
      if (queryLower.includes('present')) {
        return `${totalCount} ${totalCount === 1 ? 'student is' : 'students are'} present today.`;
      }
      if (queryLower.includes('student')) {
        return `${totalCount} ${totalCount === 1 ? 'student' : 'students'} found.`;
      }
      return `${totalCount} ${totalCount === 1 ? 'record' : 'records'} found.`;
    }

    // LIST query - use actual data length
    const actualCount = count !== undefined ? count : data.length;
    
    if (queryLower.includes('absent') && queryLower.includes('student')) {
      return `${actualCount} ${actualCount === 1 ? 'student is' : 'students are'} absent today.`;
    }
    
    if (queryLower.includes('present') && queryLower.includes('student')) {
      return `${actualCount} ${actualCount === 1 ? 'student is' : 'students are'} present today.`;
    }

    if (queryLower.includes('unpaid') || queryLower.includes('pending') || (queryLower.includes('fee') && queryLower.includes('pending'))) {
      const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.amount || item.fee_amount || 0) || 0), 0);
      if (totalAmount > 0) {
        return `${actualCount} ${actualCount === 1 ? 'student has' : 'students have'} pending fees (total: ₹${totalAmount.toLocaleString('en-IN')}).`;
      }
      return `${actualCount} ${actualCount === 1 ? 'student has' : 'students have'} pending fees.`;
    }

    // Generic response
    return `${actualCount} ${actualCount === 1 ? 'result' : 'results'} found.`;
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

