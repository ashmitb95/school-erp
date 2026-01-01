import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../shared/database/config';
import { LLMSQLGenerator } from './llm-sql-generator';
import { getSchemaContext } from './database-schema';
import { QueryPipeline } from './query-pipeline';
import { AuthRequest } from '../middleware/auth';

// SSE helper function
function setupSSE(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
}

function sendSSE(res: Response, event: string, data: any) {
  const dataStr = JSON.stringify(data);
  console.log(`[AI Service] Sending SSE event: ${event}`, {
    dataSize: dataStr.length,
    hasData: event === 'data' && !!data.data,
    hasFetchViaApi: event === 'data' && !!data.fetchViaApi,
    hasSql: event === 'data' && !!data.sql,
    preview: dataStr.substring(0, 200)
  });
  res.write(`event: ${event}\n`);
  res.write(`data: ${dataStr}\n\n`);
  // Note: res.flush() is not available in Express Response, but SSE works without it
}

// Load .env from project root

const router = Router();



// Initialize LLM SQL Generator
const sqlGenerator = new LLMSQLGenerator();

// Initialize Query Pipeline
const queryPipeline = new QueryPipeline(sendSSE);

/**
 * Detect if a user message is a clarification response and merge it with the original query
 */
function detectAndMergeClarification(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): { query: string; isClarification: boolean } {
  const history = conversationHistory.filter((h: any) => h.role && h.content);
  
  // Need at least 2 messages in history (user query + assistant clarification)
  if (history.length < 2) {
    return { query: message, isClarification: false };
  }
  
  const lastAssistantMsg = history[history.length - 1];
  const secondLastUserMsg = history[history.length - 2];
  
  // Check if last assistant message likely asked for clarification
  const clarificationPatterns = [
    /\?/,
    /(?:which|what|do you|are you|would you|can you|please|clarify|specify)/i,
    /(?:subject|overall|performance|class|date|time|period)/i
  ];
  
  const looksLikeClarification = lastAssistantMsg.role === 'assistant' && 
    clarificationPatterns.some(pattern => pattern.test(lastAssistantMsg.content));
  
  // If it looks like a clarification and current message is short/concise (likely a response)
  if (looksLikeClarification && message.length < 100) {
    // Merge: original query + clarification response
    const mergedQuery = `${secondLastUserMsg.content}. ${message}`;
    console.log(`[AI Service] Detected clarification response. Original: "${secondLastUserMsg.content}", Response: "${message}", Merged: "${mergedQuery}"`);
    return { query: mergedQuery, isClarification: true };
  }
  
  return { query: message, isClarification: false };
}

// Chat endpoint - handles both conversational queries and SQL generation
const chatSchema = z.object({
  message: z.string().min(1),
  context: z.record(z.any()).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
});

// Streaming chat endpoint (SSE) - POST with body
router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { message, context: requestContext, conversationHistory = [] } = chatSchema.parse(req.body);
    const context = requestContext || {};
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    setupSSE(res);

    // Check if this is a clarification response to a previous query
    const history = (conversationHistory || []).filter((h: any) => h.role && h.content) as Array<{ role: string; content: string }>;
    const { query: processedQuery, isClarification: isClarificationResponse } = detectAndMergeClarification(message, history);

    // Use LLM to determine if this is a data query or conversational query
    // This ensures we only generate SQL when data is actually needed
    sendSSE(res, 'thinking', { message: isClarificationResponse ? 'Processing your clarification...' : 'Analyzing query type...' });
    
    const schema = getSchemaContext();
    
    const queryTypePrompt = `Analyze this user query and determine if it requires data retrieval from the database or is just a conversational question.

DATABASE SCHEMA:
${schema}

USER QUERY: "${processedQuery}"

Respond with ONLY a JSON object:
{
  "needsData": true/false,
  "reason": "brief explanation"
}

Rules:
- needsData = true if the query asks for specific data (students, fees, attendance, exam results, counts, lists, etc.)
- needsData = false if it's a general question, explanation request, or doesn't require database query
- Examples of needsData=true: "how many students", "which students are absent", "show me fees", "list students", "give me data"
- Examples of needsData=false: "what is attendance", "how does the system work", "explain fees", general questions

Return ONLY the JSON, no other text.`;

    let needsData = false;
    try {
      const typeResponse = await sqlGenerator.callLLM(queryTypePrompt);
      const jsonMatch = typeResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const typeData = JSON.parse(jsonMatch[0]);
        needsData = typeData.needsData === true;
      } else {
        // Fallback: use pattern matching if LLM fails
        needsData = /(?:show|list|find|get|which|who|how many|count|what|when|where|give me|give|data|students|fees|attendance|exams|results|absent|present|pending|unpaid)/i.test(message);
      }
    } catch (error) {
      // Fallback: use pattern matching if LLM fails
      console.error('[AI Service] Query type detection failed, using fallback:', error);
      needsData = /(?:show|list|find|get|which|who|how many|count|what|when|where|give me|give|data|students|fees|attendance|exams|results|absent|present|pending|unpaid)/i.test(message);
    }
    
    // If it's a data query, generate SQL, execute it, and return data
    if (needsData) {
      // Extract school_id from authenticated user (preferred) or context (fallback)
      const authReq = req as AuthRequest;
      const schoolId = authReq.user?.school_id || context?.school_id;
      
      if (!schoolId) {
        sendSSE(res, 'error', { 
          message: 'school_id is required. Please ensure you are authenticated or provide school_id in context.' 
        });
        sendSSE(res, 'done', { type: 'error' });
        res.end();
        return;
      }

      // Ensure school_id is in context for downstream processing
      if (!context.school_id) {
        context.school_id = schoolId;
      }

      // Process query through pipeline - this will generate SQL and we MUST execute it
      // Use processedQuery (which may be merged with clarification) instead of raw message
      try {
        const pipelineResult = await queryPipeline.processQuery(
          {
            query: processedQuery,
            context,
            conversationHistory: history,
            schoolId,
          },
          res
        );

        // If clarification is needed, pipeline returns null
        if (!pipelineResult) {
          // User needs to respond to clarification
          sendSSE(res, 'done', { type: 'clarification_needed' });
          res.end();
          return;
        }

        const { sql: generatedSQL } = pipelineResult;

        // Execute SQL and get data with retry mechanism
        sendSSE(res, 'thinking', { message: 'Executing query and fetching data...' });
        console.log(`[AI Service] Executing SQL query...`);
        
        let data: any[];
        let finalSQL = generatedSQL;
        let executionError: string | undefined;
        const maxRetries = 3;
        let attemptNumber = 1;

        while (attemptNumber <= maxRetries) {
          try {
            data = await sequelize.query(finalSQL, {
              type: QueryTypes.SELECT
            });
            // Success - break out of retry loop
            break;
          } catch (error: any) {
            executionError = error.message || 'Database error';
            console.error(`[AI Service] SQL execution error on attempt ${attemptNumber}:`, executionError);
            console.error(`[AI Service] Failed SQL:`, finalSQL.substring(0, 500));

            // If this was the last attempt, throw the error
            if (attemptNumber >= maxRetries) {
              console.error(`[AI Service] All ${maxRetries} attempts failed. Giving up.`);
              throw error;
            }

            // Retry with error feedback
            attemptNumber++;
            sendSSE(res, 'thinking', { 
              message: `Query failed, retrying with error feedback (attempt ${attemptNumber}/${maxRetries})...` 
            });
            console.log(`[AI Service] Retrying SQL generation with error feedback...`);
            
            // Regenerate SQL with error feedback
            const history = (conversationHistory || []).filter((h: any) => h.role && h.content) as Array<{ role: string; content: string }>;
            const retryResult = await sqlGenerator.generateSQL(
              processedQuery,
              { ...context, school_id: schoolId },
              history,
              executionError,
              finalSQL,
              attemptNumber
            );

            if (!retryResult) {
              throw new Error('Failed to regenerate SQL after error');
            }

            finalSQL = retryResult.sql;
            console.log(`[AI Service] Regenerated SQL (attempt ${attemptNumber}):`, finalSQL.substring(0, 200));
          }
        }

        const count = data.length;
        console.log(`[AI Service] Query executed successfully on attempt ${attemptNumber}: ${count} rows returned`);

        // For large datasets, send SQL and count via SSE, then frontend will fetch data via API
        // For smaller datasets (< 100 rows), send data directly via SSE
        if (count > 100) {
          console.log(`[AI Service] Large dataset (${count} rows) - sending SQL reference instead of data`);
          sendSSE(res, 'data', { 
            sql: finalSQL, 
            count: count,
            fetchViaApi: true 
          });
          console.log(`[AI Service] Data event sent with fetchViaApi=true`);
        } else {
          console.log(`[AI Service] Small dataset (${count} rows) - sending data via SSE`);
          sendSSE(res, 'data', { data: data, count: count });
          console.log(`[AI Service] Data event sent with direct data`);
        }
        
        // Analyze data for calculations (ratios, percentages, etc.)
        sendSSE(res, 'thinking', { message: 'Analyzing results and calculating insights...' });
        const analysis = sqlGenerator.analyzeData(processedQuery, data);
        
        // Format response using actual data
        sendSSE(res, 'thinking', { message: 'Formatting results...' });
        const formattedResponse = sqlGenerator.formatResponse(processedQuery, data, count);
        
        // Stream the formatted response - use actual data, not LLM for formatting
        let responseText = formattedResponse;
        if (analysis.analysis) {
          responseText = `${analysis.analysis}\n\n${responseText}`;
        }
        
        // Stream response word by word for smooth UX
        const words = responseText.split(' ');
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 30));
          sendSSE(res, 'token', { token: words[i] + (i < words.length - 1 ? ' ' : '') });
        }

        // Send done event
        sendSSE(res, 'done', { type: 'data_query' });
      } catch (error: any) {
        console.error('[AI Service] Pipeline error:', error);
        sendSSE(res, 'error', { 
          message: `Error processing query: ${error.message || 'Database error'}` 
        });
        sendSSE(res, 'done', { type: 'error' });
      }
    } else {
      // Conversational query - NO SQL generation, just respond conversationally
      sendSSE(res, 'thinking', { message: 'Thinking...' });
      
      const schema = getSchemaContext();
      const examples = await sqlGenerator.getExampleValues();
      
      let historyContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        historyContext = '\n\nCONVERSATION HISTORY:\n';
        conversationHistory.slice(-10).forEach((msg) => {
          historyContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
      }
      
      const conversationalPrompt = `You are a helpful AI assistant for a Praxis ERP system. Answer questions briefly and directly. Keep responses concise and professional. Do NOT generate SQL queries - this is a conversational question.

DATABASE SCHEMA:
${schema}

EXAMPLE VALUES FROM DATABASE:
${JSON.stringify(examples, null, 2)}
${historyContext}

Current user question: "${message}"

Provide a brief, direct conversational response:`;
      
      try {
        await sqlGenerator.callLLMStream(conversationalPrompt, (chunk: string) => {
          sendSSE(res, 'token', { token: chunk });
        });
        sendSSE(res, 'done', { type: 'conversation' });
      } catch (error: any) {
        sendSSE(res, 'error', { message: error.message || 'Error generating response' });
        sendSSE(res, 'done', { type: 'error' });
      }
    }

    res.end();
  } catch (error: any) {
    console.error('Streaming chat error:', error);
    if (error instanceof z.ZodError) {
      sendSSE(res, 'error', { message: 'Invalid request' });
      res.end();
      return;
    }
    sendSSE(res, 'error', { message: 'Internal server error' });
    res.end();
  }
});

// Non-streaming chat endpoint (fallback)
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, context: requestContext, conversationHistory = [] } = chatSchema.parse(req.body);
    const context = requestContext || {};

    // Check if this is a clarification response to a previous query
    const history = (conversationHistory || []).filter((h: any) => h.role && h.content) as Array<{ role: string; content: string }>;
    const { query: processedQuery } = detectAndMergeClarification(message, history);

    // Use LLM to determine if this is a data query or conversational query
    const schema = getSchemaContext();
    const queryTypePrompt = `Analyze this user query and determine if it requires data retrieval from the database or is just a conversational question.

DATABASE SCHEMA:
${schema}

USER QUERY: "${processedQuery}"

Respond with ONLY a JSON object:
{
  "needsData": true/false,
  "reason": "brief explanation"
}

Rules:
- needsData = true if the query asks for specific data (students, fees, attendance, exam results, counts, lists, etc.)
- needsData = false if it's a general question, explanation request, or doesn't require database query
- Examples of needsData=true: "how many students", "which students are absent", "show me fees", "list students", "give me data"
- Examples of needsData=false: "what is attendance", "how does the system work", "explain fees", general questions

Return ONLY the JSON, no other text.`;

    let needsData = false;
    try {
      const typeResponse = await sqlGenerator.callLLM(queryTypePrompt);
      const jsonMatch = typeResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const typeData = JSON.parse(jsonMatch[0]);
        needsData = typeData.needsData === true;
      } else {
        // Fallback: use pattern matching if LLM fails
        needsData = /(?:show|list|find|get|which|who|how many|count|what|when|where|give me|give|data|students|fees|attendance|exams|results|absent|present|pending|unpaid)/i.test(message);
      }
    } catch (error) {
      // Fallback: use pattern matching if LLM fails
      needsData = /(?:show|list|find|get|which|who|how many|count|what|when|where|give me|give|data|students|fees|attendance|exams|results|absent|present|pending|unpaid)/i.test(message);
    }
    
    // If it's a data query, generate SQL, execute it, and return data
    if (needsData) {
      // Extract school_id
      const authReq = req as AuthRequest;
      const schoolId = authReq.user?.school_id || context?.school_id;
      
      if (!schoolId) {
        return res.json({
          response: 'school_id is required. Please ensure you are authenticated or provide school_id in context.',
          type: 'error'
        });
      }

      if (!context.school_id) {
        context.school_id = schoolId;
      }

      // Generate SQL and execute it - data MUST be returned
      // Use processedQuery (which may be merged with clarification) instead of raw message
      const sqlResult = await sqlGenerator.generateSQL(processedQuery, { ...context, school_id: schoolId }, history);
      
      if (!sqlResult) {
        return res.json({
          response: 'I couldn\'t understand your query. Please try rephrasing it.',
          type: 'error'
        });
      }

      try {
        // ALWAYS execute SQL and return data with retry mechanism
        let data: any[];
        let finalSQL = sqlResult.sql;
        let executionError: string | undefined;
        const maxRetries = 3;
        let attemptNumber = 1;

        while (attemptNumber <= maxRetries) {
          try {
            data = await sequelize.query(finalSQL, {
              type: QueryTypes.SELECT
            });
            // Success - break out of retry loop
            break;
          } catch (error: any) {
            executionError = error.message || 'Database error';
            console.error(`[AI Service] SQL execution error on attempt ${attemptNumber}:`, executionError);

            // If this was the last attempt, throw the error
            if (attemptNumber >= maxRetries) {
              console.error(`[AI Service] All ${maxRetries} attempts failed. Giving up.`);
              throw error;
            }

            // Retry with error feedback
            attemptNumber++;
            console.log(`[AI Service] Retrying SQL generation with error feedback...`);
            
            // Regenerate SQL with error feedback
            const retryResult = await sqlGenerator.generateSQL(
              processedQuery,
              { ...context, school_id: schoolId },
              history,
              executionError,
              finalSQL,
              attemptNumber
            );

            if (!retryResult) {
              throw new Error('Failed to regenerate SQL after error');
            }

            finalSQL = retryResult.sql;
            console.log(`[AI Service] Regenerated SQL (attempt ${attemptNumber}):`, finalSQL.substring(0, 200));
          }
        }

        const count = data.length;
        console.log(`[AI Service] Query executed successfully on attempt ${attemptNumber}: ${count} rows returned`);
        
        // Analyze data for calculations
        const analysis = sqlGenerator.analyzeData(processedQuery, data);
        const formattedResponse = sqlGenerator.formatResponse(processedQuery, data, count);
        
        // Include analysis in response if available
        let responseText = formattedResponse || `Found ${count} results`;
        if (analysis.analysis) {
          responseText = `${analysis.analysis}\n\n${responseText}`;
        }

        return res.json({
          response: responseText,
          data: data,
          count: count,
          sql: finalSQL,
          type: 'data_query',
          insights: analysis.insights
        });
      } catch (error: any) {
        return res.json({
          response: `Error executing query after 3 attempts: ${error.message || 'Database error'}`,
          type: 'error'
        });
      }
    } else {
      // Conversational query - NO SQL generation, just respond conversationally
      const examples = await sqlGenerator.getExampleValues();
      
      // Format conversation history for the prompt
      let historyContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        historyContext = '\n\nCONVERSATION HISTORY:\n';
        conversationHistory.slice(-10).forEach((msg) => {
          historyContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
      }
      
      const conversationalPrompt = `You are a helpful AI assistant for a Praxis ERP system. Answer questions briefly and directly. Keep responses concise and professional. Do NOT generate SQL queries - this is a conversational question.

DATABASE SCHEMA:
${schema}

EXAMPLE VALUES FROM DATABASE:
${JSON.stringify(examples, null, 2)}
${historyContext}

Current user question: "${message}"

Provide a brief, direct conversational response:`;

      const response = await sqlGenerator.callLLM(conversationalPrompt);
      return res.json({
        response,
        type: 'conversation'
      });
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute SQL and return data (for fetching large datasets)
router.post('/execute-sql', async (req: Request, res: Response) => {
  try {
    const { sql } = z.object({
      sql: z.string().min(1),
    }).parse(req.body);

    // Security: Only allow SELECT queries
    const upperSQL = sql.toUpperCase().trim();
    if (!upperSQL.startsWith('SELECT')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }

    // Execute the SQL
    const data = await sequelize.query(sql, {
      type: QueryTypes.SELECT
    });

    return res.json({
      data: data,
      count: data.length,
    });
  } catch (error: any) {
    console.error('SQL execution error:', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
});

// Direct SQL generation endpoint (for testing)
router.post('/generate-sql', async (req: Request, res: Response) => {
  try {
    const { query, context } = z.object({
      query: z.string().min(1),
      context: z.record(z.any()).optional(),
    }).parse(req.body);

    const result = await sqlGenerator.generateSQL(query, context);
    
    if (result) {
      return res.json({
        sql: result.sql,
        description: result.description,
      });
    } else {
      return res.status(400).json({ error: 'Could not generate SQL for this query' });
    }
  } catch (error: any) {
    console.error('SQL generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai' });
});


export default router;
