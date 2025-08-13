package com.bits.aidocassist.controller;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * TEMPORARY: Legacy endpoints for backward compatibility
 * Remove this once all frontend code is updated
 */
@RestController
@RequestMapping("/api/analyze")
@CrossOrigin(origins = "http://localhost:4200")
public class LegacyApiController {

    private static final Logger logger = LoggerFactory.getLogger(LegacyApiController.class);
    
    @Autowired
    private DocumentController documentController;

    /**
     * Legacy: /api/analyze/document
     */
    @PostMapping("/document")
    public ResponseEntity<DocumentController.AnalysisResponse> analyzeDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "analysisOptions", required = false) String analysisOptionsJson) {
        
        logger.warn("⚠️ DEPRECATED: Using legacy endpoint /api/analyze/document - update frontend to use /api/documents");
        return documentController.createDocument(file, analysisOptionsJson);
    }

    /**
     * Legacy: /api/analyze/text
     */
    @PostMapping("/text")
    public ResponseEntity<DocumentController.AnalysisResponse> analyzeText(
            @RequestBody @Valid DocumentController.TextAnalysisRequest request) {
        
        logger.warn("⚠️ DEPRECATED: Using legacy endpoint /api/analyze/text - update frontend to use /api/documents/analyze-text");
        return documentController.analyzeText(request);
    }

    /**
     * Legacy: /api/analyze/text (for simple string input)
     */
    @PostMapping(value = "/text", consumes = "text/plain")
    public ResponseEntity<DocumentController.AnalysisResponse> analyzeTextSimple(@RequestBody String text) {
        
        logger.warn("⚠️ DEPRECATED: Using legacy endpoint /api/analyze/text - update frontend");
        
        DocumentController.TextAnalysisRequest request = new DocumentController.TextAnalysisRequest();
        request.setText(text);
        request.setSaveDocument(true);
        
        return documentController.analyzeText(request);
    }
}