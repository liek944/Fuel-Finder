#!/bin/bash
# Emergency Fix for 500 Errors - Deployment Script

echo "🚨 Applying Emergency Fixes for 500 Errors..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in backend directory${NC}"
    echo "Please run this script from /home/ubuntu/Fuel-FInder/backend"
    exit 1
fi

echo -e "${YELLOW}📋 Fixes being applied:${NC}"
echo "  1. middleware/ownerDetection.js - Fix db.query import"
echo "  2. repositories/stationRepository.js - Remove non-existent columns"
echo ""

# Verify files exist
if [ ! -f "middleware/ownerDetection.js" ]; then
    echo -e "${RED}❌ Missing: middleware/ownerDetection.js${NC}"
    exit 1
fi

if [ ! -f "repositories/stationRepository.js" ]; then
    echo -e "${RED}❌ Missing: repositories/stationRepository.js${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required files found${NC}"
echo ""

# Check PM2 status
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📊 Current PM2 Status:${NC}"
    pm2 list | grep fuel-finder
    echo ""
    
    echo -e "${YELLOW}🔄 Restarting fuel-finder...${NC}"
    pm2 restart fuel-finder
    
    echo ""
    echo -e "${GREEN}✅ Backend restarted${NC}"
    echo ""
    
    echo -e "${YELLOW}📋 Recent Logs:${NC}"
    pm2 logs fuel-finder --lines 30 --nostream
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Emergency fixes applied successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}🧪 Test the fixes:${NC}"
    echo "  1. Check stations: curl https://fuelfinder.duckdns.org/api/stations"
    echo "  2. Check POIs: curl https://fuelfinder.duckdns.org/api/pois"
    echo "  3. Open app: https://fuelfinder.duckdns.org"
    echo ""
    
    echo -e "${YELLOW}📊 Monitor logs:${NC}"
    echo "  pm2 logs fuel-finder"
    
else
    echo -e "${YELLOW}⚠️  PM2 not found, starting manually...${NC}"
    npm start
fi

echo ""
echo -e "${GREEN}Done!${NC}"
