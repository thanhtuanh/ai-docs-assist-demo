import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AnalysisFeedback {
    id?: number;
    documentId: number;
    summaryRating?: number;
    keywordsRating?: number;
    componentsRating?: number;
    overallRating?: number;
    userComments?: string;
    suggestedSummary?: string;
    suggestedKeywords?: string;
    suggestedComponents?: string;
    summaryHelpful?: boolean;
    keywordsHelpful?: boolean;
    componentsHelpful?: boolean;
}

export interface QualityReport {
    weeklyAverageRating: number;
    monthlyAverageRating: number;
    weeklySummaryRating: number;
    weeklyKeywordsRating: number;
    weeklyComponentsRating: number;
    totalFeedbackCount: number;
    suggestionsCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class FeedbackService {
    private apiUrl = `${environment.apiUrl}/feedback`;

    constructor(private http: HttpClient) { }

    submitFeedback(feedback: AnalysisFeedback): Observable<AnalysisFeedback> {
        return this.http.post<AnalysisFeedback>(this.apiUrl, feedback);
    }

    submitQuickFeedback(documentId: number, type: string, helpful: boolean): Observable<string> {
        return this.http.post<string>(`${this.apiUrl}/quick-feedback`, {
            documentId,
            type,
            helpful
        });
    }

    getQualityReport(): Observable<QualityReport> {
        return this.http.get<QualityReport>(`${this.apiUrl}/quality-report`);
    }

    getFeedbackForDocument(documentId: number): Observable<AnalysisFeedback[]> {
        return this.http.get<AnalysisFeedback[]>(`${this.apiUrl}/document/${documentId}`);
    }
}
