// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, map, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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
}

export interface AnalysisResponse {
  document: any;
  message: string;
  metadata: { [key: string]: any };
  processingTimeMs?: number;
  timestamp?: string;
}

export interface BatchAnalysisResponse {
  documents: any[];
  message: string;
  successCount: number;
  totalCount: number;
  errors?: string[];
  statistics?: { [key: string]: any };
}

export interface DocumentWithHistory {
  document: any;
  feedbackHistory: any[];
  averageRating: number;
  feedbackCount: number;
  trends?: { [key: string]: any };
}

export interface IndustryAnalysisResult {
  primaryIndustry: string;
  confidence: number;
  topIndustries: Array<{
    industry: string;
    confidence: number;
    keywordScore: number;
    aiScore: number;
  }>;
  detectionMethod: string;
  demoMode: boolean;
  openAiConfigured: boolean;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = `${environment.apiUrl}/documents`;
  private readonly aiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  // =============================================
  // DOCUMENT ANALYSIS ENDPOINTS
  // =============================================

  /**
   * Analyze text directly without file upload
   * POST /api/documents/analyze-text
   */
  analyzeText(request: TextAnalysisRequest): Observable<AnalysisResponse> {
    console.log('🔍 Calling POST /api/documents/analyze-text');
    return this.http.post<AnalysisResponse>(`${this.baseUrl}/analyze-text`, request).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Upload and analyze document
   * POST /api/documents
   */
  analyzeDocument(file: File, options?: AnalysisOptions): Observable<AnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('analysisOptions', JSON.stringify(options));
    }

    console.log('📄 Calling POST /api/documents (file upload)');
    return this.http.post(`${this.baseUrl}`, formData, {
      observe: 'events',
      reportProgress: true
    }).pipe(
      map(event => (event.type === HttpEventType.Response ? event.body : null)),
      filter((response): response is AnalysisResponse => response !== null),
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Batch document processing
   * POST /api/documents/batch
   */
  processBatch(files: File[], options?: AnalysisOptions): Observable<BatchAnalysisResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (options) {
      formData.append('analysisOptions', JSON.stringify(options));
    }

    console.log('📦 Calling POST /api/documents/batch');
    return this.http.post<BatchAnalysisResponse>(`${this.baseUrl}/batch`, formData).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Real-time analysis for typing
   * POST /api/documents/analyze-realtime
   */
  analyzeRealtime(text: string, language?: string): Observable<any> {
    console.log('⚡ Calling POST /api/documents/analyze-realtime');
    return this.http.post(`${this.baseUrl}/analyze-realtime`, { text, language }).pipe(
      catchError(this.handleError)
    );
  }

  // =============================================
  // DOCUMENT MANAGEMENT ENDPOINTS
  // =============================================

  /**
   * Get document with history
   * GET /api/documents/{id}
   */
  getDocument(id: string | number): Observable<DocumentWithHistory> {
    console.log('📖 Calling GET /api/documents/' + id);
    return this.http.get<DocumentWithHistory>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Re-analyze existing document
   * POST /api/documents/{id}/reanalyze
   */
  reanalyzeDocument(id: string | number, options?: AnalysisOptions): Observable<AnalysisResponse> {
    const params = new HttpParams().set('options', JSON.stringify(options || {}));
    console.log('🔄 Calling POST /api/documents/' + id + '/reanalyze');
    return this.http.post<AnalysisResponse>(`${this.baseUrl}/${id}/reanalyze`, null, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Compare two documents
   * GET /api/documents/compare
   */
  compareDocuments(id1: string | number, id2: string | number): Observable<any> {
    const params = new HttpParams().set('id1', id1.toString()).set('id2', id2.toString());
    console.log('🔍 Calling GET /api/documents/compare');
    return this.http.get(`${this.baseUrl}/compare`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // =============================================
  // AI-SPECIFIC ENDPOINTS
  // =============================================

  /**
   * Industry detection
   * POST /api/ai/detect-industry
   */
  detectIndustry(text: string): Observable<IndustryAnalysisResult> {
    console.log('🏭 Calling POST /api/ai/detect-industry');
    return this.http.post<IndustryAnalysisResult>(`${this.aiUrl}/detect-industry`, { text }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Comprehensive AI analysis (industry + text analysis)
   * POST /api/ai/analyze
   */
  comprehensiveAnalysis(text: string): Observable<any> {
    console.log('🤖 Calling POST /api/ai/analyze');
    return this.http.post(`${this.aiUrl}/analyze`, { text }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * AI service health check
   * GET /api/ai/health
   */
  checkAiHealth(): Observable<any> {
    return this.http.get(`${this.aiUrl}/health`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get AI service info
   * GET /api/ai/info
   */
  getAiInfo(): Observable<any> {
    return this.http.get(`${this.aiUrl}/info`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get supported industries
   * GET /api/ai/industries
   */
  getSupportedIndustries(): Observable<any> {
    return this.http.get(`${this.aiUrl}/industries`).pipe(
      catchError(this.handleError)
    );
  }

  // =============================================
  // HEALTH & TEST ENDPOINTS
  // =============================================

  /**
   * Health check
   * GET /api/documents/health (if exists)
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Test endpoints (for development)
   * GET /api/test/health
   */
  testHealth(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/test/health`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Test industry detection
   * POST /api/test/industry
   */
  testIndustryDetection(text: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/test/industry`, { text }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Batch test
   * POST /api/test/batch
   */
  testBatch(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/test/batch`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // =============================================
  // LEGACY SUPPORT (if enabled)
  // =============================================

  /**
   * Legacy text analysis (if backend has legacy endpoints)
   * POST /api/analyze/text
   */
  legacyAnalyzeText(text: string): Observable<any> {
    console.log('🔄 Using legacy endpoint /api/analyze/text');
    return this.http.post(`${environment.apiUrl}/analyze/text`, { text }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Legacy document analysis
   * POST /api/analyze/document
   */
  legacyAnalyzeDocument(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('🔄 Using legacy endpoint /api/analyze/document');
    return this.http.post(`${environment.apiUrl}/analyze/document`, formData).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  // =============================================
  // ERROR HANDLING
  // =============================================

  private handleError = (error: any) => {
    console.error('🔴 API Error:', {
      status: error.status,
      url: error.url,
      message: error.message,
      timestamp: new Date().toISOString()
    });

    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten';

    if (error?.error instanceof ErrorEvent) {
      errorMessage = `Client-Fehler: ${error.error.message}`;
    } else if (typeof error?.status === 'number') {
      switch (error.status) {
        case 0:
          errorMessage = '🔌 Server nicht erreichbar. Backend läuft auf Port 8080?';
          break;
        case 400:
          errorMessage = '⚠️ Ungültige Anfrage. Überprüfen Sie die Eingabedaten.';
          break;
        case 404:
          errorMessage = '🔍 Endpoint nicht gefunden. Backend-Controller überprüfen.';
          break;
        case 405:
          errorMessage = '🚫 HTTP-Methode nicht erlaubt. Request-Mapping überprüfen.';
          break;
        case 413:
          errorMessage = '📦 Datei zu groß für Spring Boot Upload-Limit.';
          break;
        case 415:
          errorMessage = '📄 Content-Type nicht unterstützt vom Backend.';
          break;
        case 429:
          errorMessage = '⏰ Rate Limit erreicht. Zu viele Anfragen.';
          break;
        case 500:
          errorMessage = '⚡ Server-Fehler. Backend-Logs überprüfen.';
          break;
        case 502:
          errorMessage = '🌐 Bad Gateway. Proxy-Problem zu Spring Boot.';
          break;
        case 503:
          errorMessage = '🔧 Service nicht verfügbar. Health Check fehlgeschlagen.';
          break;
        default:
          errorMessage = `🔴 HTTP ${error.status}: ${error.message || 'Unbekannter Fehler'}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  };
}