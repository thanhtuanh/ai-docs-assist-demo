#!/bin/bash

echo "🏥 VOLLSTÄNDIGER BACKEND HEALTH CHECK - ALLE SERVICES"
echo "===================================================="
echo "Timestamp: $(date)"
echo "Backend: http://localhost:8080"
echo ""

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test-Funktion
test_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -e "${BLUE}Testing: ${name}${NC}"
    echo "URL: $url"
    
    # HTTP Status Code abrufen
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - Status: $status_code"
        # Response anzeigen
        echo "Response:"
        curl -s "$url" 2>/dev/null | jq '.' 2>/dev/null || curl -s "$url" 2>/dev/null
    else
        echo -e "${RED}❌ FAILED${NC} - Status: $status_code (Expected: $expected_status)"
        echo "Error Response:"
        curl -s "$url" 2>/dev/null
    fi
    echo "----------------------------------------"
    echo ""
}

# 1. HEALTH CONTROLLER ENDPOINTS
echo -e "${YELLOW}1. HEALTH CONTROLLER ENDPOINTS${NC}"
test_endpoint "http://localhost:8080/api/health" "General System Health"
test_endpoint "http://localhost:8080/api/system/info" "System Information"

# 2. AI CONTROLLER ENDPOINTS  
echo -e "${YELLOW}2. AI CONTROLLER ENDPOINTS${NC}"
test_endpoint "http://localhost:8080/api/ai/health" "AI Service Health"
test_endpoint "http://localhost:8080/api/ai/info" "AI Service Info"
test_endpoint "http://localhost:8080/api/ai/industries" "Supported Industries"

# 3. DOCUMENTS CONTROLLER ENDPOINTS
echo -e "${YELLOW}3. DOCUMENTS CONTROLLER ENDPOINTS${NC}"
test_endpoint "http://localhost:8080/api/documents/health" "Documents Service Health"

# Test Document Analysis
echo -e "${BLUE}Testing: Document Text Analysis${NC}"
echo "URL: http://localhost:8080/api/documents/analyze-text"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Test-Dokument für Health Check. Wir entwickeln eine moderne Anwendung mit Angular und Spring Boot.",
        "title": "Health Check Test",
        "saveDocument": false,
        "options": {
            "generateSummary": true,
            "extractKeywords": true,
            "suggestComponents": false
        }
    }' \
    "http://localhost:8080/api/documents/analyze-text" 2>/dev/null)

status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')

if [ "$status_code" -eq 200 ]; then
    echo -e "${GREEN}✅ SUCCESS${NC} - Status: $status_code"
    echo "Response:"
    echo "$body" | jq '.message, .document.title, .processingTimeMs' 2>/dev/null || echo "$body"
else
    echo -e "${RED}❌ FAILED${NC} - Status: $status_code"
    echo "Error Response:"
    echo "$body"
fi
echo "----------------------------------------"
echo ""

# 4. FEEDBACK CONTROLLER ENDPOINTS
echo -e "${YELLOW}4. FEEDBACK CONTROLLER ENDPOINTS${NC}"
test_endpoint "http://localhost:8080/api/feedback/health" "Feedback Service Health"
test_endpoint "http://localhost:8080/api/feedback/quality-report" "Quality Report"
test_endpoint "http://localhost:8080/api/feedback/improvement-suggestions" "Improvement Suggestions"

# 5. INDUSTRY DETECTION TEST
echo -e "${YELLOW}5. AI INDUSTRY DETECTION TEST${NC}"
echo -e "${BLUE}Testing: Industry Detection${NC}"
echo "URL: http://localhost:8080/api/ai/detect-industry"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"text":"BMW entwickelt autonome Fahrzeuge mit KI-Technologie für die Automobilindustrie."}' \
    "http://localhost:8080/api/ai/detect-industry" 2>/dev/null)

status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')

if [ "$status_code" -eq 200 ]; then
    echo -e "${GREEN}✅ SUCCESS${NC} - Status: $status_code"
    echo "Response:"
    echo "$body" | jq '.primaryIndustry, .confidence, .detectionMethod' 2>/dev/null || echo "$body"
else
    echo -e "${RED}❌ FAILED${NC} - Status: $status_code"
    echo "Error Response:"
    echo "$body"
fi
echo "----------------------------------------"
echo ""

# 6. ANGULAR PROXY TESTS
echo -e "${YELLOW}6. ANGULAR PROXY TESTS (if Angular running)${NC}"
angular_running=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4200" 2>/dev/null)
if [ "$angular_running" -eq 200 ]; then
    echo -e "${GREEN}✅ Angular dev server is running${NC}"
    
    test_endpoint "http://localhost:4200/api/health" "Proxy: General Health"
    test_endpoint "http://localhost:4200/api/ai/health" "Proxy: AI Health"
    test_endpoint "http://localhost:4200/api/documents/health" "Proxy: Documents Health"
    test_endpoint "http://localhost:4200/api/feedback/health" "Proxy: Feedback Health"
else
    echo -e "${YELLOW}⚠️ Angular dev server not running on port 4200${NC}"
    echo "Start with: ng serve --proxy-config proxy.conf.json"
fi
echo "----------------------------------------"
echo ""

# 7. LEGACY ENDPOINTS (if enabled)
echo -e "${YELLOW}7. LEGACY ENDPOINTS (optional)${NC}"
test_endpoint "http://localhost:8080/api/analyze/document" "Legacy Document Analysis" 404

# 8. CORS TEST
echo -e "${YELLOW}8. CORS HEADERS TEST${NC}"
echo -e "${BLUE}Testing: CORS Headers${NC}"
cors_headers=$(curl -s -I -H "Origin: http://localhost:4200" "http://localhost:8080/api/health" 2>/dev/null | grep -i "access-control")
if [ ! -z "$cors_headers" ]; then
    echo -e "${GREEN}✅ CORS Headers found:${NC}"
    echo "$cors_headers"
else
    echo -e "${YELLOW}⚠️ No CORS headers found${NC}"
    echo "This might cause issues with Angular frontend"
fi
echo "----------------------------------------"
echo ""

# 9. PERFORMANCE TEST
echo -e "${YELLOW}9. BASIC PERFORMANCE TEST${NC}"
echo -e "${BLUE}Testing: Response Times${NC}"
start_time=$(date +%s%N)
curl -s "http://localhost:8080/api/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
echo "Health endpoint response time: ${response_time}ms"

start_time=$(date +%s%N)
curl -s "http://localhost:8080/api/ai/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
echo "AI health endpoint response time: ${response_time}ms"
echo "----------------------------------------"
echo ""

# 10. PORT CHECK
echo -e "${YELLOW}10. PORT AND PROCESS CHECK${NC}"
echo "Port 8080 usage:"
lsof -i :8080 2>/dev/null || echo "No processes found on port 8080"
echo ""

echo "Port 4200 usage:"
lsof -i :4200 2>/dev/null || echo "No processes found on port 4200"
echo ""

echo "Java/Spring processes:"
ps aux | grep -E "(java.*spring|SpringBootApplication)" | grep -v grep || echo "No Spring Boot processes found"
echo "----------------------------------------"
echo ""

# 11. FINAL SUMMARY
echo -e "${YELLOW}📊 HEALTH CHECK SUMMARY${NC}"
echo "====================================="
echo "✅ = Service working correctly"
echo "❌ = Service has issues"
echo "⚠️ = Service not available (might be optional)"
echo ""
echo "🔧 If you see ❌ errors:"
echo "1. Check if Spring Boot application is running"
echo "2. Verify endpoint mappings in controllers"
echo "3. Check for routing conflicts (especially /health endpoints)"
echo "4. Review server logs for detailed error messages"
echo "5. Ensure CORS is properly configured"
echo ""
echo "🚀 Expected Results After Fix:"
echo "- All /health endpoints should return 200 ✅"
echo "- AI service should be fully functional ✅"
echo "- Document analysis should work ✅"
echo "- Angular proxy should work without errors ✅"
echo ""
echo "💡 Next Steps:"
echo "1. Fix DocumentController routing if /api/documents/health fails"
echo "2. Restart Spring Boot application"
echo "3. Test Angular frontend - should have no console errors"
echo ""
echo "=== HEALTH CHECK COMPLETE ==="