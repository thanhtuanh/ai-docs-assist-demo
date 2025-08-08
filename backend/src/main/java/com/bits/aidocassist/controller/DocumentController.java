package com.bits.aidocassist.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.bits.aidocassist.model.AnalysisFeedback;
import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.DocumentService;
import com.bits.aidocassist.service.FeedbackService;
import com.bits.aidocassist.service.TextPreprocessingService;
import com.bits.aidocassist.util.PdfProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Optimierter Document Controller mit erweiterten Analyse-Features
 * Unterstützt Batch-Verarbeitung, Echtzeit-Analyse und Feedback-Integration
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentController.class);
    
    @Autowired
    private DocumentService documentService;

    @Autowired
    private AiService aiService;
    
    @Autowired
    private TextPreprocessingService preprocessingService;
    
    @Autowired
    private FeedbackService feedbackService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Value("${spring.servlet.multipart.max-file-size:10MB}")
    private String maxFileSize;
    
    // Unterstützte Dateiformate
    private static final Set<String> SUPPORTED_FORMATS = Set.of(
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/csv",
        "application/json",
        "text/markdown"
    );

    /**
     * OPTIMIERT: Einzeldokument-Upload mit umfassender Analyse
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnalysisResponse> createDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "analysisOptions", required = false) String analysisOptionsJson) {
        
        logger.info("📄 Dokument-Upload gestartet: {}", file.getOriginalFilename());
        
        try {
            // Validierung
            ValidationResult validation = validateFile(file);
            if (!validation.isValid()) {
                return ResponseEntity.badRequest()
                    .body(new AnalysisResponse(null, validation.getErrorMessage(), null));
            }
            
            // Parse Analyse-Optionen
            AnalysisOptions options = parseAnalysisOptions(analysisOptionsJson);
            
            // Text-Extraktion mit Format-Erkennung
            String rawContent = extractTextFromFile(file);
            
            // Preprocessing für bessere Analyse-Qualität
            String processedContent = preprocessingService.preprocessText(rawContent);
            
            // Qualitäts-Check
            TextPreprocessingService.PreprocessingResult preprocessResult = 
                preprocessingService.getPreprocessingResult(rawContent, processedContent);
            
            logger.info("📊 Text-Preprocessing abgeschlossen: {} Zeichen -> {} Zeichen, Sprache: {}", 
                rawContent.length(), processedContent.length(), preprocessResult.detectedLanguage);
            
            // Parallele AI-Analyse für bessere Performance
            CompletableFuture<String> summaryFuture = CompletableFuture.supplyAsync(() -> 
                options.generateSummary ? aiService.summarizeText(processedContent) : null
            );
            
            CompletableFuture<String> keywordsFuture = CompletableFuture.supplyAsync(() -> 
                options.extractKeywords ? aiService.extractKeywords(processedContent) : null
            );
            
            CompletableFuture<String> componentsFuture = CompletableFuture.supplyAsync(() -> 
                options.suggestComponents ? aiService.suggestComponents(processedContent) : null
            );
            
            // Warte auf alle Analysen
            CompletableFuture.allOf(summaryFuture, keywordsFuture, componentsFuture).join();
            
            // Document-Objekt erstellen
            Document document = new Document();
            document.setFilename(file.getOriginalFilename());
            document.setFileType(file.getContentType());
            document.setTitle(extractTitle(file.getOriginalFilename(), processedContent));
            document.setContent(processedContent);
            document.setUploadDate(new Date());
            
            // AI-Analyse-Ergebnisse setzen
            document.setSummary(summaryFuture.get());
            document.setKeywords(keywordsFuture.get());
            document.setSuggestedComponents(componentsFuture.get());
            
            // Erweiterte Metadaten
            document.setDocumentType(detectDocumentType(processedContent));
            document.setComplexityLevel(calculateComplexity(preprocessResult));
            document.setQualityScore(calculateQualityScore(preprocessResult));
            
            // Speichern
            Document savedDocument = documentService.saveDocument(document);
            
            // Response mit zusätzlichen Metadaten
            AnalysisResponse response = new AnalysisResponse(
                savedDocument,
                "Analyse erfolgreich abgeschlossen",
                buildAnalysisMetadata(preprocessResult, savedDocument)
            );
            
            logger.info("✅ Dokument erfolgreich analysiert und gespeichert: ID={}", savedDocument.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("❌ Fehler bei Dokumentenverarbeitung: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AnalysisResponse(null, "Fehler bei der Verarbeitung: " + e.getMessage(), null));
        }
    }

    /**
     * NEU: Batch-Upload für mehrere Dokumente
     */
    @PostMapping("/batch")
    public ResponseEntity<BatchAnalysisResponse> processBatch(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "analysisOptions", required = false) String analysisOptionsJson) {
        
        logger.info("📦 Batch-Upload gestartet: {} Dateien", files.length);
        
        if (files.length > 10) {
            return ResponseEntity.badRequest()
                .body(new BatchAnalysisResponse(null, "Maximal 10 Dateien gleichzeitig erlaubt", 0, files.length));
        }
        
        AnalysisOptions options = parseAnalysisOptions(analysisOptionsJson);
        List<Document> processedDocuments = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        
        // Parallele Verarbeitung für bessere Performance
        List<CompletableFuture<Document>> futures = Arrays.stream(files)
            .map(file -> CompletableFuture.supplyAsync(() -> {
                try {
                    return processFile(file, options);
                } catch (Exception e) {
                    logger.error("Fehler bei Datei {}: {}", file.getOriginalFilename(), e.getMessage());
                    errors.add(file.getOriginalFilename() + ": " + e.getMessage());
                    return null;
                }
            }))
            .collect(Collectors.toList());
        
        // Warte auf alle Verarbeitungen
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        
        // Sammle Ergebnisse
        futures.forEach(future -> {
            try {
                Document doc = future.get();
                if (doc != null) {
                    processedDocuments.add(doc);
                }
            } catch (Exception e) {
                logger.error("Fehler beim Abrufen des Ergebnisses: ", e);
            }
        });
        
        BatchAnalysisResponse response = new BatchAnalysisResponse(
            processedDocuments,
            errors.isEmpty() ? "Alle Dokumente erfolgreich verarbeitet" : "Verarbeitung mit Fehlern abgeschlossen",
            processedDocuments.size(),
            files.length
        );
        
        logger.info("✅ Batch-Verarbeitung abgeschlossen: {}/{} erfolgreich", 
            processedDocuments.size(), files.length);
        
        return ResponseEntity.ok(response);
    }

    /**
     * OPTIMIERT: Direkte Text-Analyse ohne Datei-Upload
     */
    @PostMapping("/analyze-text")
    public ResponseEntity<AnalysisResponse> analyzeText(@RequestBody @Valid TextAnalysisRequest request) {
        
        logger.info("📝 Direkt-Text-Analyse gestartet: {} Zeichen", request.getText().length());
        
        try {
            // Text-Preprocessing
            String processedText = preprocessingService.preprocessText(request.getText());
            TextPreprocessingService.PreprocessingResult preprocessResult = 
                preprocessingService.getPreprocessingResult(request.getText(), processedText);
            
            // AI-Analyse basierend auf Optionen
            AnalysisOptions options = request.getOptions() != null ? 
                request.getOptions() : AnalysisOptions.defaultOptions();
            
            String summary = options.generateSummary ? 
                aiService.summarizeText(processedText) : null;
            String keywords = options.extractKeywords ? 
                aiService.extractKeywords(processedText) : null;
            String components = options.suggestComponents ? 
                aiService.suggestComponents(processedText) : null;
            
            // Document erstellen
            Document document = new Document();
            document.setTitle(request.getTitle() != null ? request.getTitle() : "Direkt-Analyse");
            document.setContent(processedText);
            document.setSummary(summary);
            document.setKeywords(keywords);
            document.setSuggestedComponents(components);
            document.setUploadDate(new Date());
            document.setDocumentType(detectDocumentType(processedText));
            document.setComplexityLevel(calculateComplexity(preprocessResult));
            document.setQualityScore(calculateQualityScore(preprocessResult));
            
            // Speichern wenn gewünscht
            if (request.isSaveDocument()) {
                document = documentService.saveDocument(document);
                logger.info("💾 Dokument gespeichert mit ID: {}", document.getId());
            }
            
            AnalysisResponse response = new AnalysisResponse(
                document,
                "Text-Analyse erfolgreich",
                buildAnalysisMetadata(preprocessResult, document)
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("❌ Fehler bei Text-Analyse: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AnalysisResponse(null, "Analysefehler: " + e.getMessage(), null));
        }
    }

    /**
     * NEU: Echtzeit-Analyse während der Eingabe
     */
    @PostMapping("/analyze-realtime")
    public ResponseEntity<RealtimeAnalysisResponse> analyzeRealtime(@RequestBody RealtimeAnalysisRequest request) {
        
        try {
            String text = request.getText();
            
            // Schnelle Basis-Analyse
            Map<String, Object> quickAnalysis = new HashMap<>();
            
            // Wort- und Zeichenzählung
            quickAnalysis.put("wordCount", text.split("\\s+").length);
            quickAnalysis.put("charCount", text.length());
            
            // Sprache erkennen
            quickAnalysis.put("language", preprocessingService.detectLanguage(text));
            
            // Sentiment-Indikatoren
            Map<String, Integer> sentiment = preprocessingService.detectSentimentIndicators(text);
            quickAnalysis.put("sentiment", sentiment);
            
            // Top Keywords (schnell)
            List<String> topKeywords = preprocessingService.extractKeywords(text, 5);
            quickAnalysis.put("topKeywords", topKeywords);
            
            // Technische Begriffe zählen
            long techTermCount = Arrays.stream(text.split("\\s+"))
                .filter(word -> isTechnicalTerm(word))
                .count();
            quickAnalysis.put("technicalTerms", techTermCount);
            
            RealtimeAnalysisResponse response = new RealtimeAnalysisResponse(
                quickAnalysis,
                calculateReadabilityScore(text),
                suggestImprovements(text)
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Fehler bei Echtzeit-Analyse: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * ERWEITERT: Dokument abrufen mit Analyse-Historie
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentWithHistory> getDocument(@PathVariable Long id) {
        
        Document document = documentService.getDocumentById(id);
        if (document == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Lade Feedback-Historie
        List<AnalysisFeedback> feedbackHistory = feedbackService.getFeedbackForDocument(id);
        
        // Berechne durchschnittliche Bewertungen
        double avgRating = feedbackHistory.stream()
            .filter(f -> f.getOverallRating() != null)
            .mapToInt(AnalysisFeedback::getOverallRating)
            .average()
            .orElse(0.0);
        
        DocumentWithHistory response = new DocumentWithHistory(
            document,
            feedbackHistory,
            avgRating,
            feedbackHistory.size()
        );
        
        return ResponseEntity.ok(response);
    }

    /**
     * NEU: Re-Analyse eines existierenden Dokuments
     */
    @PostMapping("/{id}/reanalyze")
    public ResponseEntity<AnalysisResponse> reanalyzeDocument(
            @PathVariable Long id,
            @RequestParam(value = "options", required = false) String optionsJson) {
        
        logger.info("🔄 Re-Analyse für Dokument ID: {}", id);
        
        Document document = documentService.getDocumentById(id);
        if (document == null) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            AnalysisOptions options = parseAnalysisOptions(optionsJson);
            
            // Nutze vorhandenen Content für neue Analyse
            String content = document.getContent();
            
            // Neue AI-Analyse
            if (options.generateSummary) {
                document.setSummary(aiService.summarizeText(content));
            }
            if (options.extractKeywords) {
                document.setKeywords(aiService.extractKeywords(content));
            }
            if (options.suggestComponents) {
                document.setSuggestedComponents(aiService.suggestComponents(content));
            }
            
            // Aktualisiere Metadaten
            document.setUploadDate(new Date());
            
            // Speichere Änderungen
            Document updatedDocument = documentService.saveDocument(document);
            
            AnalysisResponse response = new AnalysisResponse(
                updatedDocument,
                "Dokument erfolgreich neu analysiert",
                null
            );
            
            logger.info("✅ Re-Analyse abgeschlossen für ID: {}", id);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("❌ Fehler bei Re-Analyse: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AnalysisResponse(null, "Re-Analyse fehlgeschlagen: " + e.getMessage(), null));
        }
    }

    /**
     * NEU: Vergleiche zwei Dokumente
     */
    @GetMapping("/compare")
    public ResponseEntity<DocumentComparison> compareDocuments(
            @RequestParam Long id1,
            @RequestParam Long id2) {
        
        Document doc1 = documentService.getDocumentById(id1);
        Document doc2 = documentService.getDocumentById(id2);
        
        if (doc1 == null || doc2 == null) {
            return ResponseEntity.notFound().build();
        }
        
        DocumentComparison comparison = new DocumentComparison();
        comparison.setDocument1(doc1);
        comparison.setDocument2(doc2);
        
        // Vergleiche Keywords
        Set<String> keywords1 = new HashSet<>(Arrays.asList(doc1.getKeywords().split(", ")));
        Set<String> keywords2 = new HashSet<>(Arrays.asList(doc2.getKeywords().split(", ")));
        
        Set<String> commonKeywords = new HashSet<>(keywords1);
        commonKeywords.retainAll(keywords2);
        
        Set<String> uniqueToDoc1 = new HashSet<>(keywords1);
        uniqueToDoc1.removeAll(keywords2);
        
        Set<String> uniqueToDoc2 = new HashSet<>(keywords2);
        uniqueToDoc2.removeAll(keywords1);
        
        comparison.setCommonKeywords(commonKeywords);
        comparison.setUniqueToDoc1(uniqueToDoc1);
        comparison.setUniqueToDoc2(uniqueToDoc2);
        
        // Ähnlichkeits-Score berechnen
        double similarity = (double) commonKeywords.size() / 
            (keywords1.size() + keywords2.size() - commonKeywords.size());
        comparison.setSimilarityScore(similarity);
        
        return ResponseEntity.ok(comparison);
    }

    // ========================================
    // HILFSMETHODEN
    // ========================================

    /**
     * Validiert hochgeladene Dateien
     */
    private ValidationResult validateFile(MultipartFile file) {
        ValidationResult result = new ValidationResult();
        
        // Prüfe ob Datei leer ist
        if (file.isEmpty()) {
            result.setValid(false);
            result.setErrorMessage("Datei ist leer");
            return result;
        }
        
        // Prüfe Dateigröße (aus Config)
        long maxSize = parseSize(maxFileSize);
        if (file.getSize() > maxSize) {
            result.setValid(false);
            result.setErrorMessage(String.format("Datei zu groß. Maximum: %s", maxFileSize));
            return result;
        }
        
        // Prüfe Dateityp
        String contentType = file.getContentType();
        if (contentType == null || !SUPPORTED_FORMATS.contains(contentType)) {
            result.setValid(false);
            result.setErrorMessage("Dateityp nicht unterstützt. Erlaubt: PDF, TXT, DOC, DOCX, CSV, JSON, MD");
            return result;
        }
        
        result.setValid(true);
        return result;
    }

    /**
     * Extrahiert Text aus verschiedenen Dateiformaten
     */
    private String extractTextFromFile(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        
        logger.debug("Extrahiere Text aus {}, Typ: {}", filename, contentType);
        
        if (contentType.equals("application/pdf")) {
            Path tempFile = Files.createTempFile("upload", ".pdf");
            file.transferTo(tempFile.toFile());
            String content = PdfProcessor.extractTextFromPdf(tempFile.toFile());
            Files.deleteIfExists(tempFile);
            return content;
            
        } else if (contentType.equals("text/plain") || 
                   contentType.equals("text/csv") || 
                   contentType.equals("text/markdown")) {
            return new String(file.getBytes(), "UTF-8");
            
        } else if (contentType.equals("application/json")) {
            String json = new String(file.getBytes(), "UTF-8");
            // JSON formatieren für bessere Lesbarkeit
            Object jsonObject = objectMapper.readValue(json, Object.class);
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonObject);
            
        } else if (contentType.contains("word")) {
            // TODO: Apache POI Integration für Word-Dokumente
            return "Word-Dokument-Extraktion noch nicht implementiert";
            
        } else {
            // Fallback: Als Text interpretieren
            return new String(file.getBytes(), "UTF-8");
        }
    }

    /**
     * Verarbeitet eine einzelne Datei
     */
    private Document processFile(MultipartFile file, AnalysisOptions options) throws IOException {
        String content = extractTextFromFile(file);
        String processedContent = preprocessingService.preprocessText(content);
        
        Document document = new Document();
        document.setFilename(file.getOriginalFilename());
        document.setFileType(file.getContentType());
        document.setContent(processedContent);
        document.setUploadDate(new Date());
        
        // AI-Analyse
        if (options.generateSummary) {
            document.setSummary(aiService.summarizeText(processedContent));
        }
        if (options.extractKeywords) {
            document.setKeywords(aiService.extractKeywords(processedContent));
        }
        if (options.suggestComponents) {
            document.setSuggestedComponents(aiService.suggestComponents(processedContent));
        }
        
        return documentService.saveDocument(document);
    }

    /**
     * Parst Analyse-Optionen aus JSON
     */
    private AnalysisOptions parseAnalysisOptions(String json) {
        if (json == null || json.isEmpty()) {
            return AnalysisOptions.defaultOptions();
        }
        
        try {
            return objectMapper.readValue(json, AnalysisOptions.class);
        } catch (Exception e) {
            logger.warn("Fehler beim Parsen der Analyse-Optionen, verwende Defaults: {}", e.getMessage());
            return AnalysisOptions.defaultOptions();
        }
    }

    /**
     * Extrahiert Titel aus Dateiname oder Inhalt
     */
    private String extractTitle(String filename, String content) {
        // Entferne Dateiendung
        if (filename != null) {
            int lastDot = filename.lastIndexOf('.');
            if (lastDot > 0) {
                return filename.substring(0, lastDot);
            }
            return filename;
        }
        
        // Fallback: Erste Zeile des Inhalts
        String[] lines = content.split("\n");
        if (lines.length > 0 && lines[0].length() < 100) {
            return lines[0].trim();
        }
        
        return "Unbenanntes Dokument";
    }

    /**
     * Erkennt Dokumenttyp basierend auf Inhalt
     */
    private String detectDocumentType(String content) {
        String lowerContent = content.toLowerCase();
        
        if (lowerContent.contains("requirements") || lowerContent.contains("anforderungen")) {
            return "Anforderungsdokument";
        } else if (lowerContent.contains("architecture") || lowerContent.contains("architektur")) {
            return "Architekturdokument";
        } else if (lowerContent.contains("test") || lowerContent.contains("testing")) {
            return "Testdokument";
        } else if (lowerContent.contains("manual") || lowerContent.contains("anleitung")) {
            return "Handbuch";
        } else if (lowerContent.contains("api") && lowerContent.contains("endpoint")) {
            return "API-Dokumentation";
        } else if (lowerContent.contains("class") || lowerContent.contains("function") || 
                   lowerContent.contains("import")) {
            return "Code-Dokumentation";
        } else {
            return "Technisches Dokument";
        }
    }

    /**
     * Berechnet Dokumenten-Komplexität
     */
    private String calculateComplexity(TextPreprocessingService.PreprocessingResult result) {
        double score = 0;
        
        // Basierend auf verschiedenen Metriken
        Map<String, Object> metrics = result.qualityMetrics;
        
        if (metrics != null) {
            Integer wordCount = (Integer) metrics.get("wordCount");
            Double technicalDensity = (Double) metrics.get("technicalDensity");
            Double readabilityScore = (Double) metrics.get("readabilityScore");
            
            if (wordCount != null && wordCount > 1000) score += 20;
            if (technicalDensity != null && technicalDensity > 0.1) score += 30;
            if (readabilityScore != null && readabilityScore < 50) score += 30;
            if (result.codeBlockCount > 5) score += 20;
        }
        
        if (score > 70) return "Experte";
        if (score > 40) return "Fortgeschritten";
        return "Einsteiger";
    }

    /**
     * Berechnet Qualitäts-Score
     */
    private double calculateQualityScore(TextPreprocessingService.PreprocessingResult result) {
        if (result.qualityMetrics != null && result.qualityMetrics.containsKey("overallQualityScore")) {
            return (Double) result.qualityMetrics.get("overallQualityScore");
        }
        return 50.0; // Default
    }

    /**
     * Baut Analyse-Metadaten
     */
    private Map<String, Object> buildAnalysisMetadata(
            TextPreprocessingService.PreprocessingResult preprocessResult, 
            Document document) {
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("originalLength", preprocessResult.originalLength);
        metadata.put("processedLength", preprocessResult.processedLength);
        metadata.put("compressionRatio", preprocessResult.compressionRatio);
        metadata.put("detectedLanguage", preprocessResult.detectedLanguage);
        metadata.put("codeBlockCount", preprocessResult.codeBlockCount);
        metadata.put("technicalTermCount", preprocessResult.technicalTermCount);
        metadata.put("documentType", document.getDocumentType());
        metadata.put("complexityLevel", document.getComplexityLevel());
        metadata.put("qualityScore", document.getQualityScore());
        
        return metadata;
    }

    /**
     * Prüft ob ein Wort ein technischer Begriff ist
     */
    private boolean isTechnicalTerm(String word) {
        Set<String> techTerms = Set.of(
            "API", "REST", "JSON", "SQL", "NoSQL", "Docker", "Kubernetes",
            "Java", "Python", "JavaScript", "React", "Angular", "Spring"
        );
        return techTerms.contains(word.toUpperCase());
    }

    /**
     * Berechnet Lesbarkeits-Score
     */
    private double calculateReadabilityScore(String text) {
        String[] sentences = text.split("[.!?]+");
        String[] words = text.split("\\s+");
        
        if (sentences.length == 0 || words.length == 0) return 0;
        
        double avgWordsPerSentence = (double) words.length / sentences.length;
        // Vereinfachte Flesch-Reading-Ease Formel
        return Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence));
    }

    /**
     * Schlägt Verbesserungen vor
     */
    private List<String> suggestImprovements(String text) {
        List<String> suggestions = new ArrayList<>();
        
        String[] sentences = text.split("[.!?]+");
        String[] words = text.split("\\s+");
        
        // Satzlänge prüfen
        if (sentences.length > 0) {
            double avgWordsPerSentence = (double) words.length / sentences.length;
            if (avgWordsPerSentence > 25) {
                suggestions.add("Verwenden Sie kürzere Sätze für bessere Lesbarkeit");
            }
        }
        
        // Absätze prüfen
        String[] paragraphs = text.split("\n\n");
        if (paragraphs.length < 3 && words.length > 200) {
            suggestions.add("Fügen Sie mehr Absätze zur Strukturierung hinzu");
        }
        
        // Technische Begriffe
        long techTerms = Arrays.stream(words).filter(this::isTechnicalTerm).count();
        if (techTerms < 3 && words.length > 100) {
            suggestions.add("Fügen Sie spezifische technische Details hinzu");
        }
        
        return suggestions;
    }

    /**
     * Parst Größenangaben (z.B. "10MB" zu Bytes)
     */
    private long parseSize(String size) {
        size = size.toUpperCase().trim();
        long multiplier = 1;
        
        if (size.endsWith("KB")) {
            multiplier = 1024;
            size = size.substring(0, size.length() - 2);
        } else if (size.endsWith("MB")) {
            multiplier = 1024 * 1024;
            size = size.substring(0, size.length() - 2);
        } else if (size.endsWith("GB")) {
            multiplier = 1024 * 1024 * 1024;
            size = size.substring(0, size.length() - 2);
        }
        
        try {
            return Long.parseLong(size.trim()) * multiplier;
        } catch (NumberFormatException e) {
            return 10 * 1024 * 1024; // Default: 10MB
        }
    }

    // ========================================
    // REQUEST/RESPONSE DTOs
    // ========================================

    /**
     * Analyse-Optionen
     */
    public static class AnalysisOptions {
        private boolean generateSummary = true;
        private boolean extractKeywords = true;
        private boolean suggestComponents = true;
        private boolean performSentimentAnalysis = false;
        private boolean detectLanguage = true;
        private boolean calculateMetrics = true;
        
        public static AnalysisOptions defaultOptions() {
            return new AnalysisOptions();
        }
        
        public static AnalysisOptions fullAnalysis() {
            AnalysisOptions options = new AnalysisOptions();
            options.performSentimentAnalysis = true;
            return options;
        }
        
        // Getters and Setters
        public boolean isGenerateSummary() { return generateSummary; }
        public void setGenerateSummary(boolean generateSummary) { 
            this.generateSummary = generateSummary; 
        }
        
        public boolean isExtractKeywords() { return extractKeywords; }
        public void setExtractKeywords(boolean extractKeywords) { 
            this.extractKeywords = extractKeywords; 
        }
        
        public boolean isSuggestComponents() { return suggestComponents; }
        public void setSuggestComponents(boolean suggestComponents) { 
            this.suggestComponents = suggestComponents; 
        }
        
        public boolean isPerformSentimentAnalysis() { return performSentimentAnalysis; }
        public void setPerformSentimentAnalysis(boolean performSentimentAnalysis) { 
            this.performSentimentAnalysis = performSentimentAnalysis; 
        }
        
        public boolean isDetectLanguage() { return detectLanguage; }
        public void setDetectLanguage(boolean detectLanguage) { 
            this.detectLanguage = detectLanguage; 
        }
        
        public boolean isCalculateMetrics() { return calculateMetrics; }
        public void setCalculateMetrics(boolean calculateMetrics) { 
            this.calculateMetrics = calculateMetrics; 
        }
    }

    /**
     * Text-Analyse Request
     */
    public static class TextAnalysisRequest {
        @NotBlank(message = "Text darf nicht leer sein")
        private String text;
        
        private String title;
        private AnalysisOptions options;
        private boolean saveDocument = true;
        
        // Getters and Setters
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        
        public AnalysisOptions getOptions() { return options; }
        public void setOptions(AnalysisOptions options) { this.options = options; }
        
        public boolean isSaveDocument() { return saveDocument; }
        public void setSaveDocument(boolean saveDocument) { this.saveDocument = saveDocument; }
    }

    /**
     * Echtzeit-Analyse Request
     */
    public static class RealtimeAnalysisRequest {
        @NotNull
        private String text;
        private String language;
        
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
    }

    /**
     * Standard Analyse Response
     */
    public static class AnalysisResponse {
        private Document document;
        private String message;
        private Map<String, Object> metadata;
        private Long processingTimeMs;
        private Date timestamp;
        
        public AnalysisResponse(Document document, String message, Map<String, Object> metadata) {
            this.document = document;
            this.message = message;
            this.metadata = metadata;
            this.timestamp = new Date();
        }
        
        // Getters and Setters
        public Document getDocument() { return document; }
        public void setDocument(Document document) { this.document = document; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        
        public Map<String, Object> getMetadata() { return metadata; }
        public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
        
        public Long getProcessingTimeMs() { return processingTimeMs; }
        public void setProcessingTimeMs(Long processingTimeMs) { 
            this.processingTimeMs = processingTimeMs; 
        }
        
        public Date getTimestamp() { return timestamp; }
        public void setTimestamp(Date timestamp) { this.timestamp = timestamp; }
    }

    /**
     * Batch Analyse Response
     */
    public static class BatchAnalysisResponse {
        private List<Document> documents;
        private String message;
        private int successCount;
        private int totalCount;
        private List<String> errors;
        private Map<String, Object> statistics;
        
        public BatchAnalysisResponse(List<Document> documents, String message, 
                                    int successCount, int totalCount) {
            this.documents = documents;
            this.message = message;
            this.successCount = successCount;
            this.totalCount = totalCount;
            this.errors = new ArrayList<>();
            this.statistics = calculateStatistics(documents);
        }
        
        private Map<String, Object> calculateStatistics(List<Document> docs) {
            Map<String, Object> stats = new HashMap<>();
            if (docs != null && !docs.isEmpty()) {
                stats.put("totalDocuments", docs.size());
                stats.put("averageQualityScore", 
                    docs.stream()
                        .filter(d -> d.getQualityScore() != null)
                        .mapToDouble(Document::getQualityScore)
                        .average()
                        .orElse(0.0));
                
                Map<String, Long> typeDistribution = docs.stream()
                    .filter(d -> d.getDocumentType() != null)
                    .collect(Collectors.groupingBy(
                        Document::getDocumentType, 
                        Collectors.counting()));
                stats.put("documentTypes", typeDistribution);
            }
            return stats;
        }
        
        // Getters and Setters
        public List<Document> getDocuments() { return documents; }
        public void setDocuments(List<Document> documents) { this.documents = documents; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        
        public int getSuccessCount() { return successCount; }
        public void setSuccessCount(int successCount) { this.successCount = successCount; }
        
        public int getTotalCount() { return totalCount; }
        public void setTotalCount(int totalCount) { this.totalCount = totalCount; }
        
        public List<String> getErrors() { return errors; }
        public void setErrors(List<String> errors) { this.errors = errors; }
        
        public Map<String, Object> getStatistics() { return statistics; }
        public void setStatistics(Map<String, Object> statistics) { 
            this.statistics = statistics; 
        }
    }

    /**
     * Echtzeit Analyse Response
     */
    public static class RealtimeAnalysisResponse {
        private Map<String, Object> quickAnalysis;
        private double readabilityScore;
        private List<String> suggestions;
        private Map<String, Integer> sentiment;
        
        public RealtimeAnalysisResponse(Map<String, Object> quickAnalysis, 
                                       double readabilityScore, 
                                       List<String> suggestions) {
            this.quickAnalysis = quickAnalysis;
            this.readabilityScore = readabilityScore;
            this.suggestions = suggestions;
        }
        
        // Getters and Setters
        public Map<String, Object> getQuickAnalysis() { return quickAnalysis; }
        public void setQuickAnalysis(Map<String, Object> quickAnalysis) { 
            this.quickAnalysis = quickAnalysis; 
        }
        
        public double getReadabilityScore() { return readabilityScore; }
        public void setReadabilityScore(double readabilityScore) { 
            this.readabilityScore = readabilityScore; 
        }
        
        public List<String> getSuggestions() { return suggestions; }
        public void setSuggestions(List<String> suggestions) { 
            this.suggestions = suggestions; 
        }
        
        public Map<String, Integer> getSentiment() { return sentiment; }
        public void setSentiment(Map<String, Integer> sentiment) { 
            this.sentiment = sentiment; 
        }
    }

    /**
     * Dokument mit Historie
     */
    public static class DocumentWithHistory {
        private Document document;
        private List<AnalysisFeedback> feedbackHistory;
        private double averageRating;
        private int feedbackCount;
        private Map<String, Object> trends;
        
        public DocumentWithHistory(Document document, 
                                  List<AnalysisFeedback> feedbackHistory,
                                  double averageRating, 
                                  int feedbackCount) {
            this.document = document;
            this.feedbackHistory = feedbackHistory;
            this.averageRating = averageRating;
            this.feedbackCount = feedbackCount;
            this.trends = calculateTrends(feedbackHistory);
        }
        
        private Map<String, Object> calculateTrends(List<AnalysisFeedback> history) {
            Map<String, Object> trends = new HashMap<>();
            
            if (history != null && history.size() > 1) {
                // Berechne Rating-Trend
                List<Integer> ratings = history.stream()
                    .filter(f -> f.getOverallRating() != null)
                    .map(AnalysisFeedback::getOverallRating)
                    .collect(Collectors.toList());
                
                if (ratings.size() > 1) {
                    int firstHalf = ratings.subList(0, ratings.size()/2).stream()
                        .mapToInt(Integer::intValue).sum();
                    int secondHalf = ratings.subList(ratings.size()/2, ratings.size()).stream()
                        .mapToInt(Integer::intValue).sum();
                    
                    trends.put("ratingTrend", secondHalf > firstHalf ? "improving" : 
                              secondHalf < firstHalf ? "declining" : "stable");
                }
                
                // Häufigste Verbesserungskategorie
                Map<String, Long> categories = history.stream()
                    .filter(f -> f.getImprovementCategory() != null)
                    .collect(Collectors.groupingBy(
                        AnalysisFeedback::getImprovementCategory,
                        Collectors.counting()));
                
                trends.put("topImprovementArea", 
                    categories.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("none"));
            }
            
            return trends;
        }
        
        // Getters and Setters
        public Document getDocument() { return document; }
        public void setDocument(Document document) { this.document = document; }
        
        public List<AnalysisFeedback> getFeedbackHistory() { return feedbackHistory; }
        public void setFeedbackHistory(List<AnalysisFeedback> feedbackHistory) { 
            this.feedbackHistory = feedbackHistory; 
        }
        
        public double getAverageRating() { return averageRating; }
        public void setAverageRating(double averageRating) { 
            this.averageRating = averageRating; 
        }
        
        public int getFeedbackCount() { return feedbackCount; }
        public void setFeedbackCount(int feedbackCount) { 
            this.feedbackCount = feedbackCount; 
        }
        
        public Map<String, Object> getTrends() { return trends; }
        public void setTrends(Map<String, Object> trends) { this.trends = trends; }
    }

    /**
     * Dokument-Vergleich
     */
    public static class DocumentComparison {
        private Document document1;
        private Document document2;
        private Set<String> commonKeywords;
        private Set<String> uniqueToDoc1;
        private Set<String> uniqueToDoc2;
        private double similarityScore;
        private Map<String, String> fieldComparison;
        
        public DocumentComparison() {
            this.fieldComparison = new HashMap<>();
        }
        
        // Getters and Setters
        public Document getDocument1() { return document1; }
        public void setDocument1(Document document1) { this.document1 = document1; }
        
        public Document getDocument2() { return document2; }
        public void setDocument2(Document document2) { this.document2 = document2; }
        
        public Set<String> getCommonKeywords() { return commonKeywords; }
        public void setCommonKeywords(Set<String> commonKeywords) { 
            this.commonKeywords = commonKeywords; 
        }
        
        public Set<String> getUniqueToDoc1() { return uniqueToDoc1; }
        public void setUniqueToDoc1(Set<String> uniqueToDoc1) { 
            this.uniqueToDoc1 = uniqueToDoc1; 
        }
        
        public Set<String> getUniqueToDoc2() { return uniqueToDoc2; }
        public void setUniqueToDoc2(Set<String> uniqueToDoc2) { 
            this.uniqueToDoc2 = uniqueToDoc2; 
        }
        
        public double getSimilarityScore() { return similarityScore; }
        public void setSimilarityScore(double similarityScore) { 
            this.similarityScore = similarityScore; 
        }
        
        public Map<String, String> getFieldComparison() { return fieldComparison; }
        public void setFieldComparison(Map<String, String> fieldComparison) { 
            this.fieldComparison = fieldComparison; 
        }
    }

    /**
     * Validierungs-Ergebnis
     */
    private static class ValidationResult {
        private boolean valid;
        private String errorMessage;
        
        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }
        
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { 
            this.errorMessage = errorMessage; 
        }
    }

    /**
     * Exception Handler für bessere Fehlerbehandlung
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        logger.error("Unerwarteter Fehler: ", e);
        
        ErrorResponse error = new ErrorResponse(
            "INTERNAL_ERROR",
            "Ein unerwarteter Fehler ist aufgetreten",
            e.getMessage(),
            new Date()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    /**
     * Fehler-Response
     */
    public static class ErrorResponse {
        private String errorCode;
        private String message;
        private String details;
        private Date timestamp;
        
        public ErrorResponse(String errorCode, String message, String details, Date timestamp) {
            this.errorCode = errorCode;
            this.message = message;
            this.details = details;
            this.timestamp = timestamp;
        }
        
        // Getters
        public String getErrorCode() { return errorCode; }
        public String getMessage() { return message; }
        public String getDetails() { return details; }
        public Date getTimestamp() { return timestamp; }
    }
}