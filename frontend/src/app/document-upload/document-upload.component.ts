// src/app/document-upload/document-upload.component.ts
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { ApiService, AnalysisOptions } from '../services/api.service';
import { IndustryService } from '../services/industry.service';
import { FeedbackService, AnalysisFeedback } from '../feedback.service';

interface EnhancedAnalysisResult {
  // Backend Response Structure (exakt wie DocumentController.java)
  document?: any;
  message?: string;
  metadata?: { [key: string]: any };
  processingTimeMs?: number;
  
  // Industry analysis (von AI Service)
  detectedIndustry?: {
    id: string;
    name: string;
    description: string;
  };
  confidence?: number;
  
  // Processed analysis data
  summary?: string;
  technologyKeywords?: string[];
  businessKeywords?: string[];
  complianceKeywords?: string[];
  
  // Recommendations
  highPriorityRecommendations?: string[];
  mediumPriorityRecommendations?: string[];
  lowPriorityRecommendations?: string[];
  
  // Additional analysis (falls vom Backend geliefert)
  estimatedBudget?: any;
  timeline?: any;
  recommendedStack?: any;
  successMetrics?: any[];
  complianceResults?: any[];
  riskAssessment?: any;
}

@Component({
  selector: 'app-document-upload',
  templateUrl: './document-upload.component.html',
  styleUrls: ['./document-upload.component.css']
})
export class DocumentUploadComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Component State
  selectedFile: File | null = null;
  textInput: string = '';
  isDragOver: boolean = false;

  // Analysis state
  isAnalyzing: boolean = false;
  analysisResult: EnhancedAnalysisResult | null = null;
  errorMessage: string = '';

  // Industry selection
  selectedIndustry: string = 'auto';
  industries: any[] = [];

  // Feedback
  showFeedback: boolean = false;
  feedbackRating: number = 0;
  feedbackComment: string = '';
  feedbackSubmitted: boolean = false;
  analysisId: string = '';

  // Text limits
  textLimits = {
    free: 100000,
    premium: 500000,
    enterprise: 2000000
  };
  currentPlan: 'free' | 'premium' | 'enterprise' = 'free';

  // Route-based modes
  isHealthCheckMode: boolean = false;
  isDemoMode: boolean = false;
  demoIndustry: string | null = null;
  isNotFoundMode: boolean = false;
  
  // Backend status
  backendStatus: {
    available: boolean;
    aiServiceStatus: string;
    lastCheck: Date | null;
    errorDetails: string | null;
  } = {
    available: false,
    aiServiceStatus: 'unknown',
    lastCheck: null,
    errorDetails: null
  };

  constructor(
    private apiService: ApiService,
    private industryService: IndustryService,
    private feedbackService: FeedbackService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    console.log('📋 DocumentUploadComponent initialized - Pure Backend-Only Mode');
  }

  ngOnInit(): void {
    this.initializeRouteBasedMode();
    this.loadIndustries();
    this.checkBackendAvailability();
    this.handleQueryParameters();
  }

  // ===================================
  // FEHLENDE METHODEN HINZUFÜGEN
  // ===================================

  /**
   * ✅ Branchenerkennung abrufen - Fokus-Bereiche
   */
  getIndustryFocusAreas(industryId: string): string[] {
    return this.industryService.getIndustryFocusAreas(industryId);
  }

  /**
   * ✅ Branchenerkennung abrufen - Regulierungen
   */
  getIndustryRegulations(industryId: string): string[] {
    return this.industryService.getIndustryRegulations(industryId);
  }

  /**
   * ✅ Branchenerkennung abrufen - KPIs
   */
  getIndustryKPIs(industryId: string): string[] {
    return this.industryService.getIndustryKPIs(industryId);
  }

  /**
   * ✅ Branche auswählen
   */
  setIndustry(industryId: string): void {
    this.selectedIndustry = industryId;
    console.log('🎯 Industry selected:', industryId);
  }

  /**
   * ✅ Branchennamen abrufen
   */
  getIndustryName(industryId: string): string {
    const industry = this.industryService.getIndustryById(industryId);
    return industry ? industry.name : 'Unbekannte Branche';
  }

  /**
   * ✅ Dateibereich anklicken
   */
  onFileAreaClick(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * ✅ Drag Over Event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * ✅ Drag Leave Event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * ✅ File Drop Event
   */
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      console.log('📁 File dropped:', this.selectedFile.name);
    }
  }

  /**
   * ✅ Datei entfernen
   */
  removeFile(): void {
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * ✅ Datei ausgewählt Event
   */
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      console.log('📁 File selected:', this.selectedFile.name);
    }
  }

  /**
   * ✅ Dateigröße formatieren
   */
  getFileSize(size: number): string {
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    let index = 0;
    let fileSize = size;

    while (fileSize >= 1024 && index < units.length - 1) {
      fileSize /= 1024;
      index++;
    }

    return `${Math.round(fileSize * 100) / 100} ${units[index]}`;
  }

  /**
   * ✅ Confidence CSS-Klasse - FEHLER KORRIGIERT
   */
  getConfidenceClass(confidence: number | undefined): string {
    // Fallback auf 0 wenn confidence undefined ist
    const conf = confidence || 0;
    if (conf >= 80) return 'confidence-high';
    if (conf >= 60) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * ✅ Währung formatieren
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * ✅ Risiko-Label abrufen
   */
  getRiskLabel(riskLevel: number): string {
    if (riskLevel <= 3) return 'Niedrig';
    if (riskLevel <= 6) return 'Mittel';
    return 'Hoch';
  }

  /**
   * ✅ PDF exportieren
   */
  exportToPDF(): void {
    console.log('📄 Exporting to PDF...');
    // TODO: PDF Export implementieren
    alert('PDF-Export wird implementiert');
  }

  /**
   * ✅ Excel exportieren
   */
  exportToExcel(): void {
    console.log('📊 Exporting to Excel...');
    // TODO: Excel Export implementieren
    alert('Excel-Export wird implementiert');
  }

  /**
   * ✅ JSON exportieren
   */
  exportToJSON(): void {
    if (this.analysisResult) {
      const dataStr = JSON.stringify(this.analysisResult, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `analysis-${Date.now()}.json`;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }
  }

  /**
   * ✅ Ergebnisse teilen
   */
  shareResults(): void {
    if (this.analysisResult) {
      const shareData = {
        title: 'AI Document Analysis Results',
        text: `Analysis completed: ${this.analysisResult.summary}`,
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
        alert('Ergebnisse in Zwischenablage kopiert!');
      }
    }
  }

  /**
   * ✅ Feedback-Rating setzen
   */
  setFeedbackRating(rating: number): void {
    this.feedbackRating = rating;
    console.log('⭐ Feedback rating set:', rating);
  }

  /**
   * ✅ Sterne für Rating abrufen
   */
  getStars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  /**
   * ✅ Text-Länge prüfen
   */
  isTextTooLong(): boolean {
    return this.textInput.length > this.getTextLimit();
  }

  /**
   * ✅ Text-Limit abrufen
   */
  getTextLimit(): number {
    return this.textLimits[this.currentPlan];
  }

  /**
   * ✅ Zahlen formatieren
   */
  formatNumber(num: number): string {
    return new Intl.NumberFormat('de-DE').format(num);
  }

  /**
   * ✅ Demo-Text laden
   */
  loadDemoText(industry: string): void {
    const demoTexts: { [key: string]: string } = {
      'ecommerce': `
### E-Commerce Modernisierung - FashionForward

**Projektübersicht:**
FashionForward ist ein etabliertes Mode-Unternehmen mit über 50.000 Produkten und einem Jahresumsatz von 25 Millionen Euro. Das Unternehmen möchte seine veraltete E-Commerce-Plattform komplett modernisieren, um mit der Konkurrenz mithalten zu können.

**Aktuelle Herausforderungen:**
- Veraltete Magento 1.x Installation
- Langsame Ladezeiten (>5 Sekunden)
- Keine Mobile-Optimierung
- Veraltetes Payment-System
- Keine Integration mit modernen Marketing-Tools

**Technische Anforderungen:**
- Frontend: React/Next.js mit TypeScript
- Backend: Node.js mit Express oder Spring Boot
- Datenbank: PostgreSQL mit Redis für Caching
- Payment: Stripe, PayPal, SEPA
- Mobile: Progressive Web App (PWA)
- DevOps: Docker, Kubernetes, AWS/Azure
- Analytics: Google Analytics 4, Hotjar

**Geschäftsziele:**
- Verdopplung der Conversion Rate
- 50% Reduzierung der Ladezeiten
- Mobile-First Design
- Internationale Expansion
- Inventory Management Integration
- Customer Service Chatbot Integration

**Budget:** 150.000 - 300.000 Euro
**Timeline:** 8-12 Monate
      `,
      'healthcare': `
### Krankenhaus-Management System - Universitätsklinikum

**Projektbeschreibung:**
Das Universitätsklinikum mit 1.200 Betten und 5.000 Mitarbeitern benötigt ein neues digitales Management-System zur Optimierung der Patientenversorgung und Verwaltungsprozesse.

**Compliance-Anforderungen:**
- HIPAA Compliance (USA)
- GDPR/DSGVO Konformität
- HL7 FHIR Standards
- IHE Integration Profile
- ISO 27001 Zertifizierung

**Funktionale Anforderungen:**
- Elektronische Patientenakte (EPA)
- Terminverwaltung und -planung
- Medikamentenverwaltung
- Laborergebnisse Integration
- Bildgebung (DICOM) Integration
- Abrechnungsautomatisierung
- Reporting und Analytics

**Technische Spezifikationen:**
- Frontend: Angular 16+ mit Angular Material
- Backend: Spring Boot mit Spring Security
- Datenbank: PostgreSQL mit Audit-Logging
- Integration: RESTful APIs, HL7 FHIR
- Security: OAuth2, JWT, Multi-Factor Authentication
- Infrastructure: On-Premise mit Cloud-Backup
- Monitoring: ELK Stack, Prometheus

**Besondere Anforderungen:**
- 99.9% Verfügbarkeit
- End-to-End Verschlüsselung
- Audit-Trail für alle Aktionen
- Disaster Recovery Plan
- Mehrsprachige Unterstützung

**Investition:** 800.000 - 1.200.000 Euro
**Implementierung:** 18-24 Monate
      `,
      'fintech': `
### Payment-Platform - SecurePay Solutions

**Geschäftsmodell:**
SecurePay entwickelt eine moderne Payment-Plattform für europäische KMUs mit Fokus auf Sicherheit, Benutzerfreundlichkeit und Compliance mit aktuellen Finanzregulierungen.

**Regulatorische Anforderungen:**
- PCI DSS Level 1 Compliance
- PSD2 Strong Customer Authentication
- GDPR Datenschutz
- AML (Anti-Money Laundering)
- KYC (Know Your Customer)
- Banking License Requirements

**Technische Architektur:**
- Microservices mit Spring Boot
- Event-Driven Architecture (Apache Kafka)
- Real-time Transaction Processing
- Fraud Detection mit Machine Learning
- API-First Design (RESTful + GraphQL)
- Database: PostgreSQL + Redis + InfluxDB

**Security Features:**
- End-to-End Encryption (AES-256)
- Hardware Security Modules (HSM)
- Multi-Factor Authentication
- Real-time Fraud Monitoring
- Tokenization von Kartendaten
- Secure Communication (mTLS)

**Integration Partners:**
- SEPA Direct Debit
- Credit Card Processors (Visa, Mastercard)
- Open Banking APIs
- Cryptocurrency Gateways
- Accounting Software (DATEV, SAP)

**Skalierungsanforderungen:**
- 10.000 Transaktionen pro Sekunde
- Sub-100ms Response Times
- 99.99% Uptime SLA
- Multi-Region Deployment
- Auto-Scaling Infrastructure

**Finanzierung:** 2.000.000 - 5.000.000 Euro
**Go-to-Market:** 12-18 Monate
      `,
      'manufacturing': `
### Smart Factory IoT - Industry 4.0 Initiative

**Unternehmenskontext:**
Produktionsunternehmen mit 15.000 Sensoren, 500 Maschinen und 1.200 Mitarbeitern implementiert eine vollständige Industry 4.0 Transformation zur Optimierung der Produktionseffizienz.

**IoT Infrastructure:**
- 15.000+ Industrial IoT Sensors
- Edge Computing Nodes (NVIDIA Jetson)
- 5G Private Network
- Time-Sensitive Networking (TSN)
- Digital Twin Technology
- Augmented Reality (AR) Maintenance

**Predictive Analytics:**
- Machine Learning für Predictive Maintenance
- Computer Vision für Quality Control
- Real-time Anomaly Detection
- Supply Chain Optimization
- Energy Consumption Monitoring
- Workforce Analytics

**Technology Stack:**
- Backend: Spring Boot Microservices
- Message Broker: Apache Kafka + MQTT
- Database: InfluxDB + PostgreSQL + MongoDB
- Analytics: Apache Spark + TensorFlow
- Visualization: Grafana + Custom React Dashboards
- Infrastructure: Kubernetes + Docker

**Integration Systems:**
- ERP System (SAP S/4HANA)
- MES (Manufacturing Execution System)
- SCADA (Supervisory Control)
- PLM (Product Lifecycle Management)
- WMS (Warehouse Management)

**Compliance & Standards:**
- ISO 9001 Quality Management
- ISO 14001 Environmental Management
- IEC 61499 Function Blocks
- OPC UA Communication
- GDPR Worker Data Protection

**KPIs & Metrics:**
- Overall Equipment Effectiveness (OEE): +25%
- Predictive Maintenance Accuracy: 95%
- Energy Efficiency: +20%
- Defect Rate Reduction: -40%
- Production Flexibility: +60%

**Investment:** 3.000.000 - 8.000.000 Euro
**Rollout Phase:** 24-36 Monate
      `
    };

    this.textInput = demoTexts[industry] || demoTexts['ecommerce'];
    this.selectedIndustry = industry;
    console.log('📋 Demo text loaded for industry:', industry);
  }

  // ===================================
  // FEEDBACK METHODEN - FEHLER KORRIGIERT
  // ===================================

  /**
   * ✅ Feedback absenden - FEHLER KORRIGIERT
   */
  submitFeedback(): void {
    if (this.feedbackRating === 0) {
      alert('Bitte wählen Sie eine Bewertung aus');
      return;
    }

    const feedback: AnalysisFeedback = {
      documentId: parseInt(this.analysisId) || 0,
      overallRating: this.feedbackRating,
      userComments: this.feedbackComment,
      summaryRating: this.feedbackRating,
      keywordsRating: this.feedbackRating,
      componentsRating: this.feedbackRating
    };

    // KORRIGIERT: Nur ein Parameter für submitFeedback
    this.feedbackService.submitFeedback(feedback).subscribe({
      next: () => {
        this.feedbackSubmitted = true;
        console.log('✅ Feedback submitted successfully');
      },
      error: (error) => {
        console.error('❌ Feedback submission failed:', error);
        alert('Feedback konnte nicht gesendet werden');
      }
    });
  }

  /**
   * ✅ Feedback zurücksetzen
   */
  resetFeedback(): void {
    this.feedbackRating = 0;
    this.feedbackComment = '';
    this.feedbackSubmitted = false;
  }

  /**
   * ✅ Feedback schließen
   */
  closeFeedback(): void {
    this.showFeedback = false;
    this.resetFeedback();
  }

  // ===================================
  // ANALYSIS METHODEN (Backend-Only)
  // ===================================

  /**
   * ✅ Dokument analysieren - Backend-Only
   */
  async analyzeDocument(): Promise<void> {
    if (!this.selectedFile || this.isAnalyzing) return;
    
    console.log('📄 Starting document analysis - Backend-Only');
    
    if (!this.backendStatus.available) {
      this.handleError('🔌 Backend nicht verfügbar. Bitte starten Sie den Spring Boot Server.');
      return;
    }
    
    this.isAnalyzing = true;
    this.clearResults();

    const options: AnalysisOptions = this.getAnalysisOptions();
    
    this.apiService.analyzeDocument(this.selectedFile, options)
      .pipe(finalize(() => this.isAnalyzing = false))
      .subscribe({
        next: (result) => {
          console.log('✅ Backend document analysis completed');
          this.handleAnalysisSuccess(result);
        },
        error: (error) => {
          console.error('❌ Backend document analysis failed:', error.message);
          this.handleAnalysisError(error);
        }
      });
  }

  /**
   * ✅ Text analysieren - Backend-Only
   */
  async analyzeText(): Promise<void> {
    if (!this.textInput.trim() || this.isAnalyzing || this.isTextTooLong()) return;
    
    console.log('📄 Starting text analysis - Backend-Only');
    
    if (!this.backendStatus.available) {
      this.handleError('🔌 Backend nicht verfügbar. Bitte starten Sie den Spring Boot Server.');
      return;
    }
    
    this.isAnalyzing = true;
    this.clearResults();

    const request = {
      text: this.textInput,
      title: this.selectedIndustry === 'auto' ? 'Text Analysis' : `${this.getIndustryName(this.selectedIndustry)} Analysis`,
      saveDocument: true,
      options: this.getAnalysisOptions()
    };

    this.apiService.analyzeText(request)
      .pipe(finalize(() => this.isAnalyzing = false))
      .subscribe({
        next: (result) => {
          console.log('✅ Backend text analysis completed');
          this.handleAnalysisSuccess(result);
        },
        error: (error) => {
          console.error('❌ Backend text analysis failed:', error.message);
          this.handleAnalysisError(error);
        }
      });
  }

  // ===================================
  // PRIVATE HELPER METHODEN
  // ===================================

  private initializeRouteBasedMode(): void {
    const routeData = this.route.snapshot.data;
    
    this.isHealthCheckMode = !!routeData['healthCheck'];
    this.isDemoMode = !!routeData['demoMode'];
    this.demoIndustry = routeData['demoIndustry'] || null;
    this.isNotFoundMode = !!routeData['notFound'];
    
    console.log('🗺️ Route-based mode initialized:', {
      healthCheck: this.isHealthCheckMode,
      demo: this.isDemoMode,
      industry: this.demoIndustry,
      notFound: this.isNotFoundMode
    });

    if (this.isDemoMode && this.demoIndustry) {
      this.selectedIndustry = this.demoIndustry;
      this.loadDemoText(this.demoIndustry);
    }
  }

  private loadIndustries(): void {
    this.industries = this.industryService.getAllIndustries();
  }

  private async checkBackendAvailability(): Promise<void> {
    console.log('🔍 Checking backend availability...');
    
    try {
      this.backendStatus.lastCheck = new Date();
      const aiHealth = await this.apiService.checkAiHealth().toPromise();
      
      this.backendStatus.available = true;
      this.backendStatus.aiServiceStatus = aiHealth?.status || 'UP';
      this.backendStatus.errorDetails = null;
      
    } catch (error: any) {
      console.error('❌ Backend availability check failed:', error);
      
      this.backendStatus.available = false;
      this.backendStatus.aiServiceStatus = 'DOWN';
      this.backendStatus.errorDetails = this.categorizeBackendError(error);
    }
  }

  private handleQueryParameters(): void {
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = params['error'];
      }
      if (params['industry']) {
        this.selectedIndustry = params['industry'];
      }
    });
  }

  private getAnalysisOptions(): AnalysisOptions {
    return {
      generateSummary: true,
      extractKeywords: true,
      suggestComponents: true,
      performSentimentAnalysis: true,
      detectLanguage: true,
      calculateMetrics: true
    };
  }

  private handleAnalysisSuccess(result: any): void {
    console.log('🎉 Analysis successful - processing backend result');
    
    this.analysisResult = this.processBackendResponse(result);
    
    if (this.selectedIndustry === 'auto' && this.analysisResult?.detectedIndustry) {
      this.selectedIndustry = this.analysisResult.detectedIndustry.id;
    }
    
    this.analysisId = this.generateAnalysisId();
    this.showFeedback = true;
    this.feedbackSubmitted = false;
    
    console.log('✅ Analysis result ready for display');
  }

  private handleAnalysisError(error: any): void {
    console.error('💥 Backend analysis error:', error.message);
    
    const categorizedError = this.categorizeBackendError(error);
    this.errorMessage = categorizedError;
    this.analysisResult = null;
    
    this.backendStatus.available = false;
    this.backendStatus.errorDetails = categorizedError;
    this.backendStatus.lastCheck = new Date();
  }

  private processBackendResponse(result: any): EnhancedAnalysisResult {
    let normalized: EnhancedAnalysisResult = {};
    
    if (result.document) {
      const doc = result.document;
      normalized = {
        document: doc,
        message: result.message,
        metadata: result.metadata,
        processingTimeMs: result.processingTimeMs,
        summary: doc.summary,
        detectedIndustry: {
          id: doc.documentType?.toLowerCase() || 'it',
          name: doc.documentType || 'IT/Software',
          description: doc.documentType || 'Backend analysis'
        },
        confidence: doc.qualityScore || 75
      };
    }
    
    return normalized;
  }

  private categorizeBackendError(error: any): string {
    if (error.status === 0) {
      return '🔌 Backend nicht erreichbar. Läuft der Spring Boot Server auf Port 8080?';
    }
    if (error.status === 400) {
      return '⚠️ Ungültige Anfrage. Überprüfen Sie Ihre Eingabe.';
    }
    if (error.status === 404) {
      return '🔍 Backend-Endpoint nicht gefunden. Prüfen Sie die API-Konfiguration.';
    }
    if (error.status === 500) {
      return '⚡ Backend-Server-Fehler. Prüfen Sie die Spring Boot Logs.';
    }
    
    return `❌ Backend-Fehler: ${error.message || 'Unbekannter Fehler'}`;
  }

  private clearResults(): void {
    this.analysisResult = null;
    this.errorMessage = '';
    this.showFeedback = false;
    this.resetFeedback();
  }

  private generateAnalysisId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `backend_analysis_${timestamp}_${random}`;
  }

  private handleError(message: string): void {
    this.errorMessage = message;
    console.error('❌ Component Error:', message);
  }
}