import { Component, OnInit } from '@angular/core';
import { timeout, finalize } from 'rxjs/operators';
import { DocumentService } from '../document.service';
import { AnalysisResult } from '../document.model';

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
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (file.size > maxSize) {
      this.errorMessage = 'Datei zu groß. Maximale Größe: 10MB';
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Dateityp nicht unterstützt. Erlaubt: PDF, TXT, DOC, DOCX';
      return false;
    }

    return true;
  }

  analyzeDocument() {
    if (!this.selectedFile) return;

    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.errorMessage = '';

    this.simulateProgress();

    this.documentService.analyzeDocument(this.selectedFile, this.analysisOptions)
      .pipe(
        timeout(60000), // 60 second timeout
        finalize(() => this.isAnalyzing = false)
      )
      .subscribe({
        next: (result: any) => {
          console.log('Document analysis successful:', result);
          // 🔁 Konvertierung falls Backend Strings liefert
          if (result.keywords && typeof result.keywords === 'string') {
            result.keywords = result.keywords.split(',').map((k: string) => k.trim());
          }

          if (result.suggestedComponents && typeof result.suggestedComponents === 'string') {
            result.suggestedComponents = result.suggestedComponents.split(',').map((c: string) => c.trim());
          }

          this.analysisResult = this.enhanceAnalysisResult(result);
          this.analysisProgress = 100;
          this.saveToHistory(this.analysisResult);
        },
        error: (error: any) => {
          console.error('Analysis error:', error);
          if (error.name === 'TimeoutError') {
            this.errorMessage = 'Analyse-Timeout: Die Verarbeitung dauert zu lange. Bitte versuchen Sie es mit einer kleineren Datei.';
          } else if (error.status === 0) {
            this.errorMessage = 'Verbindungsfehler: Kann den Server nicht erreichen. Bitte prüfen Sie Ihre Internetverbindung.';
          } else {
            this.errorMessage = 'Fehler bei der Analyse: ' + (error.message || 'Unbekannter Fehler');
          }
        }
      });
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
    const techTerms = ['API', 'REST', 'JSON', 'Database', 'Framework', 'Algorithm'];
    return techTerms.some(t => term.toLowerCase().includes(t.toLowerCase()));
  }

  isBusinessTerm(term: string): boolean {
    const businessTerms = ['ROI', 'KPI', 'Strategy', 'Revenue', 'Customer', 'Market'];
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

  calculateCompleteness(result: AnalysisResult): number {
    let score = 0;
    if (result.summary) score += 25;
    if (result.keywords && result.keywords.length > 5) score += 25;
    if (result.recommendations && result.recommendations.length > 0) score += 25;
    if (result.sentiment) score += 25;
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
    if (!result.keywords) return 0;
    const technicalTerms = result.keywords.filter(k => this.isTechnicalTerm(k));
    return Math.min((technicalTerms.length / result.keywords.length) * 100, 100);
  }

  simulateProgress() {
    const interval = setInterval(() => {
      if (this.analysisProgress < 90) {
        this.analysisProgress += Math.random() * 15;
      } else {
        clearInterval(interval);
      }
    }, 500);
  }

  getFilteredRecommendations() {
    if (!this.analysisResult?.recommendations) return [];
    if (this.recommendationFilter === 'all') {
      return this.analysisResult.recommendations;
    }
    return this.analysisResult.recommendations.filter(
      r => r.priority.toLowerCase() === this.recommendationFilter
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
  }

  previewFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      console.log('File preview:', e.target.result.substring(0, 500));
    };
    reader.readAsText(file);
  }

  loadAnalysisHistory() {
    const history = localStorage.getItem('analysisHistory');
    if (history) {
      console.log('Loading history:', JSON.parse(history));
    }
  }

  saveToHistory(result: AnalysisResult) {
    const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
    history.unshift({
      timestamp: new Date().toISOString(),
      filename: this.selectedFile?.name,
      summary: result.summary?.substring(0, 100) + '...'
    });
    localStorage.setItem('analysisHistory', JSON.stringify(history.slice(0, 10)));
  }

  clearAnalysis() {
    this.analysisResult = null;
    this.selectedFile = null;
    this.analysisProgress = 0;
    this.errorMessage = '';
  }
}
