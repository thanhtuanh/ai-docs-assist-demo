// src/app/document.service.ts - Spring Boot Backend compatible
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, filter } from 'rxjs/operators';
import { environment } from '../environments/environment';

type AnalyzeOptions = {
  generateSummary?: boolean;
  extractKeywords?: boolean;
  suggestComponents?: boolean;
  performSentimentAnalysis?: boolean;
  detectLanguage?: boolean;
  calculateMetrics?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private baseUrl = environment.apiUrl + '/documents'; // http://localhost:8080/api

  constructor(private http: HttpClient) {}

  // 🔧 SPRING BOOT: Text Analysis - matches your backend logs
  analyzeText(input: string | { text: string; title?: string; options?: AnalyzeOptions; saveDocument?: boolean }): Observable<any> {
    const payload = typeof input === 'string' ? { text: input, saveDocument: true } : input;
    
    return this.http.post(`${this.baseUrl}/analyze/text`, payload)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  // 🔧 SPRING BOOT: Document Analysis - matches your backend
  analyzeDocument(file: File, options?: AnalyzeOptions): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('analysisOptions', JSON.stringify(options));
    }
    
    return this.http.post(`${this.baseUrl}/analyze/document`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => (event.type === HttpEventType.Response ? event.body : null)),
      filter((response): response is any => response !== null),
      retry(1),
      catchError(this.handleError)
    );
  }

  // 🆕 SIMPLIFIED: Direct methods matching Spring Boot capabilities
  analyzeTextSimple(text: string, industry?: string): Observable<any> {
    const payload = { 
      text,
      industry: industry !== 'auto' ? industry : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log('🚀 Calling Spring Boot:', `${this.baseUrl}/analyze/text`);
    console.log('📦 Payload:', { textLength: text.length, industry });
    
    return this.http.post(`${this.baseUrl}/analyze/text`, payload)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  analyzeDocumentSimple(file: File, industry?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (industry && industry !== 'auto') {
      formData.append('industry', industry);
    }
    
    console.log('🚀 Calling Spring Boot:', `${this.baseUrl}/analyze/document`);
    console.log('📦 File:', { name: file.name, size: file.size, type: file.type });
    
    return this.http.post(`${this.baseUrl}/analyze/document`, formData)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  // 🔧 SPRING BOOT: Real-time Analysis (if implemented)
  analyzeRealtime(text: string, language?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/analyze/realtime`, { text, language })
      .pipe(catchError(this.handleError));
  }

  // 🔧 SPRING BOOT: Batch Processing (if implemented)
  uploadBatch(files: File[], options?: AnalyzeOptions): Observable<any> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (options) formData.append('analysisOptions', JSON.stringify(options));
    
    return this.http.post(`${this.baseUrl}/analyze/batch`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => (event.type === HttpEventType.Response ? event.body : null)),
      filter((response): response is any => response !== null),
      retry(2),
      catchError(this.handleError)
    );
  }

  // 🔧 SPRING BOOT: Document Retrieval (if you have database storage)
  getDocument(id: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/documents/${id}`)
      .pipe(catchError(this.handleError));
  }

  // 🔧 SPRING BOOT: Re-analysis (if implemented)
  reanalyzeDocument(id: number | string, options?: AnalyzeOptions): Observable<any> {
    const httpOptions = options 
      ? { params: new HttpParams().set('options', JSON.stringify(options)) }
      : {};
    
    return this.http.post(`${this.baseUrl}/documents/${id}/reanalyze`, null, httpOptions)
      .pipe(catchError(this.handleError));
  }

  // 🔧 SPRING BOOT: Document Comparison (if implemented)
  compareDocuments(id1: number | string, id2: number | string): Observable<any> {
    const params = new HttpParams()
      .set('id1', id1.toString())
      .set('id2', id2.toString());
    return this.http.get(`${this.baseUrl}/documents/compare`, { params })
      .pipe(catchError(this.handleError));
  }

  // 🆕 SPRING BOOT: Health Check
  checkHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`)
      .pipe(catchError(this.handleError));
  }

  // 🔧 IMPROVED: Spring Boot specific error handling  
  private handleError(error: any) {
    console.error('🔴 Spring Boot API Error:', {
      status: error.status,
      url: error.url,
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    let msg = 'Ein unbekannter Fehler ist aufgetreten';
    
    if (error?.error instanceof ErrorEvent) {
      msg = `Client-Fehler: ${error.error.message}`;
    } else if (typeof error?.status === 'number') {
      switch (error.status) {
        case 0: 
          msg = '🔌 Spring Boot Server nicht erreichbar. Läuft das Backend auf Port 8080?'; 
          break;
        case 400: 
          msg = '❌ Ungültige Anfrage. Spring Boot Validation-Fehler.'; 
          break;
        case 404: 
          msg = '🔍 Spring Boot Endpoint nicht gefunden. Controller-Mapping prüfen.'; 
          break;
        case 405:
          msg = '🚫 HTTP-Methode nicht erlaubt. Spring Boot @RequestMapping prüfen.';
          break;
        case 413: 
          msg = '📦 Datei zu groß für Spring Boot Upload-Limit.'; 
          break;
        case 415:
          msg = '📄 Content-Type nicht unterstützt von Spring Boot.';
          break;
        case 429: 
          msg = '⏰ Rate Limit erreicht. Spring Boot Throttling aktiv.'; 
          break;
        case 500: 
          msg = '⚡ Spring Boot Server-Fehler. Application.log prüfen.'; 
          break;
        case 502:
          msg = '🌐 Bad Gateway. Nginx/Proxy-Problem zu Spring Boot.';
          break;
        case 503:
          msg = '🔧 Spring Boot Service nicht verfügbar. Health Check fehlgeschlagen.';
          break;
        default: 
          msg = `🔴 Spring Boot Error: ${error.status} - ${error.message || 'Unbekannt'}`;
      }
    }
    
    return throwError(() => new Error(msg));
  }
}