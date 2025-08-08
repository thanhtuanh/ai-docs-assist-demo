package com.bits.aidocassist.test;

import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.service.DocumentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
public class DocumentServiceTest {

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