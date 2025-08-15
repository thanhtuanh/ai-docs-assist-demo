// src/app/services/industry.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService, IndustryDetectionResponse } from './api.service';

/**
 * ✅ Industry Interface für UI-Darstellung
 */
export interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
  keywords: string[];
  technologies: string[];
  regulations: string[];
  kpis: string[];
  focusAreas: string[];
}

/**
 * ✅ KORRIGIERTER IndustryService - Backend-Integration Fixed
 */
@Injectable({ providedIn: 'root' })
export class IndustryService {
  
  // 📋 Lokale UI-Definitionen (unverändert für Performance)
  private readonly uiIndustries: Industry[] = [
    {
      id: 'auto',
      name: 'Automatische Erkennung',
      icon: '🤖',
      description: 'KI erkennt die Branche basierend auf Ihrem Text',
      keywords: [],
      technologies: [],
      regulations: [],
      kpis: [],
      focusAreas: ['AI-basierte Erkennung', 'Vollautomatisch', 'Höchste Genauigkeit']
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce & Retail',
      icon: '🛒',
      description: 'Online-Shops, Mobile Commerce, Payment-Systeme',
      keywords: ['shop', 'ecommerce', 'payment', 'checkout'],
      technologies: ['React', 'Angular', 'Shopify', 'Stripe', 'PayPal'],
      regulations: ['DSGVO', 'PCI-DSS', 'Cookie-Law'],
      kpis: ['Conversion Rate', 'AOV', 'CAC', 'LTV'],
      focusAreas: ['Mobile Experience', 'Payment Integration', 'Performance', 'SEO']
    },
    {
      id: 'healthcare',
      name: 'Gesundheitswesen',
      icon: '🏥',
      description: 'Krankenhäuser, Praxen, Medizintechnik',
      keywords: ['gesundheit', 'krankenhaus', 'patient', 'medizin'],
      technologies: ['FHIR', 'HL7', 'DICOM', 'EMR', 'Telemedicine'],
      regulations: ['HIPAA', 'DSGVO', 'MDR', 'FDA'],
      kpis: ['Patient Satisfaction', 'Treatment Time', 'Error Rate'],
      focusAreas: ['Data Security', 'Compliance', 'Interoperability', 'Patient Care']
    },
    {
      id: 'fintech',
      name: 'Finanzwesen',
      icon: '💰',
      description: 'Banking, Payment, Blockchain, Trading',
      keywords: ['bank', 'finanz', 'payment', 'blockchain'],
      technologies: ['Blockchain', 'API', 'Real-time Processing', 'ML'],
      regulations: ['PCI-DSS', 'PSD2', 'GDPR', 'Basel III'],
      kpis: ['Transaction Volume', 'Fraud Rate', 'Customer Acquisition'],
      focusAreas: ['Security', 'Real-time Processing', 'Compliance', 'UX']
    },
    {
      id: 'manufacturing',
      name: 'Manufacturing & Industry 4.0',
      icon: '🏭',
      description: 'Produktion, IoT, Smart Factory, Automation',
      keywords: ['manufacturing', 'iot', 'industry', 'automation'],
      technologies: ['IoT', 'Predictive Analytics', 'Automation', 'Edge Computing'],
      regulations: ['ISO 9001', 'ISO 14001', 'Industry 4.0'],
      kpis: ['OEE', 'Downtime', 'Quality Score'],
      focusAreas: ['IoT', 'Predictive Maintenance', 'Automation', 'Quality']
    },
    {
      id: 'it',
      name: 'IT/Software',
      icon: '💻',
      description: 'Software Development, IT Services, Digital Solutions',
      keywords: ['software', 'entwicklung', 'it', 'digital'],
      technologies: ['Java', 'Python', 'React', 'Angular', 'Spring Boot', 'Docker'],
      regulations: ['ISO 27001', 'DSGVO', 'SOC 2'],
      kpis: ['Code Quality', 'Performance', 'Security Score'],
      focusAreas: ['Scalability', 'Security', 'Performance', 'User Experience']
    }
  ];

  constructor(private apiService: ApiService) {
    console.log('🏭 IndustryService initialized - Backend-Integration Fixed');
    console.log('📋 UI Industries loaded:', this.uiIndustries.length);
  }

  // ===================================
  // UI-DATEN (Lokale Hilfsmethoden für Frontend)
  // ===================================

  /**
   * ✅ Alle Branchen für UI-Darstellung (lokal für Performance)
   */
  getAllIndustries(): Industry[] {
    return [...this.uiIndustries];
  }

  /**
   * ✅ Branche nach ID für UI-Darstellung
   */
  getIndustryById(id: string): Industry | undefined {
    return this.uiIndustries.find(industry => industry.id === id);
  }

  /**
   * ✅ Branchen-spezifische UI-Daten abrufen
   */
  getIndustryFocusAreas(industryId: string): string[] {
    const industry = this.getIndustryById(industryId);
    return industry ? industry.focusAreas : [];
  }

  getIndustryRegulations(industryId: string): string[] {
    const industry = this.getIndustryById(industryId);
    return industry ? industry.regulations : [];
  }

  getIndustryKPIs(industryId: string): string[] {
    const industry = this.getIndustryById(industryId);
    return industry ? industry.kpis : [];
  }

  getIndustryTechnologies(industryId: string): string[] {
    const industry = this.getIndustryById(industryId);
    return industry ? industry.technologies : [];
  }

  // ===================================
  // BACKEND-DELEGATION (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Branchenerkennung - Backend-Integration Fixed
   */
  detectIndustry(text: string): Observable<{ industry: Industry; confidence: number }> {
    console.log('📄 IndustryService: detectIndustry → Backend AI Service');
    console.log('📝 Text length:', text.length);
    
    return this.apiService.detectIndustry(text).pipe(
      map((result: IndustryDetectionResponse) => {
        console.log('✅ Backend industry detection:', result.primaryIndustry, '(' + result.confidence + '%)');
        
        // ✅ KORRIGIERT: Mappe Backend-Ergebnis zu lokaler UI-Struktur
        const detectedIndustry = this.mapBackendIndustryToLocal(result.primaryIndustry) 
          || this.getDefaultIndustry();
        
        return {
          industry: detectedIndustry,
          confidence: result.confidence
        };
      }),
      tap(result => {
        console.log('🎯 Mapped industry:', result.industry.name, 'confidence:', result.confidence);
        console.log('🔍 Detection method: Backend AI Service');
      }),
      catchError(error => {
        console.warn('⚠️ Backend industry detection failed:', error.message);
        console.log('🔄 Using fallback: IT/Software');
        
        // Fallback auf IT/Software bei Backend-Fehler
        return of({
          industry: this.getIndustryById('it') || this.getDefaultIndustry(),
          confidence: 50
        });
      })
    );
  }

  /**
   * ✅ KORRIGIERT: Unterstützte Branchen vom Backend abrufen
   */
  getSupportedIndustries(): Observable<any> {
    console.log('📄 IndustryService: getSupportedIndustries → Backend AI Service');
    
    return this.apiService.getSupportedIndustries().pipe(
      tap(industries => {
        console.log('✅ Backend industries loaded:', Object.keys(industries.industries || {}).length);
      }),
      catchError(error => {
        console.warn('⚠️ Could not fetch backend industries, using local ones');
        
        // Fallback auf lokale Branchen
        const fallback = {
          industries: this.uiIndustries.reduce((acc, ind) => {
            acc[ind.id] = ind.keywords.join(', ');
            return acc;
          }, {} as any),
          message: 'Using local industry definitions',
          fallback: true
        };
        
        return of(fallback);
      })
    );
  }

  /**
   * ✅ KORRIGIERT: Text-Analyse mit Branchenerkennung
   */
  analyzeText(text: string, selectedIndustryId?: string): Observable<any> {
    console.log('📄 IndustryService: analyzeText → Backend Comprehensive Analysis');
    
    if (selectedIndustryId && selectedIndustryId !== 'auto') {
      console.log('🎯 User selected industry:', selectedIndustryId);
      
      // Bei manueller Auswahl: Comprehensive Analysis mit Kontext
      const industry = this.getIndustryById(selectedIndustryId);
      return this.apiService.comprehensiveAnalysis(text).pipe(
        map(result => ({
          ...result,
          detectedIndustry: {
            id: selectedIndustryId,
            name: industry?.name || selectedIndustryId,
            description: industry?.description || 'Manuell ausgewählt'
          },
          confidence: 95, // Hohe Konfidenz bei manueller Auswahl
          selectionMode: 'manual'
        }))
      );
    } else {
      console.log('🤖 Auto-detect industry mode');
      // Auto-Erkennung: Vollständige Backend-Analyse
      return this.apiService.comprehensiveAnalysis(text);
    }
  }

  // ===================================
  // MAPPING & HELPER METHODEN (KORRIGIERT)
  // ===================================

  /**
   * ✅ KORRIGIERT: Mappe Backend-Branche zu lokaler UI-Struktur
   */
  private mapBackendIndustryToLocal(backendIndustry: string): Industry | undefined {
    console.log('🔄 Mapping backend industry:', backendIndustry);
    
    // ✅ ERWEITERT: Mehr Backend-zu-Frontend Mappings
    const mappings: { [key: string]: string } = {
      // Direkte Mappings
      'E-Commerce': 'ecommerce',
      'ecommerce': 'ecommerce',
      'E-Commerce & Retail': 'ecommerce',
      'Online-Handel': 'ecommerce',
      
      'Gesundheitswesen': 'healthcare',
      'healthcare': 'healthcare',
      'Medizin': 'healthcare',
      'Healthcare': 'healthcare',
      
      'Finanzwesen': 'fintech',
      'fintech': 'fintech',
      'Banking': 'fintech',
      'Finance': 'fintech',
      
      'Manufacturing': 'manufacturing',
      'Produktion': 'manufacturing',
      'Industry 4.0': 'manufacturing',
      'Industrie': 'manufacturing',
      
      'IT/Software': 'it',
      'Software': 'it',
      'Technologie': 'it',
      'Technology': 'it',
      'IT': 'it',
      
      // Fallback-Mappings
      'Automotive': 'manufacturing',
      'Transport': 'logistics',
      'Logistik': 'logistics',
      'Bildung': 'it',
      'Education': 'it',
      'Event': 'it',
      'Marketing': 'it'
    };

    const localId = mappings[backendIndustry] || backendIndustry.toLowerCase();
    const mappedIndustry = this.getIndustryById(localId);
    
    console.log('🎯 Mapped to local industry:', mappedIndustry?.name || 'Not found');
    
    return mappedIndustry;
  }

  /**
   * ✅ Standard-Branche bei Fehlern
   */
  private getDefaultIndustry(): Industry {
    return this.getIndustryById('it') || this.uiIndustries[0];
  }

  /**
   * ✅ Branche mit Fallback
   */
  getIndustryWithFallback(id: string): Industry {
    return this.getIndustryById(id) || this.getDefaultIndustry();
  }

  /**
   * ✅ Konfidenz-Level kategorisieren
   */
  getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  /**
   * ✅ Konfidenz-Beschreibung für UI
   */
  getConfidenceDescription(confidence: number): string {
    const level = this.getConfidenceLevel(confidence);
    
    switch (level) {
      case 'high':
        return 'Sehr zuverlässige Erkennung';
      case 'medium':
        return 'Gute Erkennung, manuelle Überprüfung empfohlen';
      case 'low':
        return 'Unsichere Erkennung, manuelle Auswahl empfohlen';
      default:
        return 'Unbekannte Konfidenz';
    }
  }

  /**
   * ✅ Text-Länge für Branchenerkennung validieren
   */
  validateTextForIndustryDetection(text: string): { valid: boolean; message?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, message: 'Text für Branchenerkennung darf nicht leer sein' };
    }
    
    if (text.length < 50) {
      return { valid: false, message: 'Text zu kurz für zuverlässige Branchenerkennung (min. 50 Zeichen)' };
    }
    
    if (text.length > 50000) {
      return { valid: false, message: 'Text zu lang für Branchenerkennung (max. 50.000 Zeichen)' };
    }
    
    return { valid: true };
  }

  // ===================================
  // TEST & DEBUG METHODEN (NEU)
  // ===================================

  /**
   * ✅ NEU: Test Branchenerkennung mit Debug-Output
   */
  testIndustryDetection(text: string): Observable<any> {
    console.group('🧪 Industry Detection Test');
    console.log('📝 Input text:', text.substring(0, 100) + '...');
    console.log('📏 Text length:', text.length);
    
    return this.apiService.testIndustryDetection(text).pipe(
      tap(result => {
        console.log('✅ Test result:', result);
        console.groupEnd();
      }),
      catchError(error => {
        console.error('❌ Test failed:', error);
        console.groupEnd();
        throw error;
      })
    );
  }

  /**
   * ✅ NEU: Debug Industry Mapping
   */
  debugIndustryMapping(backendIndustry: string): void {
    console.group('🔍 Industry Mapping Debug');
    console.log('🔤 Backend Industry:', backendIndustry);
    
    const mapped = this.mapBackendIndustryToLocal(backendIndustry);
    console.log('🎯 Mapped to:', mapped?.name || 'No mapping found');
    console.log('📋 Available industries:', this.uiIndustries.map(i => i.id));
    
    if (!mapped) {
      console.warn('⚠️ No mapping found for:', backendIndustry);
      console.log('💡 Consider adding mapping or using fallback');
    }
    
    console.groupEnd();
  }

  /**
   * ✅ NEU: Validate Backend Integration
   */
  validateBackendIntegration(): Observable<boolean> {
    console.log('🔍 Validating backend integration...');
    
    return this.apiService.checkAiHealth().pipe(
      map(health => {
        console.log('✅ Backend AI Service healthy:', health);
        return true;
      }),
      catchError(error => {
        console.error('❌ Backend AI Service not available:', error.message);
        return of(false);
      })
    );
  }
}