// src/app/document-summary/document-summary.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { ApiService } from '../services/api.service';

/**
 * ✅ OPTIMIERTER DocumentSummaryComponent - Backend-Only
 * 
 * WICHTIGE ÄNDERUNGEN:
 * ❌ ENTFERNT: Lokale Dokumentverarbeitung
 * ❌ ENTFERNT: Client-seitige Analyse-Logik
 * ❌ ENTFERNT: DocumentService Dependencies
 * 
 * ✅ BEHALTEN: Direkte Backend-API Calls über ApiService
 * ✅ BEHALTEN: Proper Error Handling für Backend-Fehler
 */
@Component({
  selector: 'app-document-summary',
  templateUrl: './document-summary.component.html',
  styleUrls: ['./document-summary.component.css']
})
export class DocumentSummaryComponent implements OnInit, OnDestroy {
  
  // ===================================
  // COMPONENT STATE
  // ===================================
  
  documentId: string = '';
  
  // Backend Response Data
  documentData: any = null;
  document: any = null;
  feedbackHistory: any[] = [];
  
  // UI Display Properties
  summary: string = '';
  keywords: string[] = [];
  suggestedComponents: string[] = [];
  
  // Additional Analysis Data
  qualityScore: number = 0;
  sentiment: any = null;
  wordCount: number = 0;
  documentType: string = '';
  averageRating: number = 0;
  feedbackCount: number = 0;
  
  // Component State
  isLoading: boolean = true;
  errorMessage: string = '';
  documentExists: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {
    console.log('📄 DocumentSummaryComponent initialized - Backend-Only Mode');
  }

  ngOnInit(): void {
    this.loadDocumentFromRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===================================
  // DOCUMENT LOADING (Backend-Only)
  // ===================================

  /**
   * ✅ Route-Parameter verarbeiten und Dokument laden
   */
  private loadDocumentFromRoute(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.documentId = id;
        this.fetchDocumentFromBackend(id);
      } else {
        this.handleError('Keine Dokument-ID in der URL gefunden');
      }
    });
  }

  /**
   * ✅ Dokument mit Historie vom Backend laden
   */
  private fetchDocumentFromBackend(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('📡 Loading document from backend:', id);
    
    // Backend API Call: GET /api/documents/{id}
    this.apiService.getDocument(id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.handleBackendError(error);
        throw error;
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Document loaded from backend:', response);
        this.processBackendDocumentResponse(response);
        this.documentExists = true;
      },
      error: (error: any) => {
        console.error('❌ Failed to load document from backend:', error);
        this.documentExists = false;
      }
    });
  }

  /**
   * ✅ Backend-Response verarbeiten (DocumentWithHistory)
   */
  private processBackendDocumentResponse(response: any): void {
    console.log('🔄 Processing backend document response...');
    
    // Response Structure: DocumentWithHistory vom Backend
    this.documentData = response;
    this.document = response.document;
    this.feedbackHistory = response.feedbackHistory || [];
    this.averageRating = response.averageRating || 0;
    this.feedbackCount = response.feedbackCount || 0;
    
    if (this.document) {
      // Hauptdaten extrahieren
      this.summary = this.document.summary || 'Keine Zusammenfassung verfügbar';
      this.documentType = this.document.documentType || 'Unbekannt';
      this.qualityScore = this.document.qualityScore || 0;
      this.sentiment = this.parsesentiment(this.document.sentiment);
      this.wordCount = this.calculateWordCount(this.document.content || '');
      
      // Keywords verarbeiten
      this.keywords = this.parseKeywords(this.document.keywords);
      
      // Components verarbeiten
      this.suggestedComponents = this.parseComponents(this.document.suggestedComponents);
      
      console.log('✅ Document data successfully processed for UI');
      console.log('📊 Summary length:', this.summary.length);
      console.log('🔑 Keywords count:', this.keywords.length);
      console.log('💡 Components count:', this.suggestedComponents.length);
    } else {
      this.handleError('Dokumentdaten nicht verfügbar');
    }
  }

  // ===================================
  // DOCUMENT ACTIONS (Backend-Only)
  // ===================================

  /**
   * ✅ Dokument neu analysieren - Backend API Call
   */
  reanalyzeDocument(): void {
    if (!this.documentId) {
      this.handleError('Keine Dokument-ID für Re-Analyse verfügbar');
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('🔄 Re-analyzing document via backend:', this.documentId);
    
    // Backend API Call: POST /api/documents/{id}/reanalyze
    this.apiService.reanalyzeDocument(this.documentId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.handleError('Fehler bei der Neuanalyse: ' + (error.message || 'Unbekannt'));
        throw error;
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (result: any) => {
        console.log('✅ Re-analysis completed:', result);
        // Dokument neu laden um aktualisierte Daten zu erhalten
        this.fetchDocumentFromBackend(this.documentId);
      },
      error: (error: any) => {
        console.error('❌ Re-analysis failed:', error);
      }
    });
  }

  /**
   * ✅ Dokument exportieren
   */
  exportDocument(): void {
    if (!this.documentData) {
      this.handleError('Keine Dokumentdaten zum Exportieren verfügbar');
      return;
    }

    const exportData = {
      id: this.documentId,
      timestamp: new Date().toISOString(),
      document: this.document,
      summary: this.summary,
      keywords: this.keywords,
      suggestedComponents: this.suggestedComponents,
      qualityScore: this.qualityScore,
      sentiment: this.sentiment,
      wordCount: this.wordCount,
      documentType: this.documentType,
      feedbackHistory: this.feedbackHistory,
      averageRating: this.averageRating,
      feedbackCount: this.feedbackCount,
      exportSource: 'Backend API'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document_${this.documentId}_${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('📥 Document exported successfully');
  }

  /**
   * ✅ Dokument aktualisieren
   */
  refreshDocument(): void {
    if (this.documentId) {
      console.log('🔄 Refreshing document from backend');
      this.fetchDocumentFromBackend(this.documentId);
    }
  }

  // ===================================
  // NAVIGATION
  // ===================================

  /**
   * ✅ Zurück zur Dokumentenliste
   */
  goBack(): void {
    this.router.navigate(['/']);
  }

  /**
   * ✅ Zur Dokumentbearbeitung
   */
  editDocument(): void {
    this.router.navigate(['/upload']);
  }

  // ===================================
  // DATA PROCESSING HELPERS
  // ===================================

  /**
   * ✅ Keywords von Backend-String zu Array
   */
  private parseKeywords(keywordString: string | null): string[] {
    if (!keywordString) return [];
    
    return keywordString.split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
  }

  /**
   * ✅ Components von Backend-String zu Array
   */
  private parseComponents(componentString: string | null): string[] {
    if (!componentString) return [];
    
    return componentString.split(',')
      .map(component => component.trim())
      .filter(component => component.length > 0);
  }

  /**
   * ✅ Sentiment parsen
   */
  private parsesentiment(sentimentString: string | null): any {
    if (!sentimentString) return null;
    
    try {
      // Versuche JSON zu parsen falls Backend JSON liefert
      return JSON.parse(sentimentString);
    } catch {
      // Falls String, erstelle Objekt
      return {
        label: sentimentString,
        score: 0.5
      };
    }
  }

  /**
   * ✅ Wörter zählen
   */
  private calculateWordCount(content: string): number {
    if (!content) return 0;
    return content.trim().split(/\s+/).length;
  }

  // ===================================
  // ERROR HANDLING
  // ===================================

  /**
   * ✅ Backend-spezifische Fehlerbehandlung
   */
  private handleBackendError(error: any): void {
    console.error('🔴 Backend error in DocumentSummary:', error);
    
    let errorMessage = 'Backend-Fehler beim Laden des Dokuments';
    
    if (error.status === 0) {
      errorMessage = '🔌 Backend nicht erreichbar. Läuft der Spring Boot Server?';
    } else if (error.status === 404) {
      errorMessage = '📄 Dokument nicht gefunden. Möglicherweise wurde es gelöscht.';
    } else if (error.status === 403) {
      errorMessage = '🔒 Zugriff auf Dokument verweigert';
    } else if (error.status === 500) {
      errorMessage = '⚡ Server-Fehler beim Laden des Dokuments';
    } else if (error.message) {
      errorMessage = `Backend-Fehler: ${error.message}`;
    }
    
    this.handleError(errorMessage);
  }

  /**
   * ✅ Allgemeine Fehlerbehandlung
   */
  private handleError(message: string): void {
    this.errorMessage = message;
    this.documentExists = false;
    this.isLoading = false;
    console.error('❌ DocumentSummary Error:', message);
  }

  // ===================================
  // UI HELPER METHODS
  // ===================================

  /**
   * ✅ Hat Keywords
   */
  hasKeywords(): boolean {
    return this.keywords.length > 0;
  }

  /**
   * ✅ Hat Components
   */
  hasComponents(): boolean {
    return this.suggestedComponents.length > 0;
  }

  /**
   * ✅ Hat Summary
   */
  hasSummary(): boolean {
    return this.summary.length > 0 && this.summary !== 'Keine Zusammenfassung verfügbar';
  }

  /**
   * ✅ Keywords als String
   */
  getKeywordsString(): string {
    return this.keywords.join(', ');
  }

  /**
   * ✅ Components als String
   */
  getComponentsString(): string {
    return this.suggestedComponents.join(', ');
  }

  /**
   * ✅ Sentiment Label
   */
  getSentimentLabel(): string {
    if (!this.sentiment) return 'Unbekannt';
    return this.sentiment.label || 'Neutral';
  }

  /**
   * ✅ Sentiment Score als Prozent
   */
  getSentimentScore(): number {
    if (!this.sentiment) return 0;
    return Math.round((this.sentiment.score || 0) * 100);
  }

  /**
   * ✅ Quality Score Farbe
   */
  getQualityScoreColor(): string {
    if (this.qualityScore >= 80) return 'success';
    if (this.qualityScore >= 60) return 'warning';
    return 'danger';
  }

  /**
   * ✅ Analysevollständigkeit prüfen
   */
  hasCompleteAnalysis(): boolean {
    return this.hasSummary() && this.hasKeywords() && this.qualityScore > 0;
  }

  /**
   * ✅ Analysevollständigkeit in Prozent
   */
  getAnalysisCompleteness(): number {
    let score = 0;
    if (this.hasSummary()) score += 25;
    if (this.hasKeywords()) score += 25;
    if (this.hasComponents()) score += 25;
    if (this.sentiment) score += 25;
    return score;
  }

  /**
   * ✅ Feedback vorhanden
   */
  hasFeedback(): boolean {
    return this.feedbackHistory.length > 0;
  }

  /**
   * ✅ Rating Sterne Array
   */
  getRatingStars(): number[] {
    const rating = Math.round(this.averageRating);
    return Array.from({length: 5}, (_, i) => i + 1);
  }

  /**
   * ✅ Ist Stern gefüllt
   */
  isStarFilled(star: number): boolean {
    return star <= Math.round(this.averageRating);
  }
}