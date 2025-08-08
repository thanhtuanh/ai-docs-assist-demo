# AI Document Assistant - Token-Verbrauch & Kostenoptimierung

## 📊 Token-Verbrauch überwachen

### AWS Console & CLI
```bash
# AWS CLI - Nutzung überprüfen
aws bedrock get-usage-metrics --region us-east-1

# Aktuelle Kosten anzeigen
aws ce get-cost-and-usage --time-period Start=2025-08-01,End=2025-08-08 --granularity DAILY --metrics BlendedCost

# Budget Alert erstellen
aws budgets create-budget --account-id YOUR-ACCOUNT-ID --budget '{
  "BudgetName": "AI-Services-Budget",
  "BudgetLimit": {
    "Amount": "50.00",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}'
```

### CloudWatch Metriken
- AWS CloudWatch Console → "Amazon Q" oder "Bedrock" Metriken
- Token-Verbrauch pro Tag/Monat überwachen

## 💰 Kostenoptimierung für unser Projekt

### 1. OpenAI API Konfiguration optimieren
```properties
# backend/src/main/resources/application.properties
openai.api.model=gpt-3.5-turbo          # Statt gpt-4-turbo-preview (90% günstiger!)
openai.api.max-tokens=500               # Token-Limit setzen
openai.api.temperature=0.3              # Weniger kreative, kürzere Antworten
openai.timeout.seconds=30               # Timeout reduzieren
```

### 2. Text-Preprocessing implementieren
```java
// DocumentService.java - Vor OpenAI API Aufruf
private String preprocessText(String text) {
    return text
        .replaceAll("\\s+", " ")                    // Mehrfache Leerzeichen entfernen
        .replaceAll("[^\\w\\s.,!?-äöüÄÖÜß]", "")   // Sonderzeichen entfernen
        .trim()
        .substring(0, Math.min(text.length(), 2000)); // Max 2000 Zeichen
}
```

### 3. Caching System hinzufügen
```java
// DocumentService.java
@Cacheable(value = "analysis-cache", key = "#content.hashCode()")
public AnalysisResult analyzeDocument(String content) {
    // Nur bei neuen/geänderten Inhalten API aufrufen
    return openAIService.analyze(preprocessText(content));
}

// Cache-Konfiguration in application.properties
spring.cache.type=caffeine
spring.cache.caffeine.spec=maximumSize=1000,expireAfterWrite=1h
```

### 4. Rate Limiting implementieren
```java
// DocumentController.java
@RateLimiter(name = "openai-api", fallbackMethod = "fallbackAnalysis")
public ResponseEntity<AnalysisResponse> createDocument(@RequestParam("file") MultipartFile file) {
    // Rate-limitierte API-Aufrufe
}

// application.yml
resilience4j:
  ratelimiter:
    instances:
      openai-api:
        limit-for-period: 10
        limit-refresh-period: 1m
        timeout-duration: 5s
```

### 5. Intelligente Fallbacks
```java
public AnalysisResult analyzeDocument(String content) {
    // Lokale Analyse für kurze Texte
    if (content.length() < 100) {
        return simpleLocalAnalysis(content);
    }
    
    // Cached Analyse für ähnliche Inhalte
    String contentHash = DigestUtils.md5Hex(content);
    AnalysisResult cached = cacheService.get(contentHash);
    if (cached != null) {
        return cached;
    }
    
    // Nur bei komplexen, neuen Dokumenten OpenAI verwenden
    return openAIService.analyze(preprocessText(content));
}
```

## 📈 Monitoring & Logging implementieren

### 1. Token-Usage Logger
```java
// TokenUsageLogger.java
@Component
@Slf4j
public class TokenUsageLogger {
    
    @EventListener
    public void logTokenUsage(OpenAIApiCallEvent event) {
        log.info("🔢 Token Usage: {} tokens, Cost: ${:.4f}, Model: {}, Duration: {}ms", 
            event.getTokensUsed(), 
            event.getEstimatedCost(), 
            event.getModel(),
            event.getDurationMs());
        
        // Metriken für Monitoring
        meterRegistry.counter("openai.tokens.used", "model", event.getModel())
                    .increment(event.getTokensUsed());
        meterRegistry.timer("openai.request.duration", "model", event.getModel())
                    .record(event.getDurationMs(), TimeUnit.MILLISECONDS);
    }
}
```

### 2. Cost Tracking Service
```java
// CostTrackingService.java
@Service
public class CostTrackingService {
    
    private static final Map<String, Double> TOKEN_COSTS = Map.of(
        "gpt-4-turbo-preview", 0.00001,  // $0.01 per 1K tokens input
        "gpt-3.5-turbo", 0.000001       // $0.001 per 1K tokens input
    );
    
    public void trackCost(String model, int tokensUsed) {
        double cost = tokensUsed * TOKEN_COSTS.getOrDefault(model, 0.0);
        
        // Daily/Monthly cost tracking
        String today = LocalDate.now().toString();
        redisTemplate.opsForValue().increment("daily_cost:" + today, cost);
        
        log.info("💰 Daily cost so far: ${:.2f}", getDailyCost());
    }
}
```

### 3. Dashboard Endpoints
```java
// MonitoringController.java
@RestController
@RequestMapping("/api/monitoring")
public class MonitoringController {
    
    @GetMapping("/token-usage")
    public ResponseEntity<TokenUsageStats> getTokenUsage() {
        return ResponseEntity.ok(TokenUsageStats.builder()
            .dailyTokens(getDailyTokenUsage())
            .monthlyTokens(getMonthlyTokenUsage())
            .estimatedMonthlyCost(getEstimatedMonthlyCost())
            .build());
    }
    
    @GetMapping("/cost-breakdown")
    public ResponseEntity<CostBreakdown> getCostBreakdown() {
        return ResponseEntity.ok(costTrackingService.getCostBreakdown());
    }
}
```

## 🎯 Aktuelle Kostenanalyse (Stand August 2025)

### OpenAI Preise
- **GPT-4 Turbo**: ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens
- **GPT-3.5 Turbo**: ~$0.001 per 1K input tokens, ~$0.002 per 1K output tokens

### Beispielrechnung für unser System
```
1 Dokument-Analyse:
- Input: ~2000 tokens (Dokument + Prompts)
- Output: ~500 tokens (Zusammenfassung + Keywords + Komponenten)

GPT-4 Turbo Kosten pro Analyse:
- Input: 2000 * $0.00001 = $0.02
- Output: 500 * $0.00003 = $0.015
- Total: ~$0.035 pro Analyse

GPT-3.5 Turbo Kosten pro Analyse:
- Input: 2000 * $0.000001 = $0.002
- Output: 500 * $0.000002 = $0.001
- Total: ~$0.003 pro Analyse (90% günstiger!)

Monatliche Schätzung (100 Analysen/Tag):
- GPT-4: ~$105/Monat
- GPT-3.5: ~$9/Monat
```

## 🚀 Sofortige Optimierungen

### 1. Model wechseln (application.properties)
```properties
# Aktuell
openai.api.model=gpt-4-turbo-preview

# Optimiert (90% Kostenersparnis)
openai.api.model=gpt-3.5-turbo
```

### 2. Entwicklungsumgebung Mock
```properties
# .env.development
USE_MOCK_AI=true
OPENAI_API_KEY=mock-key-for-development
```

### 3. Prompt-Optimierung
```java
// Aktuell: Lange, detaillierte Prompts
String prompt = "Analysiere das folgende Dokument sehr detailliert und gib mir eine umfassende Zusammenfassung mit allen wichtigen Details...";

// Optimiert: Kurze, präzise Prompts
String prompt = "Zusammenfassung (max 100 Wörter), Keywords (max 10), Tech-Stack:";
```

## 📋 TODO - Implementierung

### Kurzfristig (diese Woche)
- [ ] Model auf gpt-3.5-turbo umstellen
- [ ] Text-Preprocessing implementieren
- [ ] Token-Usage Logging hinzufügen
- [ ] Cache-System aktivieren

### Mittelfristig (nächste 2 Wochen)
- [ ] Rate Limiting implementieren
- [ ] Monitoring Dashboard erstellen
- [ ] Cost Tracking Service
- [ ] Intelligente Fallbacks

### Langfristig (nächster Monat)
- [ ] A/B Testing GPT-3.5 vs GPT-4 Qualität
- [ ] Lokale AI-Modelle evaluieren (Ollama, etc.)
- [ ] Batch-Processing für Multiple Dokumente
- [ ] Advanced Caching mit Similarity Search

## 🔧 Nützliche Commands

```bash
# Docker Logs für Token-Verbrauch
docker logs ai-doc-assist-backend-1 | grep "Token Usage"

# Aktuelle Kosten anzeigen
curl http://localhost:8080/api/monitoring/token-usage

# Cache Status überprüfen
curl http://localhost:8080/actuator/caches

# Prometheus Metriken (wenn aktiviert)
curl http://localhost:8080/actuator/prometheus | grep openai
```

## 📞 Support & Ressourcen

- **OpenAI Pricing**: https://openai.com/pricing
- **AWS Cost Calculator**: https://calculator.aws
- **Token Counter Tool**: https://platform.openai.com/tokenizer
- **Spring Boot Caching**: https://spring.io/guides/gs/caching/

---
*Letzte Aktualisierung: 8. August 2025*
*Nächste Review: 15. August 2025*
