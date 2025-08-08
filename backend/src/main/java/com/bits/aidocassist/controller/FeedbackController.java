package com.bits.aidocassist.controller;

import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bits.aidocassist.model.AnalysisFeedback;
import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.FeedbackService;

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
}