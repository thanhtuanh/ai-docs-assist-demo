import { Component, Input, OnInit } from '@angular/core';
import { FeedbackService, AnalysisFeedback } from '../feedback.service';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css']
})
export class FeedbackComponent implements OnInit {
  @Input() documentId!: number;
  @Input() analysisResult: any;

  feedback: AnalysisFeedback = {
    documentId: 0,
    summaryRating: 0,
    keywordsRating: 0,
    componentsRating: 0,
    overallRating: 0
  };

  showDetailedFeedback = false;
  feedbackSubmitted = false;
  isSubmitting = false;

  constructor(private feedbackService: FeedbackService) {}

  ngOnInit() {
    this.feedback.documentId = this.documentId;
  }

  // Schnelles Feedback (Daumen hoch/runter)
  submitQuickFeedback(type: 'summary' | 'keywords' | 'components', helpful: boolean) {
    this.feedbackService.submitQuickFeedback(this.documentId, type, helpful)
      .subscribe({
        next: () => {
          console.log(`Quick feedback submitted: ${type} = ${helpful}`);
          // Visuelles Feedback anzeigen
          this.showTemporaryMessage(`Feedback für ${type} gespeichert!`);
        },
        error: (error: any) => {
          console.error('Fehler beim Speichern des Feedbacks:', error);
        }
      });
  }

  // Detailliertes Feedback
  submitDetailedFeedback() {
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    
    // Gesamtbewertung berechnen falls nicht gesetzt
    if (!this.feedback.overallRating) {
      const ratings = [
        this.feedback.summaryRating || 0,
        this.feedback.keywordsRating || 0,
        this.feedback.componentsRating || 0
      ].filter(r => r > 0);
      
      this.feedback.overallRating = ratings.length > 0 
        ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
        : 3;
    }

    this.feedbackService.submitFeedback(this.feedback)
      .subscribe({
        next: (response: any) => {
          this.feedbackSubmitted = true;
          this.isSubmitting = false;
          console.log('Detailliertes Feedback gespeichert:', response);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          console.error('Fehler beim Speichern des detaillierten Feedbacks:', error);
        }
      });
  }

  // Sterne-Rating setzen
  setRating(type: 'summary' | 'keywords' | 'components' | 'overall', rating: number) {
    switch (type) {
      case 'summary':
        this.feedback.summaryRating = rating;
        break;
      case 'keywords':
        this.feedback.keywordsRating = rating;
        break;
      case 'components':
        this.feedback.componentsRating = rating;
        break;
      case 'overall':
        this.feedback.overallRating = rating;
        break;
    }
  }

  // Hilfsmethoden
  getStarsArray(count: number): number[] {
    return new Array(count).fill(0).map((_, i) => i + 1);
  }

  private showTemporaryMessage(message: string) {
    // Implementierung für temporäre Nachrichten
    const messageElement = document.createElement('div');
    messageElement.className = 'temporary-message';
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
      document.body.removeChild(messageElement);
    }, 3000);
  }
}