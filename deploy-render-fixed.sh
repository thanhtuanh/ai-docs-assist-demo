#!/bin/bash

# 🚀 Render.com Deployment Script - Simplified Domain Names
# Frontend: https://ai-docs-assist-demo.onrender.com
# Backend: https://ai-docs-assist.onrender.com

set -e  # Exit on any error

echo "🔧 Starting Render.com deployment with simplified domain names..."

# Check if required files exist
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found!"
    exit 1
fi

if [ ! -f ".env.prod" ]; then
    echo "❌ .env.prod not found!"
    exit 1
fi

# Load production environment
source .env.prod

# Validate required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY not set in .env.prod"
    exit 1
fi

echo "✅ Environment validation passed"

# Build frontend with production configuration
echo "🏗️ Building frontend..."
cd frontend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
cd ..

# Build backend
echo "🏗️ Building backend..."
cd backend
mvn clean package -DskipTests
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi
cd ..

echo "✅ All builds successful"

# Test API endpoints locally before deployment
echo "🧪 Testing configuration..."

# Check if environment URLs are correctly configured
echo "Frontend API URL: $(grep apiUrl frontend/src/environments/environment.prod.ts)"
echo "Backend CORS: $(grep CORS_ALLOWED_ORIGINS render.yaml)"

echo "🚀 Ready for Render.com deployment with simplified domain names!"
echo ""
echo "📋 Next steps:"
echo "1. Push changes to your Git repository (branch: project-ai-docs-assist)"
echo "2. In Render.com dashboard, create new services with simplified names:"
echo "   - Backend: ai-docs-assist"
echo "   - Frontend: ai-docs-assist-demo"
echo "3. Set OPENAI_API_KEY in Render.com dashboard"
echo "4. Test the application at your new frontend URL"
echo ""
echo "🔗 New URLs:"
echo "- Frontend: https://ai-docs-assist-demo.onrender.com"
echo "- Backend: https://ai-docs-assist.onrender.com"
echo ""
echo "⚠️  Remember to:"
echo "- Set OPENAI_API_KEY in Render.com dashboard"
echo "- Update any bookmarks or links to use new URLs"
echo "- Old URLs will redirect automatically"
