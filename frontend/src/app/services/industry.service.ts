import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, IndustryAnalysisResult } from './api.service';

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

@Injectable({ providedIn: 'root' })
export class IndustryService {
  
  private industries: Industry[] = [
    {
      id: 'automotive',
      name: 'Automotive',
      icon: '🚗',
      description: 'Fahrzeugbau, Elektromobilität, Automotive Technology',
      keywords: ['auto', 'fahrzeug', 'kfz', 'bmw', 'mercedes', 'elektroauto'],
      technologies: ['CAN Bus', 'AUTOSAR', 'V2X', 'Embedded Systems'],
      regulations: ['ISO 26262', 'UNECE', 'Automotive SPICE'],
      kpis: ['Fuel Efficiency', 'Safety Rating', 'Production Volume'],
      focusAreas: ['Safety', 'Efficiency', 'Connectivity', 'Sustainability']
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce & Retail',
      icon: '🛒',
      description: 'Online-Shops, Mobile Commerce, Payment-Systeme',
      keywords: ['shop', 'ecommerce', 'online', 'retail', 'payment', 'checkout'],
      technologies: ['React', 'Angular', 'Shopify', 'Magento', 'Stripe', 'PayPal'],
      regulations: ['DSGVO', 'PCI-DSS', 'Cookie-Law'],
      kpis: ['Conversion Rate', 'AOV', 'CAC', 'LTV'],
      focusAreas: ['Mobile Experience', 'Payment Integration', 'Performance', 'SEO']
    },
    {
      id: 'healthcare',
      name: 'Gesundheitswesen',
      icon: '🏥',
      description: 'Krankenhäuser, Praxen, Medizintechnik',
      keywords: ['gesundheit', 'krankenhaus', 'klinik', 'arzt', 'patient'],
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
      keywords: ['bank', 'finanz', 'payment', 'blockchain', 'trading'],
      technologies: ['Blockchain', 'API', 'Real-time Processing', 'ML'],
      regulations: ['PCI-DSS', 'PSD2', 'GDPR', 'Basel III'],
      kpis: ['Transaction Volume', 'Fraud Rate', 'Customer Acquisition'],
      focusAreas: ['Security', 'Real-time Processing', 'Compliance', 'UX']
    },
    {
      id: 'it',
      name: 'IT/Software',
      icon: '💻',
      description: 'Software Development, IT Services, Digital Solutions',
      keywords: ['software', 'entwicklung', 'it', 'digital', 'tech'],
      technologies: ['Java', 'Python', 'React', 'Angular', 'Spring Boot', 'Docker'],
      regulations: ['ISO 27001', 'DSGVO', 'SOC 2'],
      kpis: ['Code Quality', 'Performance', 'Security Score'],
      focusAreas: ['Scalability', 'Security', 'Performance', 'User Experience']
    }
  ];

  constructor(private apiService: ApiService) {}

  getAllIndustries(): Industry[] {
    return [...this.industries];
  }

  getIndustryById(id: string): Industry | undefined {
    return this.industries.find(industry => industry.id === id);
  }

  /**
   * Detect industry using backend service
   */
  detectIndustry(text: string): Observable<{ industry: Industry; confidence: number }> {
    return this.apiService.detectIndustry(text).pipe(
      map((result: IndustryAnalysisResult) => {
        // Map backend industry name to our local industry
        const detectedIndustry = this.mapBackendIndustryToLocal(result.primaryIndustry);
        return {
          industry: detectedIndustry || this.getDefaultIndustry(),
          confidence: result.confidence
        };
      }),
      catchError(error => {
        console.warn('Backend industry detection failed, using fallback:', error);
        return of({
          industry: this.detectIndustryLocal(text),
          confidence: 50
        });
      })
    );
  }

  /**
   * Get supported industries from backend
   */
  getSupportedIndustries(): Observable<any> {
    return this.apiService.getSupportedIndustries().pipe(
      catchError(error => {
        console.warn('Could not fetch backend industries, using local ones');
        return of({
          industries: this.industries.reduce((acc, ind) => {
            acc[ind.id] = ind.keywords.join(', ');
            return acc;
          }, {} as any)
        });
      })
    );
  }

  /**
   * Comprehensive analysis with industry detection
   */
  analyzeText(text: string, selectedIndustryId?: string): Observable<any> {
    if (selectedIndustryId && selectedIndustryId !== 'auto') {
      // Use selected industry for analysis
      const industry = this.getIndustryById(selectedIndustryId);
      return of(this.createAnalysisResult(text, industry!, 95));
    } else {
      // Auto-detect industry
      return this.detectIndustry(text).pipe(
        map(result => this.createAnalysisResult(text, result.industry, result.confidence))
      );
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private mapBackendIndustryToLocal(backendIndustry: string): Industry | undefined {
    const mappings: { [key: string]: string } = {
      'Automotive': 'automotive',
      'E-Commerce': 'ecommerce',
      'Gesundheitswesen': 'healthcare',
      'Finanzwesen': 'fintech',
      'IT/Software': 'it'
    };

    const localId = mappings[backendIndustry] || backendIndustry.toLowerCase();
    return this.getIndustryById(localId);
  }

  private getDefaultIndustry(): Industry {
    return this.industries[0]; // Return first industry as default
  }

  private detectIndustryLocal(text: string): Industry {
    // Fallback local detection
    const industryScores: { [key: string]: number } = {};
    
    this.industries.forEach(industry => {
      let score = 0;
      industry.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      industryScores[industry.id] = score;
    });

    const bestIndustryId = Object.keys(industryScores).reduce((a, b) => 
      industryScores[a] > industryScores[b] ? a : b
    );
    
    return this.getIndustryById(bestIndustryId) || this.getDefaultIndustry();
  }

  private createAnalysisResult(text: string, industry: Industry, confidence: number): any {
    // Create comprehensive analysis result
    const keywords = this.extractKeywords(text, industry);
    const recommendations = this.generateRecommendations(text, industry);
    
    return {
      detectedIndustry: {
        id: industry.id,
        name: industry.name,
        description: industry.description
      },
      confidence,
      summary: this.generateSummary(text, industry),
      technologyKeywords: keywords.technology,
      businessKeywords: keywords.business,
      complianceKeywords: keywords.compliance,
      highPriorityRecommendations: recommendations.high,
      mediumPriorityRecommendations: recommendations.medium,
      lowPriorityRecommendations: recommendations.low,
      estimatedBudget: this.estimateBudget(text, industry),
      timeline: this.estimateTimeline(text, industry),
      recommendedStack: this.recommendTechStack(text, industry),
      successMetrics: this.defineSuccessMetrics(text, industry),
      complianceResults: this.analyzeCompliance(text, industry),
      riskAssessment: this.calculateRisk(text, industry)
    };
  }

  private extractKeywords(text: string, industry: Industry) {
    const technology: string[] = [];
    const business: string[] = [];
    const compliance: string[] = [];

    // Extract based on industry context
    industry.technologies.forEach(tech => {
      if (new RegExp(`\\b${tech}\\b`, 'gi').test(text)) {
        technology.push(tech);
      }
    });

    industry.keywords.forEach(keyword => {
      if (new RegExp(`\\b${keyword}\\b`, 'gi').test(text)) {
        business.push(keyword);
      }
    });

    industry.regulations.forEach(reg => {
      if (new RegExp(`\\b${reg}\\b`, 'gi').test(text)) {
        compliance.push(reg);
      }
    });

    return { technology, business, compliance };
  }

  private generateRecommendations(text: string, industry: Industry) {
    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];

    // Industry-specific recommendations
    switch (industry.id) {
      case 'ecommerce':
        high.push('Progressive Web App für bessere Mobile Experience');
        high.push('Payment Gateway Integration (Stripe, PayPal)');
        medium.push('A/B Testing Framework für Conversion-Optimierung');
        low.push('Personalisierte Produktempfehlungen');
        break;
      case 'healthcare':
        high.push('FHIR-konforme Datenstrukturen');
        high.push('End-to-End Verschlüsselung für Patientendaten');
        medium.push('Audit Logging für Compliance');
        low.push('Telemedicine Integration');
        break;
      case 'fintech':
        high.push('PCI-DSS Level 1 Compliance');
        high.push('Real-time Fraud Detection');
        medium.push('Strong Customer Authentication (SCA)');
        low.push('Blockchain Integration für Transparenz');
        break;
    }

    return { all: [...high, ...medium, ...low], high, medium, low };
  }

  private generateSummary(text: string, industry: Industry): string {
    const firstLines = text.split('\n').slice(0, 3).join(' ').substring(0, 200);
    return `${industry.name}-Projekt: ${firstLines}... [Analysiert mit branchenspezifischer KI]`;
  }

  private estimateBudget(text: string, industry: Industry) {
    const baseAmount = 100000;
    const multipliers: { [key: string]: number } = {
      'automotive': 2.0,
      'healthcare': 1.8,
      'fintech': 2.2,
      'ecommerce': 1.0,
      'it': 1.2
    };
    
    const multiplier = multipliers[industry.id] || 1.0;
    const complexity = Math.min(3, 1 + (text.length / 10000));
    const estimated = baseAmount * complexity * multiplier;
    
    return {
      min: Math.round(estimated * 0.8),
      max: Math.round(estimated * 1.3),
      confidence: 'medium' as const,
      factors: [
        `Branche: ${industry.name} (${multiplier}x)`,
        `Komplexität: ${complexity.toFixed(1)}x`,
        'Compliance-Anforderungen berücksichtigt'
      ]
    };
  }

  private estimateTimeline(text: string, industry: Industry) {
    const baseTimelines: { [key: string]: number } = {
      'automotive': 18,
      'healthcare': 12,
      'fintech': 15,
      'ecommerce': 6,
      'it': 8
    };
    
    const baseMonths = baseTimelines[industry.id] || 6;
    const complexity = Math.min(2, 1 + (text.length / 15000));
    
    return {
      estimated: Math.round(baseMonths * complexity),
      phases: [
        { name: 'Discovery & Planning', duration: 1, dependencies: [], deliverables: ['Requirements'] },
        { name: 'Core Development', duration: 3, dependencies: ['Discovery'], deliverables: ['MVP'] },
        { name: 'Testing & Launch', duration: 2, dependencies: ['Core Development'], deliverables: ['Go-Live'] }
      ],
      criticalPath: ['Requirements Analysis', 'Core Development', 'Testing', 'Go-Live']
    };
  }

  private recommendTechStack(text: string, industry: Industry) {
    const base = {
      frontend: ['React', 'TypeScript'],
      backend: ['Node.js', 'Express'],
      database: ['PostgreSQL'],
      infrastructure: ['Docker', 'AWS']
    };

    // Industry-specific additions
    if (industry.technologies) {
      base.frontend.push(...industry.technologies.filter(t => 
        ['React', 'Angular', 'Vue'].some(f => t.includes(f))
      ));
      base.backend.push(...industry.technologies.filter(t => 
        ['Spring', 'Express', 'Django'].some(b => t.includes(b))
      ));
    }

    return base;
  }

  private defineSuccessMetrics(text: string, industry: Industry) {
    return industry.kpis.map(kpi => ({
      name: kpi,
      current: 'TBD',
      target: 'To be defined',
      improvement: '+25%'
    }));
  }

  private analyzeCompliance(text: string, industry: Industry) {
    return industry.regulations.map(regulation => ({
      regulation,
      relevance: text.toLowerCase().includes(regulation.toLowerCase()) ? 'high' : 'medium',
      foundKeywords: industry.keywords.filter(k => text.toLowerCase().includes(k)),
      requirements: [`${regulation} compliance required`, 'Documentation needed'],
      riskLevel: 'medium' as const
    }));
  }

  private calculateRisk(text: string, industry: Industry) {
    const baseRisk = 5;
    const securityRisk = industry.id === 'fintech' || industry.id === 'healthcare' ? 7 : 4;
    const complianceRisk = industry.regulations.length > 2 ? 6 : 3;
    
    return {
      overall: Math.max(baseRisk, securityRisk, complianceRisk),
      security: securityRisk,
      compliance: complianceRisk,
      technical: 4,
      recommendations: [
        'Security Audit durch externes Unternehmen',
        'Compliance-Beratung durch Rechtsexperten'
      ]
    };
  }
}