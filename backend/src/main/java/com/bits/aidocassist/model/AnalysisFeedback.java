package com.bits.aidocassist.model;

import java.time.LocalDateTime;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;

@Entity
public class AnalysisFeedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "document_id")
    private Document document;
    
    // Bewertungen (1-5 Sterne)
    @Column(name = "summary_rating")
    private Integer summaryRating;
    
    @Column(name = "keywords_rating")
    private Integer keywordsRating;
    
    @Column(name = "components_rating")
    private Integer componentsRating;
    
    // Gesamtbewertung
    @Column(name = "overall_rating")
    private Integer overallRating;
    
    // Textuelle Bewertungen
    @Column(columnDefinition = "TEXT")
    private String userComments;
    
    @Column(columnDefinition = "TEXT")
    private String suggestedSummary;
    
    @Column(columnDefinition = "TEXT")
    private String suggestedKeywords;
    
    @Column(columnDefinition = "TEXT")
    private String suggestedComponents;
    
    // Hilfreich-Flags
    @Column(name = "summary_helpful")
    private Boolean summaryHelpful;
    
    @Column(name = "keywords_helpful")
    private Boolean keywordsHelpful;
    
    @Column(name = "components_helpful")
    private Boolean componentsHelpful;
    
    // Metadaten
    @Column(name = "user_ip")
    private String userIp;
    
    @Column(name = "user_agent")
    private String userAgent;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    // Verbesserungsvorschläge
    @Column(name = "improvement_category")
    private String improvementCategory; // "ACCURACY", "COMPLETENESS", "RELEVANCE"
    
    @Column(name = "document_type_suggestion")
    private String documentTypeSuggestion; // "BUSINESS", "TECHNICAL", "RESEARCH"

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public Integer getSummaryRating() {
        return summaryRating;
    }

    public void setSummaryRating(Integer summaryRating) {
        this.summaryRating = summaryRating;
    }

    public Integer getKeywordsRating() {
        return keywordsRating;
    }

    public void setKeywordsRating(Integer keywordsRating) {
        this.keywordsRating = keywordsRating;
    }

    public Integer getComponentsRating() {
        return componentsRating;
    }

    public void setComponentsRating(Integer componentsRating) {
        this.componentsRating = componentsRating;
    }

    public Integer getOverallRating() {
        return overallRating;
    }

    public void setOverallRating(Integer overallRating) {
        this.overallRating = overallRating;
    }

    public String getUserComments() {
        return userComments;
    }

    public void setUserComments(String userComments) {
        this.userComments = userComments;
    }

    public String getSuggestedSummary() {
        return suggestedSummary;
    }

    public void setSuggestedSummary(String suggestedSummary) {
        this.suggestedSummary = suggestedSummary;
    }

    public String getSuggestedKeywords() {
        return suggestedKeywords;
    }

    public void setSuggestedKeywords(String suggestedKeywords) {
        this.suggestedKeywords = suggestedKeywords;
    }

    public String getSuggestedComponents() {
        return suggestedComponents;
    }

    public void setSuggestedComponents(String suggestedComponents) {
        this.suggestedComponents = suggestedComponents;
    }

    public Boolean getSummaryHelpful() {
        return summaryHelpful;
    }

    public void setSummaryHelpful(Boolean summaryHelpful) {
        this.summaryHelpful = summaryHelpful;
    }

    public Boolean getKeywordsHelpful() {
        return keywordsHelpful;
    }

    public void setKeywordsHelpful(Boolean keywordsHelpful) {
        this.keywordsHelpful = keywordsHelpful;
    }

    public Boolean getComponentsHelpful() {
        return componentsHelpful;
    }

    public void setComponentsHelpful(Boolean componentsHelpful) {
        this.componentsHelpful = componentsHelpful;
    }

    public String getUserIp() {
        return userIp;
    }

    public void setUserIp(String userIp) {
        this.userIp = userIp;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getImprovementCategory() {
        return improvementCategory;
    }

    public void setImprovementCategory(String improvementCategory) {
        this.improvementCategory = improvementCategory;
    }

    public String getDocumentTypeSuggestion() {
        return documentTypeSuggestion;
    }

    public void setDocumentTypeSuggestion(String documentTypeSuggestion) {
        this.documentTypeSuggestion = documentTypeSuggestion;
    }
}
