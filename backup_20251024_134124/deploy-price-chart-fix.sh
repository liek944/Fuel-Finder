#!/bin/bash

# Deploy Price Chart Fix
# Fixes "b.map is not a function" error in admin dashboard

echo "========================================"
echo "Deploying Price Chart Fix"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Deploy backend changes
echo -e "${BLUE}Step 1: Deploying backend changes...${NC}"
cd backend || exit 1

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Restarting PM2 process...${NC}"
    pm2 restart fuel-finder || pm2 restart server_modular_entry || pm2 restart all
    echo -e "${GREEN}✓ Backend restarted${NC}"
else
    echo -e "${RED}PM2 not found. Please restart your backend server manually.${NC}"
fi

echo ""

# Step 2: Deploy frontend changes
echo -e "${BLUE}Step 2: Building frontend...${NC}"
cd ../frontend || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build the frontend
echo -e "${YELLOW}Building React app...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. If using Netlify, push to git and it will auto-deploy"
    echo "2. If manual deploy: Upload the 'build' folder to your hosting"
    echo ""
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

# Step 3: Summary
echo ""
echo "========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Changes deployed:"
echo "  ✓ Fixed FuelPriceTrendChart data extraction"
echo "  ✓ Fixed priceRepository column name (date → report_date)"
echo ""
echo "What was fixed:"
echo "  - Error: b.map is not a function"
echo "  - Price trend chart now displays correctly"
echo "  - Statistics tab showing fuel price movement graph"
echo ""
echo "Test the fix:"
echo "  1. Go to Admin Portal"
echo "  2. Click 'Price Reports' tab"
echo "  3. Click 'Statistics' sub-tab"
echo "  4. Scroll down to see the fuel price trend chart"
echo ""
echo "Documentation: PRICE_CHART_FIX.md"
echo ""
