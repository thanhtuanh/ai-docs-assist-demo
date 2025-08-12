// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { EnhancedAnalysisResult } from '../models/industry.interfaces';

export interface ApiFeedbackData {
  rating: number;
  comment: string;
  analysisId: string;
  timestamp: Date;
  industryId?: string;
  textLength?: number;
  analysisType?: 'document' | 'text';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8080/api';
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // Document Analysis
  analyzeDocument(file: File, industry?: string): Observable<EnhancedAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (industry && industry !== 'auto') {
      formData.append('industry', industry);
    }
    
    return this.http.post<EnhancedAnalysisResult>(`${this.baseUrl}/analyze/document`, formData)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  // Text Analysis
  analyzeText(text: string, industry?: string): Observable<EnhancedAnalysisResult> {
    const payload = { 
      text, 
      industry: industry !== 'auto' ? industry : undefined,
      timestamp: new Date().toISOString()
    };
    
    return this.http.post<EnhancedAnalysisResult>(`${this.baseUrl}/analyze/text`, payload, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  // Feedback Submission
  submitFeedback(feedbackData: ApiFeedbackData): Observable<any> {
    return this.http.post(`${this.baseUrl}/feedback`, feedbackData, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  // Export Analysis Results
  exportAnalysis(analysisId: string, format: 'pdf' | 'excel' | 'json'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/${analysisId}/${format}`, {
      responseType: 'blob'
    }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.';
          break;
        case 401:
          errorMessage = 'Nicht autorisiert. Bitte melden Sie sich an.';
          break;
        case 403:
          errorMessage = 'Zugriff verweigert.';
          break;
        case 404:
          errorMessage = 'Service nicht gefunden.';
          break;
        case 429:
          errorMessage = 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
          break;
        case 500:
          errorMessage = 'Server-Fehler. Bitte versuchen Sie es später erneut.';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('API Error:', error);
    return throwError(errorMessage);
  }
}