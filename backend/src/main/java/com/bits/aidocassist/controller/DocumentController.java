package com.bits.aidocassist.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.bits.aidocassist.model.AnalysisFeedback;
import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.DocumentService;
import com.bits.aidocassist.service.FeedbackService;
import com.bits.aidocassist.service.TextPreprocessingService;
import com.bits.aidocassist.util.PdfProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Optimierter Document Controller mit erweiterten Analyse-Features.
 * Achtung: KEINE Legacy-Endpunkte in dieser Klasse (separat, s. unten).
 */
@Validated
@RestController
@RequestMapping(path = "/api/documents", produces = MediaType.APPLICATION_JSON_VALUE)
public class DocumentController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentController.class);

    private final DocumentService documentService;
    private final AiService aiService;
    private final TextPreprocessingService preprocessingService;
    private final FeedbackService feedbackService;
    private final ObjectMapper objectMapper;

    public DocumentController(
            DocumentService documentService,
            AiService aiService,
            TextPreprocessingService preprocessingService,
            FeedbackService feedbackService,
            ObjectMapper objectMapper) {
        this.documentService = documentService;
        this.aiService = aiService;
        this.preprocessingService = preprocessingService;
        this.feedbackService = feedbackService;
        this.objectMapper = objectMapper;
    }

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
            "text/markdown");

    /**
     * Einzeldokument-Upload mit Analyse.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnalysisResponse> createDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "analysisOptions", required = false) String analysisOptionsJson) {

        final Instant t0 = Instant.now();
        final String originalName = file != null ? file.getOriginalFilename() : null;
        logger.info("📄 Dokument-Upload gestartet: {}", originalName);

        try {
            ValidationResult validation = validateFile(file);
            if (!validation.isValid()) {
                return ResponseEntity.badRequest()
                        .body(new AnalysisResponse(null, validation.getErrorMessage(), Map.of()));
            }

            AnalysisOptions options = parseAnalysisOptions(analysisOptionsJson);

            String rawContent = extractTextFromFile(file);
            String processedContent = preprocessingService.preprocessText(rawContent);
            TextPreprocessingService.PreprocessingResult preprocessResult = preprocessingService
                    .getPreprocessingResult(rawContent, processedContent);

            logger.info("📊 Preprocessing: {} -> {} chars, lang={}",
                    rawContent.length(), processedContent.length(), preprocessResult.detectedLanguage);

            CompletableFuture<String> summaryFuture = CompletableFuture.supplyAsync(
                    () -> options.generateSummary ? aiService.summarizeText(processedContent) : null);

            CompletableFuture<String> keywordsFuture = CompletableFuture.supplyAsync(
                    () -> options.extractKeywords ? aiService.extractKeywords(processedContent) : null);

            CompletableFuture<String> componentsFuture = CompletableFuture.supplyAsync(
                    () -> options.suggestComponents ? aiService.suggestComponents(processedContent) : null);

            CompletableFuture.allOf(summaryFuture, keywordsFuture, componentsFuture).join();

            Document document = new Document();
            document.setFilename(originalName);
            document.setFileType(file.getContentType());
            document.setTitle(extractTitle(originalName, processedContent));
            document.setContent(processedContent);
            document.setUploadDate(new Date());

            document.setSummary(summaryFuture.get());
            document.setKeywords(keywordsFuture.get());
            document.setSuggestedComponents(componentsFuture.get());

            document.setDocumentType(detectDocumentType(processedContent));
            document.setComplexityLevel(calculateComplexity(preprocessResult));
            document.setQualityScore(calculateQualityScore(preprocessResult));

            Document saved = documentService.saveDocument(document);

            AnalysisResponse resp = new AnalysisResponse(
                    saved,
                    "Analyse erfolgreich abgeschlossen",
                    buildAnalysisMetadata(preprocessResult, saved));
            resp.setProcessingTimeMs(java.time.Duration.between(t0, Instant.now()).toMillis());

            logger.info("✅ Dokument analysiert & gespeichert: id={}", saved.getId());
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            logger.error("❌ Fehler bei Dokumentenverarbeitung:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AnalysisResponse(null, "Fehler bei der Verarbeitung: " + e.getMessage(), Map.of()));
        }
    }

    /**
     * Batch-Upload (max 10 Dateien).
     */
    @PostMapping(path = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BatchAnalysisResponse> processBatch(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "analysisOptions", required = false) String analysisOptionsJson) {

        if (files == null || files.length == 0) {
            return ResponseEntity.badRequest()
                    .body(new BatchAnalysisResponse(List.of(), "Keine Dateien übermittelt", 0, 0));
        }
        if (files.length > 10) {
            return ResponseEntity.badRequest()
                    .body(new BatchAnalysisResponse(List.of(), "Maximal 10 Dateien gleichzeitig erlaubt", 0,
                            files.length));
        }

        logger.info("📦 Batch-Upload gestartet: {} Dateien", files.length);

        AnalysisOptions options = parseAnalysisOptions(analysisOptionsJson);
        List<Document> processedDocuments = Collections.synchronizedList(new ArrayList<>());
        List<String> errors = Collections.synchronizedList(new ArrayList<>());

        List<CompletableFuture<Void>> futures = Arrays.stream(files)
                .map(file -> CompletableFuture.runAsync(() -> {
                    try {
                        ValidationResult validation = validateFile(file);
                        if (!validation.isValid()) {
                            errors.add(file.getOriginalFilename() + ": " + validation.getErrorMessage());
                            return;
                        }
                        Document doc = processFile(file, options);
                        processedDocuments.add(doc);
                    } catch (Exception e) {
                        logger.error("Fehler bei Datei {}: {}", file.getOriginalFilename(), e.getMessage());
                        errors.add(file.getOriginalFilename() + ": " + e.getMessage());
                    }
                }))
                .toList();

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        BatchAnalysisResponse response = new BatchAnalysisResponse(
                processedDocuments,
                errors.isEmpty() ? "Alle Dokumente erfolgreich verarbeitet" : "Verarbeitung mit Fehlern abgeschlossen",
                processedDocuments.size(),
                files.length);
        response.setErrors(errors);

        logger.info("✅ Batch-Verarbeitung: {}/{} erfolgreich", processedDocuments.size(), files.length);
        return ResponseEntity.ok(response);
    }

    @PostMapping(path = "/analyze-text", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AnalysisResponse> analyzeText(@RequestBody @Valid TextAnalysisRequest request) {
        final Instant t0 = Instant.now();
        String input = Objects.requireNonNullElse(request.getText(), "");
        logger.info("📝 Direkt-Text-Analyse gestartet: {} Zeichen", input.length());

        try {
            // 1. Text-Preprocessing
            String processedText = preprocessingService.preprocessText(input);
            TextPreprocessingService.PreprocessingResult preprocessResult = preprocessingService
                    .getPreprocessingResult(input, processedText);

            AnalysisOptions options = request.getOptions() != null ? request.getOptions()
                    : AnalysisOptions.defaultOptions();

            // 2. AI-Service Aufrufe mit Fallback-Mechanismus
            String summary = null;
            String keywords = null;
            String components = null;

            if (options.isGenerateSummary()) {
                try {
                    summary = aiService.summarizeText(processedText);
                    logger.debug("✅ Summary generiert: {} Zeichen", summary != null ? summary.length() : 0);
                } catch (Exception e) {
                    logger.warn("⚠️ AI Summary fehlgeschlagen, verwende Fallback: {}", e.getMessage());
                    summary = generateFallbackSummary(processedText);
                }
            }

            if (options.isExtractKeywords()) {
                try {
                    keywords = aiService.extractKeywords(processedText);
                    logger.debug("✅ Keywords extrahiert");
                } catch (Exception e) {
                    logger.warn("⚠️ AI Keywords fehlgeschlagen, verwende Fallback: {}", e.getMessage());
                    keywords = generateFallbackKeywords(processedText);
                }
            }

            if (options.isSuggestComponents()) {
                try {
                    components = aiService.suggestComponents(processedText);
                    logger.debug("✅ Components vorgeschlagen");
                } catch (Exception e) {
                    logger.warn("⚠️ AI Components fehlgeschlagen, verwende Fallback: {}", e.getMessage());
                    components = generateFallbackComponents(processedText);
                }
            }

            // 3. Document-Objekt erstellen und befüllen
            Document document = new Document();
            document.setTitle(request.getTitle() != null ? request.getTitle() : "Direkt-Analyse");
            document.setFilename(request.getTitle()); // Frontend-Kompatibilität
            document.setFileType("text/plain");
            document.setContent(processedText);
            document.setSummary(summary);
            document.setKeywords(keywords);
            document.setSuggestedComponents(components);
            document.setUploadDate(new Date());
            document.setDocumentType(detectDocumentType(processedText));
            document.setComplexityLevel(calculateComplexity(preprocessResult));
            document.setQualityScore(calculateQualityScore(preprocessResult));

            // 4. Optional: Dokument speichern
            if (request.isSaveDocument()) {
                try {
                    document = documentService.saveDocument(document);
                    logger.info("💾 Dokument gespeichert: id={}", document.getId());
                } catch (Exception e) {
                    logger.warn("⚠️ Dokument-Speicherung fehlgeschlagen: {}", e.getMessage());
                    // Weiter ohne Speicherung, aber Document behält temporäre ID
                }
            }

            // 5. Response erstellen
            AnalysisResponse resp = new AnalysisResponse(
                    document,
                    "Text-Analyse erfolgreich",
                    buildAnalysisMetadata(preprocessResult, document));
            resp.setProcessingTimeMs(java.time.Duration.between(t0, Instant.now()).toMillis());

            logger.info("✅ Text-Analyse abgeschlossen in {}ms", resp.getProcessingTimeMs());
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            logger.error("❌ Kritischer Fehler bei Text-Analyse:", e);

            // Graceful Degradation: Minimale Analyse mit Fallback
            try {
                Document fallbackDocument = createFallbackDocument(input, request);
                AnalysisResponse fallbackResp = new AnalysisResponse(
                        fallbackDocument,
                        "Analyse mit Einschränkungen abgeschlossen: " + e.getMessage(),
                        Map.of("fallback", true, "originalError", e.getMessage()));
                fallbackResp.setProcessingTimeMs(java.time.Duration.between(t0, Instant.now()).toMillis());

                return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).body(fallbackResp);

            } catch (Exception fallbackError) {
                logger.error("❌ Auch Fallback-Analyse fehlgeschlagen:", fallbackError);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new AnalysisResponse(null, "Analysefehler: " + e.getMessage(),
                                Map.of("timestamp", System.currentTimeMillis())));
            }
        }
    }

    // ================================
    // FALLBACK-METHODEN
    // ================================

    /**
     * Generiert eine einfache Zusammenfassung ohne AI
     */
    private String generateFallbackSummary(String text) {
        if (text == null || text.length() < 50) {
            return "Text zu kurz für Zusammenfassung.";
        }

        // Erste 2-3 Sätze als Zusammenfassung
        String[] sentences = text.split("(?<=[.!?])\\s+");
        StringBuilder summary = new StringBuilder();

        int maxSentences = Math.min(3, sentences.length);
        for (int i = 0; i < maxSentences; i++) {
            summary.append(sentences[i].trim());
            if (i < maxSentences - 1)
                summary.append(" ");
        }

        String result = summary.toString();
        if (result.length() > 200) {
            result = result.substring(0, 197) + "...";
        }

        return result + " [Lokale Analyse]";
    }

    /**
     * Extrahiert Keywords ohne AI
     */
    private String generateFallbackKeywords(String text) {
        try {
            List<String> keywords = preprocessingService.extractKeywords(text, 10);
            return keywords.isEmpty() ? "Keine Keywords gefunden" : String.join(", ", keywords);
        } catch (Exception e) {
            logger.warn("Fallback Keywords fehlgeschlagen: {}", e.getMessage());
            return "Keyword-Extraktion nicht verfügbar";
        }
    }

    /**
     * Schlägt Komponenten basierend auf erkannten Technologien vor
     */
    private String generateFallbackComponents(String text) {
        Set<String> components = new LinkedHashSet<>();
        String lowerText = text.toLowerCase();

        // Frontend Frameworks
        if (lowerText.contains("angular"))
            components.add("Angular");
        if (lowerText.contains("react"))
            components.add("React");
        if (lowerText.contains("vue"))
            components.add("Vue.js");

        // Backend
        if (lowerText.contains("spring") || lowerText.contains("java"))
            components.add("Spring Boot");
        if (lowerText.contains("node"))
            components.add("Node.js");
        if (lowerText.contains("express"))
            components.add("Express.js");

        // Datenbanken
        if (lowerText.contains("postgresql") || lowerText.contains("postgres"))
            components.add("PostgreSQL");
        if (lowerText.contains("mongodb"))
            components.add("MongoDB");
        if (lowerText.contains("mysql"))
            components.add("MySQL");

        // DevOps
        if (lowerText.contains("docker"))
            components.add("Docker");
        if (lowerText.contains("kubernetes"))
            components.add("Kubernetes");
        if (lowerText.contains("aws"))
            components.add("AWS");

        // Allgemeine Empfehlungen hinzufügen
        if (components.isEmpty()) {
            components.addAll(Arrays.asList("TypeScript", "REST API", "Git", "Docker"));
        }

        return components.stream().limit(8).collect(Collectors.joining(", ")) + " [Lokale Analyse]";
    }

    /**
     * Erstellt ein minimales Document bei komplettem Fallback
     */
    private Document createFallbackDocument(String input, TextAnalysisRequest request) {
        Document doc = new Document();
        doc.setTitle(request.getTitle() != null ? request.getTitle() : "Fallback-Analyse");
        doc.setContent(input.length() > 1000 ? input.substring(0, 1000) + "..." : input);
        doc.setSummary(generateFallbackSummary(input));
        doc.setKeywords(generateFallbackKeywords(input));
        doc.setSuggestedComponents(generateFallbackComponents(input));
        doc.setUploadDate(new Date());
        doc.setDocumentType("Unbekannt");
        doc.setComplexityLevel("Einsteiger");
        doc.setQualityScore(50.0);
        doc.setFileType("text/plain");

        return doc;
    }

    /**
     * Echtzeit-Analyse während der Eingabe (leichtgewichtige Heuristiken).
     */
    @PostMapping(path = "/analyze-realtime", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RealtimeAnalysisResponse> analyzeRealtime(
            @RequestBody @Valid RealtimeAnalysisRequest request) {
        try {
            String text = Objects.requireNonNullElse(request.getText(), "");

            Map<String, Object> quick = new HashMap<>();
            String[] words = text.isBlank() ? new String[0] : text.trim().split("\\s+");
            String[] sentences = text.isBlank() ? new String[0] : text.split("[.!?]+");

            quick.put("wordCount", words.length);
            quick.put("charCount", text.length());
            quick.put("language", preprocessingService.detectLanguage(text));
            quick.put("sentiment", preprocessingService.detectSentimentIndicators(text));
            quick.put("topKeywords", preprocessingService.extractKeywords(text, 5));

            long techTermCount = Arrays.stream(words).filter(this::isTechnicalTerm).count();
            quick.put("technicalTerms", techTermCount);

            RealtimeAnalysisResponse resp = new RealtimeAnalysisResponse(
                    quick,
                    calculateReadabilityScore(text),
                    suggestImprovements(text));
            // Kompatibilität: sentiment auch als Feld setzen
            @SuppressWarnings("unchecked")
            Map<String, Integer> sentiment = (Map<String, Integer>) quick.get("sentiment");
            resp.setSentiment(sentiment);

            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            logger.error("Fehler bei Echtzeit-Analyse:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Dokument + Historie.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentWithHistory> getDocument(@PathVariable Long id) {
        Document document = documentService.getDocumentById(id);
        if (document == null) {
            return ResponseEntity.notFound().build();
        }

        List<AnalysisFeedback> feedbackHistory = feedbackService.getFeedbackForDocument(id);
        double avgRating = feedbackHistory.stream()
                .map(AnalysisFeedback::getOverallRating)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);

        DocumentWithHistory response = new DocumentWithHistory(
                document,
                feedbackHistory,
                avgRating,
                feedbackHistory.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Re-Analyse des bestehenden Dokuments.
     */
    @PostMapping("/{id}/reanalyze")
    public ResponseEntity<AnalysisResponse> reanalyzeDocument(
            @PathVariable Long id,
            @RequestParam(value = "options", required = false) String optionsJson) {

        logger.info("🔄 Re-Analyse für Dokument id={}", id);

        Document document = documentService.getDocumentById(id);
        if (document == null)
            return ResponseEntity.notFound().build();

        try {
            AnalysisOptions options = parseAnalysisOptions(optionsJson);
            String content = Objects.requireNonNullElse(document.getContent(), "");

            if (options.generateSummary)
                document.setSummary(aiService.summarizeText(content));
            if (options.extractKeywords)
                document.setKeywords(aiService.extractKeywords(content));
            if (options.suggestComponents)
                document.setSuggestedComponents(aiService.suggestComponents(content));

            document.setUploadDate(new Date());
            Document updated = documentService.saveDocument(document);

            return ResponseEntity.ok(new AnalysisResponse(updated, "Dokument erfolgreich neu analysiert", Map.of()));
        } catch (Exception e) {
            logger.error("❌ Fehler bei Re-Analyse:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AnalysisResponse(null, "Re-Analyse fehlgeschlagen: " + e.getMessage(), Map.of()));
        }
    }

    /**
     * Vergleich zweier Dokumente (null-sicher).
     */
    @GetMapping("/compare")
    public ResponseEntity<DocumentComparison> compareDocuments(
            @RequestParam Long id1,
            @RequestParam Long id2) {

        Document doc1 = documentService.getDocumentById(id1);
        Document doc2 = documentService.getDocumentById(id2);
        if (doc1 == null || doc2 == null)
            return ResponseEntity.notFound().build();

        Set<String> keywords1 = toKeywordSet(doc1.getKeywords());
        Set<String> keywords2 = toKeywordSet(doc2.getKeywords());

        Set<String> common = new HashSet<>(keywords1);
        common.retainAll(keywords2);

        Set<String> unique1 = new HashSet<>(keywords1);
        unique1.removeAll(keywords2);

        Set<String> unique2 = new HashSet<>(keywords2);
        unique2.removeAll(keywords1);

        double denom = (keywords1.size() + keywords2.size() - common.size());
        double similarity = denom == 0 ? 0.0 : (double) common.size() / denom;

        DocumentComparison cmp = new DocumentComparison();
        cmp.setDocument1(doc1);
        cmp.setDocument2(doc2);
        cmp.setCommonKeywords(common);
        cmp.setUniqueToDoc1(unique1);
        cmp.setUniqueToDoc2(unique2);
        cmp.setSimilarityScore(similarity);

        return ResponseEntity.ok(cmp);
    }

    // ========================
    // Hilfsmethoden
    // ========================

    private Set<String> toKeywordSet(String kw) {
        if (kw == null || kw.isBlank())
            return Set.of();
        return Arrays.stream(kw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
    }

    private ValidationResult validateFile(MultipartFile file) {
        ValidationResult result = new ValidationResult();

        if (file == null || file.isEmpty()) {
            result.setValid(false);
            result.setErrorMessage("Datei ist leer");
            return result;
        }
        long maxSize = parseSize(maxFileSize);
        if (file.getSize() > maxSize) {
            result.setValid(false);
            result.setErrorMessage(String.format("Datei zu groß. Maximum: %s", maxFileSize));
            return result;
        }
        String contentType = file.getContentType();
        if (contentType == null || !SUPPORTED_FORMATS.contains(contentType)) {
            result.setValid(false);
            result.setErrorMessage("Dateityp nicht unterstützt. Erlaubt: PDF, TXT, DOC, DOCX, CSV, JSON, MD");
            return result;
        }
        result.setValid(true);
        return result;
    }

    private String extractTextFromFile(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        logger.debug("Extrahiere Text aus {}, Typ: {}", filename, contentType);

        if ("application/pdf".equals(contentType)) {
            Path tmp = Files.createTempFile("upload-", ".pdf");
            try {
                file.transferTo(tmp.toFile());
                return PdfProcessor.extractTextFromPdf(tmp.toFile());
            } finally {
                try {
                    Files.deleteIfExists(tmp);
                } catch (Exception ignore) {
                }
            }
        } else if ("application/json".equals(contentType)) {
            String json = new String(file.getBytes(), StandardCharsets.UTF_8);
            Object jsonObject = objectMapper.readValue(json, Object.class);
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonObject);
        } else if ("text/plain".equals(contentType)
                || "text/csv".equals(contentType)
                || "text/markdown".equals(contentType)) {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } else if (contentType.contains("word")) {
            // TODO: Apache POI für .doc/.docx integrieren
            return "Word-Dokument-Extraktion noch nicht implementiert";
        } else {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        }
    }

    private Document processFile(MultipartFile file, AnalysisOptions options) throws IOException {
        String content = extractTextFromFile(file);
        String processed = preprocessingService.preprocessText(content);

        Document document = new Document();
        document.setFilename(file.getOriginalFilename());
        document.setFileType(file.getContentType());
        document.setContent(processed);
        document.setUploadDate(new Date());

        if (options.generateSummary)
            document.setSummary(aiService.summarizeText(processed));
        if (options.extractKeywords)
            document.setKeywords(aiService.extractKeywords(processed));
        if (options.suggestComponents)
            document.setSuggestedComponents(aiService.suggestComponents(processed));

        document.setDocumentType(detectDocumentType(processed));
        TextPreprocessingService.PreprocessingResult pr = preprocessingService.getPreprocessingResult(content,
                processed);
        document.setComplexityLevel(calculateComplexity(pr));
        document.setQualityScore(calculateQualityScore(pr));

        return documentService.saveDocument(document);
    }

    private AnalysisOptions parseAnalysisOptions(String json) {
        if (json == null || json.isBlank())
            return AnalysisOptions.defaultOptions();
        try {
            return objectMapper.readValue(json, AnalysisOptions.class);
        } catch (Exception e) {
            logger.warn("Fehler beim Parsen der Analyse-Optionen, verwende Defaults: {}", e.getMessage());
            return AnalysisOptions.defaultOptions();
        }
    }

    private String extractTitle(String filename, String content) {
        if (filename != null) {
            int lastDot = filename.lastIndexOf('.');
            return lastDot > 0 ? filename.substring(0, lastDot) : filename;
        }
        String[] lines = content.split("\n");
        if (lines.length > 0 && lines[0].length() < 100)
            return lines[0].trim();
        return "Unbenanntes Dokument";
    }

    private String detectDocumentType(String content) {
        String s = content == null ? "" : content.toLowerCase();
        if (s.contains("requirements") || s.contains("anforderungen"))
            return "Anforderungsdokument";
        if (s.contains("architecture") || s.contains("architektur"))
            return "Architekturdokument";
        if (s.contains("test") || s.contains("testing"))
            return "Testdokument";
        if (s.contains("manual") || s.contains("anleitung"))
            return "Handbuch";
        if (s.contains("api") && s.contains("endpoint"))
            return "API-Dokumentation";
        if (s.contains("class") || s.contains("function") || s.contains("import"))
            return "Code-Dokumentation";
        return "Technisches Dokument";
    }

    private String calculateComplexity(TextPreprocessingService.PreprocessingResult result) {
        double score = 0;
        Map<String, Object> m = result != null ? result.qualityMetrics : null;

        if (m != null) {
            Number wc = (Number) m.getOrDefault("wordCount", 0);
            Number td = (Number) m.getOrDefault("technicalDensity", 0.0);
            Number rd = (Number) m.getOrDefault("readabilityScore", 100.0);

            if (wc.longValue() > 1000)
                score += 20;
            if (td.doubleValue() > 0.10)
                score += 30;
            if (rd.doubleValue() < 50.0)
                score += 30;
            if (result.codeBlockCount > 5)
                score += 20;
        }

        if (score > 70)
            return "Experte";
        if (score > 40)
            return "Fortgeschritten";
        return "Einsteiger";
    }

    private double calculateQualityScore(TextPreprocessingService.PreprocessingResult result) {
        if (result != null && result.qualityMetrics != null) {
            Object v = result.qualityMetrics.get("overallQualityScore");
            if (v instanceof Number n)
                return n.doubleValue();
        }
        return 50.0;
    }

    private Map<String, Object> buildAnalysisMetadata(
            TextPreprocessingService.PreprocessingResult pr,
            Document document) {

        Map<String, Object> metadata = new HashMap<>();
        if (pr != null) {
            metadata.put("originalLength", pr.originalLength);
            metadata.put("processedLength", pr.processedLength);
            metadata.put("compressionRatio", pr.compressionRatio);
            metadata.put("detectedLanguage", pr.detectedLanguage);
            metadata.put("codeBlockCount", pr.codeBlockCount);
            metadata.put("technicalTermCount", pr.technicalTermCount);
        }
        if (document != null) {
            metadata.put("documentType", document.getDocumentType());
            metadata.put("complexityLevel", document.getComplexityLevel());
            metadata.put("qualityScore", document.getQualityScore());
            // kleine Kompatibilitätshilfe fürs Frontend:
            metadata.put("name", Optional.ofNullable(document.getTitle()).orElse(document.getFilename()));
        }
        return metadata;
    }

    private boolean isTechnicalTerm(String word) {
        Set<String> techTerms = Set.of(
                "API", "REST", "JSON", "SQL", "NoSQL", "Docker", "Kubernetes",
                "Java", "Python", "JavaScript", "React", "Angular", "Spring");
        return word != null && techTerms.contains(word.toUpperCase(Locale.ROOT));
    }

    private double calculateReadabilityScore(String text) {
        if (text == null || text.isBlank())
            return 100.0;
        String[] sentences = text.split("[.!?]+");
        String[] words = text.trim().split("\\s+");
        if (sentences.length == 0 || words.length == 0)
            return 100.0;
        double avgWordsPerSentence = (double) words.length / sentences.length;
        return Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence));
        // Hinweis: stark vereinfachte Formel
    }

    private List<String> suggestImprovements(String text) {
        List<String> suggestions = new ArrayList<>();
        if (text == null || text.isBlank())
            return suggestions;

        String[] sentences = text.split("[.!?]+");
        String[] words = text.trim().split("\\s+");

        if (sentences.length > 0) {
            double avgWordsPerSentence = (double) words.length / sentences.length;
            if (avgWordsPerSentence > 25) {
                suggestions.add("Verwenden Sie kürzere Sätze für bessere Lesbarkeit.");
            }
        }
        String[] paragraphs = text.split("\\R\\R+");
        if (paragraphs.length < 3 && words.length > 200) {
            suggestions.add("Fügen Sie mehr Absätze zur Strukturierung hinzu.");
        }
        long techTerms = Arrays.stream(words).filter(this::isTechnicalTerm).count();
        if (techTerms < 3 && words.length > 100) {
            suggestions.add("Fügen Sie spezifische technische Details hinzu.");
        }
        return suggestions;
    }

    private long parseSize(String size) {
        if (size == null)
            return 10L * 1024 * 1024;
        String s = size.trim().toUpperCase(Locale.ROOT);
        long mult = 1;
        if (s.endsWith("KB")) {
            mult = 1024L;
            s = s.substring(0, s.length() - 2);
        } else if (s.endsWith("MB")) {
            mult = 1024L * 1024;
            s = s.substring(0, s.length() - 2);
        } else if (s.endsWith("GB")) {
            mult = 1024L * 1024 * 1024;
            s = s.substring(0, s.length() - 2);
        }
        try {
            return Long.parseLong(s.trim()) * mult;
        } catch (NumberFormatException e) {
            return 10L * 1024 * 1024; // Default 10MB
        }
    }

    // ========================
    // DTOs
    // ========================

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
            AnalysisOptions o = new AnalysisOptions();
            o.performSentimentAnalysis = true;
            return o;
        }

        public boolean isGenerateSummary() {
            return generateSummary;
        }

        public void setGenerateSummary(boolean v) {
            this.generateSummary = v;
        }

        public boolean isExtractKeywords() {
            return extractKeywords;
        }

        public void setExtractKeywords(boolean v) {
            this.extractKeywords = v;
        }

        public boolean isSuggestComponents() {
            return suggestComponents;
        }

        public void setSuggestComponents(boolean v) {
            this.suggestComponents = v;
        }

        public boolean isPerformSentimentAnalysis() {
            return performSentimentAnalysis;
        }

        public void setPerformSentimentAnalysis(boolean v) {
            this.performSentimentAnalysis = v;
        }

        public boolean isDetectLanguage() {
            return detectLanguage;
        }

        public void setDetectLanguage(boolean v) {
            this.detectLanguage = v;
        }

        public boolean isCalculateMetrics() {
            return calculateMetrics;
        }

        public void setCalculateMetrics(boolean v) {
            this.calculateMetrics = v;
        }
    }

    public static class TextAnalysisRequest {
        @NotBlank(message = "Text darf nicht leer sein")
        private String text;
        private String title;
        private AnalysisOptions options;
        private boolean saveDocument = true;

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public AnalysisOptions getOptions() {
            return options;
        }

        public void setOptions(AnalysisOptions options) {
            this.options = options;
        }

        public boolean isSaveDocument() {
            return saveDocument;
        }

        public void setSaveDocument(boolean saveDocument) {
            this.saveDocument = saveDocument;
        }
    }

    public static class RealtimeAnalysisRequest {
        @NotNull
        private String text;
        private String language;

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public String getLanguage() {
            return language;
        }

        public void setLanguage(String language) {
            this.language = language;
        }
    }

    public static class AnalysisResponse {
        private Document document;
        private String message;
        private Map<String, Object> metadata;
        private Long processingTimeMs;
        private Date timestamp;

        public AnalysisResponse(Document document, String message, Map<String, Object> metadata) {
            this.document = document;
            this.message = message;
            this.metadata = metadata != null ? metadata : Map.of();
            this.timestamp = new Date();
        }

        public Document getDocument() {
            return document;
        }

        public void setDocument(Document document) {
            this.document = document;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public Map<String, Object> getMetadata() {
            return metadata;
        }

        public void setMetadata(Map<String, Object> metadata) {
            this.metadata = metadata;
        }

        public Long getProcessingTimeMs() {
            return processingTimeMs;
        }

        public void setProcessingTimeMs(Long processingTimeMs) {
            this.processingTimeMs = processingTimeMs;
        }

        public Date getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(Date timestamp) {
            this.timestamp = timestamp;
        }
    }

    public static class BatchAnalysisResponse {
        private List<Document> documents;
        private String message;
        private int successCount;
        private int totalCount;
        private List<String> errors;
        private Map<String, Object> statistics;

        public BatchAnalysisResponse(List<Document> documents, String message, int successCount, int totalCount) {
            this.documents = documents != null ? documents : List.of();
            this.message = message;
            this.successCount = successCount;
            this.totalCount = totalCount;
            this.errors = new ArrayList<>();
            this.statistics = calculateStatistics(this.documents);
        }

        private Map<String, Object> calculateStatistics(List<Document> docs) {
            Map<String, Object> stats = new HashMap<>();
            if (docs != null && !docs.isEmpty()) {
                stats.put("totalDocuments", docs.size());
                stats.put("averageQualityScore",
                        docs.stream()
                                .map(Document::getQualityScore)
                                .filter(Objects::nonNull)
                                .mapToDouble(Double::doubleValue)
                                .average()
                                .orElse(0.0));
                Map<String, Long> typeDistribution = docs.stream()
                        .map(Document::getDocumentType)
                        .filter(Objects::nonNull)
                        .collect(Collectors.groupingBy(s -> s, Collectors.counting()));
                stats.put("documentTypes", typeDistribution);
            }
            return stats;
        }

        public List<Document> getDocuments() {
            return documents;
        }

        public void setDocuments(List<Document> documents) {
            this.documents = documents;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public int getSuccessCount() {
            return successCount;
        }

        public void setSuccessCount(int successCount) {
            this.successCount = successCount;
        }

        public int getTotalCount() {
            return totalCount;
        }

        public void setTotalCount(int totalCount) {
            this.totalCount = totalCount;
        }

        public List<String> getErrors() {
            return errors;
        }

        public void setErrors(List<String> errors) {
            this.errors = errors;
        }

        public Map<String, Object> getStatistics() {
            return statistics;
        }

        public void setStatistics(Map<String, Object> statistics) {
            this.statistics = statistics;
        }
    }

    public static class RealtimeAnalysisResponse {
        private Map<String, Object> quickAnalysis;
        private double readabilityScore;
        private List<String> suggestions;
        private Map<String, Integer> sentiment;

        public RealtimeAnalysisResponse(Map<String, Object> quickAnalysis, double readabilityScore,
                List<String> suggestions) {
            this.quickAnalysis = quickAnalysis != null ? quickAnalysis : Map.of();
            this.readabilityScore = readabilityScore;
            this.suggestions = suggestions != null ? suggestions : List.of();
        }

        public Map<String, Object> getQuickAnalysis() {
            return quickAnalysis;
        }

        public void setQuickAnalysis(Map<String, Object> quickAnalysis) {
            this.quickAnalysis = quickAnalysis;
        }

        public double getReadabilityScore() {
            return readabilityScore;
        }

        public void setReadabilityScore(double readabilityScore) {
            this.readabilityScore = readabilityScore;
        }

        public List<String> getSuggestions() {
            return suggestions;
        }

        public void setSuggestions(List<String> suggestions) {
            this.suggestions = suggestions;
        }

        public Map<String, Integer> getSentiment() {
            return sentiment;
        }

        public void setSentiment(Map<String, Integer> sentiment) {
            this.sentiment = sentiment;
        }
    }

    public static class DocumentWithHistory {
        private Document document;
        private List<AnalysisFeedback> feedbackHistory;
        private double averageRating;
        private int feedbackCount;
        private Map<String, Object> trends;

        public DocumentWithHistory(Document document, List<AnalysisFeedback> feedbackHistory, double averageRating,
                int feedbackCount) {
            this.document = document;
            this.feedbackHistory = feedbackHistory != null ? feedbackHistory : List.of();
            this.averageRating = averageRating;
            this.feedbackCount = feedbackCount;
            this.trends = calculateTrends(this.feedbackHistory);
        }

        private Map<String, Object> calculateTrends(List<AnalysisFeedback> history) {
            Map<String, Object> trends = new HashMap<>();
            if (history != null && history.size() > 1) {
                List<Integer> ratings = history.stream()
                        .map(AnalysisFeedback::getOverallRating)
                        .filter(Objects::nonNull)
                        .toList();
                if (ratings.size() > 1) {
                    int mid = ratings.size() / 2;
                    int firstHalf = ratings.subList(0, mid).stream().mapToInt(Integer::intValue).sum();
                    int secondHalf = ratings.subList(mid, ratings.size()).stream().mapToInt(Integer::intValue).sum();
                    trends.put("ratingTrend",
                            secondHalf > firstHalf ? "improving" : secondHalf < firstHalf ? "declining" : "stable");
                }
                Map<String, Long> categories = history.stream()
                        .map(AnalysisFeedback::getImprovementCategory)
                        .filter(Objects::nonNull)
                        .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
                trends.put("topImprovementArea", categories.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("none"));
            }
            return trends;
        }

        public Document getDocument() {
            return document;
        }

        public void setDocument(Document document) {
            this.document = document;
        }

        public List<AnalysisFeedback> getFeedbackHistory() {
            return feedbackHistory;
        }

        public void setFeedbackHistory(List<AnalysisFeedback> feedbackHistory) {
            this.feedbackHistory = feedbackHistory;
        }

        public double getAverageRating() {
            return averageRating;
        }

        public void setAverageRating(double averageRating) {
            this.averageRating = averageRating;
        }

        public int getFeedbackCount() {
            return feedbackCount;
        }

        public void setFeedbackCount(int feedbackCount) {
            this.feedbackCount = feedbackCount;
        }

        public Map<String, Object> getTrends() {
            return trends;
        }

        public void setTrends(Map<String, Object> trends) {
            this.trends = trends;
        }
    }

    public static class DocumentComparison {
        private Document document1;
        private Document document2;
        private Set<String> commonKeywords;
        private Set<String> uniqueToDoc1;
        private Set<String> uniqueToDoc2;
        private double similarityScore;
        private Map<String, String> fieldComparison = new HashMap<>();

        public Document getDocument1() {
            return document1;
        }

        public void setDocument1(Document document1) {
            this.document1 = document1;
        }

        public Document getDocument2() {
            return document2;
        }

        public void setDocument2(Document document2) {
            this.document2 = document2;
        }

        public Set<String> getCommonKeywords() {
            return commonKeywords;
        }

        public void setCommonKeywords(Set<String> commonKeywords) {
            this.commonKeywords = commonKeywords;
        }

        public Set<String> getUniqueToDoc1() {
            return uniqueToDoc1;
        }

        public void setUniqueToDoc1(Set<String> uniqueToDoc1) {
            this.uniqueToDoc1 = uniqueToDoc1;
        }

        public Set<String> getUniqueToDoc2() {
            return uniqueToDoc2;
        }

        public void setUniqueToDoc2(Set<String> uniqueToDoc2) {
            this.uniqueToDoc2 = uniqueToDoc2;
        }

        public double getSimilarityScore() {
            return similarityScore;
        }

        public void setSimilarityScore(double similarityScore) {
            this.similarityScore = similarityScore;
        }

        public Map<String, String> getFieldComparison() {
            return fieldComparison;
        }

        public void setFieldComparison(Map<String, String> fieldComparison) {
            this.fieldComparison = fieldComparison;
        }
    }

    private static class ValidationResult {
        private boolean valid;
        private String errorMessage;

        public boolean isValid() {
            return valid;
        }

        public void setValid(boolean valid) {
            this.valid = valid;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public void setErrorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
        }
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        logger.error("Unerwarteter Fehler:", e);
        ErrorResponse error = new ErrorResponse(
                "INTERNAL_ERROR",
                "Ein unerwarteter Fehler ist aufgetreten",
                e.getMessage(),
                new Date());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    public static class ErrorResponse {
        private final String errorCode;
        private final String message;
        private final String details;
        private final Date timestamp;

        public ErrorResponse(String errorCode, String message, String details, Date timestamp) {
            this.errorCode = errorCode;
            this.message = message;
            this.details = details;
            this.timestamp = timestamp;
        }

        public String getErrorCode() {
            return errorCode;
        }

        public String getMessage() {
            return message;
        }

        public String getDetails() {
            return details;
        }

        public Date getTimestamp() {
            return timestamp;
        }
    }
}
