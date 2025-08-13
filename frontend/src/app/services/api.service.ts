// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, map, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  analyzeText(text: string, industry?: string): Observable<any> {
    const payload: any = { text, saveDocument: true };
    if (industry && industry !== 'auto') payload.industry = industry;
    // WICHTIG: /documents/analyze-text (nicht /analyze/text)
    return this.http.post(`${this.base}/analyze-text`, payload).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  analyzeDocument(file: File, industry?: string): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    if (industry && industry !== 'auto') form.append('industry', industry);

    // WICHTIG: /documents (Multipart-Upload)
    return this.http.post(`${this.base}`, form, { observe: 'events', reportProgress: true }).pipe(
      map(evt => (evt.type === HttpEventType.Response ? evt.body : null)),
      filter((x): x is any => x !== null),
      retry(1),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    const s = error?.status;
    const msg =
      s === 404 ? 'Endpoint nicht gefunden. Backend-Routen prüfen.' :
      s === 0   ? 'Server nicht erreichbar.' :
      s === 400 ? 'Ungültige Anfrage.' :
      s === 500 ? 'Serverfehler.' :
      `Fehler ${s ?? 'Unbekannt'}`;
    return throwError(() => new Error(msg));
  }
}
