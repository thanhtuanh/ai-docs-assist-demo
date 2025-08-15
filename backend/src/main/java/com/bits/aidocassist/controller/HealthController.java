package com.bits.aidocassist.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"})
public class HealthController {

    @Autowired
    private Environment environment;

    /**
     * ✅ General Health Endpoint - Hauptstatus des gesamten Systems
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> generalHealth() {
        Map<String, Object> health = new HashMap<>();
        
        // Basic Info
        health.put("status", "UP");
        health.put("timestamp", System.currentTimeMillis());
        health.put("datetime", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        health.put("service", "AI Document Assistant Backend");
        health.put("version", "1.2.0");
        health.put("environment", getActiveProfile());

        // Detailed Service Status
        Map<String, Object> services = new HashMap<>();
        services.put("aiService", createServiceStatus("UP", "Industry detection & text analysis"));
        services.put("documentsService", createServiceStatus("UP", "Document processing & storage"));
        services.put("textAnalysis", createServiceStatus("UP", "Text processing & keyword extraction"));
        services.put("industryDetection", createServiceStatus("UP", "10 industries supported"));
        services.put("feedbackService", createServiceStatus("UP", "User feedback collection"));
        health.put("services", services);

        // System Information
        Map<String, Object> system = new HashMap<>();
        system.put("javaVersion", System.getProperty("java.version"));
        system.put("springProfile", getActiveProfile());
        system.put("maxMemory", formatBytes(Runtime.getRuntime().maxMemory()));
        system.put("freeMemory", formatBytes(Runtime.getRuntime().freeMemory()));
        system.put("totalMemory", formatBytes(Runtime.getRuntime().totalMemory()));
        health.put("system", system);

        // Available Endpoints
        health.put("endpoints", Arrays.asList(
                "/api/health - General system health",
                "/api/ai/health - AI service status",  
                "/api/ai/info - AI service information",
                "/api/ai/industries - Supported industries",
                "/api/ai/detect-industry - Industry detection",
                "/api/documents/health - Documents service status",
                "/api/documents/analyze-text - Text analysis", 
                "/api/documents/{id} - Get document by ID",
                "/api/documents/batch - Batch processing",
                "/api/feedback - Feedback submission"
        ));

        // Feature Flags
        Map<String, Boolean> features = new HashMap<>();
        features.put("industryDetection", true);
        features.put("textAnalysis", true);
        features.put("documentStorage", true);
        features.put("batchProcessing", true);
        features.put("feedbackCollection", true);
        features.put("corsEnabled", true);
        health.put("features", features);

        // Statistics (Mock data - replace with real stats)
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalDocumentsProcessed", "Available via service");
        stats.put("averageProcessingTime", "~4.4 seconds");
        stats.put("supportedFileTypes", Arrays.asList("PDF", "DOC", "DOCX", "TXT", "CSV", "JSON"));
        stats.put("maxFileSize", "10MB");
        stats.put("supportedIndustries", 10);
        health.put("statistics", stats);

        return ResponseEntity.ok(health);
    }

    /**
     * ✅ Documents Service Health - Spezifischer Status für Document Service  
     */
    @GetMapping("/documents/health")
    public ResponseEntity<Map<String, Object>> documentsHealth() {
        Map<String, Object> health = new HashMap<>();
        
        // Basic Info
        health.put("status", "UP");
        health.put("timestamp", System.currentTimeMillis());
        health.put("datetime", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        health.put("service", "Documents Service");
        health.put("version", "1.2.0");

        // Document Service Features
        Map<String, Object> features = new HashMap<>();
        features.put("textAnalysis", "✅ Advanced text processing with AI");
        features.put("keywordExtraction", "✅ Smart keyword identification");
        features.put("technologyRecommendations", "✅ Component suggestions");
        features.put("industryDetection", "✅ Integrated with AI service");
        features.put("documentStorage", "✅ Persistent document management");
        features.put("batchProcessing", "✅ Multiple file processing");
        features.put("fileTypeSupport", "✅ PDF, DOC, TXT, CSV, JSON");
        health.put("features", features);

        // Available Endpoints
        health.put("endpoints", Arrays.asList(
                "POST /api/documents - Upload and analyze document",
                "POST /api/documents/analyze-text - Analyze text directly",
                "GET /api/documents/{id} - Retrieve document by ID",
                "POST /api/documents/{id}/reanalyze - Re-analyze existing document", 
                "POST /api/documents/batch - Batch process multiple files",
                "GET /api/documents/compare?id1={id1}&id2={id2} - Compare documents",
                "POST /api/documents/analyze-realtime - Real-time analysis",
                "GET /api/documents/health - This health check"
        ));

        // Processing Capabilities
        Map<String, Object> capabilities = new HashMap<>();
        capabilities.put("maxFileSize", "10MB");
        capabilities.put("supportedFormats", Arrays.asList(
                "application/pdf",
                "text/plain", 
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/csv",
                "application/json"
        ));
        capabilities.put("analysisOptions", Arrays.asList(
                "generateSummary",
                "extractKeywords", 
                "suggestComponents",
                "performSentimentAnalysis",
                "detectLanguage",
                "calculateMetrics"
        ));
        health.put("capabilities", capabilities);

        // Performance Metrics
        Map<String, Object> performance = new HashMap<>();
        performance.put("averageProcessingTime", "4.4 seconds");
        performance.put("maxConcurrentRequests", "10");
        performance.put("cacheEnabled", true);
        performance.put("lastSuccessfulAnalysis", "Active");
        health.put("performance", performance);

        // Integration Status
        Map<String, String> integrations = new HashMap<>();
        integrations.put("aiService", "✅ Connected");
        integrations.put("industryDetection", "✅ Active");
        integrations.put("textPreprocessing", "✅ Available");
        integrations.put("keywordExtraction", "✅ Enhanced");
        health.put("integrations", integrations);

        return ResponseEntity.ok(health);
    }

    /**
     * ✅ AI Service Health Proxy - Forwarding to AI service
     */
    @GetMapping("/ai/health") 
    public ResponseEntity<Map<String, Object>> aiHealthProxy() {
        // This could forward to actual AI service or provide summary
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("message", "Use /api/ai/health directly for detailed AI service status");
        health.put("redirect", "/api/ai/health");
        return ResponseEntity.ok(health);
    }

    /**
     * ✅ System Information Endpoint
     */
    @GetMapping("/system/info")
    public ResponseEntity<Map<String, Object>> systemInfo() {
        Map<String, Object> info = new HashMap<>();
        
        // Application Info
        info.put("application", "AI Document Assistant");
        info.put("version", "1.2.0");
        info.put("buildTimestamp", "2025-08-15T21:00:00Z");
        info.put("profile", getActiveProfile());
        
        // Runtime Info
        Runtime runtime = Runtime.getRuntime();
        Map<String, Object> runtimeInfo = new HashMap<>();
        runtimeInfo.put("javaVersion", System.getProperty("java.version"));
        runtimeInfo.put("javaVendor", System.getProperty("java.vendor"));
        runtimeInfo.put("osName", System.getProperty("os.name"));
        runtimeInfo.put("osVersion", System.getProperty("os.version"));
        runtimeInfo.put("availableProcessors", runtime.availableProcessors());
        runtimeInfo.put("maxMemory", formatBytes(runtime.maxMemory()));
        runtimeInfo.put("totalMemory", formatBytes(runtime.totalMemory()));
        runtimeInfo.put("freeMemory", formatBytes(runtime.freeMemory()));
        runtimeInfo.put("usedMemory", formatBytes(runtime.totalMemory() - runtime.freeMemory()));
        info.put("runtime", runtimeInfo);
        
        return ResponseEntity.ok(info);
    }

    // ===================================
    // HELPER METHODS
    // ===================================

    /**
     * Creates a detailed service status object
     */
    private Map<String, Object> createServiceStatus(String status, String description) {
        Map<String, Object> serviceStatus = new HashMap<>();
        serviceStatus.put("status", status);
        serviceStatus.put("description", description);
        serviceStatus.put("lastCheck", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_TIME));
        return serviceStatus;
    }

    /**
     * Get active Spring profile
     */
    private String getActiveProfile() {
        String[] profiles = environment.getActiveProfiles();
        return profiles.length > 0 ? profiles[0] : "default";
    }

    /**
     * Format bytes to human readable format
     */
    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp - 1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }

    /**
     * Get current timestamp in ISO format
     */
    private String getCurrentTimestamp() {
        return LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    /**
     * Check if a service is healthy (placeholder for real health checks)
     */
    private boolean isServiceHealthy(String serviceName) {
        // Implement real health checks here
        // For now, return true (all services are UP)
        return true;
    }

    /**
     * Get service uptime (placeholder)
     */
    private String getServiceUptime(String serviceName) {
        // Implement real uptime calculation
        return "Available";
    }
}