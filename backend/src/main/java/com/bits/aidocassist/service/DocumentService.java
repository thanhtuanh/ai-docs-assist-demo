package com.bits.aidocassist.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.repository.DocumentRepository;

@Service
public class DocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private OpenAIService openAIService;

    @Autowired
    private TextPreprocessingService preprocessingService;

    /**
     * Hauptmethode für Dokumentenverarbeitung
     */
    public Document processDocument(MultipartFile file) throws IOException {
        Document document = new Document();
        document.setFilename(file.getOriginalFilename());
        document.setFileType(file.getContentType());
        document.setUploadDate(new Date());

        // Text-Extraktion
        String rawText = extractText(file);

        // Preprocessing für bessere Analyse
        String processedText = preprocessingService.preprocessText(rawText);
        document.setContent(processedText);

        // Erweiterte Analyse mit mehreren Durchgängen
        performComprehensiveAnalysis(document, processedText);

        return documentRepository.save(document);
    }

    /**
     * Umfassende Dokumentenanalyse
     */
    private void performComprehensiveAnalysis(Document document, String text) {
        // Basis-Klassifizierung
        OpenAIService.DocumentClassification classification = openAIService.classifyDocument(text);
        document.setDocumentType(classification.typ);
        document.setComplexityLevel(classification.komplexität);

        // Intelligente Zusammenfassung basierend auf Dokumenttyp
        String summary = generateContextualSummary(text, classification.typ);
        document.setSummary(summary);

        // Erweiterte Keyword-Extraktion
        Map<String, List<String>> keywords = openAIService.extractKeywords(text);
        document.setKeywords(formatKeywords(keywords));

        // Technische Empfehlungen mit Kontext
        OpenAIService.TechRecommendation recommendations = openAIService.generateTechRecommendations(text,
                classification.typ);
        document.setRecommendations(formatRecommendations(recommendations));

        // Sentiment-Analyse
        OpenAIService.SentimentAnalysis sentiment = openAIService.analyzeSentiment(text);
        document.setSentiment(sentiment.sentiment);
        document.setTone(sentiment.ton);

        // Qualitäts-Score berechnen
        double qualityScore = calculateQualityScore(document, text);
        document.setQualityScore(qualityScore);
    }

    /**
     * Kontextbasierte Zusammenfassung
     */
    private String generateContextualSummary(String text, String documentType) {
        // Verschiedene Zusammenfassungsstrategien je nach Dokumenttyp
        switch (documentType.toLowerCase()) {
            case "technische dokumentation":
                return generateTechnicalSummary(text);
            case "anforderungen":
                return generateRequirementsSummary(text);
            case "code":
                return generateCodeSummary(text);
            default:
                return openAIService.generateSummary(text);
        }
    }

    public Document getDocumentById(Long id) {
        return documentRepository.findById(id).orElse(null);
    }

    private String generateRequirementsSummary(String text) {
        return "Anforderungs-Zusammenfassung: " + text;
    }

    private String generateCodeSummary(String text) {
        return "Code-Zusammenfassung: " + text;
    }

    /**
     * Spezialisierte Zusammenfassung für technische Dokumente
     */
    private String generateTechnicalSummary(String text) {
        String prompt = """
                Erstelle eine technische Zusammenfassung mit Fokus auf:
                1. Verwendete Technologien und Frameworks
                2. Architektur-Entscheidungen
                3. Implementierungsdetails
                4. Performance-Überlegungen
                5. Sicherheitsaspekte
                """;
        return openAIService.generateSummary(text + "\n\n" + prompt);
    }

    /**
     * Formatierung der Keywords für bessere Darstellung
     */
    private String formatKeywords(Map<String, List<String>> keywords) {
        StringBuilder formatted = new StringBuilder();

        if (keywords.containsKey("hauptkeywords")) {
            formatted.append("Hauptthemen: ")
                    .append(String.join(", ", keywords.get("hauptkeywords")))
                    .append("\n");
        }

        if (keywords.containsKey("technische_begriffe")) {
            formatted.append("Technologien: ")
                    .append(String.join(", ", keywords.get("technische_begriffe")))
                    .append("\n");
        }

        if (keywords.containsKey("konzepte")) {
            formatted.append("Konzepte: ")
                    .append(String.join(", ", keywords.get("konzepte")));
        }

        return formatted.toString();
    }

    /**
     * Formatierung der Empfehlungen
     */
    private String formatRecommendations(OpenAIService.TechRecommendation recommendations) {
        StringBuilder formatted = new StringBuilder();

        formatted.append("## Technische Empfehlungen\n\n");

        // Priorisierte Empfehlungen
        if (recommendations.empfehlungen != null) {
            formatted.append("### Prioritäten:\n");
            recommendations.empfehlungen.stream()
                    .sorted((a, b) -> getPriorityOrder(a.priorität) - getPriorityOrder(b.priorität))
                    .forEach(emp -> {
                        formatted.append(String.format("**[%s] %s**\n",
                                emp.priorität, emp.kategorie));
                        formatted.append(String.format("- %s\n", emp.empfehlung));
                        formatted.append(String.format("  *Begründung:* %s\n", emp.begründung));
                        if (emp.tools != null && !emp.tools.isEmpty()) {
                            formatted.append(String.format("  *Empfohlene Tools:* %s\n",
                                    String.join(", ", emp.tools)));
                        }
                        formatted.append("\n");
                    });
        }

        // Best Practices
        if (recommendations.bestPractices != null && !recommendations.bestPractices.isEmpty()) {
            formatted.append("### Best Practices:\n");
            recommendations.bestPractices.forEach(bp -> {
                formatted.append(String.format("- **%s:** %s\n",
                        bp.bereich, bp.empfehlung));
            });
            formatted.append("\n");
        }

        // Nächste Schritte
        if (recommendations.nächsteSchritte != null && !recommendations.nächsteSchritte.isEmpty()) {
            formatted.append("### Nächste Schritte:\n");
            recommendations.nächsteSchritte.forEach(schritt -> formatted.append(String.format("- %s\n", schritt)));
        }

        return formatted.toString();
    }

    /**
     * Qualitätsbewertung des Dokuments
     */
    private double calculateQualityScore(Document document, String text) {
        double score = 0.0;

        // Vollständigkeit der Analyse
        if (document.getSummary() != null && !document.getSummary().isEmpty()) {
            score += 20;
        }
        if (document.getKeywords() != null && !document.getKeywords().isEmpty()) {
            score += 20;
        }
        if (document.getRecommendations() != null && !document.getRecommendations().isEmpty()) {
            score += 20;
        }

        // Textqualität
        score += calculateTextQuality(text) * 20;

        // Strukturierung
        score += calculateStructureScore(text) * 20;

        return Math.min(score, 100.0);
    }

    /**
     * Berechnung der Textqualität
     */
    private double calculateTextQuality(String text) {
        double quality = 0.0;

        // Wortanzahl
        String[] words = text.split("\\s+");
        if (words.length > 100)
            quality += 0.3;
        if (words.length > 500)
            quality += 0.2;

        // Satzlänge Varianz
        String[] sentences = text.split("[.!?]+");
        if (sentences.length > 5) {
            double avgLength = Arrays.stream(sentences)
                    .mapToInt(s -> s.split("\\s+").length)
                    .average()
                    .orElse(0);
            if (avgLength > 10 && avgLength < 25)
                quality += 0.3;
        }

        // Fachvokabular
        if (containsTechnicalTerms(text))
            quality += 0.2;

        return quality;
    }

    /**
     * Strukturbewertung
     */
    private double calculateStructureScore(String text) {
        double score = 0.0;

        // Überschriften
        if (text.contains("#") || text.contains("=="))
            score += 0.3;

        // Listen
        if (text.contains("- ") || text.contains("* ") || text.contains("1."))
            score += 0.2;

        // Absätze
        String[] paragraphs = text.split("\n\n");
        if (paragraphs.length > 3)
            score += 0.3;

        // Code-Blöcke
        if (text.contains("```") || text.contains("    "))
            score += 0.2;

        return score;
    }

    /**
     * Prüfung auf technische Begriffe
     */
    private boolean containsTechnicalTerms(String text) {
        List<String> technicalTerms = Arrays.asList(
                "API", "REST", "JSON", "Database", "Framework",
                "Algorithm", "Function", "Class", "Method", "Interface",
                "Performance", "Security", "Authentication", "Authorization",
                "Frontend", "Backend", "Deployment", "Container", "Microservice");

        String lowerText = text.toLowerCase();
        return technicalTerms.stream()
                .anyMatch(term -> lowerText.contains(term.toLowerCase()));
    }

    /**
     * Prioritäts-Reihenfolge
     */
    private int getPriorityOrder(String priority) {
        switch (priority.toUpperCase()) {
            case "KRITISCH":
                return 0;
            case "HOCH":
                return 1;
            case "MITTEL":
                return 2;
            case "NIEDRIG":
                return 3;
            default:
                return 4;
        }
    }

    /**
     * Text-Extraktion aus verschiedenen Dateiformaten
     */
    private String extractText(MultipartFile file) throws IOException {
        String contentType = file.getContentType();

        if (contentType.equals("application/pdf")) {
            return extractPdfText(file);
        } else if (contentType.equals("text/plain")) {
            return new String(file.getBytes());
        } else if (contentType.contains("word")) {
            return extractWordText(file);
        } else {
            throw new UnsupportedOperationException(
                    "Dateityp nicht unterstützt: " + contentType);
        }
    }

    /**
     * PDF-Text-Extraktion
     */
    private String extractPdfText(MultipartFile file) throws IOException {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            stripper.setStartPage(1);
            stripper.setEndPage(document.getNumberOfPages());
            return stripper.getText(document);
        }
    }

    /**
     * Word-Dokument Text-Extraktion (Placeholder)
     */
    private String extractWordText(MultipartFile file) throws IOException {
        // Implementierung mit Apache POI hinzufügen
        return "Word-Extraktion noch zu implementieren";
    }

    public Document saveDocument(Document document) {
        return documentRepository.save(document);
    }
}