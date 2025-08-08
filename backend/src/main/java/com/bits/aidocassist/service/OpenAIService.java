package com.bits.aidocassist.service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OpenAIService {

    @Value("${openai.api.key}")
    private String apiKey;

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verbesserte Zusammenfassung mit strukturiertem Prompt
     */
    public String generateSummary(String text) {
        String prompt = String.format("""
                Analysiere den folgenden Text und erstelle eine präzise Zusammenfassung.

                ANFORDERUNGEN:
                1. Identifiziere die Hauptthemen und Kernaussagen
                2. Strukturiere die Zusammenfassung in klare Abschnitte
                3. Behalte wichtige Details und Fakten bei
                4. Verwende eine klare, verständliche Sprache
                5. Länge: 150-250 Wörter

                FORMAT:
                **Hauptthema:** [Kurze Beschreibung]

                **Kernpunkte:**
                - [Punkt 1]
                - [Punkt 2]
                - [Punkt 3]

                **Zusammenfassung:**
                [Detaillierte Zusammenfassung]

                TEXT ZUR ANALYSE:
                %s
                """, text);

        return callOpenAI(prompt, 0.5, 500);
    }

    /**
     * Verbesserte Keyword-Extraktion mit Kategorisierung
     */
    public Map<String, List<String>> extractKeywords(String text) {
        String prompt = String.format("""
                Extrahiere die wichtigsten Keywords aus dem folgenden Text.

                AUFGABE:
                1. Identifiziere die 10-15 wichtigsten Schlüsselwörter
                2. Kategorisiere sie nach Relevanz und Typ
                3. Berücksichtige technische Begriffe, Konzepte und Hauptthemen
                4. Gewichte nach Häufigkeit und Kontext-Wichtigkeit

                AUSGABE-FORMAT (JSON):
                {
                    "hauptkeywords": ["keyword1", "keyword2", "keyword3"],
                    "technische_begriffe": ["term1", "term2"],
                    "konzepte": ["konzept1", "konzept2"],
                    "entitäten": ["name1", "organization1"],
                    "relevanz_score": {
                        "keyword1": 0.95,
                        "keyword2": 0.87
                    }
                }

                TEXT:
                %s

                Antworte NUR mit dem JSON-Objekt, keine zusätzliche Erklärung.
                """, text);

        String response = callOpenAI(prompt, 0.3, 300);

        try {
            return objectMapper.readValue(response, Map.class);
        } catch (Exception e) {
            // Fallback bei JSON-Parsing-Fehler
            Map<String, List<String>> fallback = new HashMap<>();
            fallback.put("keywords", Arrays.asList(response.split(",")));
            return fallback;
        }
    }

    /**
     * Verbesserte technische Empfehlungen mit Kontext-Analyse
     */
    public TechRecommendation generateTechRecommendations(String text, String documentType) {
        String prompt = String.format("""
                Analysiere den folgenden %s und erstelle technische Empfehlungen.

                ANALYSE-KRITERIEN:
                1. Identifiziere verwendete Technologien und Frameworks
                2. Erkenne technische Herausforderungen und Problembereiche
                3. Bewerte Best Practices und Standards
                4. Identifiziere Optimierungspotentiale

                EMPFEHLUNGS-STRUKTUR:
                {
                    "aktuelle_technologien": {
                        "frontend": [],
                        "backend": [],
                        "database": [],
                        "devops": []
                    },
                    "empfehlungen": [
                        {
                            "kategorie": "Performance",
                            "priorität": "HOCH",
                            "empfehlung": "...",
                            "begründung": "...",
                            "tools": ["tool1", "tool2"]
                        }
                    ],
                    "best_practices": [
                        {
                            "bereich": "Security",
                            "empfehlung": "...",
                            "referenz": "..."
                        }
                    ],
                    "nächste_schritte": [
                        "1. ...",
                        "2. ...",
                        "3. ..."
                    ]
                }

                TEXT:
                %s

                Antworte mit strukturiertem JSON.
                """, documentType, text);

        String response = callOpenAI(prompt, 0.6, 800);
        return parseTechRecommendation(response);
    }

    /**
     * Intelligente Dokumenten-Klassifizierung
     */
    public DocumentClassification classifyDocument(String text) {
        String prompt = String.format("""
                Klassifiziere das folgende Dokument:

                KLASSIFIZIERUNGS-KATEGORIEN:
                - Dokumenttyp (Technische Dokumentation, Anforderungen, Design, Code, etc.)
                - Fachbereich (Software, Hardware, Business, etc.)
                - Komplexitätslevel (Einsteiger, Fortgeschritten, Experte)
                - Sprache und Stil
                - Zielgruppe

                AUSGABE:
                {
                    "typ": "...",
                    "fachbereich": "...",
                    "komplexität": "...",
                    "hauptthemen": [],
                    "zielgruppe": "...",
                    "confidence": 0.95
                }

                TEXT:
                %s
                """, text.substring(0, Math.min(text.length(), 2000)));

        String response = callOpenAI(prompt, 0.3, 200);
        return parseClassification(response);
    }

    /**
     * Erweiterte Sentiment- und Ton-Analyse
     */
    public SentimentAnalysis analyzeSentiment(String text) {
        String prompt = String.format("""
                Führe eine detaillierte Sentiment- und Tonanalyse durch:

                ANALYSE:
                1. Gesamtstimmung (positiv/neutral/negativ)
                2. Ton (formal/informal/technisch)
                3. Emotionale Aspekte
                4. Professionaliätsgrad

                TEXT:
                %s

                AUSGABE:
                {
                    "sentiment": "...",
                    "score": 0.0,
                    "ton": "...",
                    "emotionen": [],
                    "professionalität": "..."
                }
                """, text);

        return parseSentiment(callOpenAI(prompt, 0.3, 200));
    }

    /**
     * Verbesserte OpenAI API-Aufruf mit Fehlerbehandlung
     */
    private String callOpenAI(String prompt, double temperature, int maxTokens) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "gpt-4-turbo-preview"); // Upgrade zu GPT-4 für bessere Qualität
            requestBody.put("messages", Arrays.asList(
                    Map.of("role", "system", "content",
                            "Du bist ein Experte für Dokumentenanalyse und technische Empfehlungen. " +
                                    "Antworte präzise, strukturiert und in der angegebenen Sprache."),
                    Map.of("role", "user", "content", prompt)));
            requestBody.put("temperature", temperature);
            requestBody.put("max_tokens", maxTokens);
            requestBody.put("top_p", 0.95);
            requestBody.put("frequency_penalty", 0.2);
            requestBody.put("presence_penalty", 0.1);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                    OPENAI_API_URL,
                    HttpMethod.POST,
                    entity,
                    Map.class);

            Map<String, Object> responseBody = response.getBody();
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");

            return (String) message.get("content");

        } catch (Exception e) {
            System.err.println("OpenAI API Fehler: " + e.getMessage());
            return "Fehler bei der Analyse: " + e.getMessage();
        }
    }

    // Helper-Klassen für strukturierte Antworten
    public static class TechRecommendation {
        public Map<String, List<String>> aktuelleTechnologien;
        public List<Empfehlung> empfehlungen;
        public List<BestPractice> bestPractices;
        public List<String> nächsteSchritte;
    }

    public static class Empfehlung {
        public String kategorie;
        public String priorität;
        public String empfehlung;
        public String begründung;
        public List<String> tools;
    }

    public static class BestPractice {
        public String bereich;
        public String empfehlung;
        public String referenz;
    }

    public static class DocumentClassification {
        public String typ;
        public String fachbereich;
        public String komplexität;
        public List<String> hauptthemen;
        public String zielgruppe;
        public double confidence;
    }

    public static class SentimentAnalysis {
        public String sentiment;
        public double score;
        public String ton;
        public List<String> emotionen;
        public String professionalität;
    }

    // Parser-Methoden
    private TechRecommendation parseTechRecommendation(String json) {
        try {
            return objectMapper.readValue(json, TechRecommendation.class);
        } catch (Exception e) {
            return new TechRecommendation();
        }
    }

    private DocumentClassification parseClassification(String json) {
        try {
            return objectMapper.readValue(json, DocumentClassification.class);
        } catch (Exception e) {
            return new DocumentClassification();
        }
    }

    private SentimentAnalysis parseSentiment(String json) {
        try {
            return objectMapper.readValue(json, SentimentAnalysis.class);
        } catch (Exception e) {
            return new SentimentAnalysis();
        }
    }
}