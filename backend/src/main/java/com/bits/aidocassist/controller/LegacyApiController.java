package com.bits.aidocassist.controller;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@ConditionalOnProperty(value = "feature.legacy-endpoints", havingValue = "true", matchIfMissing = false)
@RestController
@RequestMapping(path = "/api/analyze", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyApiController {

    private static final Logger logger = LoggerFactory.getLogger(LegacyApiController.class);
    private final DocumentController documentController;

    public LegacyApiController(DocumentController documentController) {
        this.documentController = documentController;
    }

    @PostMapping(path = "/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentController.AnalysisResponse> analyzeDocumentLegacy(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "analysisOptions", required = false) String analysisOptionsJson) {
        logger.info("🔄 Legacy /api/analyze/document -> delegate /api/documents");
        return documentController.createDocument(file, analysisOptionsJson);
    }

    @PostMapping(path = "/text", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<DocumentController.AnalysisResponse> analyzeTextLegacy(
            @RequestBody @Valid DocumentController.TextAnalysisRequest request) {
        logger.info("🔄 Legacy /api/analyze/text -> delegate /api/documents/analyze-text");
        return documentController.analyzeText(request);
    }

    @PostMapping(path = "/text", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<DocumentController.AnalysisResponse> analyzeTextSimpleLegacy(@RequestBody String text) {
        logger.info("🔄 Legacy /api/analyze/text (plain) -> delegate /api/documents/analyze-text");
        DocumentController.TextAnalysisRequest req = new DocumentController.TextAnalysisRequest();
        req.setText(text);
        req.setSaveDocument(true);
        return documentController.analyzeText(req);
    }
}
