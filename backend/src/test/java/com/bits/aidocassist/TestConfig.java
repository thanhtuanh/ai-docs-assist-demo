package com.bits.aidocassist;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import org.mockito.Mockito;

import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.DocumentService;

@TestConfiguration
@Profile("test")
public class TestConfig {

    @Bean
    @Primary
    public DocumentService mockDocumentService() {
        return Mockito.mock(DocumentService.class);
    }

    @Bean
    @Primary  
    public AiService mockAiService() {
        return Mockito.mock(AiService.class);
    }
}