import { Response } from 'express';
import { IntentClarifier, IntentResult } from './intent-clarifier';
import { KeywordExtractor, ExtractedKeywords } from './keyword-extractor';
import { QueryDisambiguator, SemanticQuery } from './query-disambiguator';
import { QueryEvaluator, ValidationResult } from './query-evaluator';
import { LLMSQLGenerator } from './llm-sql-generator';
import { getMetadataLoader } from './nlq-metadata-loader';

export interface PipelineContext {
  query: string;
  context?: any;
  conversationHistory?: Array<{ role: string; content: string }>;
  schoolId: string;
}

export interface PipelineResult {
  sql: string;
  semanticQuery: SemanticQuery;
  intent: IntentResult;
  keywords: ExtractedKeywords;
  validation: ValidationResult;
  needsClarification: boolean;
}

/**
 * Query Pipeline Orchestrator
 * Manages the 5-stage pipeline with user feedback
 */
export class QueryPipeline {
  private intentClarifier: IntentClarifier;
  private keywordExtractor: KeywordExtractor;
  private queryDisambiguator: QueryDisambiguator;
  private sqlGenerator: LLMSQLGenerator;
  private queryEvaluator: QueryEvaluator;
  private sendSSE: (res: Response, event: string, data: any) => void;

  constructor(sendSSEFn: (res: Response, event: string, data: any) => void) {
    this.intentClarifier = new IntentClarifier();
    this.keywordExtractor = new KeywordExtractor();
    this.queryDisambiguator = new QueryDisambiguator();
    this.sqlGenerator = new LLMSQLGenerator();
    this.queryEvaluator = new QueryEvaluator();
    this.sendSSE = sendSSEFn;
  }

  /**
   * Process query through the 5-stage pipeline
   */
  async processQuery(
    pipelineContext: PipelineContext,
    res: Response
  ): Promise<PipelineResult | null> {
    const { query, context, conversationHistory, schoolId } = pipelineContext;

    try {
      // Stage 1: Intent Clarification
      this.sendSSE(res, 'pipeline:stage', {
        stage: 'intent_clarification',
        message: 'Understanding your intent...',
      });

      const intent = await this.intentClarifier.clarifyIntent(query, context, conversationHistory);

      this.sendSSE(res, 'pipeline:intent', {
        intent: intent.intent,
        needsClarification: intent.needsClarification,
        message: intent.message,
        domain: intent.domain,
      });

      // If clarification is needed, wait for user response
      if (intent.needsClarification) {
        this.sendSSE(res, 'pipeline:clarification', {
          question: intent.clarificationQuestion,
          options: intent.clarificationOptions,
          message: 'I need clarification to proceed.',
        });
        // Return null to indicate clarification needed
        return null;
      }

      // Stage 2: Keyword Identification
      this.sendSSE(res, 'pipeline:stage', {
        stage: 'keyword_extraction',
        message: 'Identifying key terms...',
      });

      const keywords = await this.keywordExtractor.extractKeywords(query, intent);
      const keywordSummary = this.keywordExtractor.getKeywordSummary(keywords);

      this.sendSSE(res, 'pipeline:keywords', {
        keywords: keywords.filters,
        entities: keywords.entities,
        domain: keywords.domain,
        temporal: keywords.temporal,
        message: `Found key terms: ${keywordSummary}`,
      });

      // Stage 3: Query Disambiguation
      this.sendSSE(res, 'pipeline:stage', {
        stage: 'query_disambiguation',
        message: 'Mapping to database schema...',
      });

      const semanticQuery = await this.queryDisambiguator.disambiguate(
        query,
        keywords,
        intent.intent,
        { ...context, school_id: schoolId }
      );

      this.sendSSE(res, 'pipeline:disambiguation', {
        tables: [semanticQuery.primaryTable, ...semanticQuery.joins.map(j => j.table)],
        conditions: semanticQuery.conditions,
        message: `Mapping to: ${semanticQuery.primaryTable} with ${semanticQuery.joins.length} join(s)`,
      });

      // Stage 4: SQL Generation - Use LLM directly for better understanding
      this.sendSSE(res, 'pipeline:stage', {
        stage: 'sql_generation',
        message: 'Generating SQL query...',
      });

      // Use LLM to generate SQL - it understands query intent better than pattern matching
      const history = (conversationHistory || []).filter((h: any) => h.role && h.content) as Array<{ role: string; content: string }>;
      const sqlResult = await this.sqlGenerator.generateSQL(query, { ...context, school_id: schoolId }, history);
      
      if (!sqlResult) {
        throw new Error('Failed to generate SQL query');
      }
      
      const sql = sqlResult.sql;

      this.sendSSE(res, 'pipeline:sql_preview', {
        sql: sql,
        message: 'Generated SQL query',
      });

      // Stage 5: Evaluation
      this.sendSSE(res, 'pipeline:stage', {
        stage: 'query_evaluation',
        message: 'Validating query...',
      });

      const semanticValidation = this.queryEvaluator.evaluateSemanticQuery(semanticQuery);
      const sqlValidation = this.queryEvaluator.evaluateSQL(sql);

      const validation: ValidationResult = {
        valid: semanticValidation.valid && sqlValidation.valid,
        warnings: [...semanticValidation.warnings, ...sqlValidation.warnings],
        errors: [...semanticValidation.errors, ...sqlValidation.errors],
        suggestions: [...semanticValidation.suggestions, ...sqlValidation.suggestions],
        message: sqlValidation.valid
          ? 'Query validated successfully. Ready to execute.'
          : `Query has issues: ${sqlValidation.errors.join(', ')}`,
      };

      this.sendSSE(res, 'pipeline:validation', {
        valid: validation.valid,
        warnings: validation.warnings,
        errors: validation.errors,
        suggestions: validation.suggestions,
        message: validation.message,
      });

      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        sql,
        semanticQuery,
        intent,
        keywords,
        validation,
        needsClarification: false,
      };
    } catch (error: any) {
      console.error('[Query Pipeline] Error:', error);
      this.sendSSE(res, 'pipeline:error', {
        stage: 'pipeline',
        error: error.message,
        message: `An error occurred: ${error.message}`,
      });
      throw error;
    }
  }

  /**
   * Generate SQL from semantic query representation
   */
  private generateSQLFromSemantic(semanticQuery: SemanticQuery): string {
    const parts: string[] = [];

    // SELECT clause
    if (semanticQuery.selectFields.length > 0) {
      parts.push(`SELECT ${semanticQuery.selectFields.join(', ')}`);
    } else {
      parts.push(`SELECT ${semanticQuery.primaryAlias}.*`);
    }

    // FROM clause
    parts.push(`FROM ${semanticQuery.primaryTable} ${semanticQuery.primaryAlias}`);

    // JOIN clauses
    for (const join of semanticQuery.joins) {
      const joinType = join.type === 'LEFT' ? 'LEFT JOIN' : join.type === 'RIGHT' ? 'RIGHT JOIN' : 'JOIN';
      parts.push(`${joinType} ${join.table} ${join.alias} ON ${join.on}`);
    }

    // WHERE clause
    if (semanticQuery.conditions.length > 0) {
      parts.push(`WHERE ${semanticQuery.conditions.join(' AND ')}`);
    }

    // GROUP BY clause
    if (semanticQuery.groupBy && semanticQuery.groupBy.length > 0) {
      parts.push(`GROUP BY ${semanticQuery.groupBy.join(', ')}`);
    }

    // ORDER BY clause
    if (semanticQuery.orderBy) {
      parts.push(`ORDER BY ${semanticQuery.orderBy}`);
    }

    // LIMIT clause
    if (semanticQuery.limit) {
      parts.push(`LIMIT ${semanticQuery.limit}`);
    }

    return parts.join('\n');
  }
}


