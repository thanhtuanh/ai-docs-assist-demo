export interface Document {
  id?: string;
  filename: string;
  fileType: string;
  uploadDate: Date;
  content: string;
  summary?: string;
  keywords?: string[];
  recommendations?: Recommendation[];
  sentiment?: string;
  qualityScore?: number;
}

export interface AnalysisResult {
  summary: string;
  keywords: string[];
  keywordCategories?: KeywordCategories;
  recommendations: Recommendation[];
  sentiment: string;
  tone: string;
  qualityScore: number;
  readabilityScore?: number;
  hasHeadings?: boolean;
  hasLists?: boolean;
  hasCodeBlocks?: boolean;
  qualityIndicators?: QualityIndicators;
  statistics?: TextStatistics;
}

export interface Recommendation {
  category: string;
  priority: 'KRITISCH' | 'HOCH' | 'MITTEL' | 'NIEDRIG';
  recommendation: string;
  reasoning: string;
  tools?: string[];
}

export interface KeywordCategories {
  technical: string[];
  business: string[];
  general: string[];
}

export interface QualityIndicators {
  completeness: number;
  clarity: number;
  structure: number;
  technicalDepth: number;
}

export interface TextStatistics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerSentence: number;
  uniqueWords: number;
  lexicalDiversity: number;
}