# Frontend Dockerfile - VEREINFACHT und REPARIERT
FROM node:18-alpine AS build
WORKDIR /app

# Dependencies installieren
COPY package*.json ./
RUN npm ci --production=false

# Source-Code kopieren
COPY . .

# ✅ Environment-Dateien für Docker-Container überschreiben
RUN echo 'export const environment = { production: false, apiUrl: "http://localhost:8080/api" }; console.log("🔧 Docker Environment loaded:", environment);' > src/environments/environment.ts
RUN echo 'export const environment = { production: true, apiUrl: "http://localhost:8080/api" }; console.log("🔧 Docker Production Environment loaded:", environment);' > src/environments/environment.prod.ts

# ✅ Einfacher Build ohne spezielle Konfiguration
RUN npm run build

# Production Image
FROM nginx:alpine
COPY --from=build /app/dist/ai-doc-assist-frontend/ /usr/share/nginx/html/
EXPOSE 80

# ✅ Einfache nginx.conf
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf