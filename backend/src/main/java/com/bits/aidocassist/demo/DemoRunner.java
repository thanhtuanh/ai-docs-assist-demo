package com.bits.aidocassist.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.bits.aidocassist.model.Document;
import com.bits.aidocassist.service.AiService;
import com.bits.aidocassist.service.DocumentService;

@Component
public class DemoRunner implements CommandLineRunner {

    @Autowired
    private AiService aiService;

    @Autowired
    private DocumentService documentService;
    
    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Override
    public void run(String... args) throws Exception {
        // Kurzer Demo-Text für Kompatibilität
        String exampleText = "Entwicklung einer modernen Webanwendung für Aufgabenverwaltung mit React und Spring Boot. Das System soll eine REST-API, PostgreSQL-Datenbank und Docker-Container verwenden.";

        try {
            // OpenAI Status prüfen
            if (openAiApiKey != null && !openAiApiKey.trim().isEmpty()) {
                System.out.println("🤖 OpenAI API Key konfiguriert - verwende GPT-4.0-turbo");
            } else {
                System.out.println("⚠️  Kein OpenAI API Key gefunden - verwende Fallback-Methoden");
            }

            // AI-Services testen
            String summary = aiService.summarizeText(exampleText);
            String keywords = aiService.extractKeywords(exampleText);
            String suggestedComponents = aiService.suggestComponents(exampleText);

            // Document erstellen
            Document document = new Document();
            document.setTitle("Demo-Projekt mit KI-Analyse");
            document.setContent(exampleText);
            document.setSummary(summary);
            document.setKeywords(keywords);
            document.setSuggestedComponents(suggestedComponents);

            documentService.saveDocument(document);

            // Ergebnisse ausgeben
            System.out.println("\n📊 === KI-ANALYSE ERGEBNISSE ===");
            System.out.println("📝 Zusammenfassung: " + summary);
            System.out.println("🔍 Schlüsselwörter: " + keywords);
            System.out.println("💻 Technologie-Empfehlungen: " + suggestedComponents);
            System.out.println("✅ Demo-Dokument erfolgreich erstellt!");

        } catch (Exception e) {
            System.err.println("❌ Fehler beim Ausführen der Demo: " + e.getMessage());
            
            // Fallback Demo-Dokument
            Document document = new Document();
            document.setTitle("Demo-Projekt (Fallback)");
            document.setContent(exampleText);
            document.setSummary("Demo-Zusammenfassung ohne KI");
            document.setKeywords("demo, webanwendung, react, spring");
            document.setSuggestedComponents("React, Spring Boot, PostgreSQL");

            documentService.saveDocument(document);
            System.out.println("📄 Fallback Demo-Dokument erstellt");
        }
    }
}