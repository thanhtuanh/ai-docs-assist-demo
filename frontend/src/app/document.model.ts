// src/app/document.model.ts
export interface AnalysisResult {
  // Core Analysis Data
  summary?: string;
  keywords?: string[];
  sentiment?: SentimentResult | string;
  readabilityScore?: number;
  recommendations?: Recommendation[];
  qualityScore?: number;
  
  // Document Information
  documentType?: string;
  language?: string;
  wordCount?: number;
  
  // Structure Information
  hasHeadings?: boolean;
  hasLists?: boolean;
  hasCodeBlocks?: boolean;
  
  // Additional Analysis Features
  suggestedComponents?: string[];
  keywordCategories?: KeywordCategories;
  qualityIndicators?: QualityIndicators;
  
  // Metadata
  analysisId?: string;
  timestamp?: string;
  filename?: string;
}

export interface SentimentResult {
  score: number;
  label: string;
  confidence?: number;
}

export interface Recommendation {
  id?: string | number;
  title: string;
  description: string;
  priority: 'KRITISCH' | 'HOCH' | 'MITTEL' | 'NIEDRIG';
  category?: string;
  type?: string;
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

// Additional Types for Industry-specific Analysis
export interface IndustryAnalysisOptions {
  industry?: string;
  generateSummary?: boolean;
  extractKeywords?: boolean;
  generateRecommendations?: boolean;
  performSentimentAnalysis?: boolean;
  calculateQualityScore?: boolean;
  detailedMode?: boolean;
}

// Extended Analysis Result for Enhanced Features
export interface EnhancedAnalysisResult extends AnalysisResult {
  industrySpecific?: {
    industry: string;
    relevanceScore: number;
    industryKeywords: string[];
    complianceCheck?: ComplianceResult[];
  };
  
  processing?: {
    duration: number;
    model: string;
    confidence: number;
  };
  
  export?: {
    formats: string[];
    url?: string;
  };
}

export interface ComplianceResult {
  rule: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}