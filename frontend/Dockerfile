# Build stage with Node 20 for Angular 18
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean npm cache and install dependencies
RUN npm cache clean --force && npm install

# Copy source code
COPY . .

# Create environment files for Docker
RUN echo 'export const environment = { \
  production: false, \
  apiUrl: "http://backend:8080/api" \
}; \
console.log("🔧 Docker Environment loaded:", environment);' > src/environments/environment.ts

RUN echo 'export const environment = { \
  production: true, \
  apiUrl: "http://backend:8080/api" \
}; \
console.log("🔧 Docker Production Environment loaded:", environment);' > src/environments/environment.prod.ts

# Build Angular 18 application
RUN npm run build

# Production stage with Nginx
FROM nginx:1.25-alpine

# Create non-root user
RUN addgroup -g 1001 -S nginxgroup && \
    adduser -u 1001 -S nginxuser -G nginxgroup

# Copy built application
COPY --from=build /app/dist/ai-doc-assist-frontend/ /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Install wget for health checks
RUN apk add --no-cache wget

# Change ownership and create temp directories
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R nginxuser:nginxgroup /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

# Switch to non-root user
USER nginxuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
