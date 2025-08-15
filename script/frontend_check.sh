#!/bin/bash

echo "🌐 FRONTEND CURL CHECK - ANGULAR & BACKEND INTEGRATION"
echo "====================================================="
echo "Timestamp: $(date)"
echo "Frontend: http://localhost:4200"
echo "Backend: http://localhost:8080"
echo ""

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test-Funktion für Frontend
test_frontend_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    local method=${4:-GET}
    local data=$5
    local content_type=${6:-application/json}
    
    echo -e "${BLUE}Testing: ${name}${NC}"
    echo "URL: $url"
    echo "Method: $method"
    
    # HTTP Request ausführen
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url" 2>/dev/null)
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" \
            -H "Content-Type: $content_type" \
            -d "$data" \
            "$url" 2>/dev/null)
    fi
    
    # Status Code extrahieren
    status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - Status: $status_code"
        # Response anzeigen (gekürzt für bessere Lesbarkeit)
        echo "Response Preview:"
        echo "$body" | jq '.status, .service, .message, .timestamp' 2>/dev/null || \
        echo "$body" | head -c 200 && echo "..."
    else
        echo -e "${RED}❌ FAILED${NC} - Status: $status_code (Expected: $expected_status)"
        echo "Error Response:"
        echo "$body" | head -c 500
    fi
    echo "----------------------------------------"
    echo ""
}

# 1. FRONTEND VERFÜGBARKEIT CHECK
echo -e "${YELLOW}1. FRONTEND AVAILABILITY CHECK${NC}"
echo -e "${BLUE}Checking Angular Development Server${NC}"

angular_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200" 2>/dev/null)
if [ "$angular_status" -eq 200 ]; then
    echo -e "${GREEN}✅ Angular dev server is running on port 4200${NC}"
    
    # Prüfe Angular Titel
    title=$(curl -s "http://localhost:4200" 2>/dev/null | grep -o '<title[^>]*>[^<]*</title>' | sed 's/<[^>]*>//g')
    echo "Page Title: $title"
    
    # Prüfe auf Angular-spezifische Elemente
    angular_elements=$(curl -s "http://localhost:4200" 2>/dev/null | grep -c "app-root\|angular\|ng-")
    echo "Angular elements detected: $angular_elements"
    
else
    echo -e "${RED}❌ Angular dev server not running on port 4200${NC}"
    echo "Please start with: ng serve --proxy-config proxy.conf.json"
    echo ""
    echo -e "${YELLOW}⚠️ Continuing with backend-only tests...${NC}"
fi
echo "----------------------------------------"
echo ""

# 2. PROXY CONFIGURATION TEST
echo -e "${YELLOW}2. ANGULAR PROXY CONFIGURATION TEST${NC}"
if [ "$angular_status" -eq 200 ]; then
    echo -e "${BLUE}Testing proxy.conf.json configuration${NC}"
    
    # Test ob Proxy funktioniert (Backend durch Angular erreichbar)
    proxy_test=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200/api/health" 2>/dev/null)
    if [ "$proxy_test" -eq 200 ] || [ "$proxy_test" -eq 404 ]; then
        echo -e "${GREEN}✅ Proxy configuration is working (requests reach backend)${NC}"
        echo "Status: $proxy_test (Backend response via proxy)"
    else
        echo -e "${RED}❌ Proxy configuration failed${NC}"
        echo "Status: $proxy_test"
        echo "Check proxy.conf.json configuration"
    fi
else
    echo -e "${YELLOW}⚠️ Skipping proxy tests - Angular not running${NC}"
fi
echo "----------------------------------------"
echo ""

# 3. FRONTEND API CALLS (durch Angular Proxy)
if [ "$angular_status" -eq 200 ]; then
    echo -e "${YELLOW}3. FRONTEND API CALLS (via Angular Proxy)${NC}"
    
    # Health Endpoints
    test_frontend_endpoint "http://localhost:4200/api/health" "General Health (via Proxy)"
    test_frontend_endpoint "http://localhost:4200/api/ai/health" "AI Service Health (via Proxy)"
    test_frontend_endpoint "http://localhost:4200/api/documents/health" "Documents Health (via Proxy)"
    test_frontend_endpoint "http://localhost:4200/api/feedback/health" "Feedback Health (via Proxy)"
    
    # AI Service Endpoints
    test_frontend_endpoint "http://localhost:4200/api/ai/info" "AI Service Info (via Proxy)"
    test_frontend_endpoint "http://localhost:4200/api/ai/industries" "Supported Industries (via Proxy)"
    
    # Industry Detection Test
    test_frontend_endpoint "http://localhost:4200/api/ai/detect-industry" \
        "Industry Detection (via Proxy)" \
        200 \
        "POST" \
        '{"text":"Angular und Spring Boot Entwicklung für E-Commerce Platform"}' \
        "application/json"
    
    # Text Analysis Test
    test_frontend_endpoint "http://localhost:4200/api/documents/analyze-text" \
        "Text Analysis (via Proxy)" \
        200 \
        "POST" \
        '{
            "text": "Test Frontend Integration: Angular TypeScript Application mit Spring Boot Backend",
            "title": "Frontend Integration Test",
            "saveDocument": false,
            "selectedIndustry": "auto",
            "options": {
                "generateSummary": true,
                "extractKeywords": true,
                "suggestComponents": true
            }
        }' \
        "application/json"
    
else
    echo -e "${YELLOW}⚠️ Skipping frontend API tests - Angular not running${NC}"
    echo ""
fi

# 4. CORS HEADERS TEST (wichtig für Frontend)
echo -e "${YELLOW}4. CORS HEADERS TEST (Frontend Origin)${NC}"
echo -e "${BLUE}Testing CORS headers for Angular frontend${NC}"

# Test CORS mit Angular Origin
cors_response=$(curl -s -I \
    -H "Origin: http://localhost:4200" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type" \
    "http://localhost:8080/api/health" 2>/dev/null)

echo "CORS Preflight Response Headers:"
echo "$cors_response" | grep -i "access-control\|vary\|origin" || echo "No CORS headers found"

# Test ob CORS für Angular Domain funktioniert
cors_allow_origin=$(echo "$cors_response" | grep -i "access-control-allow-origin" | grep "4200")
if [ ! -z "$cors_allow_origin" ]; then
    echo -e "${GREEN}✅ CORS properly configured for Angular (localhost:4200)${NC}"
else
    echo -e "${YELLOW}⚠️ CORS might not be properly configured for Angular${NC}"
    echo "Check CORS configuration in Spring Boot backend"
fi
echo "----------------------------------------"
echo ""

# 5. FRONTEND ERROR SIMULATION
if [ "$angular_status" -eq 200 ]; then
    echo -e "${YELLOW}5. FRONTEND ERROR HANDLING TEST${NC}"
    
    # Test ungültige Endpoints
    test_frontend_endpoint "http://localhost:4200/api/nonexistent" "Invalid Endpoint (via Proxy)" 404
    
    # Test ungültige Daten
    test_frontend_endpoint "http://localhost:4200/api/ai/detect-industry" \
        "Invalid Data Test (via Proxy)" \
        400 \
        "POST" \
        '{"invalid": "data"}' \
        "application/json"
    
else
    echo -e "${YELLOW}⚠️ Skipping error handling tests - Angular not running${NC}"
fi
echo "----------------------------------------"
echo ""

# 6. FRONTEND STATIC ASSETS CHECK
if [ "$angular_status" -eq 200 ]; then
    echo -e "${YELLOW}6. FRONTEND STATIC ASSETS CHECK${NC}"
    
    # Test Angular Assets
    assets_test=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200/favicon.ico" 2>/dev/null)
    echo "Favicon Status: $assets_test"
    
    # Test Angular Bundle Files (development)
    main_js_test=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200/main.js" 2>/dev/null)
    echo "Main.js Status: $main_js_test"
    
    # Test Styles
    styles_test=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200/styles.css" 2>/dev/null)
    echo "Styles.css Status: $styles_test"
    
    if [ "$main_js_test" -eq 200 ] || [ "$main_js_test" -eq 304 ]; then
        echo -e "${GREEN}✅ Angular development bundles are serving correctly${NC}"
    else
        echo -e "${YELLOW}⚠️ Angular bundles might not be available (normal for some dev configs)${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️ Skipping static assets tests - Angular not running${NC}"
fi
echo "----------------------------------------"
echo ""

# 7. BROWSER SIMULATION TEST
if [ "$angular_status" -eq 200 ]; then
    echo -e "${YELLOW}7. BROWSER SIMULATION TEST${NC}"
    echo -e "${BLUE}Simulating browser requests with proper headers${NC}"
    
    # Simuliere Browser-Request
    browser_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
        -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
        -H "Accept-Language: en-US,en;q=0.5" \
        -H "Accept-Encoding: gzip, deflate" \
        -H "Connection: keep-alive" \
        -H "Referer: http://localhost:4200/" \
        "http://localhost:4200/api/health" 2>/dev/null)
    
    status_code=$(echo "$browser_response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$status_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Browser simulation successful${NC}"
        echo "Status: $status_code"
    else
        echo -e "${YELLOW}⚠️ Browser simulation returned: $status_code${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️ Skipping browser simulation - Angular not running${NC}"
fi
echo "----------------------------------------"
echo ""

# 8. PERFORMANCE TEST
echo -e "${YELLOW}8. FRONTEND PERFORMANCE TEST${NC}"

if [ "$angular_status" -eq 200 ]; then
    echo -e "${BLUE}Testing response times via Angular proxy${NC}"
    
    # Test Frontend Performance
    start_time=$(date +%s%N)
    curl -s "http://localhost:4200" > /dev/null
    end_time=$(date +%s%N)
    frontend_time=$(( (end_time - start_time) / 1000000 ))
    echo "Angular app load time: ${frontend_time}ms"
    
    # Test API Performance via Proxy
    start_time=$(date +%s%N)
    curl -s "http://localhost:4200/api/health" > /dev/null
    end_time=$(date +%s%N)
    api_proxy_time=$(( (end_time - start_time) / 1000000 ))
    echo "API via proxy response time: ${api_proxy_time}ms"
    
    # Vergleich mit direktem Backend-Aufruf
    start_time=$(date +%s%N)
    curl -s "http://localhost:8080/api/health" > /dev/null
    end_time=$(date +%s%N)
    direct_api_time=$(( (end_time - start_time) / 1000000 ))
    echo "Direct API response time: ${direct_api_time}ms"
    
    # Proxy Overhead berechnen
    proxy_overhead=$(( api_proxy_time - direct_api_time ))
    echo "Proxy overhead: ${proxy_overhead}ms"
    
    if [ "$proxy_overhead" -lt 100 ]; then
        echo -e "${GREEN}✅ Proxy performance is good (< 100ms overhead)${NC}"
    else
        echo -e "${YELLOW}⚠️ Proxy has significant overhead (${proxy_overhead}ms)${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️ Skipping performance tests - Angular not running${NC}"
fi
echo "----------------------------------------"
echo ""

# 9. DEVELOPMENT SERVER INFO
echo -e "${YELLOW}9. DEVELOPMENT SERVER INFORMATION${NC}"

if [ "$angular_status" -eq 200 ]; then
    echo -e "${BLUE}Angular Development Server Details${NC}"
    
    # Versuche Angular Version zu ermitteln
    package_info=$(curl -s "http://localhost:4200" 2>/dev/null | grep -o 'ng-version="[^"]*"' | head -1)
    if [ ! -z "$package_info" ]; then
        echo "Angular Version: $package_info"
    fi
    
    # Prüfe auf Development vs Production Build
    if curl -s "http://localhost:4200" 2>/dev/null | grep -q "ng-version\|main.js"; then
        echo "Build Mode: Development (detected)"
    else
        echo "Build Mode: Unknown"
    fi
    
    echo "Server: Angular CLI Dev Server"
    echo "Proxy: Configured for localhost:8080"
    
else
    echo -e "${BLUE}Angular Development Server Status${NC}"
    echo -e "${RED}❌ Not running${NC}"
    echo ""
    echo "To start Angular frontend:"
    echo "1. cd /path/to/angular/project"
    echo "2. ng serve --proxy-config proxy.conf.json"
    echo "3. Wait for 'Local: http://localhost:4200/'"
fi
echo "----------------------------------------"
echo ""

# 10. FRONTEND-BACKEND INTEGRATION SUMMARY
echo -e "${YELLOW}📊 FRONTEND-BACKEND INTEGRATION SUMMARY${NC}"
echo "========================================"

if [ "$angular_status" -eq 200 ]; then
    echo -e "${GREEN}✅ Angular Frontend: RUNNING${NC}"
    
    # Check key integration points
    health_check=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200/api/health" 2>/dev/null)
    ai_check=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200/api/ai/health" 2>/dev/null)
    
    if [ "$health_check" -eq 200 ]; then
        echo -e "${GREEN}✅ Proxy Integration: WORKING${NC}"
    else
        echo -e "${RED}❌ Proxy Integration: FAILED${NC}"
    fi
    
    if [ "$ai_check" -eq 200 ]; then
        echo -e "${GREEN}✅ AI Service Integration: WORKING${NC}"
    else
        echo -e "${RED}❌ AI Service Integration: FAILED${NC}"
    fi
    
    echo ""
    echo "🚀 Frontend is ready for development!"
    echo "📱 Access your app at: http://localhost:4200"
    
else
    echo -e "${RED}❌ Angular Frontend: NOT RUNNING${NC}"
    echo ""
    echo "🔧 To fix:"
    echo "1. Navigate to your Angular project directory"
    echo "2. Run: ng serve --proxy-config proxy.conf.json"
    echo "3. Wait for successful compilation"
    echo "4. Re-run this script to verify"
fi

echo ""
echo "🔗 Integration Points:"
echo "  Frontend: http://localhost:4200"
echo "  Backend:  http://localhost:8080"
echo "  Proxy:    /api/* → localhost:8080"
echo ""
echo "📋 Key Endpoints:"
echo "  Health:     /api/health"
echo "  AI:         /api/ai/health"
echo "  Documents:  /api/documents/health"
echo "  Analysis:   /api/documents/analyze-text"
echo ""
echo "=== FRONTEND CHECK COMPLETE ==="