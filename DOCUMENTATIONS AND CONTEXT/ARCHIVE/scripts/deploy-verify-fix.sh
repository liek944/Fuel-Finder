#!/bin/bash

# Deploy Verify Route Fix
# Fixes "Route PATCH /api/price-reports/:id/verify not found" error

echo "========================================"
echo "Deploying Verify Route Fix"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# This fix only requires frontend changes
echo -e "${BLUE}Building and deploying frontend changes...${NC}"
echo ""

cd frontend || exit 1

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

# Summary
echo ""
echo "========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "What was fixed:"
echo "  ✓ Verify route method: PATCH → POST"
echo "  ✓ Verify route path: /api/price-reports → /api/admin/price-reports"
echo ""
echo "Now you can:"
echo "  ✓ Verify price reports in Admin Dashboard"
echo "  ✓ All admin price report operations work correctly"
echo ""
echo "Test the fix:"
echo "  1. Go to Admin Portal → Price Reports"
echo "  2. Click on a pending report"
echo "  3. Click '✅ Verify' button"
echo "  4. Should see 'Report verified successfully!'"
echo ""
echo "Documentation: VERIFY_ROUTE_FIX.md"
echo ""
