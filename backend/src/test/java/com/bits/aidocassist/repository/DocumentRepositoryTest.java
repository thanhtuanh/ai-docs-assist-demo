package com.bits.aidocassist.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import org.junit.jupiter.api.Test;

import com.bits.aidocassist.model.Document;

@DataJpaTest
class DocumentRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private DocumentRepository documentRepository;

    @Test
    void findByFilename_ShouldReturnDocument_WhenExists() {
        // Given
        Document document = new Document();
        document.setFilename("test.pdf");
        document.setContent("Test content");
        document.setUploadDate(new Date()); // Date statt LocalDateTime
        entityManager.persistAndFlush(document);

        // When
        Optional<Document> found = documentRepository.findById(document.getId());

        // Then
        assertTrue(found.isPresent());
        assertEquals("test.pdf", found.get().getFilename());
    }

    @Test
    void findByFilename_ShouldReturnEmpty_WhenNotExists() {
        // When
        Optional<Document> found = documentRepository.findById(999L);

        // Then
        assertFalse(found.isPresent());
    }

    @Test
    void findAll_ShouldReturnDocuments() {
        // Given
        Document document1 = new Document();
        document1.setFilename("doc1.pdf");
        document1.setUploadDate(new Date());
        
        Document document2 = new Document();
        document2.setFilename("doc2.pdf");
        document2.setUploadDate(new Date());
        
        entityManager.persistAndFlush(document1);
        entityManager.persistAndFlush(document2);

        // When
        List<Document> documents = documentRepository.findAll();

        // Then
        assertEquals(2, documents.size());
    }
}