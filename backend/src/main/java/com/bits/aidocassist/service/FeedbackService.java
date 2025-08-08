package com.bits.aidocassist.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.bits.aidocassist.model.AnalysisFeedback;
import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.repository.AnalysisFeedbackRepository;
import com.bits.aidocassist.repository.DocumentRepository;

@Service
public class FeedbackService {

    @Autowired
    private AnalysisFeedbackRepository feedbackRepository;
    
    @Autowired
    private DocumentRepository documentRepository;

    public AnalysisFeedback saveFeedback(AnalysisFeedback feedback) {
        // Validierung
        if (feedback.getDocument() != null && feedback.getDocument().getId() != null) {
            Optional<Document> doc = documentRepository.findById(feedback.getDocument().getId());
            if (doc.isPresent()) {
                feedback.setDocument(doc.get());
            }
        }
        
        feedback.setCreatedAt(LocalDateTime.now());
        return feedbackRepository.save(feedback);
    }

    public List<AnalysisFeedback> getFeedbackForDocument(Long documentId) {
        return feedbackRepository.findByDocumentId(documentId);
    }

    public QualityReport getQualityReport() {
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);
        LocalDateTime oneMonthAgo = LocalDateTime.now().minusMonths(1);
        
        return QualityReport.builder()
            .weeklyAverageRating(feedbackRepository.getAverageRatingSince(oneWeekAgo))
            .monthlyAverageRating(feedbackRepository.getAverageRatingSince(oneMonthAgo))
            .weeklySummaryRating(feedbackRepository.getAverageSummaryRatingSince(oneWeekAgo))
            .weeklyKeywordsRating(feedbackRepository.getAverageKeywordsRatingSince(oneWeekAgo))
            .weeklyComponentsRating(feedbackRepository.getAverageComponentsRatingSince(oneWeekAgo))
            .totalFeedbackCount(feedbackRepository.count())
            .lowRatedFeedback(feedbackRepository.findLowRatedFeedback())
            .suggestionsCount(feedbackRepository.findFeedbackWithSuggestions().size())
            .build();
    }

    public List<String> getImprovementSuggestions() {
        List<String> suggestions = new ArrayList<>();
        List<AnalysisFeedback> lowRated = feedbackRepository.findLowRatedFeedback();
        
        Map<String, Integer> categoryCount = new HashMap<>();
        
        for (AnalysisFeedback feedback : lowRated) {
            if (feedback.getSummaryRating() != null && feedback.getSummaryRating() <= 2) {
                categoryCount.put("SUMMARY", categoryCount.getOrDefault("SUMMARY", 0) + 1);
            }
            if (feedback.getKeywordsRating() != null && feedback.getKeywordsRating() <= 2) {
                categoryCount.put("KEYWORDS", categoryCount.getOrDefault("KEYWORDS", 0) + 1);
            }
            if (feedback.getComponentsRating() != null && feedback.getComponentsRating() <= 2) {
                categoryCount.put("COMPONENTS", categoryCount.getOrDefault("COMPONENTS", 0) + 1);
            }
        }
        
        // Generiere Verbesserungsvorschläge
        categoryCount.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .forEach(entry -> {
                switch (entry.getKey()) {
                    case "SUMMARY":
                        suggestions.add("Zusammenfassungs-Prompts überarbeiten - " + entry.getValue() + " negative Bewertungen");
                        break;
                    case "KEYWORDS":
                        suggestions.add("Keyword-Extraktion verbessern - " + entry.getValue() + " negative Bewertungen");
                        break;
                    case "COMPONENTS":
                        suggestions.add("Technologie-Empfehlungen aktualisieren - " + entry.getValue() + " negative Bewertungen");
                        break;
                }
            });
        
        return suggestions;
    }

    // Quality Report DTO
    public static class QualityReport {
        private Double weeklyAverageRating;
        private Double monthlyAverageRating;
        private Double weeklySummaryRating;
        private Double weeklyKeywordsRating;  
        private Double weeklyComponentsRating;
        private Long totalFeedbackCount;
        private List<AnalysisFeedback> lowRatedFeedback;
        private Integer suggestionsCount;
        
        public static QualityReportBuilder builder() {
            return new QualityReportBuilder();
        }
        
        // Builder Pattern
        public static class QualityReportBuilder {
            private QualityReport report = new QualityReport();
            
            public QualityReportBuilder weeklyAverageRating(Double rating) {
                report.weeklyAverageRating = rating;
                return this;
            }
            
            public QualityReportBuilder monthlyAverageRating(Double rating) {
                report.monthlyAverageRating = rating;
                return this;
            }
            
            public QualityReportBuilder weeklySummaryRating(Double rating) {
                report.weeklySummaryRating = rating;
                return this;
            }
            
            public QualityReportBuilder weeklyKeywordsRating(Double rating) {
                report.weeklyKeywordsRating = rating;
                return this;
            }
            
            public QualityReportBuilder weeklyComponentsRating(Double rating) {
                report.weeklyComponentsRating = rating;
                return this;
            }
            
            public QualityReportBuilder totalFeedbackCount(Long count) {
                report.totalFeedbackCount = count;
                return this;
            }
            
            public QualityReportBuilder lowRatedFeedback(List<AnalysisFeedback> feedback) {
                report.lowRatedFeedback = feedback;
                return this;
            }
            
            public QualityReportBuilder suggestionsCount(Integer count) {
                report.suggestionsCount = count;
                return this;
            }
            
            public QualityReport build() {
                return report;
            }
        }
        
        // Getters
        public Double getWeeklyAverageRating() { return weeklyAverageRating; }
        public Double getMonthlyAverageRating() { return monthlyAverageRating; }
        public Double getWeeklySummaryRating() { return weeklySummaryRating; }
        public Double getWeeklyKeywordsRating() { return weeklyKeywordsRating; }
        public Double getWeeklyComponentsRating() { return weeklyComponentsRating; }
        public Long getTotalFeedbackCount() { return totalFeedbackCount; }
        public List<AnalysisFeedback> getLowRatedFeedback() { return lowRatedFeedback; }
        public Integer getSuggestionsCount() { return suggestionsCount; }
    }
}
