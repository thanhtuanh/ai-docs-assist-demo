# 🤖 AI Doc Assist - Intelligente Dokumentenanalyse mit KI

> **Ein modernes Java Spring Boot Projekt für automatisierte Dokumentenanalyse und Branchenerkennung**

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.8-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple.svg)](https://openai.com/)

## 📋 Projektübersicht

**AI Doc Assist** ist eine intelligente Webanwendung für die automatisierte Analyse von Dokumenten mit fortschrittlicher **KI-gestützter Branchenerkennung**. Das System verarbeitet PDF- und Word-Dokumente, extrahiert relevante Informationen und klassifiziert sie automatisch nach Industriezweigen.

### 🎯 Hauptfunktionen

- **📄 Dokumentenverarbeitung**: PDF & Word (.docx) Upload und Textextraktion
- **🤖 KI-gestützte Analyse**: Automatische Zusammenfassung und Keyword-Extraktion
- **🏭 Branchenerkennung**: Intelligente Klassifizierung in 10+ Industriezweige
- **⚡ Performance-Caching**: Redis-basierte Zwischenspeicherung für schnelle Antworten
- **📊 Monitoring**: Prometheus Metrics und Health Checks
- **🔒 Sicherheit**: Spring Security Integration
- **📱 Responsive UI**: Moderne Thymeleaf-basierte Benutzeroberfläche

---

## 🏗️ Technologie-Stack

### **Backend**
- **Java 21** - Moderne LTS-Version mit Performance-Optimierungen
- **Spring Boot 3.2.8** - Enterprise-Framework für Microservices
- **Spring Data JPA** - Datenbankzugriff und ORM
- **Spring Security** - Authentifizierung und Autorisierung
- **Spring Cache** - Abstraction Layer für Caching

### **AI & Machine Learning**
- **OpenAI API Integration** - GPT-basierte Textanalyse
- **Hybrid-Erkennungsalgorithmus** - Kombination aus Keywords und KI
- **Natural Language Processing** - Intelligente Textverarbeitung

### **Datenbanken & Caching**
- **H2 Database** - In-Memory Database für Development
- **Redis 7.0** - High-Performance Caching Layer
- **JPA/Hibernate** - Object-Relational Mapping

### **Frontend & UI**
- **Thymeleaf** - Server-side Template Engine
- **HTML5/CSS3** - Moderne Web-Standards
- **JavaScript ES6+** - Interactive Frontend-Features
- **Bootstrap/Responsive Design** - Mobile-first Ansatz

### **DevOps & Monitoring**
- **Docker & Docker Compose** - Containerisierung
- **Prometheus & Micrometer** - Metrics und Monitoring
- **Maven** - Build-Management und Dependency-Verwaltung
- **JUnit 5 & Testcontainers** - Comprehensive Testing

---

## 🚀 Features im Detail

### 1. **Intelligente Dokumentenanalyse**
```java
// Automatische Textextraktion aus verschiedenen Formaten
@Service
public class DocumentProcessingService {
    public DocumentAnalysis analyzeDocument(MultipartFile file) {
        String extractedText = extractText(file);
        return aiService.performAnalysis(extractedText);
    }
}
```

### 2. **KI-gestützte Branchenerkennung**
- **10 Industriezweige**: Automotive, Pharma, E-Commerce, Finanzwesen, IT/Software, etc.
- **Hybrid-Algorithmus**: 60% Keywords + 40% AI für optimale Genauigkeit
- **Confidence-Scoring**: Vertrauenswerte für jede Klassifizierung
- **Fallback-Mechanismus**: Funktioniert auch ohne OpenAI API

### 3. **Performance & Skalierbarkeit**
```yaml
# Redis Caching Configuration
spring:
  redis:
    host: localhost
    port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 600000
```

### 4. **Monitoring & Observability**
- **Health Checks**: `/actuator/health` für System-Status
- **Prometheus Metrics**: Performance und Usage-Metriken
- **Custom Dashboards**: Grafana-Integration möglich

---

## 📦 Installation & Setup

### Voraussetzungen
- **Java 21** oder höher
- **Maven 3.8+**
- **Docker** (optional für Redis)
- **Git**

### 1. Repository klonen & Setup
```bash
git clone <repository-url>
cd ai-doc-assist

# Quick Setup ausführen
chmod +x quick-setup.sh
./quick-setup.sh
```

### 2. Konfiguration
```bash
# .env Datei erstellen
cp .env.template .env

# Optional: OpenAI API Key hinzufügen
echo "OPENAI_API_KEY=your_api_key_here" >> .env
```

### 3. Dependencies installieren
```bash
mvn clean install
```

### 4. Redis starten (Docker)
```bash
docker-compose -f docker-compose-redis.yml up -d
```

### 5. Anwendung starten
```bash
# Development Mode
./start-with-industry-detection.sh

# Oder manuell
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

---

## 🧪 API-Endpunkte

### **Branchenerkennung**
```http
POST /api/ai/detect-industry
Content-Type: application/json

{
  "text": "BMW entwickelt innovative Fahrzeuge für die Zukunft der Mobilität..."
}
```

**Response:**
```json
{
  "primaryIndustry": "Automotive",
  "confidence": 87.5,
  "topIndustries": [
    {"industry": "Automotive", "confidence": 87.5},
    {"industry": "IT/Software", "confidence": 23.1}
  ],
  "detectionMethod": "Keywords + AI",
  "timestamp": 1692345678901
}
```

### **Vollständige Dokumentenanalyse**
```http
POST /api/ai/analyze
Content-Type: application/json

{
  "text": "Dokumenttext hier..."
}
```

### **Health & Monitoring**
```http
GET /actuator/health          # System Health
GET /actuator/metrics         # Performance Metrics
GET /actuator/prometheus      # Prometheus Format
GET /api/ai/info             # Service Information
```

---

## 🧪 Testing

### Unit Tests
```bash
mvn test
```

### Integration Tests
```bash
mvn verify -P integration-test
```

### API Tests
```bash
# Automatisierte API Tests
./test-industry-detection.sh
```

### Coverage Report
```bash
mvn jacoco:report
# Report verfügbar unter: target/site/jacoco/index.html
```

---

## 🐳 Docker Deployment

### Development Setup
```bash
# Nur Redis für lokale Entwicklung
docker-compose -f docker-compose-redis.yml up -d
```

### Production Setup
```bash
# Vollständige Produktionsumgebung
docker-compose up -d

# Services verfügbar:
# - Application: http://localhost:8080
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3000
```

---

## 📊 Architektur & Design

### **Layered Architecture**
```
┌─────────────────────────────────────┐
│           Presentation Layer        │
│     (Controllers, Thymeleaf)       │
├─────────────────────────────────────┤
│            Service Layer            │
│  (Business Logic, AI Integration)   │
├─────────────────────────────────────┤
│         Persistence Layer           │
│      (JPA, Redis, Database)        │
├─────────────────────────────────────┤
│         Infrastructure Layer        │
│    (Configuration, Security)       │
└─────────────────────────────────────┘
```

### **Design Patterns**
- **Service Layer Pattern** - Trennung von Business Logic
- **Repository Pattern** - Datenzugriff-Abstraktion
- **Strategy Pattern** - Verschiedene AI-Erkennungsstrategien
- **Cache-Aside Pattern** - Performance-Optimierung
- **Circuit Breaker** - Resilience für externe APIs

---

## 🔧 Konfiguration

### **Umgebungsvariablen**
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Redis Configuration  
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Settings
SPRING_PROFILES_ACTIVE=development
LOG_LEVEL=INFO
INDUSTRY_DETECTION_ENABLED=true
```

### **Profile**
- **development** - Lokale Entwicklung mit Debug-Logs
- **production** - Produktionsumgebung mit Optimierungen
- **test** - Test-Umgebung mit Mocks

---

## 📈 Performance & Metrics

### **Benchmark-Ergebnisse**
- **Dokumentenverarbeitung**: < 500ms für 1MB PDF
- **Branchenerkennung**: < 200ms (mit Cache)
- **Concurrent Users**: 100+ gleichzeitige Anfragen
- **Memory Usage**: ~512MB (mit 1000 gecachten Ergebnissen)

### **Monitoring KPIs**
- Response Time Percentiles (P50, P95, P99)
- Cache Hit Ratio (Target: >80%)
- AI API Success Rate (Target: >99%)
- Error Rate (Target: <1%)

---

## 🛡️ Sicherheit

### **Implementierte Maßnahmen**
- **Input Validation** - Schutz vor Injection-Angriffen
- **File Upload Security** - Validierung von Dateitypen und -größen
- **Rate Limiting** - Schutz vor DoS-Attacken
- **Secure Headers** - XSS und CSRF Protection
- **Environment Variables** - Sichere Konfiguration von Secrets

---

## 🔄 Continuous Integration

### **GitHub Actions Workflow**
```yaml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
      - name: Run tests
        run: mvn clean verify
```

---

## 📚 Dokumentation

### **Zusätzliche Ressourcen**
- **API Dokumentation**: `/api/ai/info`
- **Health Checks**: `/actuator/health`
- **Database Console**: `/h2-console` (Development)
- **Code Coverage**: `target/site/jacoco/index.html`

---

## 🤝 Contributing

### **Development Workflow**
1. Fork des Repositories
2. Feature Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Commits mit aussagekräftigen Nachrichten
4. Tests schreiben und ausführen
5. Pull Request erstellen

### **Code Standards**
- **Java Code Style**: Google Java Style Guide
- **Test Coverage**: Minimum 80%
- **Documentation**: JavaDoc für alle Public APIs
- **Security**: OWASP Best Practices

---

## 📋 Roadmap

### **Geplante Features**
- [ ] **Multi-Language Support** - Unterstützung für weitere Sprachen
- [ ] **Advanced AI Models** - Integration von GPT-4 und lokalen LLMs
- [ ] **Batch Processing** - Verarbeitung mehrerer Dokumente
- [ ] **REST API v2** - Erweiterte API mit GraphQL
- [ ] **Mobile App** - React Native/Flutter Client
- [ ] **Enterprise Features** - SSO, Advanced Security

---

## 📞 Kontakt & Support

### **Entwickler**
**Duc Thanh Nguyen** - Java Fullstack Entwickler mit KI-Spezialisierung

- **LinkedIn**: https://www.linkedin.com/in/duc-thanh-nguyen-55aa5941
- **GitHub**: https://github.com/thanhtuanh/bewerbung
- **E-Mail**: n.thanh@gmx.de

### **Projekt-Kontext**
Dieses Projekt wurde als **Portfolio-Demonstration** für Bewerbungen als **Java Fullstack Entwickler mit KI-Integration** entwickelt. Es zeigt moderne Softwareentwicklung mit:

- **Enterprise Java Development** (Spring Boot, JPA, Security)
- **AI/ML Integration** (OpenAI API, NLP, Machine Learning)
- **Cloud-Native Architecture** (Docker, Microservices, Caching)
- **DevOps Practices** (CI/CD, Monitoring, Testing)
- **Full-Stack Development** (Backend + Frontend + Database)

**Der Quellcode ist privat**, aber die Funktionalität kann über Demo-Umgebung getestet werden.

---

## 📄 Lizenz

Dieses Projekt ist für **Portfolio- und Bewerbungszwecke** entwickelt.  
**Alle Rechte vorbehalten © 2024 Thanh Nguyen**

---

## 🏆 Technische Highlights für Recruiter

### **Demonstrierte Fähigkeiten**
✅ **Modern Java** (21, Spring Boot 3.x, JPA)  
✅ **AI/ML Integration** (OpenAI, NLP, Hybrid Algorithms)  
✅ **Microservices Architecture** (Service Layer, REST APIs)  
✅ **Database Design** (JPA/Hibernate, Redis Caching)  
✅ **Security Implementation** (Spring Security, Input Validation)  
✅ **DevOps & Containerization** (Docker, CI/CD, Monitoring)  
✅ **Testing Strategies** (Unit, Integration, Testcontainers)  
✅ **Performance Optimization** (Caching, Async Processing)  
✅ **Full-Stack Development** (Backend + Frontend + Database)

### **Business Value**
- **Automatisierung** von manuellen Dokumentenanalyse-Prozessen
- **KI-Integration** für intelligente Businesslösungen  
- **Skalierbare Architektur** für Enterprise-Anforderungen
- **Moderne Technologien** für zukunftssichere Entwicklung

*Dieses Projekt repräsentiert professionelle Softwareentwicklung auf Enterprise-Niveau mit Fokus auf KI-Integration und moderne Java-Technologien.*