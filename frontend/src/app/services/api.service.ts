// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, map, retry, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ===================================
// BACKEND-KOMPATIBLE INTERFACES
// ===================================

export interface AnalysisOptions {
  generateSummary?: boolean;
  extractKeywords?: boolean;
  suggestComponents?: boolean;
  performSentimentAnalysis?: boolean;
  detectLanguage?: boolean;
  calculateMetrics?: boolean;
}

export interface TextAnalysisRequest {
  text: string;
  title?: string;
  options?: AnalysisOptions;
  saveDocument?: boolean;
  selectedIndustry?: string; // ✅ NEU: Backend unterstützt industry selection
}

// ✅ KORRIGIERT: Backend Response Structure (exakt wie DocumentController.java)
export interface AnalysisResponse {
  document: DocumentResponse;
  message: string;
  metadata: { [key: string]: any };
  processingTimeMs?: number;
  timestamp?: string;
}

export interface DocumentResponse {
  id: number;
  title: string;
  content: string;
  summary: string;
  keywords: string;
  suggestedComponents: string;
  recommendations?: string; // ✅ HINZUGEFÜGT: Fehlende Property
  documentType: string;
  qualityScore: number;
  sentiment: string;
  processingNotes: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ KORRIGIERT: Backend Industry Response (exakt wie AiController.java)
export interface IndustryDetectionResponse {
  primaryIndustry: string;
  confidence: number;
  topIndustries: Array<{
    industry: string;
    confidence: number;
    keywordScore: number;
    aiScore: number;
  }>;
  detectionMethod: string;
  enhancedAnalysis: boolean;
  openAiConfigured: boolean;
  timestamp: number;
}

export interface BatchAnalysisResponse {
  documents: DocumentResponse[];
  message: string;
  successCount: number;
  totalCount: number;
  errors?: string[];
  statistics?: { [key: string]: any };
}

export interface DocumentWithHistory {
  document: DocumentResponse;
  feedbackHistory: any[];
  averageRating: number;
  feedbackCount: number;
  trends?: { [key: string]: any };
}

/**
 * ✅ KORRIGIERTER ApiService - Vollständig Backend-synchronisiert
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = `${environment.apiUrl}/documents`;
  private readonly aiUrl = `${environment.apiUrl}/ai`;
  private readonly feedbackUrl = `${environment.apiUrl}/feedback`;

  constructor(private http: HttpClient) {
    console.log('🚀 ApiService initialized - Backend-Synchronized Mode');
    console.log('📡 Documents API:', this.baseUrl);
    console.log('🤖 AI API:', this.aiUrl);
    this.validateEnvironment();
  }

  // ===================================
  // DOCUMENT ANALYSIS ENDPOINTS (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Text analysieren - Backend-kompatibles Request Format
   * POST /api/documents/analyze-text
   */
  analyzeText(request: TextAnalysisRequest): Observable<AnalysisResponse> {
    console.log('📤 POST /api/documents/analyze-text');
    console.log('📝 Text length:', request.text?.length || 0);
    console.log('⚙️ Options:', request.options);
    console.log('🏭 Selected Industry:', request.selectedIndustry);
    
    // ✅ KORRIGIERT: Backend-kompatibles Request Format
    const backendRequest = {
      text: request.text,
      title: request.title || 'Text Analysis',
      saveDocument: request.saveDocument !== false, // Default true
      selectedIndustry: request.selectedIndustry || 'auto',
      options: {
        generateSummary: request.options?.generateSummary !== false,
        extractKeywords: request.options?.extractKeywords !== false,
        suggestComponents: request.options?.suggestComponents !== false,
        performSentimentAnalysis: request.options?.performSentimentAnalysis || false,
        detectLanguage: request.options?.detectLanguage !== false,
        calculateMetrics: request.options?.calculateMetrics !== false
      }
    };
    
    console.log('📦 Backend Request:', backendRequest);
    
    return this.http.post<AnalysisResponse>(`${this.baseUrl}/analyze-text`, backendRequest).pipe(
      tap(response => {
        console.log('✅ Backend text analysis successful');
        console.log('⏱️ Processing time:', response.processingTimeMs + 'ms');
        console.log('📄 Document ID:', response.document?.id);
        console.log('🏷️ Document Type:', response.document?.documentType);
        console.log('📊 Quality Score:', response.document?.qualityScore);
        
        // ✅ Debug Industry Detection
        if (response.metadata?.['industryAnalysis']) {
          console.log('🏭 Industry Analysis:', response.metadata['industryAnalysis']);
        }
      }),
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ KORRIGIERT: Dokument analysieren - Backend-kompatibles FormData Format
   * POST /api/documents
   */
  analyzeDocument(file: File, options?: AnalysisOptions): Observable<AnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    // ✅ KORRIGIERT: selectedIndustry als separates Feld
    formData.append('selectedIndustry', 'auto');
    
    // ✅ KORRIGIERT: Options als JSON String (Backend erwartet @RequestParam)
    if (options) {
      const optionsJson = {
        generateSummary: options.generateSummary !== false,
        extractKeywords: options.extractKeywords !== false,
        suggestComponents: options.suggestComponents !== false,
        performSentimentAnalysis: options.performSentimentAnalysis || false,
        detectLanguage: options.detectLanguage !== false,
        calculateMetrics: options.calculateMetrics !== false
      };
      formData.append('analysisOptions', JSON.stringify(optionsJson));
    }

    console.log('📤 POST /api/documents (file upload)');
    console.log('📄 File:', file.name, '(' + this.formatFileSize(file.size) + ')');
    console.log('📋 Form Data has files:', formData.has('file'));
    
    return this.http.post(`${this.baseUrl}`, formData, {
      observe: 'events',
      reportProgress: true
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          console.log('📊 Upload progress:', progress + '%');
        }
        return event.type === HttpEventType.Response ? event.body : null;
      }),
      filter((response): response is AnalysisResponse => response !== null),
      tap(response => {
        console.log('✅ Document analysis completed');
        console.log('📄 Document ID:', response.document?.id);
      }),
      retry(1),
      catchError(this.handleError)
    );
  }

  // ===================================
  // AI-SPECIFIC ENDPOINTS (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Branchenerkennung - Backend-kompatibles Request Format
   * POST /api/ai/detect-industry
   */
  detectIndustry(text: string): Observable<IndustryDetectionResponse> {
    console.log('🏭 POST /api/ai/detect-industry');
    console.log('📝 Text length:', text.length);
    console.log('📝 Text preview:', text.substring(0, 100) + '...');
    
    // ✅ KORRIGIERT: Backend erwartet Map<String, String> request
    const requestBody = { 
      text: text 
    };
    
    console.log('📦 Industry Detection Request:', requestBody);
    
    return this.http.post<IndustryDetectionResponse>(`${this.aiUrl}/detect-industry`, requestBody).pipe(
      tap(result => {
        console.log('✅ Industry detected:', result.primaryIndustry, '(' + result.confidence + '% confidence)');
        console.log('🔍 Detection method:', result.detectionMethod);
        console.log('🤖 Enhanced analysis:', result.enhancedAnalysis);
        console.log('🌐 OpenAI configured:', result.openAiConfigured);
        console.log('🎯 Top industries:', result.topIndustries);
      }),
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ KORRIGIERT: Umfassende AI-Analyse - Backend-kompatibles Request Format
   * POST /api/ai/analyze
   */
  comprehensiveAnalysis(text: string): Observable<any> {
    console.log('🤖 POST /api/ai/analyze');
    console.log('📝 Text length:', text.length);
    
    // ✅ KORRIGIERT: Backend erwartet Map<String, String> request
    const requestBody = { 
      text: text 
    };
    
    return this.http.post(`${this.aiUrl}/analyze`, requestBody).pipe(
      tap(result => {
        console.log('✅ Comprehensive analysis completed');
        console.log('📊 Analysis result keys:', Object.keys(result));
      }),
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ AI Service Health Check
   * GET /api/ai/health
   */
  checkAiHealth(): Observable<any> {
    return this.http.get(`${this.aiUrl}/health`).pipe(
      tap(health => {
        console.log('💚 AI Service Status:', health);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ AI Service Info
   * GET /api/ai/info
   */
  getAiInfo(): Observable<any> {
    return this.http.get(`${this.aiUrl}/info`).pipe(
      tap(info => {
        console.log('ℹ️ AI Service Info:', info);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Unterstützte Branchen abrufen
   * GET /api/ai/industries
   */
  getSupportedIndustries(): Observable<any> {
    return this.http.get(`${this.aiUrl}/industries`).pipe(
      tap(industries => {
        console.log('🏭 Supported Industries:', industries);
      }),
      catchError(this.handleError)
    );
  }

  // ===================================
  // DOCUMENT MANAGEMENT ENDPOINTS (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Dokument abrufen
   * GET /api/documents/{id}
   */
  getDocument(id: string | number): Observable<DocumentWithHistory> {
    console.log('📖 GET /api/documents/' + id);
    return this.http.get<DocumentWithHistory>(`${this.baseUrl}/${id}`).pipe(
      tap(response => {
        console.log('✅ Document loaded:', response.document?.title);
        console.log('📊 Feedback count:', response.feedbackCount);
        console.log('⭐ Average rating:', response.averageRating);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ KORRIGIERT: Dokument neu analysieren
   * POST /api/documents/{id}/reanalyze
   */
  reanalyzeDocument(id: string | number, options?: AnalysisOptions): Observable<AnalysisResponse> {
    console.log('🔄 POST /api/documents/' + id + '/reanalyze');
    
    // ✅ KORRIGIERT: Backend erwartet JSON Body mit options
    const requestBody = {
      options: {
        generateSummary: options?.generateSummary !== false,
        extractKeywords: options?.extractKeywords !== false,
        suggestComponents: options?.suggestComponents !== false,
        performSentimentAnalysis: options?.performSentimentAnalysis || false,
        detectLanguage: options?.detectLanguage !== false,
        calculateMetrics: options?.calculateMetrics !== false
      }
    };
    
    return this.http.post<AnalysisResponse>(`${this.baseUrl}/${id}/reanalyze`, requestBody).pipe(
      tap(response => {
        console.log('✅ Reanalysis completed');
        console.log('📄 Updated document ID:', response.document?.id);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ KORRIGIERT: Dokumente vergleichen
   * GET /api/documents/compare?id1={id1}&id2={id2}
   */
  compareDocuments(id1: string | number, id2: string | number): Observable<any> {
    const params = new HttpParams()
      .set('id1', id1.toString())
      .set('id2', id2.toString());
    
    console.log('🔍 GET /api/documents/compare');
    console.log('📄 Comparing documents:', id1, 'vs', id2);
    
    return this.http.get(`${this.baseUrl}/compare`, { params }).pipe(
      tap(comparison => {
        console.log('✅ Document comparison completed');
      }),
      catchError(this.handleError)
    );
  }

  // ===================================
  // BATCH PROCESSING (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Batch-Verarbeitung
   * POST /api/documents/batch
   */
  processBatch(files: File[], options?: AnalysisOptions): Observable<BatchAnalysisResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    // ✅ KORRIGIERT: Options als JSON String
    if (options) {
      formData.append('analysisOptions', JSON.stringify(options));
    }

    console.log('📦 POST /api/documents/batch');
    console.log('📄 Files count:', files.length);
    
    return this.http.post<BatchAnalysisResponse>(`${this.baseUrl}/batch`, formData).pipe(
      tap(response => {
        console.log('✅ Batch processing completed:', response.successCount + '/' + response.totalCount);
      }),
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ KORRIGIERT: Echtzeit-Analyse
   * POST /api/documents/analyze-realtime
   */
  analyzeRealtime(text: string, language?: string): Observable<any> {
    console.log('⚡ POST /api/documents/analyze-realtime');
    
    // ✅ KORRIGIERT: Backend-kompatibles Request Format
    const requestBody = { 
      text: text,
      language: language || 'auto'
    };
    
    return this.http.post(`${this.baseUrl}/analyze-realtime`, requestBody).pipe(
      catchError(this.handleError)
    );
  }

  // ===================================
  // FEEDBACK ENDPOINTS (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Feedback senden
   * POST /api/feedback
   */
  submitFeedback(feedback: any): Observable<any> {
    console.log('📝 POST /api/feedback');
    console.log('📊 Feedback data:', feedback);
    
    return this.http.post(`${this.feedbackUrl}`, feedback).pipe(
      tap(response => {
        console.log('✅ Feedback submitted successfully');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Feedback für Dokument abrufen
   * GET /api/feedback/document/{id}
   */
  getFeedbackForDocument(documentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.feedbackUrl}/document/${documentId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===================================
  // HEALTH & TEST ENDPOINTS (KORRIGIERT)
  // ===================================

  /**
   * ✅ Backend Health Check
   * GET /api/documents/health
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`).pipe(
      tap(health => {
        console.log('💚 Documents Service Health:', health);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Test Industry Detection
   * POST /api/test/industry
   */
  testIndustryDetection(text: string): Observable<any> {
    const requestBody = { text: text };
    
    return this.http.post(`${environment.apiUrl}/test/industry`, requestBody).pipe(
      tap(result => {
        console.log('🧪 Test Industry Detection Result:', result);
      }),
      catchError(this.handleError)
    );
  }

  // ===================================
  // ENHANCED ERROR HANDLING (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Umfassende Backend-Fehlerbehandlung mit Debug-Informationen
   */
  private handleError = (error: any) => {
    const errorInfo = {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error,
      timestamp: new Date().toISOString()
    };
    
    console.group('🔴 Backend API Error Details');
    console.error('📊 Error Info:', errorInfo);
    console.error('📝 Error Body:', error.error);
    console.error('🌐 Request URL:', error.url);
    console.error('📋 Full Error Object:', error);
    console.groupEnd();

    const errorMessage = this.categorizeBackendError(error);
    
    // 🚨 Keine lokalen Fallbacks - nur Backend-Fehler melden
    console.error('❌ Kein lokaler Fallback - Backend muss funktionieren!');
    
    return throwError(() => new Error(errorMessage));
  };

  /**
   * ✅ ERWEITERT: Detaillierte Backend-Fehler-Kategorisierung mit Debug-Hints
   */
  private categorizeBackendError(error: any): string {
    // Client-side Fehler
    if (error?.error instanceof ErrorEvent) {
      return `Client-Fehler: ${error.error.message}`;
    }

    // Backend HTTP Fehler mit Debug-Informationen
    switch (error.status) {
      case 0:
        return '🔌 Backend nicht erreichbar. Prüfungen:\n' +
               '• Läuft Spring Boot Server auf Port 8080?\n' +
               '• Ist das proxy.conf.json korrekt konfiguriert?\n' +
               '• Blockiert eine Firewall die Verbindung?';
      
      case 400:
        const validationErrors = error.error?.validationErrors || [];
        return '⚠️ Ungültige Anfrage. Details:\n' +
               `• Error: ${error.error?.message || 'Validation failed'}\n` +
               `• Validation: ${validationErrors.join(', ') || 'Check request format'}\n` +
               '• Überprüfen Sie Request Body Format und Parameter';
      
      case 401:
        return '🔐 Nicht autorisiert. Prüfungen:\n' +
               '• Authentication Header korrekt?\n' +
               '• JWT Token gültig?\n' +
               '• Backend Security Config korrekt?';
      
      case 403:
        return '🚫 Zugriff verweigert. Prüfungen:\n' +
               '• Benutzer hat ausreichende Berechtigung?\n' +
               '• CORS-Konfiguration korrekt?\n' +
               '• Authorization Logic im Backend überprüfen';
      
      case 404:
        return '🔍 Backend-Endpoint nicht gefunden. Prüfungen:\n' +
               `• URL: ${error.url}\n` +
               '• @RequestMapping im Controller korrekt?\n' +
               '• Context Path (/api) konfiguriert?\n' +
               '• Controller ist @RestController annotiert?';
      
      case 405:
        return '🚫 HTTP-Methode nicht erlaubt. Prüfungen:\n' +
               `• Method: ${error.status} auf ${error.url}\n` +
               '• @PostMapping vs @GetMapping korrekt?\n' +
               '• CORS preflight OPTIONS request erlaubt?';
      
      case 408:
        return '⏰ Request Timeout. Prüfungen:\n' +
               '• Backend-Performance analysieren\n' +
               '• Database-Queries optimieren\n' +
               '• Timeout-Konfiguration erhöhen';
      
      case 413:
        return '📦 Datei zu groß. Backend-Konfiguration:\n' +
               '• spring.servlet.multipart.max-file-size erhöhen\n' +
               '• spring.servlet.multipart.max-request-size anpassen\n' +
               '• Reverse Proxy File Size Limits prüfen';
      
      case 415:
        return '📄 Content-Type nicht unterstützt. Prüfungen:\n' +
               `• Sent: ${error.headers?.get('content-type')}\n` +
               '• Backend @RequestMapping consumes korrekt?\n' +
               '• Frontend Content-Type Header setzen';
      
      case 422:
        return '🔍 Validation-Fehler. Backend-Response:\n' +
               `• Message: ${error.error?.message}\n` +
               `• Errors: ${JSON.stringify(error.error?.errors || {})}\n` +
               '• @Valid Annotations im Backend überprüfen';
      
      case 429:
        return '⏳ Rate Limit erreicht. Prüfungen:\n' +
               '• Zu viele parallele Requests?\n' +
               '• Backend Rate Limiting konfiguriert?\n' +
               '• Request-Debouncing im Frontend implementieren';
      
      case 500:
        return '⚡ Backend-Server-Fehler. Debug-Schritte:\n' +
               `• Error: ${error.error?.message || 'Internal Server Error'}\n` +
               '• Spring Boot Application Logs überprüfen\n' +
               '• Database-Verbindung prüfen\n' +
               '• Stack Trace im Backend analysieren';
      
      case 502:
        return '🌐 Bad Gateway. Infrastruktur-Prüfungen:\n' +
               '• Reverse Proxy (Nginx) läuft?\n' +
               '• Spring Boot Server erreichbar?\n' +
               '• Load Balancer Konfiguration korrekt?';
      
      case 503:
        return '🔧 Backend nicht verfügbar. Prüfungen:\n' +
               '• Health Check Endpoint /actuator/health\n' +
               '• Database-Verbindung verfügbar?\n' +
               '• Memory/CPU Resources ausreichend?';
      
      case 504:
        return '⏰ Gateway Timeout. Performance-Analyse:\n' +
               '• Backend-Response zu langsam (>30s)?\n' +
               '• Database-Queries optimieren\n' +
               '• Asynchrone Verarbeitung implementieren';
      
      default:
        return `🔴 HTTP ${error.status}: ${error.statusText}\n` +
               `• Message: ${error.error?.message || error.message}\n` +
               `• URL: ${error.url}\n` +
               '• Siehe Browser Network Tab für Details';
    }
  }

  // ===================================
  // UTILITY METHODS (ERWEITERT)
  // ===================================

  /**
   * ✅ Dateigröße formatieren
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * ✅ Environment-Validierung mit Debug-Output
   */
  private validateEnvironment(): void {
    console.group('🌍 Environment Validation');
    console.log('🔧 Production:', environment.production);
    console.log('🌐 API URL:', environment.apiUrl);
    console.log('🎚️ Features:', environment.features);
    
    if (!environment.apiUrl) {
      console.error('❌ API URL nicht konfiguriert in environment!');
    }
    
    // ✅ Test Backend-Erreichbarkeit beim Service-Start
    this.checkHealth().subscribe({
      next: (health) => {
        console.log('✅ Backend Health Check erfolgrereich:', health);
      },
      error: (error) => {
        console.warn('⚠️ Backend Health Check fehlgeschlagen:', error.message);
        console.log('💡 Backend möglicherweise noch nicht gestartet');
      }
    });
    
    console.groupEnd();
  }

  /**
   * ✅ Backend-Verbindung testen (erweitert)
   */
  testBackendConnection(): Observable<boolean> {
    console.log('🔍 Testing backend connection...');
    
    return this.checkAiHealth().pipe(
      map((health) => {
        console.log('✅ Backend connection test successful:', health);
        return true;
      }),
      catchError((error) => {
        console.error('❌ Backend connection test failed:', error.message);
        console.log('💡 Mögliche Ursachen:');
        console.log('  • Spring Boot Server nicht gestartet');
        console.log('  • Port 8080 nicht erreichbar');
        console.log('  • CORS-Konfiguration fehlerhaft');
        console.log('  • Proxy-Konfiguration inkorrekt');
        
        return throwError(() => new Error('Backend nicht erreichbar - siehe Console für Details'));
      })
    );
  }

  /**
   * ✅ NEU: Request Debug Helper
   */
  debugRequest(endpoint: string, method: string, data?: any): void {
    console.group(`🔍 API Request Debug: ${method} ${endpoint}`);
    console.log('🌐 Full URL:', `${environment.apiUrl}${endpoint}`);
    console.log('📦 Request Data:', data);
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.groupEnd();
  }

  /**
   * ✅ NEU: Response Debug Helper  
   */
  debugResponse(endpoint: string, response: any, processingTime?: number): void {
    console.group(`✅ API Response Debug: ${endpoint}`);
    console.log('📨 Response Data:', response);
    console.log('⏱️ Processing Time:', processingTime ? `${processingTime}ms` : 'Unknown');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
}