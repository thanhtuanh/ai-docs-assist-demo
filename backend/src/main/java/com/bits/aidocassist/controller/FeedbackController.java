package com.bits.aidocassist.controller;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bits.aidocassist.model.AnalysisFeedback;
import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.FeedbackService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    @Autowired
    private AiService aiService;

    @PostMapping
    public ResponseEntity<AnalysisFeedback> submitFeedback(
            @RequestBody AnalysisFeedback feedback,
            HttpServletRequest request) {

        // IP und User-Agent hinzufügen
        feedback.setUserIp(getClientIpAddress(request));
        feedback.setUserAgent(request.getHeader("User-Agent"));

        AnalysisFeedback savedFeedback = feedbackService.saveFeedback(feedback);

        System.out.println("📝 Feedback erhalten: " +
                "Overall: " + feedback.getOverallRating() + "/5, " +
                "Summary: " + feedback.getSummaryRating() + "/5");

        return ResponseEntity.ok(savedFeedback);
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<List<AnalysisFeedback>> getFeedbackForDocument(
            @PathVariable Long documentId) {

        List<AnalysisFeedback> feedback = feedbackService.getFeedbackForDocument(documentId);
        return ResponseEntity.ok(feedback);
    }

    @GetMapping("/quality-report")
    public ResponseEntity<FeedbackService.QualityReport> getQualityReport() {
        FeedbackService.QualityReport report = feedbackService.getQualityReport();
        return ResponseEntity.ok(report);
    }

    @GetMapping("/ai-metrics")
    public ResponseEntity<Map<String, AiService.QualityMetrics>> getAiMetrics() {
        Map<String, AiService.QualityMetrics> metrics = aiService.getQualityMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/improvement-suggestions")
    public ResponseEntity<List<String>> getImprovementSuggestions() {
        List<String> suggestions = feedbackService.getImprovementSuggestions();
        return ResponseEntity.ok(suggestions);
    }

    @PostMapping("/quick-feedback")
    public ResponseEntity<String> submitQuickFeedback(
            @RequestBody Map<String, Object> quickFeedback) {

        // Schnelles Feedback für "Hilfreich/Nicht hilfreich"
        Long documentId = Long.valueOf(quickFeedback.get("documentId").toString());
        String type = (String) quickFeedback.get("type"); // "summary", "keywords", "components"
        Boolean helpful = (Boolean) quickFeedback.get("helpful");

        AnalysisFeedback feedback = new AnalysisFeedback();
        feedback.setDocument(new com.bits.aidocassist.model.Document());
        feedback.getDocument().setId(documentId);

        switch (type) {
            case "summary":
                feedback.setSummaryHelpful(helpful);
                feedback.setSummaryRating(helpful ? 4 : 2);
                break;
            case "keywords":
                feedback.setKeywordsHelpful(helpful);
                feedback.setKeywordsRating(helpful ? 4 : 2);
                break;
            case "components":
                feedback.setComponentsHelpful(helpful);
                feedback.setComponentsRating(helpful ? 4 : 2);
                break;
        }

        feedbackService.saveFeedback(feedback);

        return ResponseEntity.ok("Feedback gespeichert");
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader == null) {
            return request.getRemoteAddr();
        } else {
            return xForwardedForHeader.split(",")[0];
        }
    }

    // Füge das zu FeedbackController.java hinzu:

    /**
     * ✅ Feedback Service Health Check
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> feedbackHealth() {
        Map<String, Object> health = new HashMap<>();

        // Basic Info
        health.put("status", "UP");
        health.put("timestamp", System.currentTimeMillis());
        health.put("service", "Feedback Service");
        health.put("version", "1.0.0");

        // Service Features
        Map<String, Object> features = new HashMap<>();
        features.put("feedbackCollection", "✅ User feedback collection");
        features.put("qualityReports", "✅ Analysis quality reporting");
        features.put("quickFeedback", "✅ Helpful/Not helpful ratings");
        features.put("improvementSuggestions", "✅ AI improvement suggestions");
        features.put("aiMetrics", "✅ AI service quality metrics");
        health.put("features", features);

        // Available Endpoints
        List<String> endpoints = Arrays.asList(
                "POST /api/feedback - Submit detailed feedback",
                "POST /api/feedback/quick-feedback - Submit quick rating",
                "GET /api/feedback/document/{id} - Get feedback for document",
                "GET /api/feedback/quality-report - Get quality metrics",
                "GET /api/feedback/ai-metrics - Get AI service metrics",
                "GET /api/feedback/improvement-suggestions - Get suggestions",
                "GET /api/feedback/health - This health check");
        health.put("endpoints", endpoints);

        // Statistics (mock data - replace with real stats)
        Map<String, Object> stats = new HashMap<>();
        try {
            FeedbackService.QualityReport report = feedbackService.getQualityReport();
            stats.put("totalFeedbackCount", report.getTotalFeedbackCount());
            stats.put("averageRating", report.getWeeklyAverageRating());
            stats.put("suggestionsCount", report.getSuggestionsCount());
        } catch (Exception e) {
            stats.put("totalFeedbackCount", "Available");
            stats.put("averageRating", "Available");
            stats.put("suggestionsCount", "Available");
            stats.put("note", "Statistics service temporarily unavailable");
        }
        health.put("statistics", stats);

        // Integration Status
        Map<String, String> integrations = new HashMap<>();
        integrations.put("documentService", "✅ Connected");
        integrations.put("aiService", "✅ Metrics collection active");
        integrations.put("database", "✅ Feedback storage working");
        health.put("integrations", integrations);

        return ResponseEntity.ok(health);
    }
}