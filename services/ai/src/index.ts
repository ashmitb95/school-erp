import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../shared/database/config';
import { LLMSQLGenerator } from './llm-sql-generator';
import { getSchemaContext } from './database-schema';

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
  res.flush?.();
}

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.AI_SERVICE_PORT || 3006;

app.use(express.json());

// Initialize LLM SQL Generator
const sqlGenerator = new LLMSQLGenerator();

// Chat endpoint - handles both conversational queries and SQL generation
const chatSchema = z.object({
  message: z.string().min(1),
  context: z.record(z.any()).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

// Streaming chat endpoint (SSE) - POST with body
app.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { message, context: requestContext, conversationHistory = [] } = chatSchema.parse(req.body);
    const context = requestContext || {};
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    setupSSE(res);

    // Check if the query seems like it needs data retrieval
    const needsData = /(?:show|list|find|get|which|who|how many|count|what|when|where)/i.test(message);
    
    if (needsData) {
      // Step 1: Send thinking indicator
      sendSSE(res, 'thinking', { message: 'Analyzing your query and understanding what data you need...' });

      // Step 2: Generate SQL with streaming thought process (include conversation history)
      sendSSE(res, 'thinking', { message: 'Generating SQL query based on your question...' });
      
      let generatedSQL = '';
      const sqlResult = await sqlGenerator.generateSQL(message, context, conversationHistory);
      
      if (!sqlResult) {
        sendSSE(res, 'error', { 
          message: 'I couldn\'t understand your query. Please try rephrasing it.' 
        });
        sendSSE(res, 'done', { type: 'error' });
        res.end();
        return;
      }

      generatedSQL = sqlResult.sql;
      
      // Step 3: Send the generated SQL
      sendSSE(res, 'sql', { sql: generatedSQL });
      sendSSE(res, 'thinking', { message: 'Executing query and fetching data...' });

      // Step 4: Execute SQL and get data
      try {
        console.log(`[AI Service] Executing SQL query...`);
        const data = await sequelize.query(generatedSQL, {
          type: QueryTypes.SELECT
        });

        const count = data.length;
        console.log(`[AI Service] Query executed successfully: ${count} rows returned`);

        // Step 5: For large datasets, send SQL and count via SSE, then frontend will fetch data via API
        // For smaller datasets (< 100 rows), send data directly via SSE
        if (count > 100) {
          console.log(`[AI Service] Large dataset (${count} rows) - sending SQL reference instead of data`);
          // Send SQL and count - frontend will fetch data via separate API call
          sendSSE(res, 'data', { 
            sql: generatedSQL, 
            count: count,
            fetchViaApi: true 
          });
          console.log(`[AI Service] Data event sent with fetchViaApi=true`);
        } else {
          console.log(`[AI Service] Small dataset (${count} rows) - sending data via SSE`);
          // Send data directly for small datasets
          sendSSE(res, 'data', { data: data, count: count });
          console.log(`[AI Service] Data event sent with direct data`);
        }
        
        // Step 6: Format response using LLM (include conversation history)
        sendSSE(res, 'thinking', { message: 'Formatting results...' });
        const formattedResponse = sqlGenerator.formatResponse(message, data);
        
        // Stream the formatted response
        const formattingPrompt = `Format this query result in a friendly, conversational way: ${formattedResponse || `Found ${count} results`}. Keep it concise and helpful.`;
        
        try {
          await sqlGenerator.callLLMStream(formattingPrompt, (chunk: string) => {
            sendSSE(res, 'token', { token: chunk });
          });
        } catch (e) {
          // Fallback to simple text if LLM fails
          const responseText = formattedResponse || `Found ${count} results`;
          const words = responseText.split(' ');
          for (let i = 0; i < words.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 30));
            sendSSE(res, 'token', { token: words[i] + (i < words.length - 1 ? ' ' : '') });
          }
        }

        // Step 7: Send done event
        sendSSE(res, 'done', { type: 'data_query' });
      } catch (error: any) {
        console.error('SQL execution error:', error);
        sendSSE(res, 'error', { 
          message: `Error executing query: ${error.message || 'Database error'}` 
        });
        sendSSE(res, 'done', { type: 'error' });
      }
    } else {
      // Regular conversational response with streaming (include conversation history)
      sendSSE(res, 'thinking', { message: 'Thinking...' });

      // Build a conversational prompt with conversation history
      const schema = getSchemaContext();
      const examples = await sqlGenerator.getExampleValues();
      
      // Format conversation history for the prompt
      let historyContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        historyContext = '\n\nCONVERSATION HISTORY:\n';
        conversationHistory.slice(-10).forEach((msg) => {
          historyContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
      }
      
      const conversationalPrompt = `You are a helpful AI assistant for a School ERP system. Answer questions about students, fees, attendance, exams, and other school-related topics in a friendly, conversational manner.

DATABASE SCHEMA:
${schema}

EXAMPLE VALUES FROM DATABASE:
${JSON.stringify(examples, null, 2)}
${historyContext}

Current user question: "${message}"

Provide a helpful, conversational response that takes into account the conversation history:`;
      
      // Stream the LLM response
      let fullResponse = '';
      try {
        await sqlGenerator.callLLMStream(conversationalPrompt, (chunk: string) => {
          fullResponse += chunk;
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
app.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, context, conversationHistory = [] } = chatSchema.parse(req.body);

    // Check if the query seems like it needs data retrieval
    const needsData = /(?:show|list|find|get|which|who|how many|count|what|when|where)/i.test(message);
    
    if (needsData) {
      // Generate SQL from natural language (with conversation history)
      const sqlResult = await sqlGenerator.generateSQL(message, context, conversationHistory);
      
      if (!sqlResult) {
        return res.json({
          response: 'I couldn\'t understand your query. Please try rephrasing it.',
          type: 'error'
        });
      }

      try {
        const data = await sequelize.query(sqlResult.sql, {
          type: QueryTypes.SELECT
        });

        const count = data.length;
        const formattedResponse = sqlGenerator.formatResponse(message, data);

        return res.json({
          response: formattedResponse || `Found ${count} results`,
          data: data,
          count: count,
          sql: sqlResult.sql,
          type: 'data_query'
        });
      } catch (error: any) {
        return res.json({
          response: `Error executing query: ${error.message || 'Database error'}`,
          type: 'error'
        });
      }
    } else {
      // Regular conversational response (with conversation history)
      const schema = getSchemaContext();
      const examples = await sqlGenerator.getExampleValues();
      
      // Format conversation history for the prompt
      let historyContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        historyContext = '\n\nCONVERSATION HISTORY:\n';
        conversationHistory.slice(-10).forEach((msg) => {
          historyContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
      }
      
      const conversationalPrompt = `You are a helpful AI assistant for a School ERP system. Answer questions about students, fees, attendance, exams, and other school-related topics in a friendly, conversational manner.

DATABASE SCHEMA:
${schema}

EXAMPLE VALUES FROM DATABASE:
${JSON.stringify(examples, null, 2)}
${historyContext}

Current user question: "${message}"

Provide a helpful, conversational response that takes into account the conversation history:`;

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
app.post('/execute-sql', async (req: Request, res: Response) => {
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
app.post('/generate-sql', async (req: Request, res: Response) => {
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
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai' });
});

// Initialize database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ AI Service: Database connection established');
    app.listen(PORT, () => {
      console.log(`🚀 AI Service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ AI Service: Database connection failed:', error);
    process.exit(1);
  });

