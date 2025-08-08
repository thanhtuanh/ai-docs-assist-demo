package com.bits.aidocassist.service;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

@Service
public class TextPreprocessingService {
    
    // Stop Words für Deutsch und Englisch
    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
        // Deutsche Stop Words
        "der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "eines",
        "und", "oder", "aber", "als", "am", "an", "auf", "aus", "bei", "bis",
        "durch", "für", "gegen", "in", "mit", "nach", "ohne", "seit", "von", "zu",
        "zum", "zur", "über", "unter", "vor", "während", "wegen", "wie", "wo",
        "wenn", "weil", "dass", "ob", "obwohl", "sowie", "sowohl", "also", "doch",
        "jedoch", "sondern", "trotzdem", "dennoch", "denn", "daher", "deshalb",
        "ich", "du", "er", "sie", "es", "wir", "ihr", "sich", "mich", "dich",
        "ihm", "ihn", "ihnen", "mir", "dir", "uns", "euch", "mein", "dein", "sein",
        "ihr", "unser", "euer", "dieser", "diese", "dieses", "jener", "jene", "jenes",
        "hier", "dort", "heute", "gestern", "morgen", "jetzt", "dann", "nun",
        "noch", "schon", "bereits", "wieder", "immer", "nie", "oft", "manchmal",
        "sehr", "mehr", "weniger", "viel", "wenig", "alle", "einige", "manche",
        "kann", "muss", "soll", "will", "darf", "möchte", "wurde", "werden", "worden",
        "bin", "bist", "ist", "sind", "war", "waren", "habe", "hast", "hat", "haben",
        // Englische Stop Words
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
        "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "can", "shall", "need", "ought",
        "this", "that", "these", "those", "which", "who", "whom", "whose", "what",
        "where", "when", "why", "how", "all", "any", "both", "each", "every",
        "some", "many", "few", "more", "most", "other", "another", "such", "no",
        "not", "only", "own", "same", "so", "than", "too", "very", "just"
    ));
    
    // Regex Patterns
    private static final Pattern EMAIL_PATTERN = 
        Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    
    private static final Pattern URL_PATTERN = 
        Pattern.compile("https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=]+");
    
    private static final Pattern CODE_BLOCK_PATTERN = 
        Pattern.compile("```[\\s\\S]*?```");
    
    private static final Pattern IP_PATTERN = 
        Pattern.compile("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b");
    
    private static final Pattern VERSION_PATTERN = 
        Pattern.compile("\\b[vV]?\\d+\\.\\d+(?:\\.\\d+)?(?:-[a-zA-Z0-9]+)?\\b");
    
    private static final Pattern CAMEL_CASE_PATTERN = 
        Pattern.compile("([a-z])([A-Z])");

    /**
     * Hauptmethode für Text-Preprocessing
     */
    public String preprocessText(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        
        // Schritt 1: Basis-Normalisierung
        String processed = normalizeText(text);
        
        // Schritt 2: Code-Blöcke extrahieren und schützen
        Map<String, String> codeBlocks = extractAndProtectCodeBlocks(processed);
        processed = codeBlocks.get("text");
        
        // Schritt 3: Strukturerkennung und -erhaltung
        processed = preserveStructure(processed);
        
        // Schritt 4: Intelligente Bereinigung
        processed = intelligentCleaning(processed);
        
        // Schritt 5: Textanreicherung
        processed = enrichText(processed);
        
        // Schritt 6: Code-Blöcke wiederherstellen
        processed = restoreCodeBlocks(processed, codeBlocks);
        
        // Schritt 7: Finale Segmentierung
        processed = segmentText(processed);
        
        return processed;
    }

    /**
     * Text-Normalisierung
     */
    private String normalizeText(String text) {
        // Unicode-Normalisierung (NFC für konsistente Darstellung)
        text = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFC);
        
        // Zeilenumbrüche normalisieren
        text = text.replaceAll("\\r\\n|\\r", "\n");
        
        // Tabs durch Leerzeichen ersetzen
        text = text.replaceAll("\\t", "    ");
        
        // Mehrfache Leerzeichen reduzieren (aber Einrückungen erhalten)
        text = text.replaceAll("(?<!^) {2,}(?! )", " ");
        
        // Mehrfache Zeilenumbrüche auf maximal 2 reduzieren
        text = text.replaceAll("\n{3,}", "\n\n");
        
        // Steuerzeichen entfernen (außer Newline und Tab)
        text = text.replaceAll("[\\p{Cntrl}&&[^\n\t]]", "");
        
        // Konsistente Anführungszeichen
        text = text.replaceAll("[\"\\u201E\\u00AB\\u00BB]", "\""); // „ « »
        text = text.replaceAll("['\\u2018\\u201A\\u2039\\u203A]", "'"); // ‘ ‚ ‹ ›

        
        // Konsistente Gedankenstriche
        text = text.replaceAll("[–—]", "-");
        
        // Geschützte Leerzeichen normalisieren
        text = text.replaceAll("\\u00A0", " ");
        
        return text.trim();
    }

    /**
     * Code-Blöcke extrahieren und temporär ersetzen
     */
    private Map<String, String> extractAndProtectCodeBlocks(String text) {
        Map<String, String> result = new HashMap<>();
        Map<String, String> codeMap = new HashMap<>();
        int codeBlockCounter = 0;
        
        // Markdown Code-Blöcke (```)
        Matcher matcher = CODE_BLOCK_PATTERN.matcher(text);
        StringBuffer sb = new StringBuffer();
        
        while (matcher.find()) {
            String placeholder = "[[CODE_BLOCK_" + codeBlockCounter + "]]";
            codeMap.put(placeholder, matcher.group());
            matcher.appendReplacement(sb, placeholder);
            codeBlockCounter++;
        }
        matcher.appendTail(sb);
        text = sb.toString();
        
        // Inline-Code (`) schützen
        Pattern inlineCodePattern = Pattern.compile("`[^`]+`");
        matcher = inlineCodePattern.matcher(text);
        sb = new StringBuffer();
        
        while (matcher.find()) {
            String placeholder = "[[INLINE_CODE_" + codeBlockCounter + "]]";
            codeMap.put(placeholder, matcher.group());
            matcher.appendReplacement(sb, placeholder);
            codeBlockCounter++;
        }
        matcher.appendTail(sb);
        
        result.put("text", sb.toString());
        result.putAll(codeMap);
        return result;
    }

    /**
     * Strukturerhaltung und -verbesserung
     */
    private String preserveStructure(String text) {
        StringBuilder result = new StringBuilder();
        String[] lines = text.split("\n");
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();
            
            // Leere Zeilen erhalten
            if (trimmed.isEmpty()) {
                result.append("\n");
                continue;
            }
            
            // Markdown-Überschriften erkennen und normalisieren
            if (trimmed.startsWith("#")) {
                result.append(normalizeHeading(trimmed)).append("\n");
            }
            // Numerierte Überschriften erkennen (1. Einleitung, 2. Hauptteil, etc.)
            else if (trimmed.matches("^\\d+\\.?\\s+[A-ZÄÖÜ].*") && trimmed.length() < 100) {
                result.append("\n## ").append(trimmed).append("\n");
            }
            // Listen erkennen und formatieren
            else if (isList(trimmed)) {
                result.append(formatListItem(trimmed)).append("\n");
            }
            // Tabellen erkennen
            else if (isTableRow(trimmed)) {
                result.append(trimmed).append("\n");
            }
            // Eingerückte Code-Zeilen
            else if (line.startsWith("    ") || line.startsWith("\t")) {
                result.append("    ").append(line.trim()).append("\n");
            }
            // Normale Absätze
            else {
                result.append(trimmed).append("\n");
            }
        }
        
        return result.toString();
    }

    /**
     * Intelligente Textbereinigung
     */
    private String intelligentCleaning(String text) {
        // URLs durch aussagekräftige Platzhalter ersetzen
        Map<String, String> urlMap = new HashMap<>();
        Matcher urlMatcher = URL_PATTERN.matcher(text);
        StringBuffer sb = new StringBuffer();
        int urlCounter = 0;
        
        while (urlMatcher.find()) {
            String url = urlMatcher.group();
            String domain = extractDomain(url);
            String placeholder = "[LINK:" + domain + "]";
            urlMap.put(placeholder, url);
            urlMatcher.appendReplacement(sb, placeholder);
            urlCounter++;
        }
        urlMatcher.appendTail(sb);
        text = sb.toString();
        
        // E-Mails anonymisieren
        text = EMAIL_PATTERN.matcher(text).replaceAll("[EMAIL]");
        
        // IP-Adressen anonymisieren
        text = IP_PATTERN.matcher(text).replaceAll("[IP-ADDRESS]");
        
        // Mehrfache Satzzeichen reduzieren
        text = text.replaceAll("([.!?])\\1{2,}", "$1");
        text = text.replaceAll("(,)\\1+", "$1");
        
        // Überflüssige Leerzeichen vor Satzzeichen entfernen
        text = text.replaceAll("\\s+([.,!?;:])", "$1");
        
        // Leerzeichen nach Satzzeichen sicherstellen
        text = text.replaceAll("([.,!?;:])(?=[A-Za-zÄÖÜäöü])", "$1 ");
        
        return text;
    }

    /**
     * Text-Anreicherung mit Metadaten
     */
    private String enrichText(String text) {
        StringBuilder enriched = new StringBuilder();
        String[] sentences = text.split("(?<=[.!?])\\s+");
        
        for (String sentence : sentences) {
            String enrichedSentence = sentence;
            
            // Technische Begriffe annotieren
            enrichedSentence = annotateTechnicalTerms(enrichedSentence);
            
            // Akronyme erkennen und beim ersten Vorkommen erklären
            enrichedSentence = expandAcronyms(enrichedSentence);
            
            // Zahlen und Metriken hervorheben
            enrichedSentence = annotateMetrics(enrichedSentence);
            
            // Versionsnummern annotieren
            enrichedSentence = annotateVersions(enrichedSentence);
            
            // CamelCase in Wörtern erkennen (z.B. JavaScript, TypeScript)
            enrichedSentence = annotateCamelCase(enrichedSentence);
            
            enriched.append(enrichedSentence).append(" ");
        }
        
        return enriched.toString();
    }

    /**
     * Code-Blöcke wiederherstellen
     */
    private String restoreCodeBlocks(String text, Map<String, String> codeBlocks) {
        for (Map.Entry<String, String> entry : codeBlocks.entrySet()) {
            if (entry.getKey().startsWith("[[CODE_BLOCK_") || 
                entry.getKey().startsWith("[[INLINE_CODE_")) {
                text = text.replace(entry.getKey(), entry.getValue());
            }
        }
        return text;
    }

    /**
     * Text in logische Segmente unterteilen
     */
    private String segmentText(String text) {
        List<String> segments = new ArrayList<>();
        String[] paragraphs = text.split("\n\n+");
        
        StringBuilder currentSegment = new StringBuilder();
        int segmentWordCount = 0;
        String lastTopic = "";
        
        for (String paragraph : paragraphs) {
            String[] words = paragraph.split("\\s+");
            int wordCount = words.length;
            
            // Hauptthema des Absatzes ermitteln
            String currentTopic = extractMainTopic(paragraph);
            
            // Neues Segment bei Themenwechsel oder nach ~250 Wörtern
            boolean topicChange = !currentTopic.equals(lastTopic) && !lastTopic.isEmpty();
            boolean lengthExceeded = segmentWordCount > 250;
            
            if ((topicChange || lengthExceeded) && currentSegment.length() > 0) {
                segments.add(currentSegment.toString().trim());
                currentSegment = new StringBuilder();
                segmentWordCount = 0;
            }
            
            currentSegment.append(paragraph).append("\n\n");
            segmentWordCount += wordCount;
            lastTopic = currentTopic;
        }
        
        // Letztes Segment hinzufügen
        if (currentSegment.length() > 0) {
            segments.add(currentSegment.toString().trim());
        }
        
        // Segmente zusammenfügen mit Markierungen
        if (segments.size() > 1) {
            StringBuilder result = new StringBuilder();
            for (int i = 0; i < segments.size(); i++) {
                if (i > 0) {
                    result.append("\n--- Abschnitt ").append(i + 1).append(" ---\n\n");
                }
                result.append(segments.get(i));
            }
            return result.toString();
        }
        
        return text;
    }

    /**
     * Hilfsmethoden
     */
    
    private String normalizeHeading(String heading) {
        // Sicherstellen, dass nach # ein Leerzeichen kommt
        if (!heading.matches("^#+\\s.*")) {
            return heading.replaceFirst("^(#+)", "$1 ");
        }
        return heading;
    }

    private boolean isList(String line) {
        return line.matches("^[•·◦▪▫★☆◆◇○●■□▶▷→⇒*\\-+]\\s+.*") || 
               line.matches("^\\d+[.)\\]]\\s+.*") ||
               line.matches("^[a-zA-Z][.)\\]]\\s+.*");
    }

    private String formatListItem(String item) {
        // Vereinheitlichung von Listen-Markern
        item = item.replaceAll("^[•·◦▪▫★☆◆◇○●■□▶▷→⇒*+]\\s+", "- ");
        item = item.replaceAll("^(\\d+)[.)\\]]\\s+", "$1. ");
        item = item.replaceAll("^([a-zA-Z])[.)\\]]\\s+", "$1) ");
        return item;
    }

    private boolean isTableRow(String line) {
        // Einfache Tabellenerkennung (mindestens 2 | Zeichen)
        return line.contains("|") && line.chars().filter(ch -> ch == '|').count() >= 2;
    }

    private String extractDomain(String url) {
        Pattern domainPattern = Pattern.compile("https?://([^/]+)");
        Matcher matcher = domainPattern.matcher(url);
        if (matcher.find()) {
            String domain = matcher.group(1);
            // www. entfernen und nur Hauptdomain zurückgeben
            return domain.replaceFirst("^www\\.", "").split("\\.")[0];
        }
        return "website";
    }

    private String annotateTechnicalTerms(String text) {
        Map<String, String> techTerms = new HashMap<>();
        techTerms.put("\\bAPI\\b", "[TECH:API]");
        techTerms.put("\\bREST\\b", "[TECH:REST]");
        techTerms.put("\\bRESTful\\b", "[TECH:RESTful]");
        techTerms.put("\\bJSON\\b", "[TECH:JSON]");
        techTerms.put("\\bXML\\b", "[TECH:XML]");
        techTerms.put("\\bSQL\\b", "[TECH:SQL]");
        techTerms.put("\\bNoSQL\\b", "[TECH:NoSQL]");
        techTerms.put("\\bHTTP\\b", "[TECH:HTTP]");
        techTerms.put("\\bHTTPS\\b", "[TECH:HTTPS]");
        techTerms.put("\\bCSS\\b", "[TECH:CSS]");
        techTerms.put("\\bHTML\\b", "[TECH:HTML]");
        techTerms.put("\\bJavaScript\\b", "[TECH:JavaScript]");
        techTerms.put("\\bTypeScript\\b", "[TECH:TypeScript]");
        techTerms.put("\\bPython\\b", "[TECH:Python]");
        techTerms.put("\\bJava\\b(?!Script)", "[TECH:Java]");
        techTerms.put("\\bSpring\\b", "[TECH:Spring]");
        techTerms.put("\\bAngular\\b", "[TECH:Angular]");
        techTerms.put("\\bReact\\b", "[TECH:React]");
        techTerms.put("\\bVue\\b", "[TECH:Vue]");
        techTerms.put("\\bDocker\\b", "[TECH:Docker]");
        techTerms.put("\\bKubernetes\\b", "[TECH:Kubernetes]");
        techTerms.put("\\bAWS\\b", "[TECH:AWS]");
        techTerms.put("\\bAzure\\b", "[TECH:Azure]");
        techTerms.put("\\bGCP\\b", "[TECH:GCP]");
        techTerms.put("\\bCI/CD\\b", "[TECH:CI/CD]");
        techTerms.put("\\bDevOps\\b", "[TECH:DevOps]");
        techTerms.put("\\bAgile\\b", "[TECH:Agile]");
        techTerms.put("\\bScrum\\b", "[TECH:Scrum]");
        techTerms.put("\\bGit\\b", "[TECH:Git]");
        techTerms.put("\\bGitHub\\b", "[TECH:GitHub]");
        techTerms.put("\\bMicroservices?\\b", "[TECH:Microservices]");
        
        for (Map.Entry<String, String> entry : techTerms.entrySet()) {
            text = text.replaceAll(entry.getKey(), entry.getValue());
        }
        
        return text;
    }

    private String expandAcronyms(String text) {
        Map<String, String> acronyms = new LinkedHashMap<>();
        acronyms.put("AI", "AI (Artificial Intelligence)");
        acronyms.put("ML", "ML (Machine Learning)");
        acronyms.put("DL", "DL (Deep Learning)");
        acronyms.put("NLP", "NLP (Natural Language Processing)");
        acronyms.put("IoT", "IoT (Internet of Things)");
        acronyms.put("SaaS", "SaaS (Software as a Service)");
        acronyms.put("PaaS", "PaaS (Platform as a Service)");
        acronyms.put("IaaS", "IaaS (Infrastructure as a Service)");
        acronyms.put("MVP", "MVP (Minimum Viable Product)");
        acronyms.put("POC", "POC (Proof of Concept)");
        acronyms.put("ROI", "ROI (Return on Investment)");
        acronyms.put("KPI", "KPI (Key Performance Indicator)");
        acronyms.put("SLA", "SLA (Service Level Agreement)");
        acronyms.put("OAuth", "OAuth (Open Authorization)");
        acronyms.put("JWT", "JWT (JSON Web Token)");
        acronyms.put("CRUD", "CRUD (Create, Read, Update, Delete)");
        acronyms.put("ORM", "ORM (Object-Relational Mapping)");
        acronyms.put("MVC", "MVC (Model-View-Controller)");
        acronyms.put("UI", "UI (User Interface)");
        acronyms.put("UX", "UX (User Experience)");
        
        Set<String> expandedAcronyms = new HashSet<>();
        
        for (Map.Entry<String, String> entry : acronyms.entrySet()) {
            String acronym = entry.getKey();
            String expansion = entry.getValue();
            
            // Nur beim ersten Vorkommen erweitern
            if (!expandedAcronyms.contains(acronym)) {
                Pattern pattern = Pattern.compile("\\b" + acronym + "\\b");
                Matcher matcher = pattern.matcher(text);
                
                if (matcher.find()) {
                    text = matcher.replaceFirst(expansion);
                    expandedAcronyms.add(acronym);
                }
            }
        }
        
        return text;
    }

    private String annotateMetrics(String text) {
        // Prozentangaben
        text = text.replaceAll("(\\d+(?:[.,]\\d+)?\\s*%)", "[PERCENT:$1]");
        
        // Währungen (verschiedene Formate)
        text = text.replaceAll("([€$£¥]\\s*\\d+(?:[.,]\\d{3})*(?:[.,]\\d+)?)", "[CURRENCY:$1]");
        text = text.replaceAll("(\\d+(?:[.,]\\d{3})*(?:[.,]\\d+)?\\s*(?:EUR|USD|GBP|CHF|JPY))", "[CURRENCY:$1]");
        text = text.replaceAll("(\\d+(?:[.,]\\d{3})*(?:[.,]\\d+)?\\s*(?:Euro|Dollar|Pound|Franken|Yen))", "[CURRENCY:$1]");
        
        // Zeitangaben
        text = text.replaceAll("(\\d+\\s*(?:Jahr[e]?|Monat[e]?|Woche[n]?|Tag[e]?|Stunde[n]?|Minute[n]?|Sekunde[n]?))", "[TIME:$1]");
        text = text.replaceAll("(\\d+\\s*(?:years?|months?|weeks?|days?|hours?|minutes?|seconds?))", "[TIME:$1]");
        
        // Datums-Formate
        text = text.replaceAll("(\\d{1,2}[./]\\d{1,2}[./]\\d{2,4})", "[DATE:$1]");
        text = text.replaceAll("(\\d{4}-\\d{2}-\\d{2})", "[DATE:$1]");
        
        // Große Zahlen
        text = text.replaceAll("\\b(\\d{1,3}(?:[.,]\\d{3})+)\\b", "[NUMBER:$1]");
        
        // Speichergrößen
        text = text.replaceAll("(\\d+(?:[.,]\\d+)?\\s*(?:[KMGT]B|[kmgt]b))", "[STORAGE:$1]");
        
        return text;
    }

    private String annotateVersions(String text) {
        Matcher matcher = VERSION_PATTERN.matcher(text);
        StringBuffer sb = new StringBuffer();
        
        while (matcher.find()) {
            matcher.appendReplacement(sb, "[VERSION:" + matcher.group() + "]");
        }
        matcher.appendTail(sb);
        
        return sb.toString();
    }

    private String annotateCamelCase(String text) {
        String[] words = text.split("\\s+");
        StringBuilder result = new StringBuilder();
        
        for (String word : words) {
            if (word.matches(".*[a-z][A-Z].*") && !word.contains("[")) {
                result.append("[TERM:").append(word).append("] ");
            } else {
                result.append(word).append(" ");
            }
        }
        
        return result.toString().trim();
    }

    private String extractMainTopic(String paragraph) {
        // Einfache Themenerkennung basierend auf häufigsten bedeutungsvollen Wörtern
        String[] words = paragraph.toLowerCase().split("\\s+");
        Map<String, Integer> wordFreq = new HashMap<>();
        
        for (String word : words) {
            // Nur Wörter über 4 Zeichen und keine Stop Words
            if (word.length() > 4 && !STOP_WORDS.contains(word)) {
                word = word.replaceAll("[^a-zäöüß]", "");
                if (!word.isEmpty()) {
                    wordFreq.put(word, wordFreq.getOrDefault(word, 0) + 1);
                }
            }
        }
        
        // Häufigstes Wort als Hauptthema
        return wordFreq.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("");
    }

    /**
     * Erweiterte Textstatistiken für Qualitätsanalyse
     */
    public Map<String, Object> analyzeTextQuality(String text) {
        Map<String, Object> analysis = new HashMap<>();
        
        // Basis-Metriken
        String[] words = text.split("\\s+");
        String[] sentences = text.split("[.!?]+");
        String[] paragraphs = text.split("\n\n+");
        
        analysis.put("wordCount", words.length);
        analysis.put("sentenceCount", sentences.length);
        analysis.put("paragraphCount", paragraphs.length);
        analysis.put("averageWordsPerSentence", words.length / Math.max(1, sentences.length));
        analysis.put("averageSentencesPerParagraph", sentences.length / Math.max(1, paragraphs.length));
        
        // Vokabular-Analyse
        Set<String> uniqueWords = Arrays.stream(words)
            .map(w -> w.toLowerCase().replaceAll("[^a-zäöüß]", ""))
            .filter(w -> !w.isEmpty())
            .collect(Collectors.toSet());
        
        analysis.put("uniqueWords", uniqueWords.size());
        analysis.put("lexicalDiversity", (double) uniqueWords.size() / words.length);
        
        // Technische Tiefe
        long technicalTerms = Arrays.stream(words)
            .filter(w -> w.contains("[TECH:"))
            .count();
        analysis.put("technicalDensity", (double) technicalTerms / words.length);
        
        // Strukturqualität
        Map<String, Boolean> structure = new HashMap<>();
        structure.put("hasHeadings", text.contains("#") || text.contains("## "));
        structure.put("hasLists", text.contains("- ") || text.matches(".*\\d+\\.\\s.*"));
        structure.put("hasCodeBlocks", text.contains("```") || text.contains("[[CODE_BLOCK"));
        structure.put("hasTables", text.contains("|") && text.chars().filter(ch -> ch == '|').count() > 4);
        structure.put("hasLinks", text.contains("[LINK:"));
        structure.put("hasMetrics", text.contains("[PERCENT:") || text.contains("[NUMBER:"));
        analysis.put("structuralElements", structure);
        
        // Lesbarkeits-Score (Flesch-Kincaid-ähnlich)
        double avgWordsPerSentence = (double) words.length / Math.max(1, sentences.length);
        double avgSyllablesPerWord = calculateAverageSyllables(words);
        double readabilityScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
        analysis.put("readabilityScore", Math.max(0, Math.min(100, readabilityScore)));
        
        // Lesbarkeits-Interpretation
        String readabilityLevel;
        if (readabilityScore >= 90) readabilityLevel = "Sehr einfach";
        else if (readabilityScore >= 80) readabilityLevel = "Einfach";
        else if (readabilityScore >= 70) readabilityLevel = "Ziemlich einfach";
        else if (readabilityScore >= 60) readabilityLevel = "Standard";
        else if (readabilityScore >= 50) readabilityLevel = "Ziemlich schwierig";
        else if (readabilityScore >= 30) readabilityLevel = "Schwierig";
        else readabilityLevel = "Sehr schwierig";
        analysis.put("readabilityLevel", readabilityLevel);
        
        // Sentenz-Komplexität
        Map<String, Integer> sentenceComplexity = new HashMap<>();
        int shortSentences = 0;
        int mediumSentences = 0;
        int longSentences = 0;
        
        for (String sentence : sentences) {
            int wordCount = sentence.split("\\s+").length;
            if (wordCount < 10) shortSentences++;
            else if (wordCount < 20) mediumSentences++;
            else longSentences++;
        }
        
        sentenceComplexity.put("short", shortSentences);
        sentenceComplexity.put("medium", mediumSentences);
        sentenceComplexity.put("long", longSentences);
        analysis.put("sentenceComplexity", sentenceComplexity);
        
        // Qualitäts-Score (0-100)
        double qualityScore = calculateQualityScore(analysis);
        analysis.put("overallQualityScore", qualityScore);
        
        return analysis;
    }

    /**
     * Silben-Berechnung für deutsche und englische Wörter
     */
    private double calculateAverageSyllables(String[] words) {
        int totalSyllables = 0;
        int validWords = 0;
        
        for (String word : words) {
            word = word.toLowerCase().replaceAll("[^a-zäöüß]", "");
            if (word.length() > 0) {
                totalSyllables += countSyllables(word);
                validWords++;
            }
        }
        
        return validWords > 0 ? (double) totalSyllables / validWords : 1.0;
    }

    /**
     * Silbenzählung (vereinfacht)
     */
    private int countSyllables(String word) {
        word = word.toLowerCase();
        int count = 0;
        boolean previousWasVowel = false;
        String vowels = "aeiouäöü";
        
        for (int i = 0; i < word.length(); i++) {
            boolean isVowel = vowels.indexOf(word.charAt(i)) != -1;
            if (isVowel && !previousWasVowel) {
                count++;
            }
            previousWasVowel = isVowel;
        }
        
        // Sonderfälle
        if (word.endsWith("e") && count > 1) {
            count--; // Stummes 'e' am Ende
        }
        if (word.endsWith("le") && count > 1) {
            count++; // -le bildet eigene Silbe
        }
        
        return Math.max(1, count);
    }

    /**
     * Gesamtqualitäts-Score berechnen
     */
    private double calculateQualityScore(Map<String, Object> analysis) {
        double score = 0.0;
        
        // Lesbarkeit (30%)
        Double readability = (Double) analysis.get("readabilityScore");
        if (readability != null) {
            score += (readability / 100.0) * 30;
        }
        
        // Struktur (25%)
        Map<String, Boolean> structure = (Map<String, Boolean>) analysis.get("structuralElements");
        if (structure != null) {
            long structureCount = structure.values().stream().filter(v -> v).count();
            score += (structureCount / 6.0) * 25;
        }
        
        // Vokabular-Vielfalt (20%)
        Double lexicalDiversity = (Double) analysis.get("lexicalDiversity");
        if (lexicalDiversity != null) {
            score += Math.min(lexicalDiversity * 2, 1.0) * 20;
        }
        
        // Technische Tiefe (15%)
        Double technicalDensity = (Double) analysis.get("technicalDensity");
        if (technicalDensity != null) {
            score += Math.min(technicalDensity * 10, 1.0) * 15;
        }
        
        // Ausgewogenheit der Satzlängen (10%)
        Map<String, Integer> sentenceComplexity = (Map<String, Integer>) analysis.get("sentenceComplexity");
        if (sentenceComplexity != null) {
            int total = sentenceComplexity.values().stream().mapToInt(Integer::intValue).sum();
            if (total > 0) {
                double balance = 1.0 - Math.abs(0.5 - (double) sentenceComplexity.get("medium") / total);
                score += balance * 10;
            }
        }
        
        return Math.min(100, Math.max(0, score));
    }

    /**
     * Keyword-Extraktion mit TF-IDF-ähnlichem Ansatz
     */
    public List<String> extractKeywords(String text, int maxKeywords) {
        // Text bereinigen
        String cleanedText = text.toLowerCase()
            .replaceAll("\\[\\w+:([^\\]]+)\\]", "$1") // Annotations entfernen
            .replaceAll("[^a-zäöüß\\s]", " ");
        
        // Wörter zählen
        Map<String, Integer> wordFrequency = new HashMap<>();
        String[] words = cleanedText.split("\\s+");
        
        for (String word : words) {
            if (word.length() > 3 && !STOP_WORDS.contains(word)) {
                wordFrequency.put(word, wordFrequency.getOrDefault(word, 0) + 1);
            }
        }
        
        // Nach Häufigkeit sortieren und Top-Keywords zurückgeben
        return wordFrequency.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(maxKeywords)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    /**
     * Sentiment-Indikatoren erkennen
     */
    public Map<String, Integer> detectSentimentIndicators(String text) {
        Map<String, Integer> indicators = new HashMap<>();
        
        // Positive Indikatoren
        String[] positiveWords = {
            "gut", "besser", "beste", "excellent", "optimal", "erfolgreich",
            "effizient", "innovativ", "fortschrittlich", "robust", "stabil",
            "zuverlässig", "schnell", "einfach", "klar", "modern"
        };
        
        // Negative Indikatoren
        String[] negativeWords = {
            "schlecht", "schlechter", "schlechteste", "problem", "fehler",
            "mangel", "schwach", "langsam", "komplex", "kompliziert",
            "veraltet", "unsicher", "instabil", "ineffizient", "schwierig"
        };
        
        // Neutrale/Technische Indikatoren
        String[] neutralWords = {
            "implementierung", "system", "prozess", "methode", "funktion",
            "daten", "analyse", "struktur", "architektur", "design"
        };
        
        String lowerText = text.toLowerCase();
        
        int positiveCount = 0;
        int negativeCount = 0;
        int neutralCount = 0;
        
        for (String word : positiveWords) {
            positiveCount += countOccurrences(lowerText, word);
        }
        
        for (String word : negativeWords) {
            negativeCount += countOccurrences(lowerText, word);
        }
        
        for (String word : neutralWords) {
            neutralCount += countOccurrences(lowerText, word);
        }
        
        indicators.put("positive", positiveCount);
        indicators.put("negative", negativeCount);
        indicators.put("neutral", neutralCount);
        
        return indicators;
    }

    /**
     * Wort-Vorkommen zählen
     */
    private int countOccurrences(String text, String word) {
        Pattern pattern = Pattern.compile("\\b" + Pattern.quote(word) + "\\b");
        Matcher matcher = pattern.matcher(text);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    /**
     * Text-Sprache erkennen (vereinfacht)
     */
    public String detectLanguage(String text) {
        // Häufige deutsche Wörter
        String[] germanWords = {"der", "die", "das", "und", "ist", "von", "mit", "für", "auf", "ein", "eine"};
        // Häufige englische Wörter
        String[] englishWords = {"the", "and", "is", "of", "with", "for", "on", "a", "an", "to", "in"};
        
        String lowerText = text.toLowerCase();
        int germanScore = 0;
        int englishScore = 0;
        
        for (String word : germanWords) {
            if (lowerText.contains(" " + word + " ")) germanScore++;
        }
        
        for (String word : englishWords) {
            if (lowerText.contains(" " + word + " ")) englishScore++;
        }
        
        if (germanScore > englishScore) {
            return "DE";
        } else if (englishScore > germanScore) {
            return "EN";
        } else {
            return "UNKNOWN";
        }
    }

    /**
     * Zusammenfassung der Preprocessing-Ergebnisse
     */
    public PreprocessingResult getPreprocessingResult(String originalText, String processedText) {
        PreprocessingResult result = new PreprocessingResult();
        
        // Basis-Informationen
        result.originalLength = originalText.length();
        result.processedLength = processedText.length();
        result.compressionRatio = (double) processedText.length() / originalText.length();
        
        // Erkannte Elemente
        result.detectedLanguage = detectLanguage(processedText);
        result.extractedKeywords = extractKeywords(processedText, 10);
        result.sentimentIndicators = detectSentimentIndicators(processedText);
        result.qualityMetrics = analyzeTextQuality(processedText);
        
        // Strukturelemente zählen
        result.codeBlockCount = countPattern(processedText, "\\[\\[CODE_BLOCK_\\d+\\]\\]");
        result.linkCount = countPattern(processedText, "\\[LINK:[^\\]]+\\]");
        result.technicalTermCount = countPattern(processedText, "\\[TECH:[^\\]]+\\]");
        
        return result;
    }

    /**
     * Pattern-Vorkommen zählen
     */
    private int countPattern(String text, String regex) {
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    /**
     * Ergebnis-Klasse für Preprocessing
     */
    public static class PreprocessingResult {
        public int originalLength;
        public int processedLength;
        public double compressionRatio;
        public String detectedLanguage;
        public List<String> extractedKeywords;
        public Map<String, Integer> sentimentIndicators;
        public Map<String, Object> qualityMetrics;
        public int codeBlockCount;
        public int linkCount;
        public int technicalTermCount;
        
        @Override
        public String toString() {
            return String.format(
                "PreprocessingResult{originalLength=%d, processedLength=%d, compressionRatio=%.2f, " +
                "language=%s, keywords=%d, codeBlocks=%d, links=%d, techTerms=%d}",
                originalLength, processedLength, compressionRatio,
                detectedLanguage, extractedKeywords != null ? extractedKeywords.size() : 0,
                codeBlockCount, linkCount, technicalTermCount
            );
        }
    }
}