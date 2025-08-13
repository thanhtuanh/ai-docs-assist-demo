import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { DocumentService } from '../document.service';

@Component({
  selector: 'app-document-summary',
  templateUrl: './document-summary.component.html',
  styleUrls: ['./document-summary.component.css']
})
export class DocumentSummaryComponent implements OnInit, OnDestroy {
  // 🔧 IMPROVED: Better typing and initialization
  documentId: string = '';
  summary: string = '';
  keywords: string[] = [];
  suggestedComponents: string[] = [];
  
  // 🆕 ADDED: Loading and error states
  isLoading = true;
  errorMessage = '';
  documentExists = false;
  
  // 🆕 ADDED: Additional document data
  documentData: any = null;
  qualityScore = 0;
  sentiment: any = null;
  wordCount = 0;
  documentType = '';
  
  // 🔧 ADDED: Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    this.loadDocumentData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔧 IMPROVED: Better route parameter handling
  loadDocumentData(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.documentId = id;
        this.fetchDocument(id);
      } else {
        this.handleError('Keine Dokument-ID gefunden');
      }
    });
  }

  // 🆕 ADDED: Separate fetch method with better error handling
  fetchDocument(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.documentService.getDocument(id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.handleError(error);
        return [];
      })
    ).subscribe({
      next: (data: any) => {
        if (data) {
          this.processDocumentData(data);
          this.documentExists = true;
        } else {
          this.handleError('Dokument nicht gefunden');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  // 🆕 ADDED: Process different data structures from backend
  processDocumentData(data: any): void {
    this.documentData = data;
    
    // 🔧 Handle different response structures
    const analysis = data.analysis || data;
    
    // Summary
    this.summary = analysis.summary || data.summary || 'Keine Zusammenfassung verfügbar';
    
    // Keywords - handle both string and array formats
    if (analysis.keywords || data.keywords) {
      const keywordsData = analysis.keywords || data.keywords;
      if (typeof keywordsData === 'string') {
        this.keywords = keywordsData.split(',').map(k => k.trim()).filter(k => k.length > 0);
      } else if (Array.isArray(keywordsData)) {
        this.keywords = keywordsData;
      } else {
        this.keywords = [];
      }
    }
    
    // Suggested Components - handle both string and array formats
    if (analysis.suggestedComponents || data.suggestedComponents) {
      const componentsData = analysis.suggestedComponents || data.suggestedComponents;
      if (typeof componentsData === 'string') {
        this.suggestedComponents = componentsData.split(',').map(c => c.trim()).filter(c => c.length > 0);
      } else if (Array.isArray(componentsData)) {
        this.suggestedComponents = componentsData;
      } else {
        this.suggestedComponents = [];
      }
    }
    
    // 🆕 Additional data
    this.qualityScore = analysis.qualityScore || data.qualityScore || 0;
    this.sentiment = analysis.sentiment || data.sentiment || null;
    this.wordCount = analysis.wordCount || data.wordCount || 0;
    this.documentType = analysis.documentType || data.documentType || 'Unbekannt';
  }

  // 🆕 ADDED: Error handling
  handleError(error: any): void {
    console.error('Document loading error:', error);
    
    if (typeof error === 'string') {
      this.errorMessage = error;
    } else if (error?.message) {
      this.errorMessage = error.message;
    } else if (error?.status) {
      switch (error.status) {
        case 404:
          this.errorMessage = 'Dokument nicht gefunden';
          break;
        case 403:
          this.errorMessage = 'Zugriff auf Dokument verweigert';
          break;
        case 500:
          this.errorMessage = 'Server-Fehler beim Laden des Dokuments';
          break;
        default:
          this.errorMessage = `Fehler beim Laden: ${error.status}`;
      }
    } else {
      this.errorMessage = 'Unbekannter Fehler beim Laden des Dokuments';
    }
    
    this.documentExists = false;
    this.isLoading = false;
  }

  // 🆕 ADDED: Utility methods for template
  hasKeywords(): boolean {
    return this.keywords.length > 0;
  }

  hasComponents(): boolean {
    return this.suggestedComponents.length > 0;
  }

  hasSummary(): boolean {
    return this.summary.length > 0 && this.summary !== 'Keine Zusammenfassung verfügbar';
  }

  getKeywordsString(): string {
    return this.keywords.join(', ');
  }

  getComponentsString(): string {
    return this.suggestedComponents.join(', ');
  }

  getSentimentLabel(): string {
    if (!this.sentiment) return 'Unbekannt';
    return this.sentiment.label || 'Neutral';
  }

  getSentimentScore(): number {
    if (!this.sentiment) return 0;
    return Math.round((this.sentiment.score || 0) * 100);
  }

  getQualityScoreColor(): string {
    if (this.qualityScore >= 80) return 'success';
    if (this.qualityScore >= 60) return 'warning';
    return 'danger';
  }

  // 🆕 ADDED: Navigation methods
  goBack(): void {
    this.router.navigate(['/documents']);
  }

  editDocument(): void {
    this.router.navigate(['/documents', this.documentId, 'edit']);
  }

  reanalyzeDocument(): void {
    if (!this.documentId) return;
    
    this.isLoading = true;
    this.documentService.reanalyzeDocument(this.documentId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.handleError('Fehler bei der Neuanalyse: ' + (error.message || 'Unbekannt'));
        return [];
      })
    ).subscribe({
      next: (result: any) => {
        console.log('Reanalysis completed:', result);
        // Reload the document data
        this.fetchDocument(this.documentId);
      },
      error: (error: any) => {
        this.handleError('Fehler bei der Neuanalyse: ' + (error.message || 'Unbekannt'));
        this.isLoading = false;
      }
    });
  }

  // 🆕 ADDED: Export functionality
  exportDocument(): void {
    if (!this.documentData) return;

    const exportData = {
      id: this.documentId,
      timestamp: new Date().toISOString(),
      summary: this.summary,
      keywords: this.keywords,
      suggestedComponents: this.suggestedComponents,
      qualityScore: this.qualityScore,
      sentiment: this.sentiment,
      wordCount: this.wordCount,
      documentType: this.documentType,
      fullData: this.documentData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document_${this.documentId}_${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // 🆕 ADDED: Refresh functionality
  refreshDocument(): void {
    if (this.documentId) {
      this.fetchDocument(this.documentId);
    }
  }

  // 🆕 ADDED: Check if document has complete analysis
  hasCompleteAnalysis(): boolean {
    return this.hasSummary() && this.hasKeywords() && this.qualityScore > 0;
  }

  // 🆕 ADDED: Get analysis completeness percentage
  getAnalysisCompleteness(): number {
    let score = 0;
    if (this.hasSummary()) score += 25;
    if (this.hasKeywords()) score += 25;
    if (this.hasComponents()) score += 25;
    if (this.sentiment) score += 25;
    return score;
  }
}