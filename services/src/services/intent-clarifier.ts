import { getMetadataLoader, NLQMetadataLoader } from './nlq-metadata-loader';
import { LLMSQLGenerator } from './llm-sql-generator';

export interface IntentResult {
  intent: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  message: string;
  domain?: string;
}

/**
 * Stage 1: Intent Clarifier
 * Understands what the user wants to know and identifies if clarification is needed
 */
export class IntentClarifier {
  private metadataLoader: NLQMetadataLoader;
  private llmGenerator: LLMSQLGenerator;

  constructor() {
    this.metadataLoader = getMetadataLoader();
    this.llmGenerator = new LLMSQLGenerator();
  }

  /**
   * Analyze query to determine intent
   */
  async clarifyIntent(
    query: string,
    context?: any,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<IntentResult> {
    const queryLower = query.toLowerCase();

    // First, try to match with metadata patterns
    const patternMatch = await this.metadataLoader.findMatchingPattern(query);
    
    if (patternMatch && patternMatch.matchScore > 0.7) {
      // High confidence match
      return {
        intent: patternMatch.pattern.intent,
        confidence: patternMatch.matchScore,
        needsClarification: false,
        message: `I understand you want to ${this.getIntentDescription(patternMatch.pattern.intent)}.`,
        domain: patternMatch.domain,
      };
    }

    // Use LLM for intent understanding with metadata context
    const metadata = await this.metadataLoader.loadMetadata();
    const allDomains = await this.metadataLoader.getAllDomains();
    
    const domainList = allDomains.map(d => `- ${d.domain}: ${d.description}`).join('\n');
    const intentPrompt = `You are an intent classifier for a school ERP system. Analyze the user's query and determine:

1. What is the primary intent? (e.g., "count_students", "list_absent", "find_pending_fees")
2. Which domain does this belong to? (attendance, students, fees, exams, staff)
3. Is the query clear or does it need clarification?

CRITICAL: Distinguish between count queries and list queries:
- Count queries: ONLY "how many", "number of", "count" WITHOUT asking for specific fields
- List queries: 
  * "which", "who", "list", "show", "find", "get", "give me"
  * ANY query that asks for SPECIFIC FIELDS (contact numbers, names, addresses, phone, parent, etc.) - these are ALWAYS list queries
  * Examples: "contact numbers of students" → list query (wants contact fields)
  * Examples: "names of absent students" → list query (wants names)
  * Examples: "how many students" → count query (just wants a number)
  * Examples: "contact numbers of students absent today" → list query (wants contact fields, not a count)

RULE: If the query mentions specific fields to return (contact, phone, name, address, etc.), it's ALWAYS a list query, never a count query.

AVAILABLE DOMAINS:
${domainList}

CONVERSATION CONTEXT:
${conversationHistory && conversationHistory.length > 0 ? conversationHistory.slice(-4).map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n') : 'No previous conversation'}

USER QUERY: "${query}"

IMPORTANT: If the user query appears to be a clarification response (short, answers a question), consider it in context with the previous conversation. The query may be a continuation of a previous question that needed clarification.

Respond with a JSON object:
{
  "intent": "primary_intent_name",
  "domain": "domain_name",
  "confidence": 0.0-1.0,
  "needsClarification": true/false,
  "clarificationQuestion": "question if needed",
  "clarificationOptions": ["option1", "option2"] if needed,
  "reasoning": "brief explanation"
}

Return ONLY the JSON object, no other text.`;

    try {
      const response = await this.llmGenerator.callLLM(intentPrompt);
      
      // Try to parse JSON from response
      let intentData: any;
      try {
        // Extract JSON if wrapped in markdown
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          intentData = JSON.parse(jsonMatch[0]);
        } else {
          intentData = JSON.parse(response);
        }
      } catch (e) {
        // Fallback: create basic intent
        intentData = {
          intent: this.inferIntentFromQuery(query),
          domain: this.inferDomainFromQuery(query),
          confidence: 0.5,
          needsClarification: false,
        };
      }

      return {
        intent: intentData.intent || this.inferIntentFromQuery(query),
        confidence: intentData.confidence || 0.5,
        needsClarification: intentData.needsClarification || false,
        clarificationQuestion: intentData.clarificationQuestion,
        clarificationOptions: intentData.clarificationOptions,
        message: this.buildIntentMessage(intentData),
        domain: intentData.domain || this.inferDomainFromQuery(query),
      };
    } catch (error: any) {
      console.error('[Intent Clarifier] Error:', error);
      // Fallback
      return {
        intent: this.inferIntentFromQuery(query),
        confidence: 0.4,
        needsClarification: false,
        message: `I understand you want to query the database. Let me process your request.`,
        domain: this.inferDomainFromQuery(query),
      };
    }
  }

  /**
   * Infer intent from query keywords
   */
  private inferIntentFromQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    // Check if query asks for specific fields - these are ALWAYS list queries
    const asksForSpecificFields = queryLower.includes('contact') || queryLower.includes('phone') || 
                                  queryLower.includes('name') || queryLower.includes('address') ||
                                  queryLower.includes('parent') || queryLower.includes('number');
    
    // Distinguish between count queries and list queries
    // If specific fields are mentioned, it's always a list query
    const isCountQuery = !asksForSpecificFields && 
                        (queryLower.includes('how many') || queryLower.includes('number of') || 
                         (queryLower.includes('count') && !queryLower.includes('list') && !queryLower.includes('show') && !queryLower.includes('which')));
    
    if (isCountQuery) {
      if (queryLower.includes('absent')) return 'count_absent_today';
      if (queryLower.includes('student')) return 'count_students';
      if (queryLower.includes('fee')) return 'count_pending_fees';
      return 'count_entities';
    }
    
    // List/show/which queries or queries asking for specific fields should return full records
    if (asksForSpecificFields || queryLower.includes('list') || queryLower.includes('show') || 
        queryLower.includes('find') || queryLower.includes('which') || queryLower.includes('who') || 
        queryLower.includes('give me')) {
      if (queryLower.includes('absent')) return 'list_absent_today';
      if (queryLower.includes('student')) return 'list_students';
      if (queryLower.includes('fee')) return 'list_pending_fees';
      return 'list_entities';
    }
    
    return 'query_data';
  }

  /**
   * Infer domain from query keywords
   */
  private inferDomainFromQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('attendance') || queryLower.includes('absent') || queryLower.includes('present')) {
      return 'attendance';
    }
    if (queryLower.includes('fee') || queryLower.includes('payment')) {
      return 'fees';
    }
    if (queryLower.includes('exam') || queryLower.includes('result') || queryLower.includes('mark')) {
      return 'exams';
    }
    if (queryLower.includes('staff') || queryLower.includes('teacher') || queryLower.includes('employee')) {
      return 'staff';
    }
    if (queryLower.includes('student')) {
      return 'students';
    }
    
    return 'students'; // Default
  }

  /**
   * Get human-readable intent description
   */
  private getIntentDescription(intent: string): string {
    const descriptions: Record<string, string> = {
      count_absent_today: 'count students who are absent today',
      list_absent_today: 'see students who are absent today',
      list_pending_fees: 'see students with pending fees',
      count_pending_fees: 'count students with pending fees',
      list_students: 'see student information',
      count_students: 'count students',
      top_students_by_exam: 'see top performing students',
      failing_students: 'see students who failed exams',
    };
    
    return descriptions[intent] || 'query the database';
  }

  /**
   * Build intent message
   */
  private buildIntentMessage(intentData: any): string {
    if (intentData.needsClarification && intentData.clarificationQuestion) {
      return intentData.clarificationQuestion;
    }
    
    const intentDesc = this.getIntentDescription(intentData.intent);
    return `I understand you want to ${intentDesc}.`;
  }
}


