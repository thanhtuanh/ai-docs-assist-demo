// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
import { DocumentSummaryComponent } from './document-summary/document-summary.component';
import { AboutComponent } from './about/about.component';

/**
 * ✅ OPTIMIERTE App-Routing - Backend-API Orientiert
 * 
 * WICHTIGE ÄNDERUNGEN:
 * ❌ ENTFERNT: /analysis Route (nicht implementiert)
 * ❌ ENTFERNT: DocumentAnalysisComponent Route (lokale Analyse)
 * 
 * ✅ BEHALTEN: Nur funktionale Routes mit Backend-Integration
 * ✅ BEHALTEN: Document Summary mit Backend API
 * ✅ BEHALTEN: Upload mit Backend-Analyse
 */

const routes: Routes = [
  // ===================================
  // HAUPTROUTEN (Backend-integriert)
  // ===================================

  /**
   * ✅ Home/Upload Route - Hauptfunktionalität
   * Component: DocumentUploadComponent
   * Backend API: POST /api/documents/analyze-text, POST /api/documents
   */
  {
    path: '',
    component: DocumentUploadComponent,
    pathMatch: 'full',
    data: {
      title: 'AI Document Assistant',
      description: 'Dokumente analysieren mit Backend-KI'
    }
  },

  /**
   * ✅ Upload Route - Explizite Route für Upload
   * Component: DocumentUploadComponent  
   * Backend API: POST /api/documents, POST /api/documents/analyze-text
   */
  {
    path: 'upload',
    component: DocumentUploadComponent,
    data: {
      title: 'Dokument Upload',
      description: 'Neues Dokument zur Analyse hochladen'
    }
  },

  /**
   * ✅ Document Summary Route - Backend-Dokument anzeigen
   * Component: DocumentSummaryComponent
   * Backend API: GET /api/documents/{id}
   */
  {
    path: 'summary/:id',
    component: DocumentSummaryComponent,
    data: {
      title: 'Dokument Analyse',
      description: 'Analyse-Ergebnisse vom Backend anzeigen'
    }
  },

  /**
   * ✅ Document Details Route - Alternative für Summary
   * Component: DocumentSummaryComponent
   * Backend API: GET /api/documents/{id}
   */
  {
    path: 'document/:id',
    component: DocumentSummaryComponent,
    data: {
      title: 'Dokument Details',
      description: 'Detaillierte Dokument-Ansicht'
    }
  },

  /**
   * ✅ About Route - Statische Informationen
   * Component: AboutComponent
   * Backend API: Keine (statisch)
   */
  {
    path: 'about',
    component: AboutComponent,
    data: {
      title: 'Über AI Document Assistant',
      description: 'Informationen über die Anwendung'
    }
  },

  // ===================================
  // API INTEGRATION ROUTES (Entwicklung)
  // ===================================

  /**
   * ✅ Health Check Route - Backend-Status prüfen
   * Component: DocumentUploadComponent (mit Health Check)
   * Backend API: GET /api/ai/health, GET /api/documents/health
   */
  {
    path: 'health',
    component: DocumentUploadComponent,
    data: {
      title: 'Backend Health Check',
      description: 'Backend-Verbindung testen',
      healthCheck: true
    }
  },

  /**
   * ✅ Demo Route - Vordefinierte Demo-Analyse
   * Component: DocumentUploadComponent (mit Demo-Text)
   * Backend API: POST /api/documents/analyze-text
   */
  {
    path: 'demo',
    component: DocumentUploadComponent,
    data: {
      title: 'Demo Analyse',
      description: 'Demo mit vordefiniertem Text',
      demoMode: true
    }
  },

  /**
   * ✅ Demo Industry Routes - Branchenspezifische Demos
   * Component: DocumentUploadComponent
   * Backend API: POST /api/documents/analyze-text, POST /api/ai/detect-industry
   */
  {
    path: 'demo/ecommerce',
    component: DocumentUploadComponent,
    data: {
      title: 'E-Commerce Demo',
      description: 'Demo für E-Commerce Projekte',
      demoIndustry: 'ecommerce'
    }
  },
  {
    path: 'demo/healthcare',
    component: DocumentUploadComponent,
    data: {
      title: 'Healthcare Demo',
      description: 'Demo für Gesundheitswesen',
      demoIndustry: 'healthcare'
    }
  },
  {
    path: 'demo/fintech',
    component: DocumentUploadComponent,
    data: {
      title: 'Fintech Demo',
      description: 'Demo für Finanzwesen',
      demoIndustry: 'fintech'
    }
  },
  {
    path: 'demo/manufacturing',
    component: DocumentUploadComponent,
    data: {
      title: 'Manufacturing Demo',
      description: 'Demo für Produktion & Industry 4.0',
      demoIndustry: 'manufacturing'
    }
  },

  // ===================================
  // LEGACY REDIRECTS (Kompatibilität)
  // ===================================

  /**
   * ✅ Legacy Analysis Route Redirect
   * Alte /analysis Route → Upload mit Hinweis
   */
  {
    path: 'analysis',
    redirectTo: '/upload',
    pathMatch: 'full'
  },

  /**
   * ✅ Legacy Document Analysis Redirect  
   * Alte lokale Analyse → Upload mit Backend-Analyse
   */
  {
    path: 'document-analysis',
    redirectTo: '/upload',
    pathMatch: 'full'
  },

  // ===================================
  // ERROR HANDLING ROUTES
  // ===================================

  /**
   * ✅ 404 Fallback - Zurück zur Hauptseite
   * Alle unbekannten Routes → Upload Component
   */
  {
    path: '**',
    component: DocumentUploadComponent,
    data: {
      title: 'Seite nicht gefunden',
      description: 'Zurück zur Hauptfunktion',
      notFound: true
    }
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // ===================================
    // ROUTER KONFIGURATION (Korrekte Angular Options)
    // ===================================

    enableTracing: false,  // ✅ Kein Debug-Tracing in Production
    useHash: false,        // ✅ HTML5 Routing für moderne Browser

    // ✅ URL-Strategie für Backend-Integration
    onSameUrlNavigation: 'reload',  // Reload bei gleicher URL (für Refresh)

    // ✅ Scroll-Verhalten für bessere UX
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',

    // ✅ Initial Navigation (korrekte Option)
    initialNavigation: 'enabledBlocking'  // Warte auf erste Navigation
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {

  constructor() {
    console.log('🗺️ AppRoutingModule initialized - Backend-API Routes');
    console.log('📍 Available routes:');
    console.log('  / → DocumentUpload (Home)');
    console.log('  /upload → DocumentUpload (Explicit)');
    console.log('  /summary/:id → DocumentSummary (Backend API)');
    console.log('  /document/:id → DocumentSummary (Alternative)');
    console.log('  /about → About (Static)');
    console.log('  /demo → Demo Mode');
    console.log('  /demo/{industry} → Industry-specific Demos');
    console.log('  /health → Backend Health Check');
    console.log('✅ All routes integrated with Backend APIs');
  }
}

/**
 * ===================================
 * ROUTE DATA INTERFACES
 * ===================================
 */

export interface RouteData {
  title: string;
  description: string;
  healthCheck?: boolean;
  demoMode?: boolean;
  demoIndustry?: string;
  notFound?: boolean;
}

/**
 * ===================================
 * ROUTING HELPER SERVICE
 * ===================================
 */

export class RoutingHelper {

  /**
   * ✅ Navigiere zu Dokument-Summary
   */
  static navigateToDocument(router: any, documentId: string | number): void {
    router.navigate(['/summary', documentId]);
  }

  /**
   * ✅ Navigiere zu Demo mit Industry
   */
  static navigateToDemo(router: any, industry?: string): void {
    if (industry) {
      router.navigate(['/demo', industry]);
    } else {
      router.navigate(['/demo']);
    }
  }

  /**
   * ✅ Navigiere zu Upload mit Error-Parameter
   */
  static navigateToUploadWithError(router: any, errorMessage: string): void {
    router.navigate(['/upload'], {
      queryParams: { error: errorMessage }
    });
  }

  /**
   * ✅ Prüfe ob Route Backend-API benötigt
   */
  static requiresBackendApi(route: string): boolean {
    const backendRoutes = ['/summary/', '/document/', '/health'];
    return backendRoutes.some(r => route.startsWith(r));
  }

  /**
   * ✅ Extrahiere Dokument-ID aus Route
   */
  static extractDocumentId(route: string): string | null {
    const summaryMatch = route.match(/\/summary\/(\d+)/);
    const documentMatch = route.match(/\/document\/(\d+)/);

    if (summaryMatch) return summaryMatch[1];
    if (documentMatch) return documentMatch[1];

    return null;
  }

  /**
   * ✅ Prüfe ob Backend erreichbar ist
   */
  static async checkBackendAvailability(): Promise<boolean> {
    try {
      const response = await fetch('/api/ai/health', {
        method: 'GET',
        timeout: 5000
      } as any);
      return response.ok;
    } catch (error) {
      console.warn('🔌 Backend nicht erreichbar:', error);
      return false;
    }
  }

  /**
   * ✅ Generiere Route-Titel basierend auf Daten
   */
  static getRouteTitle(routeData: RouteData): string {
    if (routeData.notFound) return '404 - Seite nicht gefunden';
    if (routeData.healthCheck) return 'Backend Status';
    if (routeData.demoMode) return `Demo: ${routeData.demoIndustry || 'Allgemein'}`;
    return routeData.title;
  }
}