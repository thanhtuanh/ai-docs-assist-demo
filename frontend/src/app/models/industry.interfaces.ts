// src/app/models/industry.interfaces.ts

export interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
  keywords: string[];
  technologies: string[];
  regulations: string[];
  kpis: string[];
  focusAreas: string[];
}

export interface EnhancedAnalysisResult {
  // Bestehende Felder
  keywords: string[];
  summary: string;
  recommendations: string[];
  
  // Neue branchenspezifische Felder
  detectedIndustry: Industry;
  confidence: number;
  
  // Kategorisierte Keywords
  technologyKeywords: string[];
  businessKeywords: string[];
  complianceKeywords: string[];
  
  // Priorisierte Empfehlungen
  highPriorityRecommendations: string[];
  mediumPriorityRecommendations: string[];
  lowPriorityRecommendations: string[];
  
  // Compliance Analyse
  complianceResults: ComplianceResult[];
  
  // Risiko-Bewertung
  riskAssessment: RiskAssessment;
  
  // Budget & Timeline
  estimatedBudget: BudgetEstimate;
  timeline: TimelineEstimate;
  
  // Tech Stack
  recommendedStack: TechStack;
  
  // Success Metrics
  successMetrics: SuccessMetric[];
}

export interface ComplianceResult {
  regulation: string;
  relevance: 'high' | 'medium' | 'low';
  foundKeywords: string[];
  requirements: string[];
  riskLevel: 'high' | 'medium' | 'low';
}

export interface RiskAssessment {
  overall: number; // 1-10
  security: number;
  compliance: number;
  technical: number;
  recommendations: string[];
}

export interface BudgetEstimate {
  min: number;
  max: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface TimelineEstimate {
  estimated: number; // months
  phases: ProjectPhase[];
  criticalPath: string[];
}

export interface ProjectPhase {
  name: string;
  duration: number; // months
  dependencies: string[];
  deliverables: string[];
}

export interface TechStack {
  frontend: string[];
  backend: string[];
  database: string[];
  infrastructure: string[];
}

export interface SuccessMetric {
  name: string;
  current: string;
  target: string;
  improvement: string;
}