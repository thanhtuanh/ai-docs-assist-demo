# ---------- Build ----------
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NG_BUILD_CONFIG=production
RUN npm run build -- --configuration=${NG_BUILD_CONFIG}

# ---------- Runtime ----------
FROM nginx:alpine
# nur Server-Block (kein globaler Kram)
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
# Angular-Build-Output (achte auf Ordnernamen aus angular.json)
COPY --from=build /app/dist/ai-doc-assist-frontend /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
