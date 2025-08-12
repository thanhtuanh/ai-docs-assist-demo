// src/app/document.service.ts
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private baseUrl = environment.apiUrl; // z.B. http://localhost:8080/api

  constructor(private http: HttpClient) {}

  createDocument(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/documents`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => (event.type === HttpEventType.Response ? event.body : null)),
      filter((response): response is any => response !== null),
      retry(2),
      catchError(this.handleError)
    );
  }

  // 🔧 Rückwärtskompatibel: akzeptiert string ODER Payload-Objekt
  analyzeText(input: string | { text: string; title?: string; options?: AnalyzeOptions; saveDocument?: boolean }): Observable<any> {
    const payload = typeof input === 'string' ? { text: input, saveDocument: true } : input;
    return this.http.post(`${this.baseUrl}/documents/analyze-text`, payload)
      .pipe(catchError(this.handleError));
  }

  analyzeDocument(file: File, options?: AnalyzeOptions): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) formData.append('analysisOptions', JSON.stringify(options));
    return this.createDocument(formData);
  }

  analyzeRealtime(text: string, language?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/documents/analyze-realtime`, { text, language })
      .pipe(catchError(this.handleError));
  }

  uploadBatch(files: File[], options?: AnalyzeOptions): Observable<any> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    if (options) form.append('analysisOptions', JSON.stringify(options));
    return this.http.post(`${this.baseUrl}/documents/batch`, form, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => (event.type === HttpEventType.Response ? event.body : null)),
      filter((response): response is any => response !== null),
      retry(2),
      catchError(this.handleError)
    );
  }

  getDocument(id: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/documents/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    let msg = 'Ein unbekannter Fehler ist aufgetreten';
    if (error?.error instanceof ErrorEvent) msg = `Client-Fehler: ${error.error.message}`;
    else if (typeof error?.status === 'number') {
      switch (error.status) {
        case 0: msg = 'Server nicht erreichbar. Läuft das Backend?'; break;
        case 400: msg = 'Ungültige Anfrage. Bitte Eingaben prüfen.'; break;
        case 404: msg = 'Endpoint nicht gefunden. Prüfe die URL im Service.'; break;
        case 413: msg = 'Datei zu groß.'; break;
        case 429: msg = 'Zu viele Anfragen. Später erneut versuchen.'; break;
        case 500: msg = 'Serverfehler. Bitte Support kontaktieren.'; break;
        default: msg = `Server-Fehler: ${error.status} - ${error.message || 'Unbekannt'}`;
      }
    }
    return throwError(() => new Error(msg));
  }
}
