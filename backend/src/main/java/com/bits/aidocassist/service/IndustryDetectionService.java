// IndustryDetectionService.java - Vereinfacht für Demo ohne Redis
package com.bits.aidocassist.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "industry-detection.enabled", havingValue = "true", matchIfMissing = true)
public class IndustryDetectionService {

    private static final Logger log = LoggerFactory.getLogger(IndustryDetectionService.class);

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${openai.model:gpt-3.5-turbo-instruct}")
    private String model;

    @Value("${openai.timeout:30s}")
    private Duration timeout;

    // In-Memory Cache für Demo (ersetzt Redis)
    private final Map<String, Map<String, Object>> inMemoryCache = new ConcurrentHashMap<>();
    private static final int MAX_CACHE_SIZE = 100;

    // Branchendefinitionen mit deutschen Bezeichnungen
    private static final Map<String, Set<String>> INDUSTRY_KEYWORDS = Map.of(
        "Automotive", Set.of("auto", "fahrzeug", "kfz", "motor", "bmw", "mercedes", "audi", "volkswagen", "porsche", "automotive", "cars", "mobility", "elektroauto"),
        "Pharma", Set.of("pharma", "medikament", "arzneimittel", "bayer", "merck", "boehringer", "pharmaceutical", "drug", "medicine", "clinical", "therapie"),
        "E-Commerce", Set.of("shop", "online", "ecommerce", "e-commerce", "zalando", "amazon", "otto", "retail", "verkauf", "webshop", "marketplace"),
        "Finanzwesen", Set.of("bank", "finanz", "versicherung", "allianz", "deutsche bank", "commerzbank", "sparkasse", "financial", "insurance", "kredit"),
        "IT/Software", Set.of("software", "entwicklung", "programmierung", "sap", "siemens", "it-beratung", "consulting", "tech", "digital", "cloud"),
        "Event/Marketing", Set.of("event", "marketing", "werbung", "messe", "promotion", "advertising", "campaign", "brand", "veranstaltung"),
        "Gesundheitswesen", Set.of("gesundheit", "krankenhaus", "klinik", "arzt", "pflege", "healthcare", "medical", "hospital", "patient"),
        "Bildung", Set.of("bildung", "schule", "universität", "lernen", "education", "university", "learning", "training", "student"),
        "Energie", Set.of("energie", "strom", "gas", "öl", "solar", "wind", "energy", "power", "renewable", "nachhaltigkeit"),
        "Transport/Logistik", Set.of("transport", "logistik", "dhl", "ups", "fedex", "shipping", "delivery", "logistics", "spedition")
    );

    /**
     * Erkennt die Branche basierend auf dem Text-Inhalt
     */
    public Map<String, Object> detectIndustry(String text) {
        log.info("Starting industry detection for text with {} characters", text.length());
        
        try {
            // Check In-Memory Cache
            String cacheKey = generateCacheKey(text);
            Map<String, Object> cachedResult = inMemoryCache.get(cacheKey);
            if (cachedResult != null) {
                log.info("Returning cached industry detection result");
                return cachedResult;
            }

            // Perform industry detection
            Map<String, Object> result = analyzeIndustry(text);
            
            // Cache the result (In-Memory)
            cacheResult(cacheKey, result);
            
            log.info("Industry detection completed successfully");
            return result;

        } catch (Exception e) {
            log.error("Industry detection failed, using fallback: {}", e.getMessage());
            return getFallbackIndustryAnalysis(text);
        }
    }

    /**
     * Hauptlogik für Branchenerkennung
     */
    private Map<String, Object> analyzeIndustry(String text) {
        // 1. Keyword-basierte Erkennung (immer verfügbar)
        Map<String, Double> keywordScores = analyzeKeywords(text);
        
        // 2. AI-basierte Erkennung (nur wenn API Key verfügbar)
        Map<String, Double> aiScores = new HashMap<>();
        if (isOpenAiConfigured()) {
            try {
                aiScores = analyzeWithAI(text);
            } catch (Exception e) {
                log.warn("AI analysis failed, using keywords only: {}", e.getMessage());
            }
        }
        
        // 3. Kombiniere beide Ansätze
        Map<String, Double> combinedScores = combineScores(keywordScores, aiScores);
        
        // 4. Erstelle Ergebnis
        return buildIndustryResult(combinedScores, keywordScores, aiScores);
    }

    /**
     * Keyword-basierte Branchenerkennung
     */
    private Map<String, Double> analyzeKeywords(String text) {
        String normalizedText = text.toLowerCase();
        Map<String, Double> scores = new HashMap<>();
        
        for (Map.Entry<String, Set<String>> industry : INDUSTRY_KEYWORDS.entrySet()) {
            double score = 0.0;
            int totalKeywords = industry.getValue().size();
            int foundKeywords = 0;
            
            for (String keyword : industry.getValue()) {
                if (normalizedText.contains(keyword)) {
                    foundKeywords++;
                    // Gewichtung nach Keyword-Länge
                    score += keyword.length() > 5 ? 2.0 : 1.0;
                }
            }
            
            // Normalisierung
            if (foundKeywords > 0) {
                double coverage = (double) foundKeywords / totalKeywords;
                double avgScore = score / foundKeywords;
                scores.put(industry.getKey(), coverage * avgScore * 10);
            } else {
                scores.put(industry.getKey(), 0.0);
            }
        }
        
        return scores;
    }

    /**
     * AI-basierte Branchenerkennung mit WebClient
     */
    private Map<String, Double> analyzeWithAI(String text) {
        if (!isOpenAiConfigured()) {
            return new HashMap<>();
        }

        try {
            String industries = String.join(", ", INDUSTRY_KEYWORDS.keySet());
            String prompt = String.format(
                "Analysiere folgenden Text und bestimme die Wahrscheinlichkeit für jede Branche (0-100): %s\n\n" +
                "Branchen: %s\n\n" +
                "Text: %s\n\n" +
                "Antworte nur mit: Branche1:Wahrscheinlichkeit, Branche2:Wahrscheinlichkeit, ...",
                industries, industries, text.substring(0, Math.min(text.length(), 1500))
            );

            String aiResponse = callOpenAi(prompt);
            return parseAIResponse(aiResponse);

        } catch (Exception e) {
            log.warn("AI industry analysis failed: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * OpenAI API Call mit WebClient
     */
    private String callOpenAi(String prompt) {
        WebClient webClient = WebClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .defaultHeader("Authorization", "Bearer " + openAiApiKey)
            .defaultHeader("Content-Type", "application/json")
            .build();

        Map<String, Object> requestBody = Map.of(
            "model", model,
            "prompt", prompt,
            "max_tokens", 200,
            "temperature", 0.1,
            "top_p", 0.9
        );

        Mono<Map> response = webClient.post()
            .uri("/completions")
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(timeout);

        Map<String, Object> responseBody = response.block();
        return extractResponseText(responseBody);
    }

    /**
     * Extrahiert Text aus OpenAI Response
     */
    @SuppressWarnings("unchecked")
    private String extractResponseText(Map<String, Object> responseBody) {
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        
        if (choices != null && !choices.isEmpty()) {
            String result = (String) choices.get(0).get("text");
            if (result != null && !result.trim().isEmpty()) {
                return result.trim();
            }
        }
        throw new RuntimeException("No valid response from OpenAI");
    }

    /**
     * Parst die OpenAI-Antwort
     */
    private Map<String, Double> parseAIResponse(String response) {
        Map<String, Double> scores = new HashMap<>();
        
        try {
            String[] pairs = response.split(",");
            for (String pair : pairs) {
                String[] parts = pair.trim().split(":");
                if (parts.length == 2) {
                    String industry = normalizeIndustryName(parts[0].trim());
                    double score = Double.parseDouble(parts[1].trim());
                    
                    if (INDUSTRY_KEYWORDS.containsKey(industry)) {
                        scores.put(industry, Math.max(0, Math.min(100, score)));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse AI response: {}", e.getMessage());
        }
        
        return scores;
    }

    /**
     * Normalisiert Branchennamen
     */
    private String normalizeIndustryName(String aiIndustryName) {
        String normalized = aiIndustryName.toLowerCase().trim();
        
        Map<String, String> mappings = Map.of(
            "automobil", "Automotive",
            "pharmazeutisch", "Pharma", 
            "e-commerce", "E-Commerce",
            "finanzen", "Finanzwesen",
            "gesundheit", "Gesundheitswesen",
            "technologie", "IT/Software",
            "it", "IT/Software"
        );
        
        for (Map.Entry<String, String> mapping : mappings.entrySet()) {
            if (normalized.contains(mapping.getKey())) {
                return mapping.getValue();
            }
        }
        
        // Direkte Übereinstimmung
        for (String industry : INDUSTRY_KEYWORDS.keySet()) {
            if (industry.toLowerCase().equals(normalized)) {
                return industry;
            }
        }
        
        return aiIndustryName;
    }

    /**
     * Kombiniert Keyword- und AI-Scores
     */
    private Map<String, Double> combineScores(Map<String, Double> keywordScores, Map<String, Double> aiScores) {
        Map<String, Double> combined = new HashMap<>();
        
        for (String industry : INDUSTRY_KEYWORDS.keySet()) {
            double keywordScore = keywordScores.getOrDefault(industry, 0.0);
            double aiScore = aiScores.getOrDefault(industry, 0.0);
            
            // Gewichtung: 70% Keywords, 30% AI (für Demo)
            double combinedScore = (keywordScore * 0.7) + (aiScore * 0.3);
            combined.put(industry, combinedScore);
        }
        
        return combined;
    }

    /**
     * Erstellt das finale Ergebnis
     */
    private Map<String, Object> buildIndustryResult(Map<String, Double> combinedScores, 
                                                   Map<String, Double> keywordScores, 
                                                   Map<String, Double> aiScores) {
        
        // Sortiere nach Score
        List<Map.Entry<String, Double>> sortedIndustries = combinedScores.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .collect(Collectors.toList());

        // Top 3 Branchen
        List<Map<String, Object>> topIndustries = sortedIndustries.stream()
            .filter(e -> e.getValue() != null && e.getValue() > 5.0)
            .limit(3)
            .map(e -> {
                Map<String, Object> industryMap = new HashMap<>();
                industryMap.put("industry", e.getKey());
                industryMap.put("confidence", round2(e.getValue()));
                industryMap.put("keywordScore", round2(keywordScores.getOrDefault(e.getKey(), 0.0)));
                industryMap.put("aiScore", round2(aiScores.getOrDefault(e.getKey(), 0.0)));
                return industryMap;
            })
            .collect(Collectors.toList());

        // Hauptbranche bestimmen
        String primaryIndustry = !topIndustries.isEmpty() ? 
            (String) topIndustries.get(0).get("industry") : "Unbekannt";
        
        double confidence = !topIndustries.isEmpty() ? 
            (Double) topIndustries.get(0).get("confidence") : 0.0;

        // Ergebnis-Map erstellen
        Map<String, Object> result = new HashMap<>();
        result.put("primaryIndustry", primaryIndustry);
        result.put("confidence", confidence);
        result.put("topIndustries", topIndustries);
        result.put("detectionMethod", aiScores.isEmpty() ? "Keywords only" : "Keywords + AI");
        result.put("demoMode", true);
        result.put("openAiConfigured", isOpenAiConfigured());
        result.put("timestamp", System.currentTimeMillis());
        
        return result;
    }

    /**
     * Fallback-Analyse
     */
    private Map<String, Object> getFallbackIndustryAnalysis(String text) {
        Map<String, Double> keywordScores = analyzeKeywords(text);
        
        String primaryIndustry = keywordScores.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("Unbekannt");
            
        double confidence = keywordScores.getOrDefault(primaryIndustry, 0.0);

        Map<String, Object> topIndustryMap = new HashMap<>();
        topIndustryMap.put("industry", primaryIndustry);
        topIndustryMap.put("confidence", confidence);

        Map<String, Object> result = new HashMap<>();
        result.put("primaryIndustry", primaryIndustry);
        result.put("confidence", confidence);
        result.put("topIndustries", List.of(topIndustryMap));
        result.put("detectionMethod", "Fallback (Keywords only)");
        result.put("demoMode", true);
        result.put("timestamp", System.currentTimeMillis());
        
        return result;
    }

    /**
     * In-Memory Caching (ersetzt Redis)
     */
    private String generateCacheKey(String text) {
        return String.valueOf(text.hashCode());
    }

    private void cacheResult(String cacheKey, Map<String, Object> result) {
        try {
            // Cache-Größe begrenzen
            if (inMemoryCache.size() >= MAX_CACHE_SIZE) {
                // Älteste Einträge entfernen (vereinfacht)
                String oldestKey = inMemoryCache.keySet().iterator().next();
                inMemoryCache.remove(oldestKey);
            }
            
            inMemoryCache.put(cacheKey, result);
            log.debug("Cached result in memory for key: {}", cacheKey);
        } catch (Exception e) {
            log.warn("Failed to cache result: {}", e.getMessage());
        }
    }

    /**
     * Hilfsmethoden
     */
    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private boolean isOpenAiConfigured() {
        return openAiApiKey != null && !openAiApiKey.trim().isEmpty() && !"test-key".equals(openAiApiKey);
    }

    // Demo-spezifische Methoden
    public Map<String, Object> getServiceInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("mode", "Demo");
        info.put("caching", "In-Memory (no Redis)");
        info.put("openAiConfigured", isOpenAiConfigured());
        info.put("supportedIndustries", INDUSTRY_KEYWORDS.size());
        info.put("industries", INDUSTRY_KEYWORDS.keySet());
        info.put("cacheSize", inMemoryCache.size());
        info.put("maxCacheSize", MAX_CACHE_SIZE);
        return info;
    }

    public void clearCache() {
        inMemoryCache.clear();
        log.info("In-memory cache cleared");
    }

    public int getCacheSize() {
        return inMemoryCache.size();
    }
}