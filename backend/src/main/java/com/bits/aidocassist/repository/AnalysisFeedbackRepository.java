package com.bits.aidocassist.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.bits.aidocassist.model.AnalysisFeedback;

@Repository
public interface AnalysisFeedbackRepository extends JpaRepository<AnalysisFeedback, Long> {
    
    List<AnalysisFeedback> findByDocumentId(Long documentId);
    
    @Query("SELECT AVG(f.overallRating) FROM AnalysisFeedback f WHERE f.createdAt >= :since")
    Double getAverageRatingSince(LocalDateTime since);
    
    @Query("SELECT AVG(f.summaryRating) FROM AnalysisFeedback f WHERE f.createdAt >= :since")
    Double getAverageSummaryRatingSince(LocalDateTime since);
    
    @Query("SELECT AVG(f.keywordsRating) FROM AnalysisFeedback f WHERE f.createdAt >= :since")
    Double getAverageKeywordsRatingSince(LocalDateTime since);
    
    @Query("SELECT AVG(f.componentsRating) FROM AnalysisFeedback f WHERE f.createdAt >= :since")
    Double getAverageComponentsRatingSince(LocalDateTime since);
    
    @Query("SELECT f FROM AnalysisFeedback f WHERE f.overallRating <= 2 ORDER BY f.createdAt DESC")
    List<AnalysisFeedback> findLowRatedFeedback();
    
    @Query("SELECT f FROM AnalysisFeedback f WHERE f.suggestedSummary IS NOT NULL OR f.suggestedKeywords IS NOT NULL OR f.suggestedComponents IS NOT NULL")
    List<AnalysisFeedback> findFeedbackWithSuggestions();
}
