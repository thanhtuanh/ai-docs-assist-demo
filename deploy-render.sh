#!/bin/bash

# Deployment script for render.com
echo "🚀 Deploying AI Document Assistant to render.com..."

# Load production environment variables
if [ -f .env.prod ]; then
    echo "📋 Loading production environment variables..."
    export $(cat .env.prod | grep -v '^#' | xargs)
else
    echo "❌ .env.prod file not found!"
    exit 1
fi

# Build and deploy using production docker-compose
echo "🔨 Building containers for production..."
docker-compose -f docker-compose.prod.yml build

echo "🌐 Starting production deployment..."
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Deployment completed!"
echo "🌍 Frontend URL: ${API_FRONTEND_ORIGIN}"
echo "🔧 Backend URL: ${API_FRONTEND_ORIGIN}/api"

# Health check
echo "🏥 Performing health check..."
sleep 10
curl -f "${API_FRONTEND_ORIGIN}" && echo "✅ Frontend is healthy" || echo "❌ Frontend health check failed"

echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps
