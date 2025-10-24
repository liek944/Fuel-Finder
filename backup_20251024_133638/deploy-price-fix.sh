#!/bin/bash

# Frontend Price Display Fix Deployment Script
# Rebuilds and redeploys the frontend with price type conversion fixes
# Date: 2024-10-24

set -e  # Exit on any error

echo "=========================================="
echo "Frontend Price Display Fix Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run from frontend directory.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend directory confirmed${NC}"
echo ""

echo "Fixed files:"
echo "  ✓ PriceReportsManagement.tsx - Type interface + display fix"
echo "  ✓ AdminPortal.tsx - Price display fix"
echo "  ✓ MainApp.tsx - 2 price display fixes"
echo ""

# Check for node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# Clean previous build
echo "Cleaning previous build..."
if [ -d "dist" ]; then
    rm -rf dist
    echo -e "${GREEN}✓ Cleaned dist directory${NC}"
fi
echo ""

# Build for production
echo "Building production bundle..."
echo -e "${YELLOW}Using production API: https://fuelfinder.duckdns.org${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

# Check build output
if [ -d "dist" ]; then
    BUILD_SIZE=$(du -sh dist | cut -f1)
    FILE_COUNT=$(find dist -type f | wc -l)
    echo "Build output:"
    echo "  Size: $BUILD_SIZE"
    echo "  Files: $FILE_COUNT"
    echo ""
fi

echo "=========================================="
echo -e "${GREEN}Build Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps for deployment:"
echo ""
echo "Option 1 - If using Netlify:"
echo "  1. Login to Netlify CLI:"
echo "     netlify login"
echo "  2. Deploy:"
echo "     netlify deploy --prod --dir=dist"
echo ""
echo "Option 2 - If using Vercel:"
echo "  vercel --prod"
echo ""
echo "Option 3 - Manual deployment:"
echo "  Upload the 'dist' folder contents to your web server"
echo ""
echo "Option 4 - If deployed on same EC2 as backend:"
echo "  sudo cp -r dist/* /var/www/html/"
echo "  sudo systemctl reload nginx"
echo ""
echo "Testing checklist after deployment:"
echo "  [ ] Admin portal loads without errors"
echo "  [ ] Price reports display correctly"
echo "  [ ] Station markers show fuel prices"
echo "  [ ] No console errors about price.toFixed"
echo ""
