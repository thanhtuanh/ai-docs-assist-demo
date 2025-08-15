FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json only
COPY package.json ./

# Install dependencies
RUN npm install --no-package-lock --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.default.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=build /app/dist/ai-doc-assist-frontend /usr/share/nginx/html

# Health check script
RUN echo '#!/bin/sh\nwget --no-verbose --tries=1 --spider http://localhost/health || exit 1' > /health-check.sh && \
    chmod +x /health-check.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /health-check.sh

CMD ["nginx", "-g", "daemon off;"]