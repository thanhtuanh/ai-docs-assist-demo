package com.bits.aidocassist.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import org.junit.jupiter.api.Test;

import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.DocumentService;
import com.bits.aidocassist.service.FeedbackService;
import com.bits.aidocassist.service.TextPreprocessingService;

@WebMvcTest(DocumentController.class)
class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentService documentService;

    @MockBean
    private AiService aiService;

    @MockBean
    private TextPreprocessingService preprocessingService;

    @MockBean
    private FeedbackService feedbackService;

    @Test
    void contextLoads() {
        // Test dass der Spring Context lädt
    }

    @Test
    void getDocument_ShouldReturn404_WhenNotFound() throws Exception {
        // Einfacher Test ohne komplexe Mocks
        mockMvc.perform(get("/api/documents/999"))
                .andExpect(status().is4xxClientError());
    }
}