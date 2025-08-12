// src/app/services/industry.service.ts

import { Injectable } from '@angular/core';
import { Industry, EnhancedAnalysisResult } from '../models/industry.interfaces';

@Injectable({
  providedIn: 'root'
})
export class IndustryService {
  
  private industries: Industry[] = [
    {
      id: 'ecommerce',
      name: 'E-Commerce & Retail',
      icon: '🛒',
      description: 'Online-Shops, Mobile Commerce, Payment-Systeme',
      keywords: [
        'e-commerce', 'online shop', 'webshop', 'conversion', 'checkout', 
        'payment', 'warenkorb', 'produktkatalog', 'bestellung', 'versand',
        'mobile commerce', 'pwa', 'personalisierung', 'recommendation'
      ],
      technologies: [
        'React', 'Angular', 'Vue.js', 'Next.js', 'TypeScript', 'Node.js',
        'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Shopify',
        'Magento', 'WooCommerce', 'Stripe', 'PayPal', 'Kubernetes'
      ],
      regulations: ['DSGVO', 'PCI-DSS', 'Cookie-Law', 'Verbraucherschutz'],
      kpis: ['Conversion Rate', 'AOV', 'CAC', 'LTV', 'Cart Abandonment', 'Mobile Conversion'],
      focusAreas: ['Mobile Experience', 'Payment Integration', 'Performance', 'SEO']
    },
    {
      id: 'healthcare',
      name: 'Healthcare & Medizin',
      icon: '🏥',
      description: 'Krankenhäuser, Praxen, Medizintechnik',
      keywords: [
        'patient', 'krankenhaus', 'arzt', 'diagnose', 'behandlung',
        'medizinische daten', 'patientenakte', 'telemedicine', 'health app',
        'medical device', 'klinik', 'gesundheitswesen', 'pharma'
      ],
      technologies: [
        'FHIR', 'HL7', 'DICOM', 'Java Spring', 'React', 'Angular',
        'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS HIPAA',
        'Azure Healthcare', 'Blockchain', 'TensorFlow'
      ],
      regulations: ['HIPAA', 'DSGVO', 'MDR', 'FDA', 'ISO 27001', 'ISO 13485'],
      kpis: ['Patient Satisfaction', 'Behandlungszeit', 'Fehlerrate', 'Compliance Score'],
      focusAreas: ['Data Security', 'Compliance', 'Interoperability', 'User Safety']
    },
    {
      id: 'fintech',
      name: 'Fintech & Banking',
      icon: '💰',
      description: 'Payment, Banking, Blockchain, Trading',
      keywords: [
        'payment', 'banking', 'fintech', 'kreditkarte', 'überweisung',
        'blockchain', 'cryptocurrency', 'trading', 'investment',
        'robo advisor', 'risk management', 'fraud detection', 'sepa'
      ],
      technologies: [
        'Java Spring Security', 'Node.js', 'React', 'Angular', 'PostgreSQL',
        'Redis', 'Kafka', 'Elasticsearch', 'Kubernetes', 'AWS', 'Azure',
        'Blockchain', 'TensorFlow', 'Apache Spark'
      ],
      regulations: ['PCI-DSS', 'PSD2', 'GDPR', 'Basel III', 'MiFID II', 'AML'],
      kpis: ['Transaction Volume', 'Fraud Rate', 'Compliance Score', 'Customer Acquisition'],
      focusAreas: ['Security', 'Real-time Processing', 'Fraud Prevention', 'Compliance']
    },
    {
      id: 'manufacturing',
      name: 'Manufacturing & Industry 4.0',
      icon: '🏭',
      description: 'Produktion, IoT, Smart Factory, Automation',
      keywords: [
        'produktion', 'fertigung', 'industrie 4.0', 'iot', 'smart factory',
        'predictive maintenance', 'quality control', 'supply chain',
        'automation', 'robotik', 'sensor data', 'machine learning'
      ],
      technologies: [
        'Java Spring', 'Python', 'React', 'Angular', 'TypeScript',
        'PostgreSQL', 'InfluxDB', 'MongoDB', 'Kafka', 'MQTT',
        'Docker', 'Kubernetes', 'AWS IoT', 'Azure IoT', 'TensorFlow'
      ],
      regulations: ['ISO 9001', 'ISO 14001', 'REACH', 'CE', 'FDA'],
      kpis: ['OEE', 'Qualitätsrate', 'Durchlaufzeit', 'Energieeffizienz'],
      focusAreas: ['IoT Integration', 'Predictive Analytics', 'Automation', 'Quality Control']
    }
  ];

  getAllIndustries(): Industry[] {
    return this.industries;
  }

  getIndustryById(id: string): Industry | undefined {
    return this.industries.find(industry => industry.id === id);
  }

  detectIndustry(text: string): { industry: Industry; confidence: number } {
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
      
      // Bonus for technology matches
      industry.technologies.forEach(tech => {
        const regex = new RegExp(`\\b${tech}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * 0.5; // Lower weight for tech
        }
      });
      
      industryScores[industry.id] = score;
    });

    // Find industry with highest score
    const bestIndustryId = Object.keys(industryScores).reduce((a, b) => 
      industryScores[a] > industryScores[b] ? a : b
    );
    
    const bestIndustry = this.getIndustryById(bestIndustryId)!;
    const maxScore = Math.max(...Object.values(industryScores));
    const totalWords = text.split(/\s+/).length;
    const confidence = Math.min(95, Math.round((maxScore / totalWords) * 1000));

    return {
      industry: bestIndustry,
      confidence: Math.max(10, confidence) // Minimum 10% confidence
    };
  }

  analyzeText(text: string, selectedIndustryId?: string): EnhancedAnalysisResult {
    // Use selected industry or auto-detect
    let detectedResult;
    if (selectedIndustryId && selectedIndustryId !== 'auto') {
      const selectedIndustry = this.getIndustryById(selectedIndustryId);
      detectedResult = {
        industry: selectedIndustry!,
        confidence: 95 // High confidence for manual selection
      };
    } else {
      detectedResult = this.detectIndustry(text);
    }

    // Extract categorized keywords
    const keywordCategories = this.categorizeKeywords(text, detectedResult.industry);
    
    // Generate industry-specific recommendations
    const recommendations = this.generateRecommendations(text, detectedResult.industry);
    
    // Perform compliance analysis
    const complianceResults = this.analyzeCompliance(text, detectedResult.industry);
    
    // Calculate risk assessment
    const riskAssessment = this.calculateRisk(text, detectedResult.industry);
    
    // Estimate budget and timeline
    const budgetEstimate = this.estimateBudget(text, detectedResult.industry);
    const timeline = this.estimateTimeline(text, detectedResult.industry);
    
    // Recommend tech stack
    const recommendedStack = this.recommendTechStack(text, detectedResult.industry);
    
    // Define success metrics
    const successMetrics = this.defineSuccessMetrics(text, detectedResult.industry);

    return {
      keywords: [...keywordCategories.technology, ...keywordCategories.business, ...keywordCategories.compliance],
      summary: this.generateSummary(text, detectedResult.industry),
      recommendations: recommendations.all,
      
      detectedIndustry: detectedResult.industry,
      confidence: detectedResult.confidence,
      
      technologyKeywords: keywordCategories.technology,
      businessKeywords: keywordCategories.business,
      complianceKeywords: keywordCategories.compliance,
      
      highPriorityRecommendations: recommendations.high,
      mediumPriorityRecommendations: recommendations.medium,
      lowPriorityRecommendations: recommendations.low,
      
      complianceResults,
      riskAssessment,
      estimatedBudget: budgetEstimate,
      timeline,
      recommendedStack,
      successMetrics
    };
  }

  private categorizeKeywords(text: string, industry: Industry) {
    const technology: string[] = [];
    const business: string[] = [];
    const compliance: string[] = [];

    // Extract technology keywords
    industry.technologies.forEach(tech => {
      if (new RegExp(`\\b${tech}\\b`, 'gi').test(text)) {
        technology.push(tech);
      }
    });

    // Extract business keywords
    industry.keywords.forEach(keyword => {
      if (new RegExp(`\\b${keyword}\\b`, 'gi').test(text)) {
        business.push(keyword);
      }
    });

    // Extract compliance keywords
    industry.regulations.forEach(reg => {
      if (new RegExp(`\\b${reg}\\b`, 'gi').test(text)) {
        compliance.push(reg);
      }
    });

    return {
      technology: technology.slice(0, 8),
      business: business.slice(0, 8),
      compliance: compliance.slice(0, 6)
    };
  }

  private generateRecommendations(text: string, industry: Industry) {
    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];

    // Industry-specific recommendation logic
    switch (industry.id) {
      case 'ecommerce':
        if (text.toLowerCase().includes('mobile') || text.toLowerCase().includes('conversion')) {
          high.push('Progressive Web App (PWA) für bessere Mobile Experience');
          high.push('Mobile-First Design mit Touch-optimierter Navigation');
        }
        if (text.toLowerCase().includes('payment') || text.toLowerCase().includes('checkout')) {
          high.push('Integrierte Payment-Lösungen (Stripe, PayPal, Klarna)');
          medium.push('One-Click Checkout für Stammkunden');
        }
        if (text.toLowerCase().includes('performance') || text.toLowerCase().includes('speed')) {
          high.push('CDN Implementation für globale Performance');
          medium.push('Image Optimization mit WebP/AVIF Format');
        }
        low.push('A/B Testing Framework für Conversion-Optimierung');
        low.push('Personalisierte Produktempfehlungen mit ML');
        break;

      case 'healthcare':
        high.push('End-to-End Verschlüsselung für Patientendaten');
        high.push('HIPAA-konforme Datenspeicherung und -verarbeitung');
        high.push('Audit Logging für alle kritischen Operationen');
        medium.push('FHIR-Standard für Dateninteroperabilität');
        medium.push('Multi-Factor Authentication für alle Benutzer');
        low.push('Telemedicine-Integration für Remote-Consultations');
        break;

      case 'fintech':
        high.push('PCI-DSS Level 1 Compliance für Payment Processing');
        high.push('Real-time Fraud Detection mit Machine Learning');
        high.push('Strong Customer Authentication (SCA) nach PSD2');
        medium.push('Tokenization für sensible Finanzdaten');
        medium.push('API Rate Limiting und DDoS Protection');
        low.push('Blockchain-Integration für Transparenz');
        break;

      case 'manufacturing':
        high.push('MQTT-Protokoll für IoT-Sensor-Kommunikation');
        high.push('Edge Computing für Latency-kritische Anwendungen');
        medium.push('Predictive Maintenance mit Machine Learning');
        medium.push('InfluxDB für Zeitreihendaten von Sensoren');
        low.push('Digital Twin Implementation für Simulation');
        low.push('Automated Quality Control mit Computer Vision');
        break;
    }

    return {
      all: [...high, ...medium, ...low],
      high,
      medium,
      low
    };
  }

  private analyzeCompliance(text: string, industry: Industry) {
    return industry.regulations.map(regulation => {
      const keywords = this.getRegulationKeywords(regulation);
      const foundKeywords = keywords.filter(keyword => 
        new RegExp(`\\b${keyword}\\b`, 'gi').test(text)
      );
      
      const relevance = foundKeywords.length > 0 ? 'high' : 
                      (text.toLowerCase().includes(regulation.toLowerCase()) ? 'medium' : 'low');
      
      return {
        regulation,
        relevance: relevance as 'high' | 'medium' | 'low',
        foundKeywords,
        requirements: this.getRegulationRequirements(regulation),
        riskLevel: this.calculateComplianceRisk(text, regulation) as 'high' | 'medium' | 'low'
      };
    });
  }

  private getRegulationKeywords(regulation: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'DSGVO': ['datenschutz', 'privacy', 'cookie', 'consent'],
      'HIPAA': ['patient', 'medical', 'health', 'phi'],
      'PCI-DSS': ['payment', 'card', 'transaction', 'credit'],
      'ISO 9001': ['quality', 'process', 'documentation'],
      'PSD2': ['payment', 'banking', 'authentication']
    };
    return keywordMap[regulation] || [];
  }

  private getRegulationRequirements(regulation: string): string[] {
    const requirementMap: { [key: string]: string[] } = {
      'DSGVO': ['Cookie Consent Management', 'Data Anonymization', 'Right to be Forgotten'],
      'HIPAA': ['Administrative Safeguards', 'Physical Safeguards', 'Technical Safeguards'],
      'PCI-DSS': ['Secure Network', 'Cardholder Data Protection', 'Vulnerability Management'],
      'ISO 9001': ['Quality Management System', 'Process Documentation', 'Continuous Improvement']
    };
    return requirementMap[regulation] || [];
  }

  private calculateRisk(text: string, industry: Industry) {
    // Simplified risk calculation
    const securityRisk = this.calculateSecurityRisk(text, industry);
    const complianceRisk = this.calculateOverallComplianceRisk(text, industry);
    const technicalRisk = this.calculateTechnicalRisk(text, industry);
    
    return {
      overall: Math.max(securityRisk, complianceRisk, technicalRisk),
      security: securityRisk,
      compliance: complianceRisk,
      technical: technicalRisk,
      recommendations: this.getRiskRecommendations(securityRisk, complianceRisk, technicalRisk)
    };
  }

  private calculateSecurityRisk(text: string, industry: Industry): number {
    let risk = 3; // Base risk
    
    // Higher risk for certain industries
    if (['healthcare', 'fintech'].includes(industry.id)) {
      risk += 2;
    }
    
    // Lower risk if security measures mentioned
    if (text.toLowerCase().includes('encryption') || text.toLowerCase().includes('security')) {
      risk -= 1;
    }
    
    return Math.min(10, Math.max(1, risk));
  }

  private calculateOverallComplianceRisk(text: string, industry: Industry): number {
    let risk = 4; // Base risk
    
    // Higher risk for regulated industries
    if (industry.regulations.length > 2) {
      risk += 2;
    }
    
    // Lower risk if compliance mentioned
    if (text.toLowerCase().includes('compliance') || text.toLowerCase().includes('audit')) {
      risk -= 1;
    }
    
    return Math.min(10, Math.max(1, risk));
  }

  private calculateTechnicalRisk(text: string, industry: Industry): number {
    let risk = 3; // Base risk
    
    // Higher risk for complex projects
    if (text.length > 10000) {
      risk += 1;
    }
    
    // Lower risk if modern technologies mentioned
    const modernTech = ['kubernetes', 'docker', 'microservices', 'cloud'];
    if (modernTech.some(tech => text.toLowerCase().includes(tech))) {
      risk -= 1;
    }
    
    return Math.min(10, Math.max(1, risk));
  }

  private calculateComplianceRisk(text: string, regulation: string): string {
    // Simplified compliance risk calculation
    if (text.toLowerCase().includes(regulation.toLowerCase())) {
      return 'medium';
    }
    return 'high';
  }

  private getRiskRecommendations(security: number, compliance: number, technical: number): string[] {
    const recommendations: string[] = [];
    
    if (security > 6) {
      recommendations.push('Security Audit durch externes Unternehmen');
      recommendations.push('Penetration Testing vor Go-Live');
    }
    
    if (compliance > 6) {
      recommendations.push('Compliance-Beratung durch Rechtsexperten');
      recommendations.push('Regelmäßige Compliance-Audits einplanen');
    }
    
    if (technical > 6) {
      recommendations.push('Proof of Concept für kritische Komponenten');
      recommendations.push('Erfahrene Architekten für System-Design');
    }
    
    return recommendations;
  }

  private estimateBudget(text: string, industry: Industry) {
    // Base budget calculation
    let baseAmount = 100000; // 100k EUR base
    
    // Industry multipliers
    const industryMultipliers: { [key: string]: number } = {
      'ecommerce': 1.0,
      'healthcare': 1.8,
      'fintech': 2.0,
      'manufacturing': 1.5
    };
    
    // Complexity factor based on text length and keywords
    const complexityFactor = Math.min(3, 1 + (text.length / 10000));
    
    const multiplier = industryMultipliers[industry.id] || 1.0;
    const estimated = baseAmount * complexityFactor * multiplier;
    
    return {
      min: Math.round(estimated * 0.8),
      max: Math.round(estimated * 1.3),
      confidence: 'medium' as const,
      factors: [
        `Branche: ${industry.name} (${multiplier}x)`,
        `Komplexität: ${complexityFactor.toFixed(1)}x`,
        'Compliance-Anforderungen berücksichtigt',
        'Security-Standards eingerechnet'
      ]
    };
  }

  private estimateTimeline(text: string, industry: Industry) {
    // Base timeline in months
    const baseTimelines: { [key: string]: number } = {
      'ecommerce': 6,
      'healthcare': 12,
      'fintech': 15,
      'manufacturing': 9
    };
    
    const baseMonths = baseTimelines[industry.id] || 6;
    const complexityFactor = Math.min(2, 1 + (text.length / 15000));
    const estimated = Math.round(baseMonths * complexityFactor);
    
    return {
      estimated,
      phases: this.generateProjectPhases(industry),
      criticalPath: this.getCriticalPath(industry)
    };
  }

  private generateProjectPhases(industry: Industry) {
    const commonPhases = [
      { name: 'Discovery & Planning', duration: 1, dependencies: [], deliverables: ['Requirements', 'Architecture'] },
      { name: 'Core Development', duration: 3, dependencies: ['Discovery & Planning'], deliverables: ['MVP', 'Core Features'] },
      { name: 'Integration & Testing', duration: 2, dependencies: ['Core Development'], deliverables: ['Integrations', 'Test Results'] },
      { name: 'Launch & Support', duration: 1, dependencies: ['Integration & Testing'], deliverables: ['Go-Live', 'Documentation'] }
    ];
    
    // Add industry-specific phases
    if (industry.id === 'healthcare') {
      commonPhases.splice(2, 0, {
        name: 'Compliance Validation',
        duration: 1,
        dependencies: ['Core Development'],
        deliverables: ['HIPAA Audit', 'Security Certification']
      });
    }
    
    return commonPhases;
  }

  private getCriticalPath(industry: Industry): string[] {
    const commonPath = ['Requirements Analysis', 'Architecture Design', 'Core Development'];
    
    if (industry.id === 'healthcare') {
      commonPath.push('Security Implementation', 'HIPAA Compliance');
    } else if (industry.id === 'fintech') {
      commonPath.push('Security Implementation', 'Payment Integration', 'Fraud Detection');
    } else if (industry.id === 'ecommerce') {
      commonPath.push('Payment Integration', 'Mobile Optimization');
    }
    
    commonPath.push('Testing', 'Go-Live');
    return commonPath;
  }

  private recommendTechStack(text: string, industry: Industry) {
    // Base tech stack recommendations
    const base = {
      frontend: ['React 18+', 'TypeScript', 'Tailwind CSS'],
      backend: ['Node.js', 'Express.js', 'PostgreSQL'],
      database: ['PostgreSQL', 'Redis'],
      infrastructure: ['Docker', 'Kubernetes', 'AWS/Azure']
    };
    
    // Industry-specific additions
    switch (industry.id) {
      case 'ecommerce':
        base.frontend.push('Next.js', 'PWA');
        base.backend.push('Stripe API', 'PayPal SDK');
        base.database.push('Elasticsearch');
        break;
        
      case 'healthcare':
        base.backend.push('FHIR API', 'HL7');
        base.database.push('MongoDB');
        base.infrastructure.push('AWS HIPAA', 'VPN');
        break;
        
      case 'fintech':
        base.backend.push('Spring Security', 'Kafka');
        base.database.push('Apache Cassandra');
        base.infrastructure.push('API Gateway', 'WAF');
        break;
        
      case 'manufacturing':
        base.backend.push('MQTT', 'Apache Kafka');
        base.database.push('InfluxDB', 'MongoDB');
        base.infrastructure.push('Edge Computing', 'IoT Gateway');
        break;
    }
    
    return base;
  }

  private defineSuccessMetrics(text: string, industry: Industry) {
    const baseMetrics = [
      { name: 'Performance', current: 'TBD', target: '<3s Ladezeit', improvement: '+60%' },
      { name: 'User Satisfaction', current: 'TBD', target: '>4.5/5', improvement: '+25%' }
    ];
    
    // Industry-specific metrics
    switch (industry.id) {
      case 'ecommerce':
        baseMetrics.push(
          { name: 'Conversion Rate', current: '2.1%', target: '4.5%', improvement: '+114%' },
          { name: 'Mobile Conversion', current: '1.2%', target: '3.8%', improvement: '+217%' }
        );
        break;
        
      case 'healthcare':
        baseMetrics.push(
          { name: 'Data Security Score', current: 'TBD', target: '98%', improvement: '+30%' },
          { name: 'Compliance Score', current: 'TBD', target: '100%', improvement: '+40%' }
        );
        break;
        
      case 'fintech':
        baseMetrics.push(
          { name: 'Transaction Processing', current: 'TBD', target: '<100ms', improvement: '+200%' },
          { name: 'Fraud Detection Rate', current: 'TBD', target: '99.5%', improvement: '+15%' }
        );
        break;
    }
    
    return baseMetrics;
  }

  private generateSummary(text: string, industry: Industry): string {
    // Extract key information from text
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const firstParagraph = lines.slice(0, 3).join(' ').substring(0, 200);
    
    return `${industry.name}-Projekt: ${firstParagraph}... [Analysiert mit branchenspezifischer KI für optimale ${industry.focusAreas.join(', ')} Empfehlungen]`;
  }
}