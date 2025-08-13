import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, AnalysisOptions, TextAnalysisRequest } from './services/api.service';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private apiService: ApiService) {}

  // Backward compatibility methods
  analyzeText(text: string, options?: AnalysisOptions): Observable<any> {
    const request: TextAnalysisRequest = {
      text,
      saveDocument: true,
      options: options || { generateSummary: true, extractKeywords: true, suggestComponents: true }
    };
    return this.apiService.analyzeText(request);
  }

  analyzeDocument(file: File, options?: AnalysisOptions): Observable<any> {
    return this.apiService.analyzeDocument(file, options);
  }

  analyzeTextSimple(text: string, industry?: string): Observable<any> {
    console.log('🚀 DocumentService: analyzeTextSimple');
    const request: TextAnalysisRequest = {
      text,
      title: industry ? `${industry} Analysis` : 'Text Analysis',
      saveDocument: true,
      options: {
        generateSummary: true,
        extractKeywords: true,
        suggestComponents: true,
        detectLanguage: true,
        calculateMetrics: true
      }
    };
    return this.apiService.analyzeText(request);
  }

  analyzeDocumentSimple(file: File, industry?: string): Observable<any> {
    console.log('🚀 DocumentService: analyzeDocumentSimple');
    const options: AnalysisOptions = {
      generateSummary: true,
      extractKeywords: true,
      suggestComponents: true,
      detectLanguage: true,
      calculateMetrics: true
    };
    return this.apiService.analyzeDocument(file, options);
  }

  // Enhanced methods using new backend capabilities
  analyzeWithIndustryDetection(text: string): Observable<any> {
    // First detect industry, then analyze text
    return this.apiService.detectIndustry(text).pipe(
      map(industryResult => {
        console.log('🏭 Industry detected:', industryResult.primaryIndustry);
        return this.analyzeText(text, {
          generateSummary: true,
          extractKeywords: true,
          suggestComponents: true,
          performSentimentAnalysis: true
        });
      }),
      catchError(error => {
        console.warn('Industry detection failed, using regular analysis');
        return this.analyzeText(text);
      })
    );
  }

  comprehensiveAnalysis(text: string): Observable<any> {
    return this.apiService.comprehensiveAnalysis(text);
  }

  // Document management
  getDocument(id: number | string): Observable<any> {
    return this.apiService.getDocument(id);
  }

  reanalyzeDocument(id: number | string, options?: AnalysisOptions): Observable<any> {
    return this.apiService.reanalyzeDocument(id, options);
  }

  compareDocuments(id1: number | string, id2: number | string): Observable<any> {
    return this.apiService.compareDocuments(id1, id2);
  }

  // Utility methods
  checkHealth(): Observable<any> {
    return this.apiService.checkHealth();
  }

  getSupportedIndustries(): Observable<any> {
    return this.apiService.getSupportedIndustries();
  }
}
