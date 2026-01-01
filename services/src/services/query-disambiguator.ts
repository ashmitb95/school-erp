import { getMetadataLoader, NLQMetadataLoader } from './nlq-metadata-loader';
import { ExtractedKeywords } from './keyword-extractor';

export interface SemanticQuery {
  primaryTable: string;
  primaryAlias: string;
  joins: Array<{
    table: string;
    alias: string;
    on: string;
    type: 'INNER' | 'LEFT' | 'RIGHT';
  }>;
  conditions: string[];
  selectFields: string[];
  orderBy?: string;
  groupBy?: string[];
  limit?: number;
  isCount: boolean;
}

/**
 * Stage 3: Query Disambiguator
 * Maps natural language keywords to database concepts using metadata
 */
export class QueryDisambiguator {
  private metadataLoader: NLQMetadataLoader;

  constructor() {
    this.metadataLoader = getMetadataLoader();
  }

  /**
   * Disambiguate query into semantic representation
   */
  async disambiguate(
    query: string,
    keywords: ExtractedKeywords,
    intent: string,
    context?: any
  ): Promise<SemanticQuery> {
    const schoolId = context?.school_id;
    if (!schoolId) {
      throw new Error('school_id is required in context');
    }

    // Get domain metadata
    const domain = keywords.domain || 'students';
    const domainMetadata = await this.metadataLoader.getDomainMetadata(domain);
    const commonMetadata = await this.metadataLoader.getCommonMetadata();

    // Determine if this is a count query vs list query
    // Check keywords.actions first (from keyword extractor), then fall back to query text
    const queryLower = query.toLowerCase();
    const hasListAction = keywords.actions.some(a => 
      a.includes('which') || a.includes('who') || a.includes('list') || 
      a.includes('show') || a.includes('find') || a.includes('get') || a.includes('give me')
    );
    const hasCountAction = keywords.actions.some(a => 
      a.includes('how many') || a.includes('number of') || a.includes('count')
    );
    
    // If list action is present, it's not a count query
    // Only count if explicitly a count action and no list action
    const isCountQuery = hasCountAction && !hasListAction && 
                        (queryLower.includes('how many') || queryLower.includes('number of') || 
                         (queryLower.includes('count') && !queryLower.includes('list') && !queryLower.includes('show') && !queryLower.includes('which') && !queryLower.includes('who') && !queryLower.includes('give me')));
    
    // Start building semantic query
    const semanticQuery: SemanticQuery = {
      primaryTable: domainMetadata?.table || 'students',
      primaryAlias: this.getTableAlias(domainMetadata?.table || 'students', commonMetadata),
      joins: [],
      conditions: [],
      selectFields: [],
      isCount: isCountQuery,
    };

    // Add school_id condition
    semanticQuery.conditions.push(`${semanticQuery.primaryAlias}.school_id = '${schoolId}'`);

    // Map entities to tables
    if (keywords.entities.length > 0) {
      const primaryEntity = keywords.entities[0];
      const entityInfo = await this.metadataLoader.getEntityInfo(primaryEntity);
      if (entityInfo) {
        semanticQuery.primaryTable = entityInfo.table;
        semanticQuery.primaryAlias = entityInfo.alias;
      }
    }

    // Apply domain-specific joins
    if (domainMetadata) {
      for (const join of domainMetadata.commonJoins) {
        // Check if this join is needed based on keywords
        if (this.isJoinNeeded(join, keywords, domainMetadata)) {
          semanticQuery.joins.push({
            table: join.to,
            alias: this.getTableAlias(join.to, commonMetadata),
            on: this.replaceAliases(join.on, semanticQuery.primaryAlias, this.getTableAlias(join.to, commonMetadata)),
            type: (join.type as 'INNER' | 'LEFT' | 'RIGHT') || 'LEFT',
          });
        }
      }
    }

    // Map filters to conditions using synonyms
    for (const filter of keywords.filters) {
      const synonym = await this.metadataLoader.getSynonym(filter, domain);
      if (synonym) {
        // Replace alias in condition
        const condition = this.replaceAliasInCondition(synonym.sql, semanticQuery.primaryAlias, semanticQuery.joins);
        // Avoid duplicate conditions
        if (!semanticQuery.conditions.includes(condition)) {
          semanticQuery.conditions.push(condition);
        }
      }
    }

    // Apply temporal conditions
    if (keywords.temporal) {
      const temporalSQL = await this.metadataLoader.getTemporalPattern(keywords.temporal);
      if (temporalSQL) {
        // Determine which table has the date field
        const dateTable = this.getDateTable(domain, semanticQuery);
        semanticQuery.conditions.push(`${dateTable}.date ${temporalSQL.includes('=') ? temporalSQL : `= ${temporalSQL}`}`);
      }
    }

    // Apply business logic
    for (const filter of keywords.filters) {
      const businessLogic = await this.metadataLoader.getBusinessLogic(`${filter}_${keywords.entities[0] || 'student'}`, domain);
      if (businessLogic) {
        if (businessLogic.condition) {
          const condition = this.replaceAliasInCondition(businessLogic.condition, semanticQuery.primaryAlias, semanticQuery.joins);
          semanticQuery.conditions.push(condition);
        }
        if (businessLogic.join && !semanticQuery.joins.find(j => j.table === this.extractTableFromJoin(businessLogic.join!))) {
          // Add join if not already present
          const joinTable = this.extractTableFromJoin(businessLogic.join);
          semanticQuery.joins.push({
            table: joinTable,
            alias: this.getTableAlias(joinTable, commonMetadata),
            on: this.extractJoinCondition(businessLogic.join),
            type: 'INNER',
          });
        }
      }
    }

    // Set select fields based on query intent and requested fields
    if (semanticQuery.isCount) {
      semanticQuery.selectFields.push(`COUNT(DISTINCT ${semanticQuery.primaryAlias}.id) as count`);
    } else {
      // For list queries, include relevant fields based on what's asked
      if (semanticQuery.primaryTable === 'students') {
        // Always include basic student info
        semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.id`);
        semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.first_name`);
        semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.last_name`);
        semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.admission_number`);
        semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.roll_number`);
        
        // Add class name if available
        const classJoin = semanticQuery.joins.find(j => j.table === 'classes');
        if (classJoin) {
          semanticQuery.selectFields.push(`${classJoin.alias}.name as class_name`);
        }
        
        // If query asks for contact info, include parent contact fields
        if (queryLower.includes('contact') || queryLower.includes('phone') || queryLower.includes('parent')) {
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.father_phone`);
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.mother_phone`);
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.father_name`);
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.mother_name`);
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.emergency_contact_phone`);
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.emergency_contact_name`);
        }
        
        // If query asks for address, include address fields
        if (queryLower.includes('address') || queryLower.includes('location')) {
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.address`);
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.city`);
          semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.state`);
        }
      } else {
        // For other tables, use * but add relevant joins
        semanticQuery.selectFields.push(`${semanticQuery.primaryAlias}.*`);
      }
      
      // Add attendance status if attendance is involved
      const attendanceJoin = semanticQuery.joins.find(j => j.table === 'attendances');
      if (attendanceJoin) {
        semanticQuery.selectFields.push(`${attendanceJoin.alias}.status as attendance_status`);
        semanticQuery.selectFields.push(`${attendanceJoin.alias}.date as attendance_date`);
      }
      
      // Add fee info if fees are involved
      const feeJoin = semanticQuery.joins.find(j => j.table === 'fees');
      if (feeJoin) {
        semanticQuery.selectFields.push(`${feeJoin.alias}.amount`);
        semanticQuery.selectFields.push(`${feeJoin.alias}.due_date`);
        semanticQuery.selectFields.push(`${feeJoin.alias}.fee_type`);
        semanticQuery.selectFields.push(`${feeJoin.alias}.status as fee_status`);
      }
    }

    // Set order by
    if (keywords.modifiers.includes('top') || keywords.modifiers.includes('best') || keywords.modifiers.includes('highest')) {
      semanticQuery.orderBy = semanticQuery.selectFields[0].includes('COUNT') 
        ? 'count DESC' 
        : `${semanticQuery.primaryAlias}.id DESC`;
      semanticQuery.limit = 10;
    } else if (semanticQuery.primaryTable === 'students') {
      semanticQuery.orderBy = `${semanticQuery.primaryAlias}.roll_number`;
    }

    return semanticQuery;
  }

  /**
   * Get table alias
   */
  private getTableAlias(table: string, commonMetadata: any): string {
    const entityInfo = commonMetadata.commonEntities[table];
    if (entityInfo) {
      return entityInfo.alias;
    }
    // Default aliases
    const aliases: Record<string, string> = {
      students: 's',
      classes: 'c',
      attendances: 'a',
      fees: 'f',
      exams: 'e',
      exam_results: 'er',
      staff: 'st',
      subjects: 'sub',
    };
    return aliases[table] || table.substring(0, 1);
  }

  /**
   * Check if join is needed
   */
  private isJoinNeeded(join: any, keywords: ExtractedKeywords, domainMetadata: any): boolean {
    // If query mentions the joined table or its related concepts
    const queryLower = keywords.filters.join(' ').toLowerCase();
    if (domainMetadata.keywords) {
      for (const keyword of domainMetadata.keywords) {
        if (queryLower.includes(keyword)) {
          return true;
        }
      }
    }
    return true; // Default to including joins
  }

  /**
   * Replace aliases in SQL condition
   */
  private replaceAliasInCondition(condition: string, primaryAlias: string, joins: Array<{ alias: string; table: string }>): string {
    let result = condition;
    
    // Replace common table references with aliases
    for (const join of joins) {
      result = result.replace(new RegExp(`\\b${join.table}\\b`, 'g'), join.alias);
    }
    
    // Replace primary table references
    const primaryTable = this.getTableFromAlias(primaryAlias);
    if (primaryTable) {
      result = result.replace(new RegExp(`\\b${primaryTable}\\b`, 'g'), primaryAlias);
    }
    
    return result;
  }

  /**
   * Replace aliases in join condition
   */
  private replaceAliases(condition: string, fromAlias: string, toAlias: string): string {
    // Simple replacement - assumes format like "table1.field = table2.field"
    return condition
      .replace(/\bstudents\b/g, fromAlias === 's' ? 's' : fromAlias)
      .replace(/\battendances\b/g, toAlias === 'a' ? 'a' : toAlias)
      .replace(/\bclasses\b/g, toAlias === 'c' ? 'c' : toAlias)
      .replace(/\bfees\b/g, toAlias === 'f' ? 'f' : toAlias);
  }

  /**
   * Get table that has date field for temporal queries
   */
  private getDateTable(domain: string, semanticQuery: SemanticQuery): string {
    if (domain === 'attendance') {
      const attendanceJoin = semanticQuery.joins.find(j => j.table === 'attendances');
      return attendanceJoin?.alias || 'a';
    }
    if (domain === 'fees') {
      const feeJoin = semanticQuery.joins.find(j => j.table === 'fees');
      return feeJoin?.alias || 'f';
    }
    return semanticQuery.primaryAlias;
  }

  /**
   * Extract table name from join SQL
   */
  private extractTableFromJoin(joinSQL: string): string {
    const match = joinSQL.match(/JOIN\s+(\w+)/i);
    return match ? match[1] : '';
  }

  /**
   * Extract join condition from join SQL
   */
  private extractJoinCondition(joinSQL: string): string {
    const match = joinSQL.match(/ON\s+(.+)/i);
    return match ? match[1] : '';
  }

  /**
   * Get table name from alias
   */
  private getTableFromAlias(alias: string): string | null {
    const aliasToTable: Record<string, string> = {
      s: 'students',
      c: 'classes',
      a: 'attendances',
      f: 'fees',
      e: 'exams',
      er: 'exam_results',
      st: 'staff',
      sub: 'subjects',
    };
    return aliasToTable[alias] || null;
  }
}

