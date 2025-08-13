import { Component, OnInit } from '@angular/core';
import { timeout, finalize } from 'rxjs/operators';
import { DocumentService } from '../document.service';
import { AnalysisResult, SentimentResult } from '../document.model';

@Component({
  selector: 'app-document-analysis',
  templateUrl: './document-analysis.component.html'
})
export class DocumentAnalysisComponent implements OnInit {
  selectedFile: File | null = null;
  isAnalyzing = false;
  analysisResult: AnalysisResult | null = null;
  analysisProgress = 0;
  errorMessage = '';

  analysisOptions = {
    generateSummary: true,
    extractKeywords: true,
    generateRecommendations: true,
    performSentimentAnalysis: true,
    calculateQualityScore: true,
    detailedMode: false
  };

  recommendationFilter = 'all'; // all, high, medium, low

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadAnalysisHistory();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!this.validateFile(file)) return;
      this.selectedFile = file;
      this.errorMessage = '';
      this.previewFile(file);
    }
  }

  validateFile(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf', 
      'text/plain', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (file.size > maxSize) {
      this.errorMessage = 'Datei zu groß. Maximale Größe: 10MB';
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Dateityp nicht unterstützt. Erlaubt: PDF, TXT, DOC, DOCX, XLS, XLSX';
      return false;
    }

    return true;
  }

  // 🔧 FIXED: Use the correct service method
  analyzeDocument() {
    if (!this.selectedFile) return;

    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.errorMessage = '';

    this.simulateProgress();

    // 🔧 Use analyzeDocumentSimple instead of analyzeDocument with complex options
    this.documentService.analyzeDocumentSimple(this.selectedFile, undefined)
      .pipe(
        timeout(60000), // 60 second timeout
        finalize(() => {
          this.isAnalyzing = false;
          this.analysisProgress = 100;
        })
      )
      .subscribe({
        next: (result: any) => {
          console.log('Document analysis successful:', result);
          
          // 🔧 IMPROVED: Better handling of different result formats
          this.analysisResult = this.processAnalysisResult(result);
          this.saveToHistory(this.analysisResult);
        },
        error: (error: any) => {
          console.error('Analysis error:', error);
          this.handleAnalysisError(error);
        }
      });
  }

  // 🆕 ADDED: Process different backend response formats
  processAnalysisResult(result: any): AnalysisResult {
    // Handle different possible backend response structures
    const processedResult: AnalysisResult = {
      summary: result.summary || result.analysis?.summary || 'Keine Zusammenfassung verfügbar',
      keywords: this.extractKeywords(result),
      sentiment: this.extractSentiment(result), // 🔧 FIXED: Better sentiment handling
      readabilityScore: result.readabilityScore || result.analysis?.readabilityScore || 0,
      recommendations: this.extractRecommendations(result),
      suggestedComponents: this.extractSuggestedComponents(result), // 🔧 FIXED: Now properly typed
      qualityScore: result.qualityScore || result.analysis?.qualityScore || 0,
      documentType: result.documentType || result.analysis?.documentType || 'unknown',
      language: result.language || result.analysis?.language || 'de',
      wordCount: result.wordCount || result.analysis?.wordCount || 0, // 🔧 FIXED: Now properly typed
      hasHeadings: result.hasHeadings || result.analysis?.structure?.hasHeadings || false,
      hasLists: result.hasLists || result.analysis?.structure?.hasLists || false,
      hasCodeBlocks: result.hasCodeBlocks || result.analysis?.structure?.hasCodeBlocks || false,
      analysisId: result.analysisId || result.id || this.generateAnalysisId(),
      timestamp: result.timestamp || new Date().toISOString(),
      filename: this.selectedFile?.name || 'unknown'
    };

    return this.enhanceAnalysisResult(processedResult);
  }

  // 🆕 ADDED: Extract keywords from various formats
  extractKeywords(result: any): string[] {
    let keywords = result.keywords || result.analysis?.keywords || [];
    
    if (typeof keywords === 'string') {
      keywords = keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    }
    
    if (!Array.isArray(keywords)) {
      keywords = [];
    }
    
    return keywords;
  }

  // 🔧 FIXED: Better sentiment extraction with proper typing
  extractSentiment(result: any): SentimentResult | string | undefined {
    const sentiment = result.sentiment || result.analysis?.sentiment;
    
    if (!sentiment) return undefined;
    
    // If it's already a proper SentimentResult object
    if (typeof sentiment === 'object' && sentiment.score !== undefined) {
      return {
        score: sentiment.score,
        label: sentiment.label || 'neutral',
        confidence: sentiment.confidence
      };
    }
    
    // If it's a string
    if (typeof sentiment === 'string') {
      return sentiment;
    }
    
    // Default fallback
    return { score: 0, label: 'neutral' };
  }

  // 🆕 ADDED: Extract recommendations from various formats
  extractRecommendations(result: any): any[] {
    let recommendations = result.recommendations || result.analysis?.recommendations || [];
    
    if (!Array.isArray(recommendations)) {
      recommendations = [];
    }
    
    // Ensure each recommendation has required properties
    return recommendations.map((rec: any, index: number) => ({
      id: rec.id || index,
      title: rec.title || rec.text || `Empfehlung ${index + 1}`,
      description: rec.description || rec.detail || rec.text || '',
      priority: rec.priority || rec.severity || 'MITTEL',
      category: rec.category || rec.type || 'general'
    }));
  }

  // 🆕 ADDED: Extract suggested components
  extractSuggestedComponents(result: any): string[] {
    let components = result.suggestedComponents || result.analysis?.suggestedComponents || [];
    
    if (typeof components === 'string') {
      components = components.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
    }
    
    if (!Array.isArray(components)) {
      components = [];
    }
    
    return components;
  }

  // 🔧 IMPROVED: Better error handling
  handleAnalysisError(error: any) {
    if (error.name === 'TimeoutError') {
      this.errorMessage = 'Analyse-Timeout: Die Verarbeitung dauert zu lange. Bitte versuchen Sie es mit einer kleineren Datei.';
    } else if (error.status === 0) {
      this.errorMessage = 'Verbindungsfehler: Kann den Server nicht erreichen. Bitte prüfen Sie Ihre Internetverbindung.';
    } else if (error.status === 404) {
      this.errorMessage = 'Service nicht gefunden: Backend-Endpunkt ist nicht verfügbar.';
    } else if (error.status === 413) {
      this.errorMessage = 'Datei zu groß: Bitte wählen Sie eine kleinere Datei.';
    } else if (error.status === 415) {
      this.errorMessage = 'Dateityp nicht unterstützt: Bitte verwenden Sie PDF, TXT, DOC oder DOCX.';
    } else if (error.status >= 500) {
      this.errorMessage = 'Server-Fehler: Bitte versuchen Sie es später erneut.';
    } else {
      this.errorMessage = 'Fehler bei der Analyse: ' + (error.message || 'Unbekannter Fehler');
    }
  }

  enhanceAnalysisResult(result: AnalysisResult): AnalysisResult {
    if (result.recommendations) {
      result.recommendations = this.sortRecommendations(result.recommendations);
    }

    if (result.keywords) {
      result.keywordCategories = this.categorizeKeywords(result.keywords);
    }

    result.qualityIndicators = this.calculateQualityIndicators(result);

    return result;
  }

  sortRecommendations(recommendations: any[]): any[] {
    const priorityOrder: any = { 'KRITISCH': 0, 'HOCH': 1, 'MITTEL': 2, 'NIEDRIG': 3 };
    return recommendations.sort((a, b) => (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999));
  }

  categorizeKeywords(keywords: string[]): any {
    return {
      technical: keywords.filter(k => this.isTechnicalTerm(k)),
      business: keywords.filter(k => this.isBusinessTerm(k)),
      general: keywords.filter(k => !this.isTechnicalTerm(k) && !this.isBusinessTerm(k))
    };
  }

  isTechnicalTerm(term: string): boolean {
    const techTerms = ['API', 'REST', 'JSON', 'Database', 'Framework', 'Algorithm', 'Software', 'System', 'Code', 'Development'];
    return techTerms.some(t => term.toLowerCase().includes(t.toLowerCase()));
  }

  isBusinessTerm(term: string): boolean {
    const businessTerms = ['ROI', 'KPI', 'Strategy', 'Revenue', 'Customer', 'Market', 'Business', 'Sales', 'Profit', 'Management'];
    return businessTerms.some(t => term.toLowerCase().includes(t.toLowerCase()));
  }

  calculateQualityIndicators(result: AnalysisResult): any {
    return {
      completeness: this.calculateCompleteness(result),
      clarity: result.readabilityScore || 0,
      structure: this.calculateStructureScore(result),
      technicalDepth: this.calculateTechnicalDepth(result)
    };
  }

  // 🔧 FIXED: Better type checking for sentiment
  calculateCompleteness(result: AnalysisResult): number {
    let score = 0;
    if (result.summary && result.summary.length > 50) score += 25;
    if (result.keywords && result.keywords.length > 3) score += 25;
    if (result.recommendations && result.recommendations.length > 0) score += 25;
    
    // 🔧 FIXED: Safe sentiment score checking
    if (result.sentiment) {
      if (typeof result.sentiment === 'object' && result.sentiment !== null && 'score' in result.sentiment && result.sentiment.score !== undefined) {
        score += 25;
      } else if (typeof result.sentiment === 'string' && result.sentiment.length > 0) {
        score += 25;
      }
    }
    
    return score;
  }

  calculateStructureScore(result: AnalysisResult): number {
    let score = 50;
    if (result.hasHeadings) score += 20;
    if (result.hasLists) score += 15;
    if (result.hasCodeBlocks) score += 15;
    return Math.min(score, 100);
  }

  calculateTechnicalDepth(result: AnalysisResult): number {
    if (!result.keywords || result.keywords.length === 0) return 0;
    const technicalTerms = result.keywords.filter(k => this.isTechnicalTerm(k));
    return Math.min((technicalTerms.length / result.keywords.length) * 100, 100);
  }

  simulateProgress() {
    const interval = setInterval(() => {
      if (this.analysisProgress < 85 && this.isAnalyzing) {
        this.analysisProgress += Math.random() * 10 + 5;
      } else {
        clearInterval(interval);
      }
    }, 800);
  }

  getFilteredRecommendations() {
    if (!this.analysisResult?.recommendations) return [];
    if (this.recommendationFilter === 'all') {
      return this.analysisResult.recommendations;
    }
    
    // Map filter values to priority names
    const filterMap: any = {
      'high': ['KRITISCH', 'HOCH'],
      'medium': ['MITTEL'],
      'low': ['NIEDRIG']
    };
    
    const allowedPriorities = filterMap[this.recommendationFilter] || [this.recommendationFilter.toUpperCase()];
    
    return this.analysisResult.recommendations.filter(
      r => allowedPriorities.includes(r.priority.toUpperCase())
    );
  }

  exportResults() {
    if (!this.analysisResult) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      filename: this.selectedFile?.name,
      analysis: this.analysisResult
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis_${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url); // 🔧 Clean up
  }

  // 🔧 IMPROVED: Better file preview with error handling
  previewFile(file: File) {
    if (file.type === 'text/plain' && file.size < 1024 * 1024) { // Only preview text files < 1MB
      const reader = new FileReader();
      reader.onload = (e: any) => {
        console.log('File preview:', e.target.result.substring(0, 500) + '...');
      };
      reader.onerror = () => {
        console.log('Could not preview file');
      };
      reader.readAsText(file);
    } else {
      console.log('File selected:', file.name, 'Size:', Math.round(file.size / 1024) + 'KB');
    }
  }

  // 🔧 IMPROVED: Use sessionStorage instead of localStorage for better privacy
  loadAnalysisHistory() {
    try {
      const history = sessionStorage.getItem('analysisHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        console.log('Loading analysis history:', parsedHistory.length + ' entries');
      }
    } catch (error) {
      console.warn('Could not load analysis history:', error);
    }
  }

  // 🔧 FIXED: Safe property access with proper typing
  saveToHistory(result: AnalysisResult) {
    try {
      const history = JSON.parse(sessionStorage.getItem('analysisHistory') || '[]');
      const historyEntry = {
        timestamp: new Date().toISOString(),
        filename: this.selectedFile?.name,
        summary: result.summary ? 
          (result.summary.length > 100 ? result.summary.substring(0, 100) + '...' : result.summary) : 
          'Keine Zusammenfassung',
        qualityScore: result.qualityScore || 0,
        wordCount: result.wordCount || 0 // 🔧 FIXED: Safe access with fallback
      };
      
      history.unshift(historyEntry);
      sessionStorage.setItem('analysisHistory', JSON.stringify(history.slice(0, 10))); // Keep last 10 entries
    } catch (error) {
      console.warn('Could not save to history:', error);
    }
  }

  clearAnalysis() {
    this.analysisResult = null;
    this.selectedFile = null;
    this.analysisProgress = 0;
    this.errorMessage = '';
  }

  // 🆕 ADDED: Reset file input
  resetFileInput() {
    this.clearAnalysis();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // 🔧 FIXED: Safe property access for analysis summary
  getAnalysisSummary(): string {
    if (!this.analysisResult) return '';
    
    const parts = [];
    
    // Safe wordCount check
    if (this.analysisResult.wordCount && this.analysisResult.wordCount > 0) {
      parts.push(`${this.analysisResult.wordCount} Wörter`);
    }
    
    // Safe keywords check
    if (this.analysisResult.keywords && this.analysisResult.keywords.length > 0) {
      parts.push(`${this.analysisResult.keywords.length} Schlüsselwörter`);
    }
    
    // Safe qualityScore check
    if (this.analysisResult.qualityScore && this.analysisResult.qualityScore > 0) {
      parts.push(`Qualität: ${Math.round(this.analysisResult.qualityScore)}%`);
    }
    
    return parts.join(' • ');
  }

  // 🆕 ADDED: Generate unique analysis ID
  private generateAnalysisId(): string {
    return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}