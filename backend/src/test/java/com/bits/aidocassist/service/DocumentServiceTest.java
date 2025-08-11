package com.bits.aidocassist.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import org.junit.jupiter.api.Test;

import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.repository.DocumentRepository;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "openai.api.key=test-key",
    "logging.level.com.bits.aidocassist=ERROR"
})
class DocumentServiceTest {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private DocumentRepository documentRepository;

    @Test
    void saveDocument_ShouldWork() {
        // Given
        Document document = new Document();
        document.setTitle("Test Document");
        document.setContent("Test content");
        
        // When
        Document result = documentService.saveDocument(document);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
    }

    @Test
    void getDocumentById_ShouldWork() {
        // Given
        Document document = new Document();
        document.setTitle("Test Document");
        document.setContent("Test content");
        Document savedDoc = documentRepository.save(document);

        // When
        Document result = documentService.getDocumentById(savedDoc.getId());

        // Then
        assertNotNull(result);
    }
}