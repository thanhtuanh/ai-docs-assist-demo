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
  activeTab: 'upload' | 'text' = 'upload'; // Tab state

  constructor(
    private documentService: DocumentService,
    private http: HttpClient,
    private router: Router
  ) {}

  // Tab management
  setActiveTab(tab: 'upload' | 'text') {
    this.activeTab = tab;
    this.clearError();
    console.log('Switched to tab:', tab);
  }

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
    this.inputText = `# Projektbeschreibung: E-Commerce Platform

## Überblick
Entwicklung einer modernen E-Commerce-Plattform mit React Frontend und Node.js Backend.

## Technische Anforderungen
- React.js für das Frontend
- Node.js mit Express für das Backend
- MongoDB als Datenbank
- JWT für Authentifizierung
- Stripe für Zahlungsabwicklung

## Features
- Produktkatalog mit Suchfunktion
- Warenkorb und Checkout-Prozess
- Benutzerverwaltung
- Admin-Dashboard
- Responsive Design

## Zielgruppe
Kleine bis mittlere Unternehmen, die ihre Produkte online verkaufen möchten.`;
    
    console.log('Sample text loaded');
  }

  // Export analysis results
  exportResults() {
    if (!this.analysisResult) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      source: this.activeTab === 'upload' ? 'document' : 'text',
      filename: this.activeTab === 'upload' ? this.selectedFile?.name : 'text-analysis',
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
