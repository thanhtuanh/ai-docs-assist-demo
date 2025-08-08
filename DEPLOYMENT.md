# 🚀 AI Document Assistant - Deployment Guide

## 🏠 Lokale Entwicklung

### Voraussetzungen
- Docker und Docker Compose installiert
- OpenAI API Key

### Lokale Ausführung
```bash
# 1. OpenAI API Key setzen
export OPENAI_API_KEY="your-api-key-here"

# 2. Container starten
docker-compose up -d

# 3. Anwendung öffnen
open http://localhost:4200
```

**Lokale URLs:**
- Frontend: http://localhost:4200
- Backend: http://localhost:8080
- Backend API: http://localhost:8080/api

## 🌐 Production Deployment (render.com)

### 1. Umgebungsvariablen konfigurieren
Stellen Sie sicher, dass `.env.prod` korrekt konfiguriert ist:

```bash
# .env.prod
ENVIRONMENT=production
API_FRONTEND_ORIGIN=https://bits-ai-docs-assist-demo.onrender.com
CORS_ALLOWED_ORIGINS=https://bits-ai-docs-assist-demo.onrender.com
OPENAI_API_KEY=your-actual-api-key
OPENAI_MODEL=gpt-3.5-turbo
DEMO_MODE=true
SPRING_PROFILES_ACTIVE=production
```

### 2. Deployment ausführen
```bash
# Mit dem bereitgestellten Skript
./deploy-render.sh

# Oder manuell
docker-compose -f docker-compose.prod.yml up -d
```

### 3. render.com Konfiguration

#### Backend Service
- **Build Command**: `docker build -t backend ./backend`
- **Start Command**: `java -jar app.jar`
- **Environment**: Production
- **Port**: 8080

#### Frontend Service  
- **Build Command**: `docker build -t frontend ./frontend`
- **Start Command**: `nginx -g 'daemon off;'`
- **Environment**: Production
- **Port**: 80

### 4. Umgebungsvariablen in render.com setzen
In der render.com Dashboard für jeden Service:

```
OPENAI_API_KEY=sk-proj-...
API_FRONTEND_ORIGIN=https://bits-ai-docs-assist-demo.onrender.com
CORS_ALLOWED_ORIGINS=https://bits-ai-docs-assist-demo.onrender.com
OPENAI_MODEL=gpt-3.5-turbo
SPRING_PROFILES_ACTIVE=production
DEMO_MODE=true
```

## 🔧 Konfiguration

### Ports
- **Lokal**: Frontend auf 4200, Backend auf 8080
- **Production**: Frontend auf 80, Backend auf 8080

### CORS
- **Lokal**: `http://localhost:4200`
- **Production**: `https://bits-ai-docs-assist-demo.onrender.com`

### OpenAI Modell
- **Kostensparend**: `gpt-3.5-turbo` (empfohlen)
- **Leistungsstark**: `gpt-4-turbo-preview`

## 🩺 Health Checks

```bash
# Frontend
curl http://localhost:4200

# Backend Health
curl http://localhost:8080/actuator/health

# Backend API Test
curl -X GET http://localhost:8080/api/documents
```

## 📊 Monitoring

### Container Status
```bash
docker-compose ps
```

### Logs anzeigen
```bash
# Alle Services
docker-compose logs -f

# Nur Backend
docker-compose logs -f backend

# Nur Frontend  
docker-compose logs -f frontend
```

## 🔍 Troubleshooting

### Port-Konflikte
```bash
# Prüfen welche Ports belegt sind
lsof -i :4200
lsof -i :8080

# Container neu starten
docker-compose down && docker-compose up -d
```

### CORS-Probleme
1. Prüfen Sie die CORS_ALLOWED_ORIGINS Konfiguration
2. Stellen Sie sicher, dass Frontend und Backend URLs übereinstimmen
3. Browser-Cache leeren

### OpenAI API Probleme
1. API Key prüfen
2. Modell-Verfügbarkeit prüfen
3. Rate Limits beachten
4. Logs für detaillierte Fehlermeldungen prüfen

## 📈 Performance Optimierung

### Kosten sparen
- Verwenden Sie `gpt-3.5-turbo` statt `gpt-4`
- Setzen Sie `OPENAI_MAX_TOKENS=500`
- Aktivieren Sie `DEMO_MODE=true` für Testzwecke

### Memory Limits
- Backend: `-Xmx1024m` (bereits konfiguriert)
- Überwachen Sie die Container-Ressourcennutzung
