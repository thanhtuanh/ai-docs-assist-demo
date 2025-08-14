// document-analysis.component.ts - Bereinigte Komponente
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentAnalysisService, AnalysisResult } from './document-analysis.service';

@Component({
  selector: 'app-document-analysis',
  templateUrl: './document-analysis.component.html',
  styleUrls: ['./document-analysis.component.css']
})
export class DocumentAnalysisComponent implements OnInit, OnDestroy {
  analysisForm: FormGroup;
  analysisResult: AnalysisResult | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  showDetails = {
    keywords: true,
    recommendations: true,
    budget: true,
    timeline: true,
    compliance: true,
    techStack: true,
    metrics: true
  };

  constructor(
    private fb: FormBuilder,
    private analysisService: DocumentAnalysisService
  ) {
    this.analysisForm = this.fb.group({
      documentText: ['', [Validators.required, Validators.minLength(50)]]
    });
  }

  ngOnInit(): void {
    this.analysisService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    this.analysisService.analysisResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.analysisResult = result;
        if (result) {
          this.errorMessage = null;
        }
      });

    this.loadTestData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAnalyze(): void {
    if (this.analysisForm.valid) {
      const documentText = this.analysisForm.get('documentText')?.value;
      this.errorMessage = null;
      
      this.analysisService.analyzeDocument(documentText)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            console.log('✅ Analysis completed:', result);
          },
          error: (error) => {
            console.error('❌ Analysis failed:', error);
            this.errorMessage = 'Analyse fehlgeschlagen. Verwende Mock-Daten für Demo.';
            this.isLoading = false;
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  onClearResults(): void {
    this.analysisResult = null;
    this.errorMessage = null;
    this.analysisForm.reset();
  }

  toggleSection(section: keyof typeof this.showDetails): void {
    this.showDetails[section] = !this.showDetails[section];
  }

  exportResults(): void {
    if (this.analysisResult) {
      const dataStr = JSON.stringify(this.analysisResult, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `document-analysis-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }
  }

  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel.toLowerCase()) {
      case 'niedrig': return 'risk-low';
      case 'mittel': return 'risk-medium';
      case 'hoch': return 'risk-high';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'rec-high';
      case 'medium': return 'rec-medium';
      case 'low': return 'rec-low';
      default: return '';
    }
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 80) return 'confidence-high';
    if (confidence >= 60) return 'confidence-medium';
    return 'confidence-low';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getRiskIcon(risk: number): string {
    if (risk <= 3) return '🟢';
    if (risk <= 6) return '🟡';
    return '🔴';
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  getTechIcon(category: string): string {
    switch (category) {
      case 'frontend': return '🎨';
      case 'backend': return '⚙️';
      case 'database': return '🗄️';
      case 'infrastructure': return '☁️';
      default: return '🔧';
    }
  }

  get documentTextControl() {
    return this.analysisForm.get('documentText');
  }

  get isDocumentTextInvalid(): boolean {
    const control = this.documentTextControl;
    return !!(control && control.invalid && control.touched);
  }

  get documentTextErrors(): string[] {
    const control = this.documentTextControl;
    const errors: string[] = [];
    
    if (control?.errors) {
      if (control.errors['required']) {
        errors.push('Dokumententext ist erforderlich');
      }
      if (control.errors['minlength']) {
        errors.push('Mindestens 50 Zeichen erforderlich');
      }
    }
    
    return errors;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.analysisForm.controls).forEach(key => {
      const control = this.analysisForm.get(key);
      control?.markAsTouched();
    });
  }

  private loadTestData(): void {
    const testInput = `### BITS Tech-Projekt
BITS Digital Solutions: Technisches Projektdokument

PROJEKTZIEL:
Entwicklung einer skalierbaren Cloud-Anwendung zur Dokumentenverwaltung mit KI-gestützter Analyse.

TECHNOLOGIE-STACK:
• Frontend: Angular 16, Responsive Design
• Backend: Spring Boot (REST API), Java 17
• Datenbank: PostgreSQL, Elasticsearch
• Cloud & DevOps: Docker, Kubernetes, GitLab CI/CD, AWS
• Sicherheit: Keycloak, OAuth2, JWT

KOMPETENZBEREICHE:
- Digital Solutions
- Cloud Native Entwicklung
- AI Integration (OpenAI API, ML-Modelle)
- Security by Design

PHASEN:
1. Architekturentwurf & Prototyp
2. Entwicklung & Integration
3. Testautomatisierung (JUnit, Cypress)
4. Deployment & Betrieb (AWS EKS)`;

    this.analysisForm.patchValue({
      documentText: testInput
    });
  }
}