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

    // 🔧 VERBESSERTE Branchendefinitionen mit präziseren Keywords
    private static final Map<String, Set<String>> INDUSTRY_KEYWORDS = Map.of(
        "IT/Software", Set.of(
            // Grundlegende IT-Begriffe
            "software", "entwicklung", "programmierung", "anwendung", "system", "plattform",
            "digital", "tech", "technisch", "it-projekt", "digitalisierung", "digital solutions",
            
            // Programmiersprachen & Frameworks  
            "java", "spring", "spring boot", "angular", "react", "vue", "typescript", "javascript",
            "python", "node.js", "express", "django", "laravel", ".net", "c#", "php",
            
            // Datenbanken & Storage
            "postgresql", "mysql", "mongodb", "elasticsearch", "redis", "oracle", "sql server",
            "database", "datenbank", "nosql", "big data", "data warehouse",
            
            // Cloud & DevOps
            "aws", "azure", "gcp", "cloud", "docker", "kubernetes", "jenkins", "gitlab",
            "ci/cd", "devops", "deployment", "container", "microservices", "serverless",
            
            // Architektur & APIs
            "rest", "api", "rest api", "microservice", "architektur", "design pattern", "mvc", 
            "spa", "saas", "paas", "iaas", "cloud-anwendung", "web-anwendung",
            
            // Entwicklungstools
            "git", "github", "gitlab", "jira", "confluence", "maven", "gradle", "npm",
            "webpack", "testing", "junit", "cypress", "selenium", "sonarqube",
            
            // IT-Sicherheit (spezifisch)
            "oauth", "oauth2", "jwt", "keycloak", "authentication", "authorization", 
            "spring security", "ssl", "tls", "security framework",
            
            // Projekt-Begriffe
            "tech-projekt", "software-projekt", "entwicklungsprojekt", "implementierung", 
            "integration", "migration", "upgrade", "refactoring", "code review"
        ),
        
        "Finanzwesen", Set.of(
            // Finanz-spezifische Begriffe (ohne generische Sicherheit)
            "bank", "banking", "fintech", "payment", "zahlung", "transaktion", "kredit",
            "versicherung", "trading", "börse", "aktien", "investment", "portfolio",
            "blockchain", "bitcoin", "kryptowährung", "wallet", "defi",
            "risk management", "compliance", "pci dss", "basel", "mifid", "sepa", 
            "swift", "iban", "financial services", "robo advisor", "peer-to-peer"
        ),
        
        "Automotive", Set.of(
            "auto", "fahrzeug", "kfz", "automotive", "mobility", "tesla", "bmw", "mercedes",
            "volkswagen", "audi", "porsche", "elektroauto", "hybrid", "verbrenner",
            "carsharing", "autonomous driving", "connected car", "automotive software"
        ),
        
        "E-Commerce", Set.of(
            "shop", "online", "ecommerce", "e-commerce", "zalando", "amazon", "otto", 
            "retail", "verkauf", "webshop", "marketplace", "online-handel", "checkout",
            "payment gateway", "inventory", "logistics", "fulfillment"
        ),
        
        "Pharma", Set.of(
            "pharma", "medikament", "arzneimittel", "bayer", "merck", "boehringer",
            "pharmaceutical", "drug", "medicine", "clinical", "therapie", "biotech",
            "clinical trial", "fda", "ema", "drug discovery"
        ),
        
        "Event/Marketing", Set.of(
            "event", "marketing", "werbung", "messe", "promotion", "advertising", 
            "campaign", "brand", "veranstaltung", "social media", "influencer",
            "content marketing", "seo", "sem", "digital marketing"
        ),
        
        "Gesundheitswesen", Set.of(
            "gesundheit", "krankenhaus", "klinik", "arzt", "pflege", "healthcare", 
            "medical", "hospital", "patient", "telemedicine", "health tech",
            "medical device", "diagnostics", "therapy"
        ),
        
        "Bildung", Set.of(
            "bildung", "schule", "universität", "lernen", "education", "university", 
            "learning", "training", "student", "e-learning", "lms", "mooc",
            "edtech", "online course", "distance learning"
        ),
        
        "Energie", Set.of(
            "energie", "strom", "gas", "öl", "solar", "wind", "energy", "power", 
            "renewable", "nachhaltigkeit", "smart grid", "energy management",
            "photovoltaik", "windkraft", "energiewende"
        ),
        
        "Transport/Logistik", Set.of(
            "transport", "logistik", "dhl", "ups", "fedex", "shipping", "delivery", 
            "logistics", "spedition", "supply chain", "warehouse", "fleet management",
            "last mile", "freight", "cargo"
        )
    );

    /**
     * 🔧 VERBESSERTE Hauptmethode für Branchenerkennung
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
            Map<String, Object> result = analyzeIndustryEnhanced(text);
            
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
     * 🆕 VERBESSERTE Hauptlogik für Branchenerkennung
     */
    private Map<String, Object> analyzeIndustryEnhanced(String text) {
        // 1. Keyword-basierte Erkennung mit verbesserter Gewichtung
        Map<String, Double> keywordScores = analyzeKeywordsEnhanced(text);
        
        // 2. Kontext-Analyse für bessere Genauigkeit
        Map<String, Double> contextEnhanced = enhanceWithContextAnalysis(text, keywordScores);
        
        // 3. AI-basierte Erkennung (nur wenn API Key verfügbar)
        Map<String, Double> aiScores = new HashMap<>();
        if (isOpenAiConfigured()) {
            try {
                aiScores = analyzeWithAI(text);
            } catch (Exception e) {
                log.warn("AI analysis failed, using enhanced keywords only: {}", e.getMessage());
            }
        }
        
        // 4. Kombiniere alle Ansätze
        Map<String, Double> finalScores = combineScoresEnhanced(contextEnhanced, aiScores);
        
        // 5. Erstelle detailliertes Ergebnis
        return buildEnhancedIndustryResult(finalScores, keywordScores, aiScores, text);
    }

    /**
     * 🔧 VERBESSERTE Keyword-Analyse mit präziser Gewichtung
     */
    private Map<String, Double> analyzeKeywordsEnhanced(String text) {
        String normalizedText = text.toLowerCase();
        Map<String, Double> scores = new HashMap<>();
        Map<String, List<String>> matchedKeywords = new HashMap<>();
        
        for (Map.Entry<String, Set<String>> industry : INDUSTRY_KEYWORDS.entrySet()) {
            double score = 0.0;
            List<String> matched = new ArrayList<>();
            
            for (String keyword : industry.getValue()) {
                if (normalizedText.contains(keyword)) {
                    matched.add(keyword);
                    
                    // 🔧 VERBESSERTE Gewichtung nach Spezifität
                    double weight = calculateKeywordWeight(keyword, industry.getKey(), normalizedText);
                    score += weight;
                }
            }
            
            matchedKeywords.put(industry.getKey(), matched);
            
            if (!matched.isEmpty()) {
                // Bonus für hohe Keyword-Abdeckung
                double coverage = (double) matched.size() / industry.getValue().size();
                double coverageBonus = coverage > 0.3 ? coverage * 15 : 0;
                
                // Bonus für Keyword-Dichte
                double density = (double) matched.size() / text.split("\\s+").length;
                double densityBonus = density > 0.05 ? density * 50 : 0;
                
                scores.put(industry.getKey(), score + coverageBonus + densityBonus);
                
                log.debug("Industry {}: {} keywords matched, score: {:.2f}", 
                    industry.getKey(), matched.size(), scores.get(industry.getKey()));
            } else {
                scores.put(industry.getKey(), 0.0);
            }
        }
        
        return scores;
    }

    /**
     * 🆕 Intelligente Keyword-Gewichtung
     */
    private double calculateKeywordWeight(String keyword, String industry, String text) {
        // Basis-Gewichtung
        double weight = keyword.length() > 6 ? 2.0 : 1.5;
        
        // IT/Software spezifische Gewichtung
        if ("IT/Software".equals(industry)) {
            // Hochspezifische Tech-Keywords
            if (Arrays.asList("spring boot", "angular", "postgresql", "kubernetes", 
                             "docker", "elasticsearch", "microservices").contains(keyword)) {
                weight = 8.0;
            }
            // Sehr spezifische IT-Keywords  
            else if (Arrays.asList("java", "typescript", "rest api", "oauth2", "jwt", 
                                  "ci/cd", "devops", "gitlab").contains(keyword)) {
                weight = 5.0;
            }
            // Moderately spezifische Keywords
            else if (Arrays.asList("software", "entwicklung", "api", "cloud", 
                                  "database", "git").contains(keyword)) {
                weight = 3.0;
            }
            // Strukturelle IT-Begriffe
            else if (text.contains("tech-projekt") || text.contains("digital solutions")) {
                weight += 2.0;
            }
        }
        
        // Finanzwesen: Reduziere Gewichtung für generische Begriffe
        else if ("Finanzwesen".equals(industry)) {
            if (Arrays.asList("fintech", "payment", "banking", "trading", "blockchain").contains(keyword)) {
                weight = 5.0;
            } else if (keyword.equals("security") || keyword.equals("sicherheit")) {
                weight = 0.5; // Sehr niedrig, da zu generisch
            }
        }
        
        return weight;
    }

    /**
     * 🆕 Kontext-Analyse für bessere Genauigkeit
     */
    private Map<String, Double> enhanceWithContextAnalysis(String text, Map<String, Double> keywordScores) {
        Map<String, Double> enhanced = new HashMap<>(keywordScores);
        String lowerText = text.toLowerCase();
        
        // IT-Projekt Strukturerkennung
        if (isITProjectStructure(lowerText)) {
            enhanced.put("IT/Software", enhanced.getOrDefault("IT/Software", 0.0) + 20.0);
            log.debug("IT project structure detected, boosting IT/Software score");
        }
        
        // Software-Projekt Phrasen
        if (containsSoftwareProjectPhrases(lowerText)) {
            enhanced.put("IT/Software", enhanced.getOrDefault("IT/Software", 0.0) + 15.0);
            log.debug("Software project phrases detected, boosting IT/Software score");
        }
        
        // Tech-Stack Vollständigkeit
        if (hasCompleteTechStack(lowerText)) {
            enhanced.put("IT/Software", enhanced.getOrDefault("IT/Software", 0.0) + 25.0);
            log.debug("Complete tech stack detected, significant boost for IT/Software");
        }
        
        // Reduziere andere Branchen wenn IT stark ist
        double itScore = enhanced.getOrDefault("IT/Software", 0.0);
        if (itScore > 40) {
            enhanced.replaceAll((k, v) -> {
                if (!"IT/Software".equals(k)) {
                    return v * 0.4; // Reduziere andere Branchen um 60%
                }
                return v;
            });
            log.debug("Strong IT/Software signal detected, reducing other industries");
        }
        
        return enhanced;
    }

    /**
     * 🆕 Prüfung auf IT-Projekt Struktur
     */
    private boolean isITProjectStructure(String text) {
        // Typische Sektionen eines IT-Projektdokuments
        boolean hasArchitecture = text.contains("architektur") || text.contains("tech") || 
                                 text.contains("technologie");
        boolean hasTechStack = text.contains("frontend") && text.contains("backend");
        boolean hasImplementation = text.contains("entwicklung") || text.contains("deployment") || 
                                   text.contains("implementierung");
        boolean hasDevOps = text.contains("docker") || text.contains("kubernetes") || 
                           text.contains("ci/cd");
        
        return (hasArchitecture && hasTechStack) || (hasTechStack && hasImplementation) || 
               (hasArchitecture && hasDevOps);
    }

    /**
     * 🆕 Prüfung auf Software-Projekt Phrasen
     */
    private boolean containsSoftwareProjectPhrases(String text) {
        List<String> phrases = Arrays.asList(
            "tech-projekt", "software-projekt", "digital solutions", "cloud-anwendung",
            "rest api", "web-anwendung", "dokumentenverwaltung", "ki-gestützt",
            "technisches projektdokument", "entwicklungsprojekt"
        );
        
        return phrases.stream().anyMatch(text::contains);
    }

    /**
     * 🆕 Prüfung auf vollständigen Tech-Stack
     */
    private boolean hasCompleteTechStack(String text) {
        boolean hasFrontend = text.contains("angular") || text.contains("react") || text.contains("vue");
        boolean hasBackend = text.contains("spring") || text.contains("express") || text.contains("django");
        boolean hasDatabase = text.contains("postgresql") || text.contains("mongodb") || text.contains("mysql");
        boolean hasCloud = text.contains("aws") || text.contains("azure") || text.contains("docker");
        
        return hasFrontend && hasBackend && hasDatabase && hasCloud;
    }

    /**
     * 🔧 VERBESSERTE Score-Kombination
     */
    private Map<String, Double> combineScoresEnhanced(Map<String, Double> keywordScores, Map<String, Double> aiScores) {
        Map<String, Double> combined = new HashMap<>();
        
        for (String industry : INDUSTRY_KEYWORDS.keySet()) {
            double keywordScore = keywordScores.getOrDefault(industry, 0.0);
            double aiScore = aiScores.getOrDefault(industry, 0.0);
            
            // Gewichtung: 80% Keywords (da verbessert), 20% AI
            double combinedScore = (keywordScore * 0.8) + (aiScore * 0.2);
            combined.put(industry, combinedScore);
        }
        
        return combined;
    }

    /**
     * 🔧 VERBESSERTER Ergebnis-Builder mit Debug-Info
     */
    private Map<String, Object> buildEnhancedIndustryResult(Map<String, Double> combinedScores, 
                                                           Map<String, Double> keywordScores, 
                                                           Map<String, Double> aiScores,
                                                           String text) {
        
        // Sortiere nach Score
        List<Map.Entry<String, Double>> sortedIndustries = combinedScores.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .collect(Collectors.toList());

        // Top 3 Branchen (mit höherem Mindest-Score)
        List<Map<String, Object>> topIndustries = sortedIndustries.stream()
            .filter(e -> e.getValue() != null && e.getValue() > 8.0) // Erhöhter Mindest-Score
            .limit(3)
            .map(e -> {
                Map<String, Object> industryMap = new HashMap<>();
                industryMap.put("industry", e.getKey());
                industryMap.put("confidence", Math.min(95.0, round2(e.getValue())));
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

        // Debug-Informationen
        Map<String, Object> debug = new HashMap<>();
        debug.put("detectedKeywords", findMatchedKeywords(text));
        debug.put("contextFactors", analyzeContextFactors(text));
        debug.put("allScores", combinedScores);

        // Ergebnis-Map erstellen
        Map<String, Object> result = new HashMap<>();
        result.put("primaryIndustry", primaryIndustry);
        result.put("confidence", confidence);
        result.put("topIndustries", topIndustries);
        result.put("detectionMethod", aiScores.isEmpty() ? "Enhanced Keywords" : "Enhanced Keywords + AI");
        result.put("enhancedAnalysis", true);
        result.put("openAiConfigured", isOpenAiConfigured());
        result.put("timestamp", System.currentTimeMillis());
        
        // Debug nur im Development
        if (log.isDebugEnabled()) {
            result.put("debug", debug);
        }

        // Logging für Überwachung
        log.info("Industry Detection Result - Primary: {} ({}% confidence), Method: {}", 
            primaryIndustry, Math.round(confidence), 
            aiScores.isEmpty() ? "Enhanced Keywords" : "Enhanced Keywords + AI");
        
        return result;
    }

    /**
     * 🆕 Hilfsmethode: Gefundene Keywords ermitteln
     */
    private Map<String, List<String>> findMatchedKeywords(String text) {
        Map<String, List<String>> matched = new HashMap<>();
        String lowerText = text.toLowerCase();
        
        for (Map.Entry<String, Set<String>> industry : INDUSTRY_KEYWORDS.entrySet()) {
            List<String> foundKeywords = industry.getValue().stream()
                .filter(lowerText::contains)
                .collect(Collectors.toList());
            
            if (!foundKeywords.isEmpty()) {
                matched.put(industry.getKey(), foundKeywords);
            }
        }
        
        return matched;
    }

    /**
     * 🆕 Hilfsmethode: Kontext-Faktoren analysieren
     */
    private Map<String, Boolean> analyzeContextFactors(String text) {
        String lowerText = text.toLowerCase();
        
        Map<String, Boolean> factors = new HashMap<>();
        factors.put("hasITProjectStructure", isITProjectStructure(lowerText));
        factors.put("hasSoftwareProjectPhrases", containsSoftwareProjectPhrases(lowerText));
        factors.put("hasCompleteTechStack", hasCompleteTechStack(lowerText));
        factors.put("hasArchitectureSection", lowerText.contains("architektur") || lowerText.contains("technologie"));
        factors.put("hasImplementationDetails", lowerText.contains("implementierung") || lowerText.contains("entwicklung"));
        factors.put("hasDevOpsElements", lowerText.contains("docker") || lowerText.contains("kubernetes") || lowerText.contains("ci/cd"));
        
        return factors;
    }

    /**
     * OpenAI API Call mit WebClient (unverändert von Original)
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
     * OpenAI API Call mit WebClient (unverändert)
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
     * Extrahiert Text aus OpenAI Response (unverändert)
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
     * Parst die OpenAI-Antwort (unverändert)
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
     * Normalisiert Branchennamen (unverändert)
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
     * 🔧 VERBESSERTE Fallback-Analyse
     */
    private Map<String, Object> getFallbackIndustryAnalysis(String text) {
        Map<String, Double> keywordScores = analyzeKeywordsEnhanced(text);
        Map<String, Double> contextEnhanced = enhanceWithContextAnalysis(text, keywordScores);
        
        String primaryIndustry = contextEnhanced.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("Unbekannt");
            
        double confidence = Math.min(95.0, contextEnhanced.getOrDefault(primaryIndustry, 0.0));

        // Top Industry für Response
        Map<String, Object> topIndustryMap = new HashMap<>();
        topIndustryMap.put("industry", primaryIndustry);
        topIndustryMap.put("confidence", confidence);
        topIndustryMap.put("keywordScore", confidence);
        topIndustryMap.put("aiScore", 0.0);

        Map<String, Object> result = new HashMap<>();
        result.put("primaryIndustry", primaryIndustry);
        result.put("confidence", confidence);
        result.put("topIndustries", List.of(topIndustryMap));
        result.put("detectionMethod", "Enhanced Fallback (Keywords + Context)");
        result.put("enhancedAnalysis", true);
        result.put("timestamp", System.currentTimeMillis());
        
        log.info("Fallback analysis completed - Primary: {} ({}% confidence)", 
            primaryIndustry, Math.round(confidence));
        
        return result;
    }

    /**
     * In-Memory Caching (unverändert)
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
     * Hilfsmethoden (unverändert)
     */
    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private boolean isOpenAiConfigured() {
        return openAiApiKey != null && !openAiApiKey.trim().isEmpty() && !"test-key".equals(openAiApiKey);
    }

    // Demo-spezifische Methoden (unverändert)
    public Map<String, Object> getServiceInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("mode", "Enhanced Demo");
        info.put("caching", "In-Memory (no Redis)");
        info.put("openAiConfigured", isOpenAiConfigured());
        info.put("supportedIndustries", INDUSTRY_KEYWORDS.size());
        info.put("industries", INDUSTRY_KEYWORDS.keySet());
        info.put("cacheSize", inMemoryCache.size());
        info.put("maxCacheSize", MAX_CACHE_SIZE);
        info.put("enhancedFeatures", Arrays.asList(
            "Improved IT/Software detection",
            "Context-aware analysis", 
            "Tech stack recognition",
            "Project structure detection"
        ));
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