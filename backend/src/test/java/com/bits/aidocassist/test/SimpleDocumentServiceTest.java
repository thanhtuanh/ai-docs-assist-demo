package com.bits.aidocassist.test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import org.junit.jupiter.api.Test;

import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.service.DocumentService;

@SpringBootTest
@TestPropertySource(properties = {
    "openai.api.key=",
    "logging.level.com.bits.aidocassist=ERROR"
})
public class SimpleDocumentServiceTest {

    @Autowired
    private DocumentService documentService;

    @Test
    public void testSaveDocument() {
        Document document = new Document();
        document.setTitle("Test Document");
        document.setContent("This is a test document.");
        document.setSummary("Test document summary.");
        document.setKeywords("test, document, summary");
        document.setSuggestedComponents("Spring Boot, PostgreSQL, Angular");

        Document savedDocument = documentService.saveDocument(document);
        assertNotNull(savedDocument.getId());
    }
}