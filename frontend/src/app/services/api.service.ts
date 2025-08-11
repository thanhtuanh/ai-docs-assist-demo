import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    // Prüfe ob wir im Container laufen
    this.apiUrl = this.getApiUrl();
    console.log('Using API URL:', this.apiUrl);
  }

  private getApiUrl(): string {
    // In Production mit Nginx Proxy
    if (environment.production) {
      return '/api';
    }
    
    // Lokale Entwicklung
    return environment.apiUrl;
  }

  analyzeText(text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/documents/analyze-text`, { text })
      .pipe(
        timeout(30000), // 30 Sekunden Timeout
        retry(2),
        catchError(this.handleError)
      );
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`)
      .pipe(
        timeout(5000),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten';
    
    console.error('API Error Details:', error);
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Netzwerkfehler: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Backend-Server nicht erreichbar. Prüfen Sie, ob der Server läuft.';
          break;
        case 404:
          errorMessage = 'API-Endpunkt nicht gefunden. Prüfen Sie die URL.';
          break;
        case 500:
          errorMessage = 'Interner Serverfehler. Prüfen Sie die Server-Logs.';
          break;
        case 503:
          errorMessage = 'Service temporär nicht verfügbar.';
          break;
        default:
          errorMessage = `HTTP ${error.status}: ${error.statusText}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}