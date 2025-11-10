#!/bin/bash

# AdSense Compliance Verification Script
# This script verifies that all required pages and files are in place for AdSense approval

set -e

echo "🔍 Verifying AdSense Compliance..."
echo "=================================="
echo ""

DOMAIN="https://aigrocerylists.com"
TEMP_DIR="/tmp/adsense-verify"
mkdir -p "$TEMP_DIR"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check URL
check_url() {
  local url=$1
  local name=$2
  
  echo -n "Checking $name... "
  
  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
    echo -e "${GREEN}✅ OK${NC}"
    return 0
  else
    echo -e "${RED}❌ FAILED${NC}"
    return 1
  fi
}

# Function to check content
check_content() {
  local url=$1
  local keyword=$2
  local name=$3
  
  echo -n "Checking $name content... "
  
  if curl -s "$url" | grep -q "$keyword"; then
    echo -e "${GREEN}✅ Found${NC}"
    return 0
  else
    echo -e "${RED}❌ Not found${NC}"
    return 1
  fi
}

echo "📋 Checking Legal Pages"
echo "----------------------"
check_url "$DOMAIN/privacy.html" "Privacy Policy"
check_content "$DOMAIN/privacy.html" "Google AdSense" "AdSense disclosure"
check_content "$DOMAIN/privacy.html" "GDPR" "GDPR compliance"
echo ""

echo "📋 Checking Terms of Service"
echo "----------------------------"
check_url "$DOMAIN/terms.html" "Terms of Service"
check_content "$DOMAIN/terms.html" "Acceptable Use" "Terms content"
echo ""

echo "📋 Checking About Page"
echo "---------------------"
check_url "$DOMAIN/about.html" "About Page"
check_content "$DOMAIN/about.html" "Our Mission" "About content"
echo ""

echo "📋 Checking Contact Page"
echo "------------------------"
check_url "$DOMAIN/contact.html" "Contact Page"
check_content "$DOMAIN/contact.html" "support@aigrocerylists.com" "Contact info"
echo ""

echo "🔗 Checking SEO Files"
echo "---------------------"
check_url "$DOMAIN/robots.txt" "Robots.txt"
check_content "$DOMAIN/robots.txt" "Allow:" "Robots content"
check_url "$DOMAIN/sitemap.xml" "Sitemap"
check_content "$DOMAIN/sitemap.xml" "aigrocerylists.com" "Sitemap content"
echo ""

echo "🌐 Checking Main App"
echo "--------------------"
check_url "$DOMAIN/" "Main App"
check_content "$DOMAIN/" "AI Grocery" "App title"
echo ""

echo "📊 Checking Meta Tags"
echo "---------------------"
if curl -s "$DOMAIN/" | grep -q "meta name=\"description\""; then
  echo -e "Meta description: ${GREEN}✅ Present${NC}"
else
  echo -e "Meta description: ${RED}❌ Missing${NC}"
fi

if curl -s "$DOMAIN/" | grep -q "meta name=\"viewport\""; then
  echo -e "Mobile viewport: ${GREEN}✅ Present${NC}"
else
  echo -e "Mobile viewport: ${RED}❌ Missing${NC}"
fi

if curl -s "$DOMAIN/" | grep -q "og:title"; then
  echo -e "OpenGraph tags: ${GREEN}✅ Present${NC}"
else
  echo -e "OpenGraph tags: ${RED}❌ Missing${NC}"
fi
echo ""

echo "✅ Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Deploy changes: git push && npm run build && npm run deploy"
echo "2. Wait 24-48 hours for Google to crawl"
echo "3. Submit to Google AdSense: https://www.google.com/adsense"
echo "4. Monitor approval status"
echo ""
echo "📚 Documentation:"
echo "- Checklist: ADSENSE_COMPLIANCE_CHECKLIST.md"
echo "- Resubmission: ADSENSE_RESUBMISSION_GUIDE.md"
echo "- Setup: ADSENSE_SETUP_GUIDE.md"

