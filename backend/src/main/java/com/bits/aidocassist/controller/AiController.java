package com.bits.aidocassist.controller;

import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.IndustryDetectionService;

import lombok.RequiredArgsConstructor;
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final IndustryDetectionService industryDetectionService;
    private final AiService aiService;

    /**
     * Branchenerkennung (funktioniert bereits)
     */
    @PostMapping("/detect-industry")
    public ResponseEntity<Map<String, Object>> detectIndustry(@RequestBody Map<String, String> request) {
        log.info("Received industry detection request");

        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Text is required"));
        }

        try {
            Map<String, Object> result = industryDetectionService.detectIndustry(text);
            log.info("Industry detection completed successfully");
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Industry detection failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Industry detection failed: " + e.getMessage()));
        }
    }

    /**
     * 🔧 KORRIGIERTE vollständige Analyse mit robuster Fehlerbehandlung
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeDocument(@RequestBody Map<String, String> request) {
        log.info("Received comprehensive AI analysis request");

        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Text is required"));
        }

        try {
            // 1. Branchenerkennung (funktioniert bereits)
            Map<String, Object> industryAnalysis = industryDetectionService.detectIndustry(text);
            log.info("✅ Industry detection completed");

            // 2. 🔧 AI-ANALYSE MIT FEHLERBEHANDLUNG:
            Map<String, Object> textAnalysis = performRobustTextAnalysis(text);
            log.info("✅ Text analysis completed");

            // 3. Kombiniere Ergebnisse
            Map<String, Object> result = new HashMap<>();
            result.put("industryAnalysis", industryAnalysis);
            result.put("textAnalysis", textAnalysis);
            result.put("timestamp", System.currentTimeMillis());
            result.put("status", "SUCCESS");

            log.info("✅ Comprehensive AI analysis completed successfully");
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("❌ Comprehensive AI analysis failed: {}", e.getMessage(), e);
            
            // Fallback: Nur Branchenerkennung
            try {
                Map<String, Object> fallbackResult = new HashMap<>();
                fallbackResult.put("industryAnalysis", industryDetectionService.detectIndustry(text));
                fallbackResult.put("textAnalysis", createFallbackTextAnalysis(text));
                fallbackResult.put("status", "PARTIAL");
                fallbackResult.put("message", "Analysis completed with limitations: " + e.getMessage());
                fallbackResult.put("timestamp", System.currentTimeMillis());
                
                return ResponseEntity.ok(fallbackResult);
                
            } catch (Exception fallbackError) {
                log.error("❌ Even fallback analysis failed: {}", fallbackError.getMessage());
                return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Analysis failed: " + e.getMessage()));
            }
        }
    }

    /**
     * 🆕 Robuste Text-Analyse mit individueller Fehlerbehandlung
     */
    private Map<String, Object> performRobustTextAnalysis(String text) {
        Map<String, Object> analysis = new HashMap<>();
        
        // Summary mit Fallback
        String summary = null;
        try {
            summary = aiService.summarizeText(text);
            log.debug("✅ AI Summary generated: {} chars", summary != null ? summary.length() : 0);
        } catch (Exception e) {
            log.warn("⚠️ AI Summary failed, using fallback: {}", e.getMessage());
            summary = generateFallbackSummary(text);
        }
        
        // Keywords mit Fallback
        String keywords = null;
        try {
            keywords = aiService.extractKeywords(text);
            log.debug("✅ AI Keywords extracted");
        } catch (Exception e) {
            log.warn("⚠️ AI Keywords failed, using fallback: {}", e.getMessage());
            keywords = generateFallbackKeywords(text);
        }
        
        // Components mit Fallback
        String components = null;
        try {
            components = aiService.suggestComponents(text);
            log.debug("✅ AI Components suggested");
        } catch (Exception e) {
            log.warn("⚠️ AI Components failed, using fallback: {}", e.getMessage());
            components = generateFallbackComponents(text);
        }

        // Ergebnis zusammenstellen
        analysis.put("summary", summary);
        analysis.put("keywords", keywords);
        analysis.put("components", components);
        analysis.put("wordCount", text.split("\\s+").length);
        analysis.put("characterCount", text.length());
        analysis.put("method", "AI_WITH_FALLBACK");
        
        return analysis;
    }

    /**
     * 🆕 Fallback Text-Analyse (wenn AI komplett fehlschlägt)
     */
    private Map<String, Object> createFallbackTextAnalysis(String text) {
        Map<String, Object> analysis = new HashMap<>();
        
        analysis.put("summary", generateFallbackSummary(text));
        analysis.put("keywords", generateFallbackKeywords(text));
        analysis.put("components", generateFallbackComponents(text));
        analysis.put("wordCount", text.split("\\s+").length);
        analysis.put("characterCount", text.length());
        analysis.put("method", "FALLBACK_ONLY");
        analysis.put("note", "AI services unavailable, using local analysis");
        
        return analysis;
    }

    // ================================
    // 🆕 FALLBACK-METHODEN
    // ================================

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
            if (i < maxSentences - 1) summary.append(" ");
        }
        
        String result = summary.toString();
        if (result.length() > 200) {
            result = result.substring(0, 197) + "...";
        }
        
        return result + " [Lokale Analyse]";
    }

    private String generateFallbackKeywords(String text) {
        // Einfache Keyword-Extraktion
        String[] words = text.toLowerCase().split("\\s+");
        Map<String, Integer> wordCount = new HashMap<>();
        
        for (String word : words) {
            if (word.length() > 3 && !isStopWord(word)) {
                wordCount.put(word, wordCount.getOrDefault(word, 0) + 1);
            }
        }
        
        return wordCount.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8)
                .map(Map.Entry::getKey)
                .collect(Collectors.joining(", "))
                + " [Lokale Analyse]";
    }

    private String generateFallbackComponents(String text) {
        Set<String> components = new LinkedHashSet<>();
        String lowerText = text.toLowerCase();
        
        // Frontend Frameworks
        if (lowerText.contains("angular")) components.add("Angular");
        if (lowerText.contains("react")) components.add("React");
        if (lowerText.contains("vue")) components.add("Vue.js");
        
        // Backend
        if (lowerText.contains("spring") || lowerText.contains("java")) components.add("Spring Boot");
        if (lowerText.contains("node")) components.add("Node.js");
        if (lowerText.contains("express")) components.add("Express.js");
        
        // Datenbanken
        if (lowerText.contains("postgresql")) components.add("PostgreSQL");
        if (lowerText.contains("mongodb")) components.add("MongoDB");
        if (lowerText.contains("mysql")) components.add("MySQL");
        
        // DevOps
        if (lowerText.contains("docker")) components.add("Docker");
        if (lowerText.contains("kubernetes")) components.add("Kubernetes");
        if (lowerText.contains("aws")) components.add("AWS");
        
        // Standard-Empfehlungen falls nichts erkannt
        if (components.isEmpty()) {
            components.addAll(Arrays.asList("REST API", "Git", "Docker", "TypeScript"));
        }
        
        return components.stream()
                .limit(8)
                .collect(Collectors.joining(", "))
                + " [Lokale Analyse]";
    }

    private boolean isStopWord(String word) {
        Set<String> stopWords = Set.of("und", "oder", "aber", "von", "mit", "für", "auf", "ein", "eine",
                                      "and", "or", "but", "of", "with", "for", "on", "a", "an", "the");
        return stopWords.contains(word);
    }

    /**
     * 🔧 Health Check - Status auf TRUE setzen nach AiService Integration
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "ai-service");

        Map<String, Object> features = new HashMap<>();

        Map<String, Object> industryDetection = new HashMap<>();
        industryDetection.put("available", true);
        industryDetection.put("keywordBased", true);
        industryDetection.put("aiBased", isOpenAiConfigured());
        industryDetection.put("supportedIndustries", 10);
        features.put("industryDetection", industryDetection);

        Map<String, Object> textAnalysis = new HashMap<>();
        textAnalysis.put("available", true); // ✅ JETZT AUF TRUE GESETZT
        textAnalysis.put("status", "Integrated with fallback support");
        textAnalysis.put("aiService", isOpenAiConfigured() ? "OpenAI available" : "Using fallback methods");
        features.put("textAnalysis", textAnalysis);

        health.put("features", features);
        health.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(health);
    }

    // ================================
    // UNVERÄNDERTE METHODEN
    // ================================

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "AI Analysis Service with Industry Detection");
        info.put("version", "1.2.0"); // Version erhöht nach Integration
        info.put("description", "AI-powered industry detection with robust text analysis integration");

        Map<String, Object> endpoints = new HashMap<>();
        endpoints.put("industryDetection", "POST /api/ai/detect-industry - Industry detection");
        endpoints.put("comprehensive", "POST /api/ai/analyze - Full analysis with fallback support");
        endpoints.put("health", "GET /api/ai/health");
        endpoints.put("info", "GET /api/ai/info");
        endpoints.put("industries", "GET /api/ai/industries");
        info.put("endpoints", endpoints);

        Map<String, Object> features = new HashMap<>();
        features.put("industryDetection", "✅ Automatic industry classification (10 industries)");
        features.put("textAnalysis", "✅ Integrated with robust fallback support");
        features.put("caching", "✅ In-memory result caching");
        features.put("fallback", "✅ Local fallback when OpenAI unavailable");
        features.put("monitoring", "✅ Health checks and metrics");
        info.put("features", features);

        return ResponseEntity.ok(info);
    }

    @GetMapping("/industries")
    public ResponseEntity<Map<String, Object>> getIndustries() {
        Map<String, Object> industries = new HashMap<>();
        industries.put("automotive", "auto, fahrzeug, kfz, motor, bmw, mercedes, audi...");
        industries.put("pharma", "pharma, medikament, arzneimittel, bayer, merck...");
        industries.put("ecommerce", "shop, online, ecommerce, zalando, amazon...");
        industries.put("finance", "bank, finanz, versicherung, allianz...");
        industries.put("it", "software, entwicklung, programmierung, sap...");
        industries.put("event", "event, marketing, werbung, messe...");
        industries.put("healthcare", "gesundheit, krankenhaus, klinik, arzt...");
        industries.put("education", "bildung, schule, universität, lernen...");
        industries.put("energy", "energie, strom, gas, öl, solar, wind...");
        industries.put("logistics", "transport, logistik, dhl, ups, fedex...");

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Supported industries and sample keywords");
        result.put("industries", industries);
        result.put("note", "Each industry has 10-15 keywords for detection");

        return ResponseEntity.ok(result);
    }

    private boolean isOpenAiConfigured() {
        String apiKey = System.getenv("OPENAI_API_KEY");
        return apiKey != null && !apiKey.trim().isEmpty();
    }
}