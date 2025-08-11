package com.bits.aidocassist.integration;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
class DocumentIntegrationTest {

    @Autowired
    private DocumentRepository documentRepository;

    @Test
    void contextLoads() {
        // Test dass die Spring Boot App startet
        assertNotNull(documentRepository);
    }

    @Test
    void saveDocument_ShouldWork() {
        // Given
        Document document = new Document();
        document.setFilename("integration-test.txt");
        document.setContent("Integration test content");
        document.setTitle("Integration Test Document");
        
        // When
        Document savedDocument = documentRepository.save(document);

        // Then
        assertNotNull(savedDocument.getId());
        assertTrue(savedDocument.getId() > 0);
    }
}