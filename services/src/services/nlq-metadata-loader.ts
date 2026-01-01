import * as fs from 'fs';
import * as path from 'path';

export interface QuestionPattern {
  pattern: string;
  type: 'simple' | 'complex';
  intent: string;
  sqlTemplate?: string;
  variations?: string[];
  keywords?: string[];
  description?: string;
}

export interface DomainMetadata {
  domain: string;
  description: string;
  table: string;
  primaryEntity?: string;
  questionPatterns: QuestionPattern[];
  columnSynonyms: Record<string, { sql: string; description?: string }>;
  businessLogic: Record<string, { condition?: string; join?: string; description?: string }>;
  commonJoins: Array<{
    from: string;
    to: string;
    on: string;
    alias: string;
    type?: 'INNER' | 'LEFT' | 'RIGHT';
  }>;
  keywords?: string[];
}

export interface CommonMetadata {
  domain: string;
  description: string;
  temporalPatterns: Record<string, { sql: string; description: string }>;
  countPatterns: Record<string, { type: string; description: string }>;
  commonEntities: Record<string, { table: string; alias: string; description: string }>;
}

export interface LoadedMetadata {
  domains: Map<string, DomainMetadata>;
  common: CommonMetadata;
}

/**
 * Metadata Loader for NLQ System
 * Loads and caches domain-specific metadata from JSON files
 */
export class NLQMetadataLoader {
  private metadataCache: LoadedMetadata | null = null;
  private metadataPath: string;

  constructor(metadataPath?: string) {
    // Use absolute path from project root or relative to this file
    if (metadataPath) {
      this.metadataPath = metadataPath;
    } else {
      // Try to resolve relative to this file's location
      const currentDir = __dirname || process.cwd();
      this.metadataPath = path.join(currentDir, 'nlq-metadata');
    }
  }

  /**
   * Load all metadata files
   */
  async loadMetadata(): Promise<LoadedMetadata> {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    const domains = new Map<string, DomainMetadata>();
    let common: CommonMetadata | null = null;

    try {
      // Load common metadata
      const commonPath = path.join(this.metadataPath, 'common.json');
      if (fs.existsSync(commonPath)) {
        const commonData = JSON.parse(fs.readFileSync(commonPath, 'utf-8'));
        common = commonData as CommonMetadata;
      }

      // Load domain metadata files
      const files = fs.readdirSync(this.metadataPath);
      for (const file of files) {
        if (file === 'common.json') continue;
        if (file.endsWith('.json')) {
          const filePath = path.join(this.metadataPath, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const domain = data.domain;
          if (domain) {
            domains.set(domain, data as DomainMetadata);
          }
        }
      }

      if (!common) {
        throw new Error('common.json metadata file is required');
      }

      this.metadataCache = {
        domains,
        common,
      };

      return this.metadataCache;
    } catch (error: any) {
      console.error('[NLQ Metadata Loader] Error loading metadata:', error);
      throw new Error(`Failed to load metadata: ${error.message}`);
    }
  }

  /**
   * Get metadata for a specific domain
   */
  async getDomainMetadata(domain: string): Promise<DomainMetadata | null> {
    const metadata = await this.loadMetadata();
    return metadata.domains.get(domain) || null;
  }

  /**
   * Get all domain metadata
   */
  async getAllDomains(): Promise<DomainMetadata[]> {
    const metadata = await this.loadMetadata();
    return Array.from(metadata.domains.values());
  }

  /**
   * Get common metadata
   */
  async getCommonMetadata(): Promise<CommonMetadata> {
    const metadata = await this.loadMetadata();
    return metadata.common;
  }

  /**
   * Find matching question pattern across all domains
   */
  async findMatchingPattern(query: string): Promise<{
    pattern: QuestionPattern;
    domain: string;
    matchScore: number;
  } | null> {
    const metadata = await this.loadMetadata();
    const queryLower = query.toLowerCase();

    let bestMatch: {
      pattern: QuestionPattern;
      domain: string;
      matchScore: number;
    } | null = null;
    let bestScore = 0;

    // Check each domain
    for (const [domain, domainData] of metadata.domains.entries()) {
      for (const pattern of domainData.questionPatterns) {
        // Check variations first (exact match)
        if (pattern.variations) {
          for (const variation of pattern.variations) {
            if (queryLower === variation.toLowerCase()) {
              return { pattern, domain, matchScore: 1.0 };
            }
            // Partial match
            if (queryLower.includes(variation.toLowerCase()) || variation.toLowerCase().includes(queryLower)) {
              const score = Math.min(queryLower.length, variation.length) / Math.max(queryLower.length, variation.length);
              if (score > bestScore) {
                bestScore = score;
                bestMatch = { pattern, domain, matchScore: score };
              }
            }
          }
        }

        // Check keywords
        if (pattern.keywords) {
          const matchedKeywords = pattern.keywords.filter(kw => queryLower.includes(kw.toLowerCase())).length;
          if (matchedKeywords > 0) {
            const score = matchedKeywords / pattern.keywords.length;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = { pattern, domain, matchScore: score };
            }
          }
        }

        // Simple regex pattern matching (basic)
        try {
          const regex = new RegExp(pattern.pattern.replace(/\([^)]+\)/g, '.*'), 'i');
          if (regex.test(query)) {
            const score = 0.7; // Pattern match gets medium score
            if (score > bestScore) {
              bestScore = score;
              bestMatch = { pattern, domain, matchScore: score };
            }
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get synonyms for a term
   */
  async getSynonym(term: string, domain?: string): Promise<{ sql: string; description?: string } | null> {
    const metadata = await this.loadMetadata();
    const termLower = term.toLowerCase();

    // Check specific domain first
    if (domain) {
      const domainData = metadata.domains.get(domain);
      if (domainData?.columnSynonyms[termLower]) {
        return domainData.columnSynonyms[termLower];
      }
    }

    // Check all domains
    for (const domainData of metadata.domains.values()) {
      if (domainData.columnSynonyms[termLower]) {
        return domainData.columnSynonyms[termLower];
      }
    }

    return null;
  }

  /**
   * Get business logic mapping
   */
  async getBusinessLogic(key: string, domain?: string): Promise<{ condition?: string; join?: string; description?: string } | null> {
    const metadata = await this.loadMetadata();

    // Check specific domain first
    if (domain) {
      const domainData = metadata.domains.get(domain);
      if (domainData?.businessLogic[key]) {
        return domainData.businessLogic[key];
      }
    }

    // Check all domains
    for (const domainData of metadata.domains.values()) {
      if (domainData.businessLogic[key]) {
        return domainData.businessLogic[key];
      }
    }

    return null;
  }

  /**
   * Get temporal pattern SQL
   */
  async getTemporalPattern(term: string): Promise<string | null> {
    const metadata = await this.loadMetadata();
    const termLower = term.toLowerCase();
    return metadata.common.temporalPatterns[termLower]?.sql || null;
  }

  /**
   * Get entity information
   */
  async getEntityInfo(entity: string): Promise<{ table: string; alias: string; description: string } | null> {
    const metadata = await this.loadMetadata();
    const entityLower = entity.toLowerCase();
    return metadata.common.commonEntities[entityLower] || null;
  }

  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.metadataCache = null;
  }
}

// Singleton instance
let metadataLoaderInstance: NLQMetadataLoader | null = null;

export function getMetadataLoader(): NLQMetadataLoader {
  if (!metadataLoaderInstance) {
    metadataLoaderInstance = new NLQMetadataLoader();
  }
  return metadataLoaderInstance;
}

