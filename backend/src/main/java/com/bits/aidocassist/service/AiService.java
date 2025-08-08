package com.bits.aidocassist.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiService {

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${openai.api.model:gpt-4-turbo-preview}")
    private String openAiModel;

    @Autowired
    private TextPreprocessingService preprocessingService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Verwende Chat Completions API statt Legacy Completions
    private static final String OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

    // Qualitäts-Metriken
    private final Map<String, QualityMetrics> qualityMetrics = new HashMap<>();

    /**
     * OPTIMIERTE Zusammenfassung mit strukturiertem Output
     */
    public String summarizeText(String text) {
        long startTime = System.currentTimeMillis();
        
        if (text.length() < 100) {
            return text + " [Text zu kurz für KI-Zusammenfassung]";
        }

        // Text-Preprocessing für bessere Ergebnisse
        String processedText = preprocessingService.preprocessText(text);
        
        if (openAiApiKey != null && !openAiApiKey.trim().isEmpty()) {
            try {
                String prompt = createOptimizedSummarizationPrompt(processedText);
                String result = callOpenAiChat(prompt, 500, 0.3, "summarization");
                
                // Post-Processing für strukturierte Ausgabe
                result = postProcessSummary(result);
                
                recordQualityMetrics("summarization", startTime, true, result.length());
                System.out.println("✅ OpenAI Zusammenfassung erfolgreich (GPT-4)");
                return result;
            } catch (Exception e) {
                recordQualityMetrics("summarization", startTime, false, 0);
                System.err.println("❌ OpenAI Summarization failed: " + e.getMessage());
                return getEnhancedFallbackSummary(processedText);
            }
        }
        return getEnhancedFallbackSummary(processedText);
    }

    /**
     * OPTIMIERTE Keyword-Extraktion mit Kategorisierung
     */
    public String extractKeywords(String text) {
        long startTime = System.currentTimeMillis();
        
        // Text-Preprocessing
        String processedText = preprocessingService.preprocessText(text);
        
        if (openAiApiKey != null && !openAiApiKey.trim().isEmpty()) {
            try {
                String prompt = createOptimizedKeywordPrompt(processedText);
                String result = callOpenAiChat(prompt, 300, 0.2, "keywords");
                
                // JSON-Response parsen und formatieren
                result = processKeywordResponse(result);
                
                recordQualityMetrics("keywords", startTime, true, result.length());
                System.out.println("✅ OpenAI Keywords erfolgreich extrahiert (strukturiert)");
                return result;
            } catch (Exception e) {
                recordQualityMetrics("keywords", startTime, false, 0);
                System.err.println("❌ OpenAI Keyword extraction failed: " + e.getMessage());
            }
        }
        
        // Verwende TextPreprocessingService für Fallback
        List<String> keywords = preprocessingService.extractKeywords(processedText, 15);
        return String.join(", ", keywords);
    }

    /**
     * OPTIMIERTE Komponenten-Empfehlungen (kontextbezogen)
     */
    public String suggestComponents(String text) {
        long startTime = System.currentTimeMillis();
        
        // Text-Preprocessing und Technologie-Erkennung
        String processedText = preprocessingService.preprocessText(text);
        Set<String> detectedTechs = detectExistingTechnologies(processedText);
        
        if (openAiApiKey != null && !openAiApiKey.trim().isEmpty()) {
            try {
                String prompt = createContextAwareComponentPrompt(processedText, detectedTechs);
                String result = callOpenAiChat(prompt, 400, 0.4, "components");
                
                // Validierung: Keine widersprüchlichen Empfehlungen
                result = validateComponentSuggestions(result, detectedTechs);
                
                recordQualityMetrics("components", startTime, true, result.length());
                System.out.println("✅ OpenAI Komponenten-Empfehlungen (kontextbezogen)");
                return result;
            } catch (Exception e) {
                recordQualityMetrics("components", startTime, false, 0);
                System.err.println("❌ OpenAI Component suggestion failed: " + e.getMessage());
            }
        }
        
        return getContextAwareFallbackComponents(processedText, detectedTechs);
    }

    // ========================================
    // OPTIMIERTE PROMPT-ERSTELLUNG
    // ========================================

    private String createOptimizedSummarizationPrompt(String text) {
        // Text begrenzen aber intelligent (nicht mitten im Satz abschneiden)
        String inputText = truncateIntelligently(text, 4000);
        
        return String.format("""
            Analysiere das folgende technische Dokument und erstelle eine STRUKTURIERTE Zusammenfassung.
            
            ANFORDERUNGEN:
            1. **Hauptziel**: Beschreibe das Kernziel in 1-2 Sätzen
            2. **Technologie-Stack**: Liste die wichtigsten verwendeten Technologien
            3. **Kernfunktionen**: Die 3 wichtigsten Features/Komponenten
            4. **Besonderheiten**: Was macht dieses Projekt einzigartig?
            
            FORMAT DER AUSGABE:
            **Projektziel:** [Beschreibung]
            
            **Technologien:** [Frontend], [Backend], [Datenbank], [DevOps]
            
            **Hauptfunktionen:**
            - [Funktion 1]
            - [Funktion 2]
            - [Funktion 3]
            
            **Besonderheit:** [Was hebt das Projekt hervor]
            
            DOKUMENT:
            %s
            
            ZUSAMMENFASSUNG:
            """, inputText);
    }

    private String createOptimizedKeywordPrompt(String text) {
        String inputText = truncateIntelligently(text, 3000);
        
        // Bereits erkannte technische Begriffe hervorheben
        Map<String, Object> textAnalysis = preprocessingService.analyzeTextQuality(text);
        
        return String.format("""
            Extrahiere und kategorisiere die wichtigsten Keywords aus diesem technischen Dokument.
            
            AUSGABE ALS JSON:
            {
                "projekt": ["Projektname", "Firma"],
                "technologien": {
                    "frontend": ["Angular 16", "TypeScript"],
                    "backend": ["Spring Boot", "Java 17"],
                    "datenbank": ["PostgreSQL", "Elasticsearch"],
                    "devops": ["Docker", "Kubernetes", "AWS"]
                },
                "konzepte": ["Cloud-Native", "Microservices", "REST API"],
                "priorität_hoch": ["die 5 wichtigsten Keywords"]
            }
            
            REGELN:
            - Behalte Versionsnummern bei (z.B. "Angular 16")
            - Gruppiere nach technischen Kategorien
            - Mindestens 15-20 Keywords insgesamt
            
            TEXT:
            %s
            
            JSON-OUTPUT:
            """, inputText);
    }

    private String createContextAwareComponentPrompt(String text, Set<String> existingTechs) {
        String inputText = truncateIntelligently(text, 3000);
        String existingTechList = String.join(", ", existingTechs);
        
        return String.format("""
            Als Senior Solutions Architect, analysiere das Projekt und empfehle ERGÄNZENDE Technologien.
            
            BEREITS VERWENDETE TECHNOLOGIEN (NICHT ersetzen):
            %s
            
            AUFGABE:
            Empfehle NUR ERGÄNZENDE Tools und Services die den vorhandenen Stack VERBESSERN:
            - Performance-Optimierung
            - Monitoring & Observability  
            - Security-Erweiterungen
            - Developer Experience Tools
            - Testing-Frameworks
            
            AUSGABE-FORMAT:
            Monitoring: [Tool1], [Tool2]
            Caching: [Tool3]
            Security: [Tool4], [Tool5]
            Testing: [Tool6]
            DevTools: [Tool7], [Tool8]
            
            WICHTIG: 
            - KEINE alternativen Frontend-Frameworks wenn Angular verwendet wird
            - KEINE alternativen Datenbanken wenn PostgreSQL verwendet wird
            - Nur ERGÄNZUNGEN zum bestehenden Stack
            
            PROJEKT:
            %s
            
            EMPFEHLUNGEN:
            """, existingTechList, inputText);
    }

    // ========================================
    // OPTIMIERTER OPENAI API AUFRUF (Chat Completions)
    // ========================================

    private String callOpenAiChat(String prompt, int maxTokens, double temperature, String type) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", openAiModel); // Nutze GPT-4 aus Config
        requestBody.put("messages", Arrays.asList(
            Map.of("role", "system", "content", 
                "Du bist ein Experte für technische Dokumentenanalyse. " +
                "Antworte präzise, strukturiert und in deutscher Sprache."),
            Map.of("role", "user", "content", prompt)
        ));
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("temperature", temperature);
        requestBody.put("top_p", 0.95);
        requestBody.put("frequency_penalty", 0.2);
        requestBody.put("presence_penalty", 0.1);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        
        try {
            System.out.println("🤖 Rufe OpenAI Chat API auf (" + openAiModel + ") für: " + type);
            ResponseEntity<Map> response = restTemplate.exchange(
                OPENAI_CHAT_URL, HttpMethod.POST, entity, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String result = (String) message.get("content");
                    return result != null ? result.trim() : "Keine Antwort erhalten";
                }
            }
        } catch (Exception e) {
            System.err.println("❌ OpenAI Chat API Fehler: " + e.getMessage());
            throw e;
        }
        
        return "API-Aufruf fehlgeschlagen";
    }

    // ========================================
    // POST-PROCESSING & VALIDIERUNG
    // ========================================

    private String postProcessSummary(String summary) {
        // Stelle sicher, dass die Zusammenfassung strukturiert ist
        if (!summary.contains("**")) {
            // Füge Struktur hinzu wenn fehlt
            String[] sentences = summary.split("\\. ");
            if (sentences.length >= 2) {
                return String.format(
                    "**Zusammenfassung:** %s\n\n**Details:** %s",
                    sentences[0] + ".",
                    String.join(". ", Arrays.copyOfRange(sentences, 1, sentences.length))
                );
            }
        }
        return summary;
    }

    private String processKeywordResponse(String response) {
        try {
            // Versuche JSON zu parsen
            Map<String, Object> keywordMap = objectMapper.readValue(response, Map.class);
            
            StringBuilder formatted = new StringBuilder();
            
            // Projekt-Keywords
            if (keywordMap.containsKey("projekt")) {
                List<String> projekt = (List<String>) keywordMap.get("projekt");
                formatted.append("Projekt: ").append(String.join(", ", projekt)).append("\n");
            }
            
            // Technologie-Keywords
            if (keywordMap.containsKey("technologien")) {
                Map<String, List<String>> techs = (Map<String, List<String>>) keywordMap.get("technologien");
                List<String> allTechs = new ArrayList<>();
                techs.values().forEach(allTechs::addAll);
                formatted.append("Technologien: ").append(String.join(", ", allTechs)).append("\n");
            }
            
            // Konzepte
            if (keywordMap.containsKey("konzepte")) {
                List<String> konzepte = (List<String>) keywordMap.get("konzepte");
                formatted.append("Konzepte: ").append(String.join(", ", konzepte));
            }
            
            return formatted.toString();
            
        } catch (Exception e) {
            // Fallback: Wenn kein JSON, gib Response direkt zurück
            return response;
        }
    }

    private String validateComponentSuggestions(String suggestions, Set<String> existingTechs) {
        // Entferne widersprüchliche Empfehlungen
        String validated = suggestions;
        
        // Wenn Angular verwendet wird, entferne React/Vue Empfehlungen
        if (existingTechs.stream().anyMatch(t -> t.toLowerCase().contains("angular"))) {
            validated = validated.replaceAll("(?i)\\b(React|Vue\\.js|Vue)\\b,?\\s*", "");
        }
        
        // Wenn PostgreSQL verwendet wird, entferne MongoDB Empfehlungen
        if (existingTechs.stream().anyMatch(t -> t.toLowerCase().contains("postgresql"))) {
            validated = validated.replaceAll("(?i)\\b(MongoDB|CouchDB)\\b,?\\s*", "");
        }
        
        // Wenn Spring Boot verwendet wird, entferne Express/Django Empfehlungen
        if (existingTechs.stream().anyMatch(t -> t.toLowerCase().contains("spring"))) {
            validated = validated.replaceAll("(?i)\\b(Express|Django|FastAPI)\\b,?\\s*", "");
        }
        
        return validated.trim();
    }

    // ========================================
    // INTELLIGENTE HILFSMETHODEN
    // ========================================

    private String truncateIntelligently(String text, int maxLength) {
        if (text.length() <= maxLength) {
            return text;
        }
        
        // Finde den letzten vollständigen Satz vor maxLength
        String truncated = text.substring(0, maxLength);
        int lastPeriod = truncated.lastIndexOf(".");
        int lastNewline = truncated.lastIndexOf("\n");
        
        int cutPoint = Math.max(lastPeriod, lastNewline);
        if (cutPoint > maxLength * 0.7) { // Nur wenn nicht zu viel verloren geht
            return text.substring(0, cutPoint + 1);
        }
        
        return truncated + "...";
    }

    private Set<String> detectExistingTechnologies(String text) {
        Set<String> detected = new HashSet<>();
        String lowerText = text.toLowerCase();
        
        // Frontend Frameworks
        if (lowerText.contains("angular")) detected.add("Angular");
        if (lowerText.contains("react")) detected.add("React");
        if (lowerText.contains("vue")) detected.add("Vue.js");
        
        // Backend Frameworks
        if (lowerText.contains("spring boot")) detected.add("Spring Boot");
        if (lowerText.contains("express")) detected.add("Express.js");
        if (lowerText.contains("django")) detected.add("Django");
        
        // Databases
        if (lowerText.contains("postgresql")) detected.add("PostgreSQL");
        if (lowerText.contains("mongodb")) detected.add("MongoDB");
        if (lowerText.contains("mysql")) detected.add("MySQL");
        if (lowerText.contains("elasticsearch")) detected.add("Elasticsearch");
        
        // DevOps
        if (lowerText.contains("docker")) detected.add("Docker");
        if (lowerText.contains("kubernetes")) detected.add("Kubernetes");
        if (lowerText.contains("aws")) detected.add("AWS");
        
        return detected;
    }

    // ========================================
    // VERBESSERTE FALLBACK-METHODEN
    // ========================================

    private String getEnhancedFallbackSummary(String text) {
        // Nutze TextPreprocessingService für bessere Analyse
        Map<String, Object> analysis = preprocessingService.analyzeTextQuality(text);
        List<String> keywords = preprocessingService.extractKeywords(text, 5);
        
        StringBuilder summary = new StringBuilder();
        summary.append("**Hauptthemen:** ").append(String.join(", ", keywords)).append("\n");
        
        // Extrahiere erste und wichtigste Sätze
        String[] sentences = text.split("\\. ");
        if (sentences.length > 0) {
            summary.append("**Zusammenfassung:** ").append(sentences[0]).append(".");
            if (sentences.length > 1) {
                summary.append(" ").append(sentences[sentences.length - 1]);
            }
        }
        
        summary.append("\n[Lokale Analyse - OpenAI nicht verfügbar]");
        return summary.toString();
    }

    private String getContextAwareFallbackComponents(String text, Set<String> existingTechs) {
        Set<String> suggestions = new LinkedHashSet<>();
        
        // Ergänze basierend auf erkannten Technologien
        if (existingTechs.contains("Angular")) {
            suggestions.addAll(Arrays.asList("RxJS", "NgRx", "Angular Material", "Jasmine", "Karma"));
        }
        if (existingTechs.contains("Spring Boot")) {
            suggestions.addAll(Arrays.asList("Spring Security", "Spring Data JPA", "Lombok", "MapStruct"));
        }
        if (existingTechs.contains("PostgreSQL")) {
            suggestions.addAll(Arrays.asList("Redis", "Flyway", "pgAdmin"));
        }
        if (existingTechs.contains("Docker")) {
            suggestions.addAll(Arrays.asList("Docker Compose", "Portainer", "Prometheus", "Grafana"));
        }
        
        // Allgemeine Ergänzungen
        suggestions.addAll(Arrays.asList("SonarQube", "GitLab CI/CD", "Swagger/OpenAPI", "Postman"));
        
        return suggestions.stream()
            .limit(12)
            .collect(Collectors.joining(", "));
    }

    // ========================================
    // QUALITÄTS-METRIKEN (unverändert)
    // ========================================

    private void recordQualityMetrics(String analysisType, long startTime, boolean success, int resultLength) {
        long responseTime = System.currentTimeMillis() - startTime;
        
        QualityMetrics metrics = qualityMetrics.computeIfAbsent(analysisType, k -> new QualityMetrics());
        metrics.recordCall(responseTime, success, resultLength);
        
        System.out.printf("📊 %s: %dms, Success: %s, Length: %d chars%n", 
            analysisType, responseTime, success, resultLength);
    }

    public Map<String, QualityMetrics> getQualityMetrics() {
        return Collections.unmodifiableMap(qualityMetrics);
    }

    public static class QualityMetrics {
        private int totalCalls = 0;
        private int successfulCalls = 0;
        private long totalResponseTime = 0;
        private int totalResultLength = 0;
        private LocalDateTime lastCall;

        public void recordCall(long responseTime, boolean success, int resultLength) {
            totalCalls++;
            if (success) successfulCalls++;
            totalResponseTime += responseTime;
            totalResultLength += resultLength;
            lastCall = LocalDateTime.now();
        }

        public double getSuccessRate() {
            return totalCalls > 0 ? (double) successfulCalls / totalCalls * 100 : 0;
        }

        public double getAvgResponseTime() {
            return totalCalls > 0 ? (double) totalResponseTime / totalCalls : 0;
        }

        public double getAvgResultLength() {
            return successfulCalls > 0 ? (double) totalResultLength / successfulCalls : 0;
        }

        public int getTotalCalls() { return totalCalls; }
        public int getSuccessfulCalls() { return successfulCalls; }
        public LocalDateTime getLastCall() { return lastCall; }
    }
}