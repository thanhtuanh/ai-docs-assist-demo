package com.bits.aidocassist.controller;

import com.bits.aidocassist.service.IndustryDetectionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);
    
    private final IndustryDetectionService industryDetectionService;
    // Ihr bestehender AiService kann später integriert werden
    // private final AiService aiService;

    /**
     * Branchenerkennung (neuer Hauptendpoint)
     * POST /api/ai/detect-industry
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
     * Vollständige Analyse: Text-Analyse + Branchenerkennung
     * POST /api/ai/analyze
     * 
     * Dieser Endpoint kann später erweitert werden, wenn AiService.analyzeText verfügbar ist
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeDocument(@RequestBody Map<String, String> request) {
        log.info("Received comprehensive AI analysis request");
        
        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Text is required"));
        }

        try {
            // 1. Branchenerkennung (verfügbar)
            Map<String, Object> industryAnalysis = industryDetectionService.detectIndustry(text);
            
            // 2. Text-Analyse (TODO: Integration mit bestehendem AiService)
            Map<String, Object> textAnalysis = createBasicTextAnalysis(text);
            
            // 3. Kombiniere Ergebnisse
            Map<String, Object> result = new HashMap<>();
            result.put("industryAnalysis", industryAnalysis);
            result.put("textAnalysis", textAnalysis);
            result.put("timestamp", System.currentTimeMillis());
            
            log.info("Comprehensive AI analysis completed successfully");
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("Comprehensive AI analysis failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Analysis failed: " + e.getMessage()));
        }
    }

    /**
     * Basis Text-Analyse (Platzhalter für Integration mit bestehendem AiService)
     */
    private Map<String, Object> createBasicTextAnalysis(String text) {
        Map<String, Object> analysis = new HashMap<>();
        
        // Basis-Analyse ohne AiService
        analysis.put("wordCount", text.split("\\s+").length);
        analysis.put("characterCount", text.length());
        analysis.put("summary", "Text analysis integration pending - using industry detection only");
        analysis.put("keywords", "Available after AiService integration");
        analysis.put("recommendations", "Available after AiService integration");
        analysis.put("status", "Partial analysis - industry detection completed");
        
        return analysis;
    }

    /**
     * Health Check mit Industry Detection Status
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
        textAnalysis.put("available", false); // TODO: Nach AiService Integration auf true setzen
        textAnalysis.put("status", "Integration pending");
        features.put("textAnalysis", textAnalysis);
        
        health.put("features", features);
        health.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.ok(health);
    }

    /**
     * Service Info mit verfügbaren Endpoints
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "AI Analysis Service with Industry Detection");
        info.put("version", "1.1.0");
        info.put("description", "AI-powered industry detection with text analysis integration");
        
        Map<String, Object> endpoints = new HashMap<>();
        endpoints.put("industryDetection", "POST /api/ai/detect-industry - Industry detection");
        endpoints.put("comprehensive", "POST /api/ai/analyze - Industry detection + basic analysis");
        endpoints.put("health", "GET /api/ai/health");
        endpoints.put("info", "GET /api/ai/info");
        endpoints.put("industries", "GET /api/ai/industries");
        info.put("endpoints", endpoints);
        
        Map<String, Object> features = new HashMap<>();
        features.put("industryDetection", "✅ Automatic industry classification (10 industries)");
        features.put("textAnalysis", "⏳ Integration with existing AiService pending");
        features.put("caching", "✅ Redis-based result caching");
        features.put("fallback", "✅ Local fallback when OpenAI unavailable");
        features.put("monitoring", "✅ Health checks and metrics");
        info.put("features", features);
        
        Map<String, Object> supportedIndustries = new HashMap<>();
        supportedIndustries.put("count", 10);
        supportedIndustries.put("industries", "Automotive, Pharma, E-Commerce, Finanzwesen, IT/Software, Event/Marketing, Gesundheitswesen, Bildung, Energie, Transport/Logistik");
        info.put("supportedIndustries", supportedIndustries);
        
        return ResponseEntity.ok(info);
    }

    /**
     * Debugging: Zeige verfügbare Branchen und ihre Keywords
     */
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

    /**
     * Prüft ob OpenAI konfiguriert ist (vereinfacht)
     */
    private boolean isOpenAiConfigured() {
        // Diese Methode kann später erweitert werden
        String apiKey = System.getenv("OPENAI_API_KEY");
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    // TODO: Integration mit bestehendem AiService
    // Wenn Ihr AiService verfügbar ist, können Sie diese Methoden hinzufügen:
    /*
    private final AiService aiService; // In der Klasse definieren
    
    @PostMapping("/analyze-text")
    public ResponseEntity<Map<String, String>> analyzeTextOnly(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Text is required"));
        }

        try {
            Map<String, String> result = aiService.analyzeText(text);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Analysis failed: " + e.getMessage()));
        }
    }
    */
}