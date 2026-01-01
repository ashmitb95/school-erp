import { getMetadataLoader, NLQMetadataLoader } from './nlq-metadata-loader';

export interface ExtractedKeywords {
  entities: string[]; // students, fees, exams, etc.
  domain: string | null;
  temporal: string | null; // today, this week, etc.
  filters: string[]; // absent, pending, unpaid, etc.
  actions: string[]; // count, list, show, etc.
  modifiers: string[]; // top, best, new, etc.
}

/**
 * Stage 2: Keyword Extractor
 * Extracts key terms, entities, temporal references, and filters from the query
 */
export class KeywordExtractor {
  private metadataLoader: NLQMetadataLoader;

  constructor() {
    this.metadataLoader = getMetadataLoader();
  }

  /**
   * Extract keywords from query
   */
  async extractKeywords(query: string, intentResult?: { domain?: string }): Promise<ExtractedKeywords> {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    const keywords: ExtractedKeywords = {
      entities: [],
      domain: null,
      temporal: null,
      filters: [],
      actions: [],
      modifiers: [],
    };

    // Load metadata
    const metadata = await this.metadataLoader.loadMetadata();
    const commonMetadata = await this.metadataLoader.getCommonMetadata();

    // Extract entities
    for (const [entity, info] of Object.entries(commonMetadata.commonEntities)) {
      if (queryLower.includes(entity)) {
        keywords.entities.push(entity);
      }
    }

    // Extract domain from intent or infer from keywords
    if (intentResult?.domain) {
      keywords.domain = intentResult.domain;
    } else {
      keywords.domain = this.inferDomain(queryLower, metadata);
    }

    // Extract temporal references
    for (const [temporal, info] of Object.entries(commonMetadata.temporalPatterns)) {
      if (queryLower.includes(temporal)) {
        keywords.temporal = temporal;
        break;
      }
    }

    // Extract filters from domain metadata
    if (keywords.domain) {
      const domainMetadata = await this.metadataLoader.getDomainMetadata(keywords.domain);
      if (domainMetadata) {
        // Check column synonyms
        for (const [term, synonym] of Object.entries(domainMetadata.columnSynonyms)) {
          if (queryLower.includes(term)) {
            keywords.filters.push(term);
          }
        }
        
        // Check keywords
        if (domainMetadata.keywords) {
          for (const keyword of domainMetadata.keywords) {
            if (queryLower.includes(keyword.toLowerCase())) {
              keywords.filters.push(keyword);
            }
          }
        }
      }
    }

    // Extract actions - prioritize list actions over count actions
    const listActionWords = ['which', 'who', 'list', 'show', 'find', 'get', 'display', 'give me'];
    const countActionWords = ['how many', 'number of', 'count'];
    
    // Check for list actions first (they take priority)
    for (const action of listActionWords) {
      if (queryLower.includes(action)) {
        keywords.actions.push(action);
      }
    }
    
    // Only add count actions if no list actions were found
    if (keywords.actions.length === 0) {
      for (const action of countActionWords) {
        if (queryLower.includes(action)) {
          keywords.actions.push(action);
        }
      }
    }

    // Extract modifiers
    const modifierWords = ['top', 'best', 'highest', 'lowest', 'new', 'recent', 'active', 'pending', 'unpaid', 'overdue'];
    for (const modifier of modifierWords) {
      if (queryLower.includes(modifier)) {
        keywords.modifiers.push(modifier);
      }
    }

    // If no entities found, try to infer from context
    if (keywords.entities.length === 0) {
      if (keywords.domain === 'attendance' || keywords.filters.includes('absent') || keywords.filters.includes('present')) {
        keywords.entities.push('students');
      } else if (keywords.domain === 'fees') {
        keywords.entities.push('students');
      } else if (keywords.domain === 'exams') {
        keywords.entities.push('students');
      } else {
        keywords.entities.push('students'); // Default
      }
    }

    return keywords;
  }

  /**
   * Infer domain from query
   */
  private inferDomain(query: string, metadata: any): string | null {
    const domainKeywords: Record<string, string[]> = {
      attendance: ['attendance', 'absent', 'present', 'late', 'excused', 'missing'],
      fees: ['fee', 'fees', 'payment', 'paid', 'pending', 'unpaid', 'overdue', 'due'],
      exams: ['exam', 'exams', 'result', 'results', 'marks', 'grade', 'performance', 'failing'],
      staff: ['staff', 'teacher', 'teachers', 'employee', 'employees', 'designation'],
      students: ['student', 'students', 'admission', 'class', 'grade'],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return domain;
        }
      }
    }

    return 'students'; // Default
  }

  /**
   * Get human-readable keyword summary
   */
  getKeywordSummary(keywords: ExtractedKeywords): string {
    const parts: string[] = [];
    
    if (keywords.entities.length > 0) {
      parts.push(`entities: ${keywords.entities.join(', ')}`);
    }
    if (keywords.domain) {
      parts.push(`domain: ${keywords.domain}`);
    }
    if (keywords.temporal) {
      parts.push(`time: ${keywords.temporal}`);
    }
    if (keywords.filters.length > 0) {
      parts.push(`filters: ${keywords.filters.join(', ')}`);
    }
    if (keywords.actions.length > 0) {
      parts.push(`actions: ${keywords.actions.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('; ') : 'No keywords found';
  }
}


