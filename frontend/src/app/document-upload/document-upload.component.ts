import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ApiService, AnalysisOptions } from '../services/api.service';
import { IndustryService } from '../services/industry.service';
import { FeedbackService, AnalysisFeedback } from '../feedback.service';

interface EnhancedAnalysisResult {
  // Core fields from backend
  document?: any;
  message?: string;
  metadata?: { [key: string]: any };
  processingTimeMs?: number;
  
  // Industry analysis fields
  detectedIndustry?: {
    id: string;
    name: string;
    description: string;
  };
  confidence?: number;
  
  // Categorized analysis
  summary?: string;
  technologyKeywords?: string[];
  businessKeywords?: string[];
  complianceKeywords?: string[];
  
  // Recommendations
  highPriorityRecommendations?: string[];
  mediumPriorityRecommendations?: string[];
  lowPriorityRecommendations?: string[];
  
  // Additional analysis
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

  // File and text handling
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

  // Analysis options
  analysisOptions: AnalysisOptions = {
    generateSummary: true,
    extractKeywords: true,
    suggestComponents: true,
    performSentimentAnalysis: false,
    detectLanguage: true,
    calculateMetrics: true
  };

  constructor(
    private apiService: ApiService,
    private industryService: IndustryService,
    private feedbackService: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadIndustries();
    this.checkBackendHealth();
  }

  // =============================================
  // INITIALIZATION METHODS
  // =============================================

  private loadIndustries(): void {
    this.industries = this.industryService.getAllIndustries();
    
    // Also load from backend if available
    this.industryService.getSupportedIndustries().subscribe({
      next: (backendIndustries) => {
        console.log('✅ Backend industries loaded:', backendIndustries);
        // Could merge or update local industries here
      },
      error: (error) => {
        console.warn('⚠️ Could not load backend industries, using local ones');
      }
    });
  }

  private checkBackendHealth(): void {
    this.apiService.checkAiHealth().subscribe({
      next: (health) => {
        console.log('✅ AI Service Health:', health);
      },
      error: (error) => {
        console.warn('⚠️ AI Service not available:', error);
      }
    });
  }

  // =============================================
  // ANALYSIS METHODS
  // =============================================

  async analyzeDocument(): Promise<void> {
    if (!this.selectedFile || this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.clearResults();
    console.log('📄 Starting document analysis...');

    // Enhanced analysis options
    const options: AnalysisOptions = {
      ...this.analysisOptions,
      performSentimentAnalysis: true,
      calculateMetrics: true
    };

    this.apiService.analyzeDocument(this.selectedFile, options)
      .pipe(finalize(() => this.isAnalyzing = false))
      .subscribe({
        next: (result) => {
          console.log('✅ Document analysis completed:', result);
          this.handleAnalysisSuccess(result);
        },
        error: (error) => {
          console.error('❌ Document analysis failed:', error);
          this.handleAnalysisError(error);
        }
      });
  }

  async analyzeText(): Promise<void> {
    if (!this.textInput.trim() || this.isAnalyzing || this.isTextTooLong()) return;
    
    this.isAnalyzing = true;
    this.clearResults();
    console.log('📝 Starting text analysis...');

    const request = {
      text: this.textInput,
      title: this.selectedIndustry === 'auto' ? 'Text Analysis' : `${this.getIndustryName(this.selectedIndustry)} Analysis`,
      saveDocument: true,
      options: {
        ...this.analysisOptions,
        performSentimentAnalysis: true,
        calculateMetrics: true
      }
    };

    this.apiService.analyzeText(request)
      .pipe(finalize(() => this.isAnalyzing = false))
      .subscribe({
        next: (result) => {
          console.log('✅ Text analysis completed:', result);
          this.handleAnalysisSuccess(result);
        },
        error: (error) => {
          console.error('❌ Text analysis failed:', error);
          this.handleAnalysisError(error);
        }
      });
  }

  // Enhanced analysis with industry detection
  analyzeWithIndustryDetection(): void {
    if (!this.textInput.trim() || this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.clearResults();
    console.log('🏭 Starting analysis with industry detection...');

    // First detect industry
    this.apiService.detectIndustry(this.textInput)
      .pipe(finalize(() => this.isAnalyzing = false))
      .subscribe({
        next: (industryResult) => {
          console.log('🏭 Industry detected:', industryResult);
          
          // Then perform comprehensive analysis
          this.apiService.comprehensiveAnalysis(this.textInput).subscribe({
            next: (analysisResult) => {
              // Combine results
              const combined = {
                ...analysisResult,
                detectedIndustry: {
                  id: industryResult.primaryIndustry.toLowerCase(),
                  name: industryResult.primaryIndustry,
                  description: `Auto-detected: ${industryResult.primaryIndustry}`
                },
                confidence: industryResult.confidence
              };
              this.handleAnalysisSuccess(combined);
            },
            error: (error) => this.handleAnalysisError(error)
          });
        },
        error: (error) => {
          console.warn('Industry detection failed, using regular analysis');
          this.analyzeText();
        }
      });
  }

  // =============================================
  // RESULT HANDLING
  // =============================================

  private handleAnalysisSuccess(result: any): void {
    console.log('🎉 Analysis successful:', result);
    
    // Normalize the result structure
    this.analysisResult = this.normalizeAnalysisResult(result);
    
    // Update selected industry if auto-detected
    if (this.selectedIndustry === 'auto' && this.analysisResult?.detectedIndustry) {
      this.selectedIndustry = this.analysisResult.detectedIndustry.id;
    }
    
    // Show feedback option
    this.analysisId = this.generateAnalysisId();
    this.showFeedback = true;
    this.feedbackSubmitted = false;
    
    console.log('✅ Analysis result processed and ready for display');
  }

  private handleAnalysisError(error: any): void {
    console.error('💥 Analysis error:', error);
    this.errorMessage = error.message || 'Ein Fehler ist bei der Analyse aufgetreten';
    this.analysisResult = null;
  }

  private normalizeAnalysisResult(result: any): EnhancedAnalysisResult {
    console.log('📄 Normalizing analysis result...');
    console.log('🔍 Raw backend result:', result);
    
    // Handle different response structures from different endpoints
    let normalized: EnhancedAnalysisResult = {};
    
    // From /api/documents endpoints
    if (result.document) {
      const doc = result.document;
      normalized = {
        document: doc,
        message: result.message,
        metadata: result.metadata,
        processingTimeMs: result.processingTimeMs,
        summary: doc.summary,
        detectedIndustry: {
          id: doc.documentType?.toLowerCase() || 'ecommerce',
          name: doc.documentType || 'E-Commerce',
          description: doc.documentType || 'Document type not specified'
        },
        confidence: doc.qualityScore || 50
      };
      
      // Parse keywords if they're comma-separated strings
      if (doc.keywords) {
        const keywords = doc.keywords.split(',').map((k: string) => k.trim());
        normalized.technologyKeywords = keywords.filter((k: string) => this.isTechnicalTerm(k));
        normalized.businessKeywords = keywords.filter((k: string) => !this.isTechnicalTerm(k));
        normalized.complianceKeywords = [];
      }
      
      // Parse recommendations
      if (doc.recommendations) {
        const recs = doc.recommendations.split('\n').filter((r: string) => r.trim());
        normalized.highPriorityRecommendations = recs.slice(0, 3);
        normalized.mediumPriorityRecommendations = recs.slice(3, 6);
        normalized.lowPriorityRecommendations = recs.slice(6);
      }
    }
    
    // From /api/ai endpoints
    if (result.industryAnalysis) {
      const industry = result.industryAnalysis;
      normalized.detectedIndustry = {
        id: industry.primaryIndustry?.toLowerCase() || 'unknown',
        name: industry.primaryIndustry || 'Unknown',
        description: `Detected with ${industry.confidence}% confidence`
      };
      normalized.confidence = industry.confidence;
    }
    
    // From industry service local analysis
    if (result.detectedIndustry && !normalized.detectedIndustry) {
      normalized.detectedIndustry = result.detectedIndustry;
      normalized.confidence = result.confidence;
      normalized.summary = result.summary;
      normalized.technologyKeywords = result.technologyKeywords || [];
      normalized.businessKeywords = result.businessKeywords || [];
      normalized.complianceKeywords = result.complianceKeywords || [];
      normalized.highPriorityRecommendations = result.highPriorityRecommendations || [];
      normalized.mediumPriorityRecommendations = result.mediumPriorityRecommendations || [];
      normalized.lowPriorityRecommendations = result.lowPriorityRecommendations || [];
      normalized.estimatedBudget = result.estimatedBudget;
      normalized.timeline = result.timeline;
      normalized.recommendedStack = result.recommendedStack;
      normalized.successMetrics = result.successMetrics || [];
      normalized.complianceResults = result.complianceResults || [];
      normalized.riskAssessment = result.riskAssessment;
    }
    
    // 🆕 Fallback to local analysis if backend gives minimal data
    if (!normalized.summary || (!normalized.technologyKeywords || normalized.technologyKeywords.length === 0)) {
      console.log('🔄 Backend analysis incomplete, using local fallback analysis...');
      const localAnalysis = this.performLocalAnalysis(this.textInput);
      
      // Use backend summary if available, otherwise local
      if (!normalized.summary) {
        normalized.summary = localAnalysis.summary;
      }
      
      // Use local keyword extraction if backend didn't provide any
      if (!normalized.technologyKeywords || normalized.technologyKeywords.length === 0) {
        normalized.technologyKeywords = localAnalysis.technologyKeywords;
        normalized.businessKeywords = localAnalysis.businessKeywords;
        normalized.complianceKeywords = localAnalysis.complianceKeywords;
      }
      
      // Use local recommendations if none provided
      if (!normalized.highPriorityRecommendations || normalized.highPriorityRecommendations.length === 0) {
        normalized.highPriorityRecommendations = localAnalysis.highPriorityRecommendations;
        normalized.mediumPriorityRecommendations = localAnalysis.mediumPriorityRecommendations;
        normalized.lowPriorityRecommendations = localAnalysis.lowPriorityRecommendations;
      }
      
      // Set estimated budget and timeline
      normalized.estimatedBudget = localAnalysis.estimatedBudget;
      normalized.timeline = localAnalysis.timeline;
      normalized.recommendedStack = localAnalysis.recommendedStack;
      normalized.successMetrics = localAnalysis.successMetrics;
      normalized.complianceResults = localAnalysis.complianceResults;
      normalized.riskAssessment = localAnalysis.riskAssessment;
    }
    
    // Fallback for minimal results
    if (!normalized.detectedIndustry) {
      // Try to detect industry from text
      const detectedIndustry = this.detectIndustryFromText(this.textInput);
      normalized.detectedIndustry = {
        id: detectedIndustry.id,
        name: detectedIndustry.name,
        description: detectedIndustry.description
      };
      normalized.confidence = detectedIndustry.confidence;
    }
    
    // Ensure arrays are initialized
    if (!normalized.technologyKeywords) normalized.technologyKeywords = [];
    if (!normalized.businessKeywords) normalized.businessKeywords = [];
    if (!normalized.complianceKeywords) normalized.complianceKeywords = [];
    if (!normalized.highPriorityRecommendations) normalized.highPriorityRecommendations = [];
    if (!normalized.mediumPriorityRecommendations) normalized.mediumPriorityRecommendations = [];
    if (!normalized.lowPriorityRecommendations) normalized.lowPriorityRecommendations = [];
    
    if (!normalized.summary && result.textAnalysis) {
      normalized.summary = result.textAnalysis.summary || 'Analysis completed successfully';
    }
    
    console.log('✅ Analysis result normalized:', normalized);
    return normalized;
  }

  // =============================================
  // FILE HANDLING METHODS
  // =============================================

  onFileAreaClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.clearResults();
      this.validateFile();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.clearResults();
      this.validateFile();
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileInput.nativeElement.value = '';
    this.clearResults();
  }

  private validateFile(): void {
    if (!this.selectedFile) return;
    
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/json',
      'text/markdown'
    ];
    
    if (!allowedTypes.includes(this.selectedFile.type)) {
      this.errorMessage = 'Unsupported file type. Supported: PDF, DOC, DOCX, TXT, CSV, JSON, MD';
      this.removeFile();
      return;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (this.selectedFile.size > maxSize) {
      this.errorMessage = 'File too large. Maximum size is 10MB.';
      this.removeFile();
      return;
    }
    
    this.errorMessage = '';
  }

  getFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // =============================================
  // INDUSTRY METHODS
  // =============================================

  setIndustry(industryId: string): void {
    this.selectedIndustry = industryId;
    this.clearResults();
    console.log('🏭 Industry selected:', industryId);
  }

  getIndustryName(industryId: string): string {
    if (industryId === 'auto') return 'Automatische Erkennung';
    const industry = this.industryService.getIndustryById(industryId);
    return industry ? industry.name : 'Unknown Industry';
  }

  getIndustryFocusAreas(industryId: string): string[] {
    const industry = this.industryService.getIndustryById(industryId);
    return industry ? industry.focusAreas : [];
  }

  getIndustryRegulations(industryId: string): string[] {
    const industry = this.industryService.getIndustryById(industryId);
    return industry ? industry.regulations : [];
  }

  getIndustryKPIs(industryId: string): string[] {
    const industry = this.industryService.getIndustryById(industryId);
    return industry ? industry.kpis : [];
  }

  // =============================================
  // TEXT INPUT METHODS
  // =============================================

  loadDemoText(industryType?: string): void {
    const demoType = industryType || 'ecommerce';
    this.textInput = this.getDemoTextByIndustry(demoType);
    
    if (industryType) {
      this.selectedIndustry = industryType;
    }
    
    this.clearResults();
  }

  private getDemoTextByIndustry(industryType: string): string {
    const demoTexts: { [key: string]: string } = {
      'ecommerce': this.getEcommerceDemoText(),
      'healthcare': this.getHealthcareDemoText(),
      'fintech': this.getFintechDemoText(),
      'manufacturing': this.getManufacturingDemoText()
    };
    
    return demoTexts[industryType] || demoTexts['ecommerce'];
  }

  getTextLimit(): number {
    return this.textLimits[this.currentPlan];
  }

  isTextTooLong(): boolean {
    return this.textInput.length > this.getTextLimit();
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('de-DE').format(num);
  }

  // =============================================
  // FEEDBACK METHODS
  // =============================================

  setFeedbackRating(rating: number): void {
    this.feedbackRating = rating;
  }

  async submitFeedback(): Promise<void> {
    if (this.feedbackRating === 0) {
      alert('Please provide a rating.');
      return;
    }
    
    const feedbackData: AnalysisFeedback = {
      documentId: parseInt(this.analysisId.split('_')[1]) || Math.floor(Math.random() * 1000)
    };
    
    try {
      await this.feedbackService.submitFeedback(feedbackData);
      this.storeFeedbackDetails();
      this.feedbackSubmitted = true;
      setTimeout(() => {
        alert('Thank you for your feedback!');
      }, 100);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      this.storeFeedbackDetails();
      this.feedbackSubmitted = true;
      alert('Feedback stored locally. Thank you!');
    }
  }

  private storeFeedbackDetails(): void {
    try {
      const feedbackDetails = {
        analysisId: this.analysisId,
        rating: this.feedbackRating,
        comment: this.feedbackComment.trim(),
        industry: this.selectedIndustry,
        timestamp: new Date().toISOString(),
        analysisType: this.selectedFile ? 'document' : 'text'
      };
      
      const existingFeedbacks = JSON.parse(localStorage.getItem('analysis_feedbacks') || '[]');
      existingFeedbacks.push(feedbackDetails);
      
      if (existingFeedbacks.length > 50) {
        existingFeedbacks.splice(0, existingFeedbacks.length - 50);
      }
      
      localStorage.setItem('analysis_feedbacks', JSON.stringify(existingFeedbacks));
      console.log('Feedback stored locally:', feedbackDetails);
    } catch (error) {
      console.error('Error storing feedback:', error);
    }
  }

  resetFeedback(): void {
    this.feedbackRating = 0;
    this.feedbackComment = '';
    this.feedbackSubmitted = false;
  }

  closeFeedback(): void {
    this.showFeedback = false;
    this.resetFeedback();
  }

  getStars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  // =============================================
  // UI HELPER METHODS
  // =============================================

  getConfidenceClass(confidence: number | undefined): string {
    if (!confidence) return 'low';
    if (confidence >= 70) return 'high';
    if (confidence >= 40) return 'medium';
    return 'low';
  }

  getRiskLabel(riskLevel: number): string {
    if (riskLevel <= 3) return 'Niedrig';
    if (riskLevel <= 6) return 'Mittel';
    return 'Hoch';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // =============================================
  // EXPORT METHODS
  // =============================================

  exportToPDF(): void {
    if (!this.analysisResult) return;
    
    const content = this.generateReportContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-report-${Date.now()}.txt`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  exportToExcel(): void {
    if (!this.analysisResult) return;
    
    const csvContent = this.generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-data-${Date.now()}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  exportToJSON(): void {
    if (!this.analysisResult) return;
    
    const dataStr = JSON.stringify(this.analysisResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-result-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  shareResults(): void {
    if (!this.analysisResult) return;
    
    const shareData = {
      title: 'AI Document Analysis Results',
      text: `Industry: ${this.analysisResult.detectedIndustry?.name || 'Unknown'}\nConfidence: ${this.analysisResult.confidence || 0}%`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(
        `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`
      ).then(() => {
        alert('Results copied to clipboard!');
      }).catch(() => {
        alert('Sharing not available. Please copy URL manually.');
      });
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private clearResults(): void {
    this.analysisResult = null;
    this.errorMessage = '';
    this.showFeedback = false;
    this.resetFeedback();
  }

  private generateAnalysisId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `analysis_${timestamp}_${random}`;
  }

  private isTechnicalTerm(term: string): boolean {
    const techTerms = [
      'React', 'Vue', 'Angular', 'Node.js', 'Express', 'TypeScript', 'JavaScript',
      'API', 'REST', 'GraphQL', 'JSON', 'Database', 'PostgreSQL', 'MongoDB', 'Redis',
      'Framework', 'Algorithm', 'Software', 'System', 'Code', 'Development',
      'PWA', 'SPA', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Cloud', 'Microservices',
      'CI/CD', 'DevOps', 'Terraform', 'Elasticsearch', 'CDN', 'SSL', 'HTTPS',
      'Payment', 'Integration', 'Caching', 'Performance', 'Security', 'Authentication'
    ];
    return techTerms.some(t => term.toLowerCase().includes(t.toLowerCase()));
  }

  // 🆕 Local analysis fallback when backend provides minimal data
  private performLocalAnalysis(text: string): any {
    const technologyKeywords = this.extractTechnologyKeywords(text);
    const businessKeywords = this.extractBusinessKeywords(text);
    const complianceKeywords = this.extractComplianceKeywords(text);
    
    return {
      summary: this.generateLocalSummary(text),
      technologyKeywords,
      businessKeywords, 
      complianceKeywords,
      highPriorityRecommendations: this.generateHighPriorityRecommendations(text),
      mediumPriorityRecommendations: this.generateMediumPriorityRecommendations(text),
      lowPriorityRecommendations: this.generateLowPriorityRecommendations(text),
      estimatedBudget: this.estimateBudgetFromText(text),
      timeline: this.estimateTimelineFromText(text),
      recommendedStack: this.recommendTechStackFromText(text),
      successMetrics: this.generateSuccessMetrics(text),
      complianceResults: this.analyzeComplianceFromText(text),
      riskAssessment: this.assessRiskFromText(text)
    };
  }

  private detectIndustryFromText(text: string): any {
    const lowerText = text.toLowerCase();
    
    // E-Commerce indicators
    if (lowerText.includes('e-commerce') || lowerText.includes('shop') || 
        lowerText.includes('payment') || lowerText.includes('checkout') ||
        lowerText.includes('conversion') || lowerText.includes('fashion')) {
      return {
        id: 'ecommerce',
        name: 'E-Commerce & Retail',
        description: 'Detected based on e-commerce, shopping, and retail keywords',
        confidence: 75
      };
    }
    
    // Healthcare indicators
    if (lowerText.includes('health') || lowerText.includes('medical') || 
        lowerText.includes('patient') || lowerText.includes('hospital') ||
        lowerText.includes('fhir') || lowerText.includes('hipaa')) {
      return {
        id: 'healthcare',
        name: 'Healthcare',
        description: 'Detected based on healthcare and medical keywords',
        confidence: 80
      };
    }
    
    // Fintech indicators  
    if (lowerText.includes('fintech') || lowerText.includes('banking') ||
        lowerText.includes('payment') || lowerText.includes('financial') ||
        lowerText.includes('pci-dss') || lowerText.includes('fraud')) {
      return {
        id: 'fintech',
        name: 'Fintech & Banking',
        description: 'Detected based on financial and payment keywords',
        confidence: 85
      };
    }
    
    // Manufacturing indicators
    if (lowerText.includes('manufacturing') || lowerText.includes('iot') ||
        lowerText.includes('industry 4.0') || lowerText.includes('factory') ||
        lowerText.includes('production') || lowerText.includes('automation')) {
      return {
        id: 'manufacturing',
        name: 'Manufacturing & Industry 4.0',
        description: 'Detected based on manufacturing and IoT keywords',
        confidence: 78
      };
    }
    
    // Default to IT
    return {
      id: 'it',
      name: 'IT & Software',
      description: 'Default classification for technology projects',
      confidence: 50
    };
  }

  private extractTechnologyKeywords(text: string): string[] {
    const techTerms = [
      'React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'TypeScript', 'JavaScript',
      'PWA', 'SPA', 'GraphQL', 'REST API', 'Microservices', 'Docker', 'Kubernetes',
      'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'AWS', 'Azure', 'CloudFront',
      'CI/CD', 'DevOps', 'Terraform', 'PayPal', 'Stripe', 'CDN', 'SSL', 'HTTPS'
    ];
    
    const found: string[] = [];
    const lowerText = text.toLowerCase();
    
    techTerms.forEach(term => {
      if (lowerText.includes(term.toLowerCase())) {
        found.push(term);
      }
    });
    
    return found.slice(0, 10); // Limit to top 10
  }

  private extractBusinessKeywords(text: string): string[] {
    const businessTerms = [
      'E-Commerce', 'Conversion Rate', 'Mobile Commerce', 'Customer Experience',
      'ROI', 'Revenue', 'Sales', 'Marketing', 'Branding', 'Customer Journey',
      'User Experience', 'Performance', 'Scalability', 'Growth', 'Strategy',
      'Business Intelligence', 'Analytics', 'KPI', 'Optimization', 'Automation'
    ];
    
    const found: string[] = [];
    const lowerText = text.toLowerCase();
    
    businessTerms.forEach(term => {
      if (lowerText.includes(term.toLowerCase())) {
        found.push(term);
      }
    });
    
    return found.slice(0, 8); // Limit to top 8
  }

  private extractComplianceKeywords(text: string): string[] {
    const complianceTerms = [
      'GDPR', 'DSGVO', 'PCI-DSS', 'SOC 2', 'ISO 27001', 'HIPAA', 'PSD2',
      'Security', 'Privacy', 'Data Protection', 'Compliance', 'Audit',
      'Encryption', 'Authentication', 'Authorization', 'Access Control'
    ];
    
    const found: string[] = [];
    const lowerText = text.toLowerCase();
    
    complianceTerms.forEach(term => {
      if (lowerText.includes(term.toLowerCase())) {
        found.push(term);
      }
    });
    
    return found.slice(0, 6); // Limit to top 6
  }

  private generateLocalSummary(text: string): string {
    const firstSentences = text.split('.').slice(0, 3).join('.').trim();
    if (firstSentences.length > 200) {
      return firstSentences.substring(0, 200) + '...';
    }
    return firstSentences + '.';
  }

  private generateHighPriorityRecommendations(text: string): string[] {
    const lowerText = text.toLowerCase();
    const recommendations: string[] = [];
    
    if (lowerText.includes('performance') || lowerText.includes('speed')) {
      recommendations.push('Performance-Optimierung durch CDN und Caching implementieren');
    }
    if (lowerText.includes('mobile') || lowerText.includes('responsive')) {
      recommendations.push('Mobile-First Design für bessere User Experience');
    }
    if (lowerText.includes('security') || lowerText.includes('sicherheit')) {
      recommendations.push('Comprehensive Security Audit und Penetration Testing');
    }
    if (lowerText.includes('payment') || lowerText.includes('checkout')) {
      recommendations.push('Optimierte Checkout-Experience für höhere Conversion Rate');
    }
    
    return recommendations.slice(0, 3);
  }

  private generateMediumPriorityRecommendations(text: string): string[] {
    return [
      'A/B Testing Framework für kontinuierliche Optimierung',
      'Personalisierung durch Machine Learning implementieren',
      'Advanced Analytics und Customer Insights Dashboard'
    ];
  }

  private generateLowPriorityRecommendations(text: string): string[] {
    return [
      'Social Media Integration für virales Marketing',
      'Customer Review System für Vertrauensbildung',
      'Internationalisierung für globale Expansion'
    ];
  }

  private estimateBudgetFromText(text: string): any {
    const lowerText = text.toLowerCase();
    let baseAmount = 200000; // Base 200k
    
    // Extract budget if mentioned
    const budgetMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*(?:€|Euro)/g);
    if (budgetMatch) {
      const budgetStr = budgetMatch[0].replace(/[^\d]/g, '');
      const mentionedBudget = parseInt(budgetStr);
      if (mentionedBudget > 50000) {
        baseAmount = mentionedBudget;
      }
    }
    
    // Adjust based on complexity indicators
    if (lowerText.includes('enterprise') || lowerText.includes('microservices')) {
      baseAmount *= 1.5;
    }
    if (lowerText.includes('ai') || lowerText.includes('machine learning')) {
      baseAmount *= 1.3;
    }
    if (lowerText.includes('international') || lowerText.includes('multi-region')) {
      baseAmount *= 1.2;
    }
    
    return {
      min: Math.round(baseAmount * 0.8),
      max: Math.round(baseAmount * 1.3),
      confidence: 'medium',
      factors: [
        'Projektgröße und Komplexität berücksichtigt',
        'Technologie-Stack Komplexität einkalkuliert',
        'Marktübliche Entwicklungskosten angewandt'
      ]
    };
  }

  private estimateTimelineFromText(text: string): any {
    const lowerText = text.toLowerCase();
    let months = 8; // Base 8 months
    
    // Extract timeline if mentioned
    const timelineMatch = text.match(/(\d{1,2})\s*(?:-\s*(\d{1,2}))?\s*(?:Monat|month)/gi);
    if (timelineMatch) {
      const timeStr = timelineMatch[0].match(/\d{1,2}/g);
      if (timeStr) {
        months = parseInt(timeStr[0]);
      }
    }
    
    return {
      estimated: months,
      phases: [
        { name: 'Discovery & Design', duration: Math.round(months * 0.2), dependencies: [], deliverables: ['Requirements'] },
        { name: 'Development', duration: Math.round(months * 0.5), dependencies: ['Discovery'], deliverables: ['MVP'] },
        { name: 'Testing & Launch', duration: Math.round(months * 0.3), dependencies: ['Development'], deliverables: ['Go-Live'] }
      ],
      criticalPath: ['Requirements Analysis', 'Core Development', 'Integration Testing', 'Go-Live']
    };
  }

  private recommendTechStackFromText(text: string): any {
    const lowerText = text.toLowerCase();
    const stack = {
      frontend: ['React', 'TypeScript'],
      backend: ['Node.js', 'Express'],
      database: ['PostgreSQL'],
      infrastructure: ['Docker', 'AWS']
    };
    
    // Frontend recommendations
    if (lowerText.includes('vue')) {
      stack.frontend = ['Vue.js', 'TypeScript'];
    }
    if (lowerText.includes('angular')) {
      stack.frontend = ['Angular', 'TypeScript'];
    }
    if (lowerText.includes('pwa')) {
      stack.frontend.push('PWA');
    }
    
    // Backend recommendations
    if (lowerText.includes('java') || lowerText.includes('spring')) {
      stack.backend = ['Java', 'Spring Boot'];
    }
    if (lowerText.includes('microservices')) {
      stack.backend.push('Microservices');
    }
    
    // Database recommendations
    if (lowerText.includes('mongodb')) {
      stack.database.push('MongoDB');
    }
    if (lowerText.includes('redis')) {
      stack.database.push('Redis');
    }
    if (lowerText.includes('elasticsearch')) {
      stack.database.push('Elasticsearch');
    }
    
    // Infrastructure
    if (lowerText.includes('kubernetes')) {
      stack.infrastructure.push('Kubernetes');
    }
    if (lowerText.includes('azure')) {
      stack.infrastructure = ['Docker', 'Azure'];
    }
    
    return stack;
  }

  private generateSuccessMetrics(text: string): any[] {
    return [
      { name: 'Conversion Rate', current: '2.1%', target: '4.5%', improvement: '+114%' },
      { name: 'Page Load Time', current: '8s', target: '2s', improvement: '-75%' },
      { name: 'Mobile Conversion', current: '1.2%', target: '3.8%', improvement: '+217%' },
      { name: 'SEO Ranking', current: 'Position 15+', target: 'Top 10', improvement: 'Top 10' }
    ];
  }

  private analyzeComplianceFromText(text: string): any[] {
    const results: any[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('gdpr') || lowerText.includes('dsgvo')) {
      results.push({
        regulation: 'GDPR/DSGVO',
        relevance: 'high',
        foundKeywords: ['GDPR', 'Data Protection'],
        requirements: ['Cookie Consent', 'Privacy Policy', 'Data Processing Records']
      });
    }
    
    if (lowerText.includes('pci') || lowerText.includes('payment')) {
      results.push({
        regulation: 'PCI-DSS',
        relevance: 'high',
        foundKeywords: ['Payment', 'Card Processing'],
        requirements: ['Secure Payment Processing', 'Encryption', 'Security Monitoring']
      });
    }
    
    return results;
  }

  private assessRiskFromText(text: string): any {
    const lowerText = text.toLowerCase();
    let overallRisk = 5;
    
    // Increase risk based on complexity
    if (lowerText.includes('enterprise') || lowerText.includes('large scale')) {
      overallRisk += 1;
    }
    if (lowerText.includes('legacy') || lowerText.includes('migration')) {
      overallRisk += 1;
    }
    if (lowerText.includes('tight deadline') || lowerText.includes('aggressive timeline')) {
      overallRisk += 2;
    }
    
    return {
      overall: Math.min(overallRisk, 10),
      security: lowerText.includes('payment') || lowerText.includes('financial') ? 7 : 5,
      compliance: lowerText.includes('gdpr') || lowerText.includes('regulated') ? 6 : 4,
      technical: lowerText.includes('microservices') || lowerText.includes('complex') ? 6 : 4,
      recommendations: [
        'Agile Entwicklungsansatz für Risikominimierung',
        'Regelmäßige Stakeholder-Updates und Reviews',
        'Comprehensive Testing-Strategie implementieren'
      ]
    };
  }

  private generateReportContent(): string {
    if (!this.analysisResult) return '';
    
    return `AI DOCUMENT ANALYSIS REPORT
===========================

Industry: ${this.analysisResult.detectedIndustry?.name || 'Unknown'}
Confidence: ${this.analysisResult.confidence || 0}%
Analysis Date: ${new Date().toLocaleDateString('de-DE')}

SUMMARY
=======
${this.analysisResult.summary || 'No summary available'}

KEYWORDS
========
Technology: ${this.analysisResult.technologyKeywords?.join(', ') || 'None'}
Business: ${this.analysisResult.businessKeywords?.join(', ') || 'None'}
Compliance: ${this.analysisResult.complianceKeywords?.join(', ') || 'None'}

HIGH PRIORITY RECOMMENDATIONS
=============================
${this.analysisResult.highPriorityRecommendations?.map((rec, i) => `${i + 1}. ${rec}`).join('\n') || 'None'}

BUDGET ESTIMATION
================
${this.analysisResult.estimatedBudget ? 
  `Min: ${this.formatCurrency(this.analysisResult.estimatedBudget.min)}\nMax: ${this.formatCurrency(this.analysisResult.estimatedBudget.max)}` : 
  'Not available'}

TIMELINE: ${this.analysisResult.timeline?.estimated || 'TBD'} months`;
  }

  private generateCSVContent(): string {
    if (!this.analysisResult) return '';
    
    const rows = [
      ['Category', 'Value'],
      ['Industry', this.analysisResult.detectedIndustry?.name || 'Unknown'],
      ['Confidence', `${this.analysisResult.confidence || 0}%`],
      ['Summary Length', (this.analysisResult.summary?.length || 0).toString()],
      ['Tech Keywords', (this.analysisResult.technologyKeywords?.length || 0).toString()],
      ['Business Keywords', (this.analysisResult.businessKeywords?.length || 0).toString()]
    ];
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  // =============================================
  // DEMO TEXT METHODS
  // =============================================

  private getEcommerceDemoText(): string {
    return `E-Commerce Platform "ShopNext"
Entwicklung einer modernen Online-Shopping-Plattform

PROJEKTÜBERSICHT:
Entwicklung einer skalierbaren E-Commerce-Lösung mit React, Node.js und PostgreSQL.
Die Plattform soll 10.000+ Produkte verwalten und 1000+ gleichzeitige Nutzer unterstützen.

TECHNISCHE ANFORDERUNGEN:
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Express.js, REST API
- Datenbank: PostgreSQL, Redis für Caching
- Payment: Stripe, PayPal Integration
- Deployment: Docker, Kubernetes, AWS

FEATURES:
- Produktkatalog mit Such- und Filterfunktionen
- Warenkorb und Checkout-Prozess
- Benutzerverwaltung und Authentifizierung
- Admin-Dashboard für Produktverwaltung
- Mobile-responsive Design
- Real-time Transaction Monitoring
- API für Drittanbieter-Integration
- Compliance-Dashboard und Reporting

SICHERHEIT: PCI-DSS, PSD2, GDPR
BUDGET: €1.500.000 - €2.000.000
TIMELINE: 18-24 Monate`;
  }

  private getHealthcareDemoText(): string {
    return `Healthcare Management System "MediCore"
Krankenhaus-Verwaltungssystem für 500-Betten-Klinik

PROJEKTBESCHREIBUNG:
Entwicklung eines FHIR-konformen Krankenhaus-Informationssystems
für digitale Patientenakten und Workflow-Management.

TECHNISCHE SPEZIFIKATION:
- Backend: Java Spring Boot, Spring Security
- Frontend: Angular 16, TypeScript
- Datenbank: PostgreSQL mit HL7 FHIR Unterstützung
- Integration: DICOM, HL7, Medizingeräte-APIs
- Sicherheit: Ende-zu-Ende-Verschlüsselung, HIPAA-Compliance

KERNFUNKTIONEN:
- Elektronische Patientenakten (EPA)
- Terminverwaltung und Ressourcenplanung
- Medikamentenverwaltung mit Interaktionsprüfung
- Labor- und Bildgebungsintegration
- Compliance-Dashboard und Audit-Logs
- Telemedicine-Portal für Remote-Consultations
- Mobile App für Ärzte und Pflegepersonal
- Integration mit Medizingeräten (IoMT)
- Real-time Monitoring und Alerts
- Patientenportal mit Terminen und Befunden

COMPLIANCE: HIPAA, DSGVO, MDR, FDA
SICHERHEIT: End-to-End Encryption, Multi-Factor Authentication
BUDGET: €800.000 - €1.200.000
TIMELINE: 12-15 Monate
TEAM: 8-10 Entwickler, 2 Security Experten, 1 Compliance Officer`;
  }

  private getFintechDemoText(): string {
    return `Fintech Platform "SecurePay"
Digitale Payment-Lösung für KMU

PROJEKTKONZEPT:
Entwicklung einer PCI-DSS-konformen Payment-Plattform
mit Real-time Fraud Detection und Multi-Currency Support.

TECHNISCHE ARCHITEKTUR:
- Microservices: Java Spring Boot, Spring Cloud
- Frontend: React, TypeScript, Material-UI
- Datenbank: PostgreSQL, MongoDB für Analytics
- Message Queue: Apache Kafka
- Security: OAuth 2.0, JWT, 2FA, HSM

HAUPTFUNKTIONEN:
- Payment Processing (Kreditkarten, SEPA, PayPal)
- Fraud Detection mit Machine Learning
- Multi-Currency und Wechselkurs-Management
- PCI-DSS Level 1 Compliance
- Real-time Transaction Monitoring
- API für Drittanbieter-Integration
- Compliance-Dashboard und Reporting
- Mobile Payment SDK
- Subscription Management
- Chargeback Protection
- Risk Scoring Engine
- Blockchain-Integration für Transparenz

SICHERHEIT: PCI-DSS, PSD2, GDPR, SOC 2 Type II
REGULIERUNG: BaFin, PCI Security Council
BUDGET: €1.500.000 - €2.000.000
TIMELINE: 18-24 Monate
TEAM: 12-15 Entwickler, 3 Security Experten, 2 Compliance Officer`;
  }

  private getManufacturingDemoText(): string {
    return `Smart Factory IoT Platform "IndustryConnect"
Industry 4.0 Lösung für Produktionsoptimierung

PROJEKTBESCHREIBUNG:
Entwicklung einer IoT-basierten Smart Factory Plattform
für Predictive Maintenance und Produktionsoptimierung.

TECHNISCHE INFRASTRUKTUR:
- Backend: Java Spring Boot, Microservices
- IoT: MQTT, Apache Kafka, InfluxDB
- Frontend: Angular, TypeScript, D3.js
- Cloud: AWS IoT Core, Lambda, DynamoDB
- Analytics: Apache Spark, TensorFlow

KERNFEATURES:
- 15.000+ IoT Sensoren Integration
- Real-time Production Monitoring
- Predictive Maintenance AI
- Quality Control Automation
- Supply Chain Optimization
- Energy Management System
- Worker Safety Monitoring
- OEE (Overall Equipment Effectiveness)
- Digital Twin Technology
- Automated Reporting

COMPLIANCE: ISO 9001, ISO 14001, Industry 4.0
BUDGET: €2.500.000 - €3.500.000
TIMELINE: 24-30 Monate
TEAM: 20+ Entwickler, IoT Spezialisten, Data Scientists`;
  }
}