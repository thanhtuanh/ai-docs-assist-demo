// In der Component, die das AnalysisResult anzeigt
// (z.B. document-analysis.component.ts oder analysis-results.component.ts)

import { Component, OnInit, OnDestroy } from '@angular/core';
import { DocumentAnalysisService, AnalysisResult } from './document-analysis.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-analysis-results',
  templateUrl: './analysis-results.component.html',
  styleUrls: ['./analysis-results.component.css']
})
export class AnalysisResultsComponent implements OnInit, OnDestroy {
  
  analysisResult: AnalysisResult | null = null;
  private subscription: Subscription = new Subscription();

  constructor(private documentAnalysisService: DocumentAnalysisService) {}

  ngOnInit() {
    console.log('🖥️ DEBUGGING: Component ngOnInit gestartet');
    
    // Subscribe zu analysisResult$ Observable
    this.subscription.add(
      this.documentAnalysisService.analysisResult$.subscribe(result => {
        console.log('🖥️ DEBUGGING: Component erhält Result:', result);
        
        if (result) {
          console.log('🏢 UI-Update: Branche =', result.detectedIndustry.name, 'Confidence =', result.detectedIndustry.confidence);
          console.log('🔧 UI-Update: Technologien =', result.keywords.technologies);
          console.log('🏢 UI-Update: Business-Terms =', result.keywords.businessTerms);
          console.log('📋 UI-Update: Compliance =', result.keywords.compliance);
          console.log('💰 UI-Update: Budget =', result.budget.min, '-', result.budget.max, '€');
          console.log('⏱️ UI-Update: Timeline =', result.timeline.months, 'Monate');
          console.log('🎯 UI-Update: Empfehlungen =', {
            high: result.recommendations.high.length,
            medium: result.recommendations.medium.length,
            low: result.recommendations.low.length
          });
          
          // Prüfe ob alle Arrays gefüllt sind
          console.log('📊 DEBUGGING: Vollständigkeits-Check:');
          console.log('  - Technologien leer?', result.keywords.technologies.length === 0);
          console.log('  - Business-Terms leer?', result.keywords.businessTerms.length === 0);
          console.log('  - Empfehlungen leer?', result.recommendations.high.length === 0);
          
        } else {
          console.log('❌ DEBUGGING: Component erhält NULL result');
        }
        
        this.analysisResult = result;
      })
    );
    
    console.log('✅ DEBUGGING: Component subscription eingerichtet');
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // Optional: Methode zum manuellen Testen
  testAnalysis() {
    console.log('🧪 DEBUGGING: Teste Frontend-Analyse manuell');
    const testText = `
      BITS Tech-Projekt
      BITS Digital Solutions: Technisches Projektdokument
      PROJEKTZIEL:
      Entwicklung einer skalierbaren Cloud-Anwendung zur Dokumentenverwaltung mit
      KI-gestützter Analyse.
      TECHNOLOGIE-STACK:
      • Frontend: Angular 16, Responsive Design
      • Backend: Spring Boot (REST API), Java 17
      • Datenbank: PostgreSQL, Elasticsearch
      • Cloud & DevOps: Docker, Kubernetes, GitLab CI/CD, AWS
      • Sicherheit: Keycloak, OAuth2, JWT
    `;
    
    this.documentAnalysisService.analyzeDocument(testText).subscribe();
  }
}