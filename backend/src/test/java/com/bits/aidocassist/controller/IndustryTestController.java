package com.bits.aidocassist.controller;

import com.bits.aidocassist.service.IndustryDetectionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Test-Controller für die Branchenerkennung
 * Funktioniert unabhängig vom bestehenden AiService
 */
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "industry-detection.enabled", havingValue = "true", matchIfMissing = true)
public class IndustryTestController {

    private static final Logger log = LoggerFactory.getLogger(IndustryTestController.class);
    
    private final IndustryDetectionService industryDetectionService;

    /**
     * Einfacher Health Check
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Industry Detection Test API");
        response.put("version", "1.1.0");
        response.put("timestamp", System.currentTimeMillis());
        response.put("message", "Industry Detection Service is ready");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Echo-Test für API-Erreichbarkeit
     */
    @PostMapping("/echo")
    public ResponseEntity<Map<String, Object>> echo(@RequestBody Map<String, Object> request) {
        log.info("Echo request received: {}", request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("received", request);
        response.put("timestamp", System.currentTimeMillis());
        response.put("message", "Echo successful - Industry Detection API is working");
        response.put("nextStep", "Try POST /api/test/industry with text content");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Direkte Branchenerkennung für Tests
     */
    @PostMapping("/industry")
    public ResponseEntity<Map<String, Object>> testIndustryDetection(@RequestBody Map<String, String> request) {
        log.info("Industry detection test request received");
        
        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Text field is required");
            error.put("example", Map.of("text", "BMW entwickelt innovative Fahrzeuge"));
            error.put("timestamp", System.currentTimeMillis());
            return ResponseEntity.badRequest().body(error);
        }

        try {
            long startTime = System.currentTimeMillis();
            Map<String, Object> result = industryDetectionService.detectIndustry(text);
            long processingTime = System.currentTimeMillis() - startTime;
            
            // Test-spezifische Informationen hinzufügen
            result.put("testInfo", Map.of(
                "processingTimeMs", processingTime,
                "inputLength", text.length(),
                "endpoint", "POST /api/test/industry",
                "status", "SUCCESS"
            ));
            
            log.info("Industry detection test completed in {}ms", processingTime);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("Industry detection test failed: {}", e.getMessage(), e);
            
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Industry detection failed");
            error.put("message", e.getMessage());
            error.put("timestamp", System.currentTimeMillis());
            error.put("inputText", text.substring(0, Math.min(100, text.length())) + "...");
            
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Batch-Test mit mehreren Beispieltexten
     */
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> batchTest() {
        log.info("Batch industry detection test started");
        
        Map<String, String> testTexts = Map.of(
            "automotive", "BMW und Mercedes entwickeln elektrische Fahrzeuge für die Zukunft der Mobilität",
            "pharma", "Bayer forscht an innovativen Medikamenten gegen Krebs und Alzheimer",
            "ecommerce", "Amazon und Zalando dominieren den deutschen Online-Handel",
            "finance", "Deutsche Bank digitalisiert ihre Services mit neuen Fintech-Lösungen",
            "it", "SAP entwickelt Cloud-Software für Enterprise-Kunden"
        );

        Map<String, Object> results = new HashMap<>();
        Map<String, Object> summary = new HashMap<>();
        int successCount = 0;
        int totalTime = 0;

        for (Map.Entry<String, String> entry : testTexts.entrySet()) {
            try {
                long startTime = System.currentTimeMillis();
                Map<String, Object> result = industryDetectionService.detectIndustry(entry.getValue());
                long processingTime = System.currentTimeMillis() - startTime;
                
                result.put("expectedIndustry", entry.getKey());
                result.put("processingTimeMs", processingTime);
                results.put(entry.getKey(), result);
                
                successCount++;
                totalTime += processingTime;
                
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", e.getMessage());
                error.put("expectedIndustry", entry.getKey());
                results.put(entry.getKey(), error);
                
                log.warn("Batch test failed for {}: {}", entry.getKey(), e.getMessage());
            }
        }

        summary.put("totalTests", testTexts.size());
        summary.put("successful", successCount);
        summary.put("failed", testTexts.size() - successCount);
        summary.put("averageTimeMs", totalTime / Math.max(1, successCount));
        summary.put("timestamp", System.currentTimeMillis());

        Map<String, Object> response = new HashMap<>();
        response.put("summary", summary);
        response.put("results", results);
        response.put("message", "Batch industry detection test completed");

        log.info("Batch test completed: {}/{} successful", successCount, testTexts.size());
        return ResponseEntity.ok(response);
    }

    /**
     * Performance-Test
     */
    @PostMapping("/performance")
    public ResponseEntity<Map<String, Object>> performanceTest(@RequestBody Map<String, Object> request) {
        String text = (String) request.getOrDefault("text", "BMW entwickelt innovative Fahrzeuge");
        Integer iterations = (Integer) request.getOrDefault("iterations", 10);
        
        if (iterations > 50) {
            iterations = 50; // Limit für Tests
        }

        log.info("Performance test started with {} iterations", iterations);

        long totalTime = 0;
        long minTime = Long.MAX_VALUE;
        long maxTime = 0;
        int successCount = 0;

        for (int i = 0; i < iterations; i++) {
            try {
                long startTime = System.nanoTime();
                industryDetectionService.detectIndustry(text);
                long endTime = System.nanoTime();
                
                long duration = (endTime - startTime) / 1_000_000; // Convert to milliseconds
                totalTime += duration;
                minTime = Math.min(minTime, duration);
                maxTime = Math.max(maxTime, duration);
                successCount++;
                
            } catch (Exception e) {
                log.warn("Performance test iteration {} failed: {}", i, e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("iterations", iterations);
        response.put("successful", successCount);
        response.put("failed", iterations - successCount);
        response.put("averageTimeMs", totalTime / Math.max(1, successCount));
        response.put("minTimeMs", minTime == Long.MAX_VALUE ? 0 : minTime);
        response.put("maxTimeMs", maxTime);
        response.put("totalTimeMs", totalTime);
        response.put("requestsPerSecond", successCount * 1000.0 / Math.max(1, totalTime));
        response.put("timestamp", System.currentTimeMillis());

        log.info("Performance test completed: {} successful requests, avg {}ms", 
                successCount, totalTime / Math.max(1, successCount));
        
        return ResponseEntity.ok(response);
    }

    /**
     * Debugging-Informationen
     */
    @GetMapping("/debug")
    public ResponseEntity<Map<String, Object>> debug() {
        Map<String, Object> debug = new HashMap<>();
        
        debug.put("service", "IndustryDetectionService");
        debug.put("endpoints", Map.of(
            "health", "GET /api/test/health",
            "echo", "POST /api/test/echo",
            "industry", "POST /api/test/industry",
            "batch", "POST /api/test/batch",
            "performance", "POST /api/test/performance",
            "debug", "GET /api/test/debug"
        ));
        
        debug.put("environment", Map.of(
            "openaiConfigured", System.getenv("OPENAI_API_KEY") != null,
            "redisHost", System.getProperty("spring.redis.host", "localhost"),
            "activeProfile", System.getProperty("spring.profiles.active", "default")
        ));
        
        debug.put("examples", Map.of(
            "simple", "POST /api/test/industry with {\"text\": \"BMW entwickelt Autos\"}",
            "batch", "POST /api/test/batch (no body required)",
            "performance", "POST /api/test/performance with {\"iterations\": 10}"
        ));
        
        debug.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.ok(debug);
    }
}
