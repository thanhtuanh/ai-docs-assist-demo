import { Injectable } from '@angular/core';

export interface PreprocessingResult {
  originalLength: number;
  processedLength: number;
  compressionRatio: number;
  detectedLanguage: string;
  extractedKeywords: string[];
  sentimentIndicators: { [key: string]: number };
  qualityMetrics: { [key: string]: any };
  codeBlockCount: number;
  linkCount: number;
  technicalTermCount: number;
}

@Injectable({ providedIn: 'root' })
export class TextPreprocessingService {

  /**
   * Basic text preprocessing (client-side)
   */
  preprocessText(text: string): string {
    if (!text) return '';
    
    // Basic normalization
    let processed = text
      // Normalize line breaks
      .replace(/\r\n|\r/g, '\n')
      // Remove excessive whitespace
      .replace(/[ \t]+/g, ' ')
      // Limit consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim();
    
    return processed;
  }

  /**
   * Extract basic keywords (client-side implementation)
   */
  extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const stopWords = new Set([
      'der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'von', 'zu', 'mit',
      'the', 'and', 'or', 'but', 'in', 'of', 'to', 'with', 'for', 'on', 'at'
    ]);
    
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    // Count frequency
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Detect basic sentiment indicators (client-side)
   */
  detectSentimentIndicators(text: string): { [key: string]: number } {
    const positiveWords = ['gut', 'besser', 'excellent', 'optimal', 'erfolgreich'];
    const negativeWords = ['schlecht', 'fehler', 'problem', 'mangel', 'schwierig'];
    const neutralWords = ['system', 'prozess', 'methode', 'funktion', 'analyse'];
    
    const lowerText = text.toLowerCase();
    
    const positive = positiveWords.reduce((count, word) => 
      count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    
    const negative = negativeWords.reduce((count, word) => 
      count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    
    const neutral = neutralWords.reduce((count, word) => 
      count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    
    return { positive, negative, neutral };
  }

  /**
   * Detect language (basic implementation)
   */
  detectLanguage(text: string): string {
    const germanWords = ['der', 'die', 'das', 'und', 'ist', 'mit', 'für'];
    const englishWords = ['the', 'and', 'is', 'with', 'for', 'that', 'this'];
    
    const lowerText = text.toLowerCase();
    
    const germanScore = germanWords.reduce((score, word) => 
      score + (lowerText.includes(` ${word} `) ? 1 : 0), 0);
    
    const englishScore = englishWords.reduce((score, word) => 
      score + (lowerText.includes(` ${word} `) ? 1 : 0), 0);
    
    if (germanScore > englishScore) return 'DE';
    if (englishScore > germanScore) return 'EN';
    return 'UNKNOWN';
  }

  /**
   * Create basic quality analysis
   */
  analyzeTextQuality(text: string): { [key: string]: any } {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^\w]/g, '')));
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      averageWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
      uniqueWords: uniqueWords.size,
      lexicalDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
      readabilityScore: this.calculateReadabilityScore(text),
      overallQualityScore: this.calculateOverallQuality(text)
    };
  }

  /**
   * Calculate basic readability score
   */
  private calculateReadabilityScore(text: string): number {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 100;
    
    const avgWordsPerSentence = words.length / sentences.length;
    
    // Simplified Flesch formula
    const score = 206.835 - (1.015 * avgWordsPerSentence);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate overall quality score (FIXED - proper array access)
   */
  private calculateOverallQuality(text: string): number {
    let score = 0;
    
    const analysis = this.analyzeTextQuality(text);
    
    // Word count factor (FIXED - using bracket notation)
    if (analysis['wordCount'] > 100) score += 20;
    if (analysis['wordCount'] > 500) score += 10;
    
    // Structure factor (FIXED - using bracket notation)
    if (analysis['paragraphCount'] > 2) score += 15;
    if (text.includes('\n')) score += 10;
    
    // Readability factor (FIXED - using bracket notation)
    if (analysis['readabilityScore'] > 60) score += 25;
    
    // Technical content factor
    const techTerms = ['API', 'System', 'Framework', 'Database', 'Software'];
    const hasTechTerms = techTerms.some(term => 
      text.toLowerCase().includes(term.toLowerCase()));
    if (hasTechTerms) score += 20;
    
    return Math.min(100, score);
  }

  /**
   * Get preprocessing result summary
   */
  getPreprocessingResult(originalText: string, processedText: string): PreprocessingResult {
    const keywords = this.extractKeywords(processedText, 10);
    const sentiment = this.detectSentimentIndicators(processedText);
    const quality = this.analyzeTextQuality(processedText);
    
    return {
      originalLength: originalText.length,
      processedLength: processedText.length,
      compressionRatio: originalText.length > 0 ? processedText.length / originalText.length : 1,
      detectedLanguage: this.detectLanguage(processedText),
      extractedKeywords: keywords,
      sentimentIndicators: sentiment,
      qualityMetrics: quality,
      codeBlockCount: (processedText.match(/```/g) || []).length / 2,
      linkCount: (processedText.match(/https?:\/\/[^\s]+/g) || []).length,
      technicalTermCount: this.countTechnicalTerms(processedText)
    };
  }

  private countTechnicalTerms(text: string): number {
    const techTerms = [
      'API', 'REST', 'JSON', 'XML', 'HTTP', 'HTTPS', 'SQL', 'NoSQL',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Spring', 'Django',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'DevOps'
    ];
    
    const lowerText = text.toLowerCase();
    return techTerms.reduce((count, term) => {
      const matches = lowerText.match(new RegExp(`\\b${term.toLowerCase()}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }
}