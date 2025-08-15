// src/app/document.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService, AnalysisOptions, TextAnalysisRequest, AnalysisResponse } from './services/api.service';

/**
 * ✅ OPTIMIERTER DocumentService - Pure Backend-Delegation
 * 
 * WICHTIGE ÄNDERUNGEN:
 * ❌ ENTFERNT: Alle lokalen Business Logic Methoden
 * ❌ ENTFERNT: Fallback-Analyse-Algorithmen  
 * ❌ ENTFERNT: Client-seitige Text-Verarbeitung
 * ❌ ENTFERNT: saveDocument() - Backend macht das automatisch
 * ❌ ENTFERNT: analyzeWithIndustryDetection() - deprecated
 * 
 * ✅ BEHALTEN: Nur Backend-Delegation und Standard-Optionen
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  
  constructor(private apiService: ApiService) {
    console.log('📋 DocumentService initialized - Pure Backend Delegation Mode');
    console.log('🎯 All analysis logic delegated to Spring Boot Backend');
  }

  // ===================================
  // HAUPTMETHODEN (Pure Backend-Delegation)
  // ===================================

  /**
   * ✅ Text analysieren - Direkte Backend-Delegation
   * Keine lokale Verarbeitung, alles über Backend
   */
  analyzeText(text: string, options?: AnalysisOptions): Observable<AnalysisResponse> {
    console.log('🔄 DocumentService: analyzeText → Backend');
    console.log('📝 Text length:', text.length);
    
    const request: TextAnalysisRequest = {
      text,
      title: 'Text Analysis',
      saveDocument: true,
      options: options || this.getDefaultOptions()
    };
    
    return this.apiService.analyzeText(request).pipe(
      tap(response => {
        console.log('✅ Backend analysis completed:', response.processingTimeMs + 'ms');
        console.log('📄 Document saved with ID:', response.document?.id);
      })
    );
  }

  /**
   * ✅ Dokument analysieren - Direkte Backend-Delegation  
   * File-Upload und Analyse komplett über Backend
   */
  analyzeDocument(file: File, options?: AnalysisOptions): Observable<AnalysisResponse> {
    console.log('🔄 DocumentService: analyzeDocument → Backend');
    console.log('📄 File:', file.name, '(' + this.formatFileSize(file.size) + ')');
    
    return this.apiService.analyzeDocument(file, options || this.getDefaultOptions()).pipe(
      tap(response => {
        console.log('✅ Document analysis completed:', response.processingTimeMs + 'ms');
        console.log('📄 Document saved with ID:', response.document?.id);
      })
    );
  }

  /**
   * ✅ Einfache Text-Analyse - Backend-Delegation mit Standard-Optionen
   * Convenience-Method für schnelle Analyse
   */
  analyzeTextSimple(text: string, industry?: string): Observable<AnalysisResponse> {
    console.log('🔄 DocumentService: analyzeTextSimple → Backend');
    
    const request: TextAnalysisRequest = {
      text,
      title: industry ? `${industry} Analysis` : 'Simple Text Analysis',
      saveDocument: true,
      options: this.getDefaultOptions()
    };
    
    return this.apiService.analyzeText(request);
  }

  /**
   * ✅ Einfache Dokument-Analyse - Backend-Delegation
   * Convenience-Method für schnelle Dokument-Analyse
   */
  analyzeDocumentSimple(file: File, industry?: string): Observable<AnalysisResponse> {
    console.log('🔄 DocumentService: analyzeDocumentSimple → Backend');
    
    return this.apiService.analyzeDocument(file, this.getDefaultOptions());
  }

  /**
   * ✅ Umfassende Analyse - Direkte Backend AI Service Delegation
   * Nutzt die erweiterten AI-Features des Backends
   */
  comprehensiveAnalysis(text: string): Observable<any> {
    console.log('🔄 DocumentService: comprehensiveAnalysis → Backend AI Service');
    return this.apiService.comprehensiveAnalysis(text);
  }

  // ===================================
  // DOCUMENT MANAGEMENT (Backend-Delegation)
  // ===================================

  /**
   * ✅ Dokument abrufen - Direkte Backend-Delegation
   * Gibt das Document aus DocumentWithHistory zurück
   */
  getDocument(id: number | string): Observable<any> {
    console.log('🔄 DocumentService: getDocument(' + id + ') → Backend');
    return this.apiService.getDocument(id).pipe(
      map(response => response.document), // Extrahiere Document aus DocumentWithHistory
      tap(document => {
        console.log('✅ Document loaded:', document?.title || 'Untitled');
      })
    );
  }

  /**
   * ✅ Dokument mit vollständiger Historie abrufen
   * Gibt komplette DocumentWithHistory zurück
   */
  getDocumentWithHistory(id: number | string): Observable<any> {
    console.log('🔄 DocumentService: getDocumentWithHistory(' + id + ') → Backend');
    return this.apiService.getDocument(id).pipe(
      tap(response => {
        console.log('✅ Document with history loaded:', response.feedbackCount + ' feedback entries');
      })
    );
  }

  /**
   * ✅ Dokument neu analysieren - Direkte Backend-Delegation
   */
  reanalyzeDocument(id: number | string, options?: AnalysisOptions): Observable<AnalysisResponse> {
    console.log('🔄 DocumentService: reanalyzeDocument(' + id + ') → Backend');
    return this.apiService.reanalyzeDocument(id, options || this.getDefaultOptions());
  }

  /**
   * ✅ Dokumente vergleichen - Direkte Backend-Delegation
   */
  compareDocuments(id1: number | string, id2: number | string): Observable<any> {
    console.log('🔄 DocumentService: compareDocuments(' + id1 + ', ' + id2 + ') → Backend');
    return this.apiService.compareDocuments(id1, id2);
  }

  // ===================================
  // BATCH PROCESSING (Backend-Delegation)
  // ===================================

  /**
   * ✅ Batch-Verarbeitung - Direkte Backend-Delegation
   */
  processBatch(files: File[], options?: AnalysisOptions): Observable<any> {
    console.log('🔄 DocumentService: processBatch(' + files.length + ' files) → Backend');
    return this.apiService.processBatch(files, options || this.getDefaultOptions());
  }

  /**
   * ✅ Echtzeit-Analyse - Direkte Backend-Delegation
   */
  analyzeRealtime(text: string, language?: string): Observable<any> {
    console.log('🔄 DocumentService: analyzeRealtime → Backend');
    return this.apiService.analyzeRealtime(text, language);
  }

  // ===================================
  // HEALTH & STATUS (Backend-Delegation)
  // ===================================

  /**
   * ✅ Backend Health Check
   */
  checkHealth(): Observable<any> {
    console.log('🔄 DocumentService: checkHealth → Backend');
    return this.apiService.checkHealth();
  }

  /**
   * ✅ AI Service Health Check
   */
  checkAiHealth(): Observable<any> {
    console.log('🔄 DocumentService: checkAiHealth → Backend AI');
    return this.apiService.checkAiHealth();
  }

  /**
   * ✅ Backend-Verbindung testen
   */
  testBackendConnection(): Observable<boolean> {
    console.log('🔄 DocumentService: testBackendConnection → Backend');
    return this.apiService.testBackendConnection();
  }

  // ===================================
  // CONFIGURATION METHODS (Local Helper)
  // ===================================

  /**
   * ✅ Standard-Analyse-Optionen
   * Lokale Konfiguration für Backend-Requests
   */
  private getDefaultOptions(): AnalysisOptions {
    return {
      generateSummary: true,
      extractKeywords: true,
      suggestComponents: true,
      performSentimentAnalysis: false,
      detectLanguage: true,
      calculateMetrics: true
    };
  }

  /**
   * ✅ Vollständige Analyse-Optionen
   * Aktiviert alle verfügbaren Backend-Features
   */
  getFullAnalysisOptions(): AnalysisOptions {
    return {
      generateSummary: true,
      extractKeywords: true,
      suggestComponents: true,
      performSentimentAnalysis: true,
      detectLanguage: true,
      calculateMetrics: true
    };
  }

  /**
   * ✅ Schnelle Analyse-Optionen
   * Minimale Optionen für Performance
   */
  getQuickAnalysisOptions(): AnalysisOptions {
    return {
      generateSummary: true,
      extractKeywords: true,
      suggestComponents: false,
      performSentimentAnalysis: false,
      detectLanguage: false,
      calculateMetrics: false
    };
  }

  // ===================================
  // UTILITY METHODS (Local Helper)
  // ===================================

  /**
   * ✅ Dateigröße formatieren (lokale Utility)
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * ✅ Analyse-Titel generieren (lokale Utility)
   */
  generateAnalysisTitle(filename?: string, content?: string): string {
    if (filename) {
      const name = filename.substring(0, filename.lastIndexOf('.')) || filename;
      return `Analysis: ${name}`;
    }
    
    if (content && content.length > 0) {
      const firstLine = content.split('\n')[0].substring(0, 50);
      return `Analysis: ${firstLine}...`;
    }
    
    return `Analysis: ${new Date().toLocaleDateString()}`;
  }

  /**
   * ✅ Unterstützte Dateiformate prüfen (lokale Utility)
   */
  isSupportedFileType(file: File): boolean {
    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json',
      'text/markdown'
    ];
    
    return supportedTypes.includes(file.type);
  }

  /**
   * ✅ Text-Länge validieren (lokale Utility)
   */
  validateTextLength(text: string, maxLength: number = 100000): { valid: boolean; message?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, message: 'Text darf nicht leer sein' };
    }
    
    if (text.length > maxLength) {
      return { 
        valid: false, 
        message: `Text zu lang (${text.length}/${maxLength} Zeichen)` 
      };
    }
    
    return { valid: true };
  }

  // ===================================
  // BACKWARD COMPATIBILITY (Deprecated aber behalten)
  // ===================================

  /**
   * @deprecated Verwende analyzeText() stattdessen
   * Backward compatibility für bestehenden Code
   */
  analyzeWithIndustryDetection(text: string): Observable<any> {
    console.warn('⚠️ analyzeWithIndustryDetection() ist deprecated - verwende analyzeText()');
    console.warn('🔄 Weiterleitung an analyzeText()');
    return this.analyzeText(text);
  }

  /**
   * @deprecated Backend macht Document-Speicherung automatisch
   * Diese Methode existiert nur für Kompatibilität
   */
  saveDocument(document: any): Observable<any> {
    console.warn('⚠️ saveDocument() ist deprecated - Backend speichert automatisch');
    console.warn('💡 Document wird automatisch bei analyzeText/analyzeDocument gespeichert');
    
    // Gib das Document direkt zurück (Backend hat es bereits gespeichert)
    return new Observable(observer => {
      observer.next(document);
      observer.complete();
    });
  }

  // ===================================
  // 🚨 ENTFERNTE METHODEN (Dokumentation)
  // ===================================

  /*
   * ❌ ENTFERNT: Alle lokalen Analyse-Methoden
   * 
   * Diese Methoden wurden entfernt und durch Backend-Delegation ersetzt:
   * 
   * - analyzeDocumentLocally() → analyzeDocument() via Backend
   * - extractKeywordsLocally() → Backend AI Service
   * - generateSummaryLocally() → Backend AI Service  
   * - suggestComponentsLocally() → Backend AI Service
   * - detectDocumentTypeLocally() → Backend Analysis
   * - calculateQualityScoreLocally() → Backend Metrics
   * - preprocessTextLocally() → Backend TextPreprocessingService
   * 
   * GRUND: Alle Business Logic gehört ins Backend für:
   * - Konsistenz zwischen verschiedenen Clients
   * - Zentrale Wartung und Updates
   * - Bessere Performance durch Backend-Caching
   * - Sicherheit (sensible Algorithmen nur im Backend)
   */
}