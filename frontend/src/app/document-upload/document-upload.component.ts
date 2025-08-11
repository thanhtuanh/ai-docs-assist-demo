import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { timeout, finalize } from 'rxjs/operators';
import { DocumentService } from '../document.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-document-upload',
  templateUrl: './document-upload.component.html',
  styleUrls: ['./document-upload.component.css']
})
export class DocumentUploadComponent {
  selectedFile: File | null = null;
  inputText: string = '';
  isProcessing = false;
  analysisResult: any = null;
  uploadError = '';

  constructor(
    private documentService: DocumentService,
    private http: HttpClient,
    private router: Router
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Debug logging
      console.log('File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Validate file
      if (file.size === 0) {
        this.uploadError = 'Die ausgewählte Datei ist leer (0 Bytes). Bitte wählen Sie eine gültige Datei aus.';
        this.selectedFile = null;
        return;
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        this.uploadError = `Die Datei ist zu groß (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximale Größe: 10 MB.`;
        this.selectedFile = null;
        return;
      }
      
      // Check file type
      const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.uploadError = `Dateityp "${file.type}" wird nicht unterstützt. Erlaubte Formate: PDF, TXT, DOC, DOCX.`;
        this.selectedFile = null;
        return;
      }
      
      this.selectedFile = file;
      this.uploadError = '';
      
      // Try to read file preview for additional validation
      this.previewFile(file);
      
      console.log('File validation passed:', {
        name: file.name,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        type: file.type
      });
    }
  }

  // Preview file content to validate it's readable
  private previewFile(file: File) {
    if (file.type === 'text/plain' || file.type === 'text/csv' || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const content = e.target.result;
        console.log('File preview (first 200 chars):', content.substring(0, 200));
        
        if (!content || content.trim().length === 0) {
          this.uploadError = 'Die Datei scheint leer zu sein oder enthält nur Leerzeichen.';
          this.selectedFile = null;
        }
      };
      reader.onerror = (e) => {
        console.error('Error reading file:', e);
        this.uploadError = 'Fehler beim Lesen der Datei. Die Datei könnte beschädigt sein.';
        this.selectedFile = null;
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      // For PDF files, just check if we can read it as ArrayBuffer
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const arrayBuffer = e.target.result;
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          this.uploadError = 'Die PDF-Datei scheint beschädigt oder leer zu sein.';
          this.selectedFile = null;
        } else {
          console.log('PDF file loaded successfully, size:', arrayBuffer.byteLength, 'bytes');
        }
      };
      reader.onerror = (e) => {
        console.error('Error reading PDF file:', e);
        this.uploadError = 'Fehler beim Lesen der PDF-Datei. Die Datei könnte beschädigt sein.';
        this.selectedFile = null;
      };
      reader.readAsArrayBuffer(file);
    }
  }

  uploadDocument() {
    if (!this.selectedFile) {
      this.uploadError = 'Bitte wählen Sie eine Datei aus.';
      return;
    }

    // Additional validation before upload
    const validationResult = this.validateFileForUpload(this.selectedFile);
    if (!validationResult.isValid) {
      this.uploadError = validationResult.errorMessage;
      return;
    }

    this.isProcessing = true;
    this.uploadError = '';
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    console.log('Starting upload for file:', {
      name: this.selectedFile.name,
      size: this.selectedFile.size,
      type: this.selectedFile.type
    });

    // Add timeout and better error handling
    this.documentService.createDocument(formData)
      .pipe(
        timeout(60000), // 60 second timeout
        finalize(() => this.isProcessing = false)
      )
      .subscribe({
        next: (response: any) => {
          console.log('Upload successful:', response);
          if (response && response.document) {
            this.analysisResult = this.processApiResponse(response.document);
          } else {
            this.analysisResult = response; 
          }
        },
        error: (error: any) => {
          console.error('Upload error:', error);
          if (error.name === 'TimeoutError') {
            this.uploadError = 'Upload-Timeout: Die Verarbeitung dauert zu lange. Bitte versuchen Sie es mit einer kleineren Datei.';
          } else if (error.status === 0) {
            this.uploadError = 'Verbindungsfehler: Kann den Server nicht erreichen. Bitte prüfen Sie Ihre Internetverbindung.';
          } else if (error.status === 413) {
            this.uploadError = 'Die Datei ist zu groß für den Server. Maximale Größe: 10 MB.';
          } else if (error.status === 415) {
            this.uploadError = 'Dateityp wird vom Server nicht unterstützt.';
          } else {
            this.uploadError = `Fehler beim Upload: ${error.message || 'Unbekannter Fehler'}`;
          }
        }
      });
  }

  // Comprehensive file validation
  private validateFileForUpload(file: File): { isValid: boolean; errorMessage: string } {
    // Check if file exists and has content
    if (!file) {
      return { isValid: false, errorMessage: 'Keine Datei ausgewählt.' };
    }

    if (file.size === 0) {
      return { 
        isValid: false, 
        errorMessage: 'Die Datei ist leer (0 Bytes). Möglicherweise ist die Datei beschädigt oder wurde nicht korrekt ausgewählt.' 
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { 
        isValid: false, 
        errorMessage: `Die Datei ist zu groß (${this.formatFileSize(file.size)}). Maximale Größe: 10 MB.` 
      };
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'text/plain', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { 
        isValid: false, 
        errorMessage: `Dateityp "${this.getFileTypeDisplay(file.type)}" wird nicht unterstützt. Erlaubte Formate: PDF, TXT, DOC, DOCX, CSV, JSON, MD.` 
      };
    }

    // Check file name
    if (file.name.length > 255) {
      return { 
        isValid: false, 
        errorMessage: 'Der Dateiname ist zu lang. Maximale Länge: 255 Zeichen.' 
      };
    }

    // Additional checks for specific file types
    if (file.type === 'application/pdf' && file.size < 100) {
      return { 
        isValid: false, 
        errorMessage: 'Die PDF-Datei scheint zu klein oder beschädigt zu sein.' 
      };
    }

    return { isValid: true, errorMessage: '' };
  }

  analyzeText() {
    if (!this.inputText.trim()) {
      this.uploadError = 'Bitte Text eingeben.';
      return;
    }

    this.isProcessing = true;
    this.uploadError = '';

    this.documentService.analyzeText(this.inputText)
      .pipe(
        timeout(60000), // 60 second timeout
        finalize(() => this.isProcessing = false)
      )
      .subscribe({
        next: (response: any) => {
          console.log('Text analysis successful:', response);
          if (response && response.document) {
            this.analysisResult = this.processApiResponse(response.document);
          } else {
            this.analysisResult = response;
          }
        },
        error: (error: any) => {
          console.error('Text analysis error:', error);
          if (error.name === 'TimeoutError') {
            this.uploadError = 'Analyse-Timeout: Die Verarbeitung dauert zu lange. Bitte versuchen Sie es mit einem kürzeren Text.';
          } else if (error.status === 0) {
            this.uploadError = 'Verbindungsfehler: Kann den Server nicht erreichen. Bitte prüfen Sie Ihre Internetverbindung.';
          } else {
            this.uploadError = `Fehler bei der Textanalyse: ${error.message || 'Unbekannter Fehler'}`;
          }
        }
      });
  }

  // ✅ Neue Methode zur Verarbeitung der API-Antwort
  processApiResponse(document: any): any {
    const result = {
      summary: document.summary || '',
      keywords: this.parseKeywords(document.keywords),
      suggestedComponents: this.parseSuggestedComponents(document.suggestedComponents),
      qualityScore: document.qualityScore || 0,
      documentType: document.documentType || '',
      complexityLevel: document.complexityLevel || ''
    };

    console.log('Processed API Response:', result);
    return result;
  }

  // ✅ Keywords aus JSON-String oder Text extrahieren
  parseKeywords(keywordsString: string): string[] {
    if (!keywordsString) return [];
    
    try {
      // Versuche JSON zu parsen
      if (keywordsString.includes('```json')) {
        const jsonMatch = keywordsString.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          const keywords: string[] = [];
          
          // Extrahiere alle Keywords aus der verschachtelten Struktur
          if (parsed.projekt) keywords.push(...parsed.projekt);
          if (parsed.technologien) {
            Object.values(parsed.technologien).forEach((tech: any) => {
              if (Array.isArray(tech)) keywords.push(...tech);
            });
          }
          if (parsed.konzepte) keywords.push(...parsed.konzepte);
          if (parsed.priorität_hoch) keywords.push(...parsed.priorität_hoch);
          
          return [...new Set(keywords)]; // Duplikate entfernen
        }
      }
      
      // Fallback: Als JSON parsen
      const parsed = JSON.parse(keywordsString);
      if (Array.isArray(parsed)) return parsed;
      
      // Wenn es ein Objekt ist, alle Werte sammeln
      const keywords: string[] = [];
      Object.values(parsed).forEach((value: any) => {
        if (Array.isArray(value)) keywords.push(...value);
        else if (typeof value === 'string') keywords.push(value);
      });
      return keywords;
      
    } catch (e) {
      // Fallback: String aufteilen
      return keywordsString.split(/[,;\n]/).map(k => k.trim()).filter(k => k.length > 0);
    }
  }

  // ✅ Suggested Components aus Text extrahieren
  parseSuggestedComponents(componentsString: string): string[] {
    if (!componentsString) return [];
    
    // Extrahiere Komponenten in eckigen Klammern [Component]
    const matches = componentsString.match(/\[([^\]]+)\]/g);
    if (matches) {
      return matches.map(match => match.replace(/[\[\]]/g, ''));
    }
    
    // Fallback: Nach Zeilen aufteilen und filtern
    return componentsString.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('-'))
      .slice(0, 10); // Maximal 10 Komponenten
  }

  submitQuickFeedback(helpful: boolean) {
    console.log('Feedback:', helpful ? 'Hilfreich' : 'Nicht hilfreich');
    alert(helpful ? '👍 Danke für Ihr positives Feedback!' : '👎 Danke für Ihr Feedback. Wir arbeiten an Verbesserungen.');
  }

  // Helper methods for file display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeDisplay(mimeType: string): string {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'text/plain': 'TXT',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'text/csv': 'CSV',
      'application/json': 'JSON',
      'text/markdown': 'MD'
    };
    
    return typeMap[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
  }

  // Clear selected file
  clearFile(fileInput: HTMLInputElement) {
    this.selectedFile = null;
    this.uploadError = '';
    this.analysisResult = null;
    fileInput.value = '';
    console.log('File cleared');
  }

  // Clear text input
  clearText() {
    this.inputText = '';
    this.uploadError = '';
    this.analysisResult = null;
    console.log('Text cleared');
  }

  // Clear error messages
  clearError() {
    this.uploadError = '';
  }

  // Load sample text for demonstration
  loadSampleText() {
    this.inputText = `PROJEKTANFRAGE: E-COMMERCE PLATTFORM FÜR PREMIUM LIFESTYLE PRODUKTE

Datum: 11. August 2025
Standort: München, Bayern, Deutschland
Auftraggeber: Premium Lifestyle GmbH
Projektleiter: Dr. Sarah Müller

EXECUTIVE SUMMARY
Die Premium Lifestyle GmbH plant die Entwicklung einer hochmodernen E-Commerce-Plattform für den Verkauf von Premium-Lifestyle-Produkten im deutschsprachigen Raum. Das Projekt soll bis Q2 2026 abgeschlossen werden und eine skalierbare, DSGVO-konforme Lösung bieten.

GESCHÄFTSHINTERGRUND
Unser Unternehmen ist seit 2018 im Premium-Lifestyle-Segment tätig und vertreibt hochwertige Produkte in den Bereichen:
- Luxus-Wohnaccessoires (Durchschnittspreis: 150-2.500 EUR)
- Designer-Möbel (Durchschnittspreis: 800-15.000 EUR)
- Exklusive Kunstobjekte (Durchschnittspreis: 500-25.000 EUR)
- Premium-Elektronik (Durchschnittspreis: 300-8.000 EUR)

Aktuell erfolgt der Verkauf hauptsächlich über physische Showrooms in München, Hamburg und Berlin. Der Online-Anteil beträgt nur 15% des Gesamtumsatzes (2024: 3,2 Mio. EUR). Ziel ist es, den Online-Anteil bis 2027 auf 60% zu steigern.

MARKTANALYSE UND ZIELGRUPPE
Primäre Zielgruppe:
- Alter: 35-65 Jahre
- Einkommen: >80.000 EUR/Jahr
- Wohnort: Großstädte (München, Hamburg, Berlin, Köln, Frankfurt)
- Affinität zu Premium-Marken und exklusiven Produkten
- Hohe Erwartungen an Service und Qualität

Sekundäre Zielgruppe:
- Geschäftskunden (Interior Designer, Architekten)
- Internationale Kunden (Österreich, Schweiz, Benelux)

TECHNISCHE ANFORDERUNGEN

Frontend-Technologien:
- React 18+ mit TypeScript für maximale Typsicherheit
- Next.js 14+ für Server-Side Rendering und SEO-Optimierung
- Tailwind CSS für responsive Design
- Framer Motion für Premium-Animationen
- React Query für effizientes State Management

Backend-Technologien:
- Node.js 20+ mit Express.js
- TypeScript für Backend-Entwicklung
- PostgreSQL als Hauptdatenbank
- Redis für Caching und Session-Management
- Elasticsearch für erweiterte Suchfunktionen

Cloud-Infrastruktur:
- AWS als Cloud-Provider (Frankfurt Region für DSGVO-Compliance)
- Docker-Container für Microservices-Architektur
- Kubernetes für Orchestrierung
- CloudFront CDN für globale Performance
- S3 für Medien-Storage

FUNKTIONALE ANFORDERUNGEN

Produktkatalog:
- Hierarchische Kategoriestruktur mit bis zu 5 Ebenen
- Erweiterte Filteroptionen (Preis, Marke, Material, Farbe, Stil)
- 360°-Produktansichten und Zoom-Funktionalität
- Augmented Reality (AR) für Möbel-Visualisierung
- Produktvergleichsfunktion
- Wishlist und Favoriten
- Produktbewertungen und Reviews

E-Commerce-Funktionen:
- Intelligenter Warenkorb mit Cross-Selling-Empfehlungen
- Multi-Step-Checkout mit Gastbestellung
- Verschiedene Zahlungsmethoden:
  * Kreditkarte (Visa, Mastercard, Amex)
  * PayPal und Apple Pay
  * SEPA-Lastschrift
  * Klarna (Ratenkauf für Hochpreisprodukte)
  * Kryptowährungen (Bitcoin, Ethereum)
- Flexible Versandoptionen:
  * Standard-Versand (3-5 Werktage)
  * Express-Versand (1-2 Werktage)
  * Premium White-Glove-Service für Möbel
  * Internationale Lieferung

Benutzerverwaltung:
- Registrierung mit E-Mail-Verifizierung
- Social Login (Google, Apple, Facebook)
- Zwei-Faktor-Authentifizierung (2FA)
- Detaillierte Benutzerprofile mit Präferenzen
- Bestellhistorie und Tracking
- Adressbuch mit mehreren Lieferadressen
- VIP-Kundenstatus mit exklusiven Vorteilen

Content Management:
- Headless CMS für flexible Content-Verwaltung
- Multi-Language-Support (Deutsch, Englisch, Französisch)
- SEO-optimierte Landingpages
- Blog-System für Lifestyle-Content
- Newsletter-Integration mit Segmentierung

NICHT-FUNKTIONALE ANFORDERUNGEN

Performance:
- Ladezeit <2 Sekunden für Produktseiten
- Core Web Vitals Score >90
- 99,9% Uptime-Garantie
- Skalierung für bis zu 10.000 gleichzeitige Benutzer

Sicherheit:
- SSL/TLS-Verschlüsselung (TLS 1.3)
- PCI DSS Level 1 Compliance für Zahlungsverarbeitung
- OWASP Top 10 Security Standards
- Regelmäßige Penetrationstests
- DDoS-Schutz und Web Application Firewall

DSGVO UND DATENSCHUTZ (KRITISCH)
- Vollständige DSGVO-Compliance (EU-DSGVO Art. 25)
- Privacy by Design und Privacy by Default
- Explizite Einwilligungsverwaltung für Cookies
- Recht auf Vergessenwerden (Art. 17 DSGVO)
- Datenportabilität (Art. 20 DSGVO)
- Datenschutz-Folgenabschätzung (DSFA)
- Bestellung eines Datenschutzbeauftragten
- Dokumentation aller Datenverarbeitungsprozesse
- Sichere Datenübertragung nur innerhalb der EU
- Anonymisierung von Analytics-Daten

INTEGRATION UND SCHNITTSTELLEN

ERP-Integration:
- SAP Business One für Warenwirtschaft
- Automatische Bestandssynchronisation
- Preismanagement und Rabattstrukturen

CRM-Integration:
- Salesforce für Kundenverwaltung
- Marketing-Automation mit HubSpot
- Customer Service mit Zendesk

Logistik-Partner:
- DHL für Standard-Versand
- UPS für Express-Lieferungen
- Spezialisierte Kunsttransporte für Hochwertobjekte

Marketing-Tools:
- Google Analytics 4 (DSGVO-konform)
- Google Ads und Facebook Ads Integration
- Mailchimp für E-Mail-Marketing
- Hotjar für User Experience Analytics

MOBILE STRATEGIE
- Mobile-First Design-Ansatz
- Progressive Web App (PWA) Funktionalität
- Native Apps für iOS und Android (Phase 2)
- Mobile Payment Integration (Apple Pay, Google Pay)
- Push-Notifications für Angebote und Updates

RISIKEN UND HERAUSFORDERUNGEN

Technische Risiken:
- Komplexe Integration verschiedener Systeme
- Performance-Optimierung bei hochauflösenden Produktbildern
- Skalierbarkeit während Verkaufsspitzen (Black Friday, Weihnachten)
- Datenmigration von Legacy-Systemen

Rechtliche Risiken:
- Änderungen in der DSGVO-Rechtsprechung
- Neue E-Commerce-Gesetze (Digital Services Act)
- Internationale Handelsbestimmungen
- Produkthaftung bei Kunstobjekten

Geschäftliche Risiken:
- Hohe Kundenerwartungen im Premium-Segment
- Starke Konkurrenz durch etablierte Luxus-E-Commerce-Anbieter
- Wirtschaftliche Unsicherheit und Inflation
- Lieferkettenprobleme bei exklusiven Produkten

BUDGET UND ZEITPLAN

Geschätztes Gesamtbudget: 850.000 - 1.200.000 EUR

Phase 1 (6 Monate): MVP-Entwicklung - 400.000 EUR
- Grundlegende E-Commerce-Funktionen
- DSGVO-konforme Basis-Implementation
- Desktop und Mobile Responsive Design

Phase 2 (4 Monate): Erweiterte Features - 300.000 EUR
- AR-Funktionalität
- Erweiterte Personalisierung
- Mobile Apps

Phase 3 (2 Monate): Optimierung und Launch - 150.000 EUR
- Performance-Optimierung
- Sicherheitstests
- Go-Live und Support

Laufende Kosten (jährlich): 120.000 EUR
- Cloud-Hosting und CDN
- Wartung und Updates
- Support und Monitoring

ERFOLGSMESSUNG (KPIs)

E-Commerce KPIs:
- Conversion Rate: Ziel >3,5%
- Average Order Value: Ziel >450 EUR
- Customer Lifetime Value: Ziel >2.800 EUR
- Cart Abandonment Rate: <65%

Technische KPIs:
- Page Load Speed: <2 Sekunden
- Mobile Performance Score: >90
- Uptime: >99,9%
- Security Score: A+ Rating

Business KPIs:
- Online-Umsatzanteil: 60% bis 2027
- Neue Kundenakquisition: +40% jährlich
- Kundenzufriedenheit: >4,5/5 Sterne
- Return on Investment: >250% nach 3 Jahren

COMPLIANCE UND ZERTIFIZIERUNGEN

Erforderliche Zertifizierungen:
- ISO 27001 für Informationssicherheit
- PCI DSS Level 1 für Zahlungsverarbeitung
- SOC 2 Type II für Cloud-Services
- Trusted Shops Gütesiegel

Rechtliche Compliance:
- DSGVO (EU-Datenschutz-Grundverordnung)
- Digital Services Act (DSA)
- Verbraucherrechte-Richtlinie
- Produktsicherheitsgesetz (ProdSG)

NACHHALTIGKEIT UND CSR

Umweltaspekte:
- CO2-neutrale Cloud-Infrastruktur
- Optimierung der Lieferketten
- Digitale Belege statt Papier
- Green Hosting mit erneuerbaren Energien

Soziale Verantwortung:
- Barrierefreie Website (WCAG 2.1 AA)
- Faire Arbeitsbedingungen bei Partnern
- Unterstützung lokaler Künstler und Designer

TECHNOLOGIE-TRENDS UND ZUKUNFTSSICHERHEIT

Emerging Technologies:
- Künstliche Intelligenz für Produktempfehlungen
- Machine Learning für Preisoptimierung
- Blockchain für Authentizitätszertifikate
- Voice Commerce Integration (Alexa, Google Assistant)

Zukunftssicherheit:
- Microservices-Architektur für Flexibilität
- API-First Approach für Integrationen
- Cloud-Native Development
- Continuous Integration/Continuous Deployment (CI/CD)

PROJEKTORGANISATION

Projektteam:
- Projektleiter: Dr. Sarah Müller (Premium Lifestyle GmbH)
- Technical Lead: Zu bestimmen (Entwicklungspartner)
- UX/UI Designer: Spezialisiert auf Luxury E-Commerce
- Backend-Entwickler: 3-4 Senior-Entwickler
- Frontend-Entwickler: 2-3 Senior-Entwickler
- DevOps-Engineer: 1 Senior-Engineer
- QA-Engineer: 2 Tester
- Datenschutzbeauftragter: Externe Beratung

Kommunikation:
- Wöchentliche Status-Meetings
- Bi-wöchentliche Stakeholder-Updates
- Monatliche Steering Committee Meetings
- Agile Entwicklung mit 2-Wochen-Sprints

AUSWAHLKRITERIEN FÜR ENTWICKLUNGSPARTNER

Technische Expertise:
- Nachgewiesene Erfahrung mit Premium E-Commerce
- DSGVO-Compliance Expertise
- AWS-Zertifizierungen
- Referenzen im Luxury-Segment

Projektmanagement:
- Agile Methodiken (Scrum/Kanban)
- Transparente Kommunikation
- Risikomanagement-Erfahrung
- Change Management Prozesse

Support und Wartung:
- 24/7 Support-Verfügbarkeit
- SLA-Garantien
- Proaktives Monitoring
- Regelmäßige Updates und Patches

NÄCHSTE SCHRITTE

1. Ausschreibung an qualifizierte Entwicklungspartner
2. Detaillierte Anforderungsanalyse mit ausgewählten Partnern
3. Proof of Concept für kritische Funktionen
4. Vertragsverhandlungen und Projektstart
5. Kick-off Meeting und Projektplanung

KONTAKTINFORMATION

Dr. Sarah Müller
Projektleiterin Digital Transformation
Premium Lifestyle GmbH
Maximilianstraße 35
80539 München

E-Mail: s.mueller@premium-lifestyle.de
Telefon: +49 89 123456789
LinkedIn: /in/sarah-mueller-digital

Dieses Dokument ist vertraulich und nur für den internen Gebrauch bestimmt. Alle Angaben unterliegen dem Datenschutz gemäß DSGVO.

---
Erstellt: 11. August 2025
Version: 1.0
Status: Zur Freigabe`;
    
    console.log('Realistic E-Commerce sample text loaded');
  }

  // Export analysis results
  exportResults() {
    if (!this.analysisResult) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      source: this.selectedFile ? 'document' : 'text',
      filename: this.selectedFile ? this.selectedFile.name : 'text-analysis',
      analysis: this.analysisResult
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis_${Date.now()}.json`;
    link.click();
    
    console.log('Results exported');
  }

  // Start new analysis
  startNewAnalysis() {
    this.analysisResult = null;
    this.uploadError = '';
    this.selectedFile = null;
    this.inputText = '';
    console.log('Started new analysis');
  }
}
