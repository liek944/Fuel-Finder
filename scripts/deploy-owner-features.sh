#!/bin/bash

# Deploy Owner Dashboard Station Features
# Includes: Fuel price display + Edit station modal with fuel price editing

echo "🚀 Deploying Owner Dashboard Station Features..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# FRONTEND DEPLOYMENT
# ============================================
echo -e "${BLUE}📦 Building Frontend...${NC}"
cd frontend || exit

# Install dependencies
npm install

# Build
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend build successful!${NC}"
else
  echo -e "${RED}❌ Frontend build failed!${NC}"
  exit 1
fi

# Deploy to Netlify (if CLI is available)
if command -v netlify &> /dev/null; then
  echo -e "${BLUE}🌐 Deploying to Netlify...${NC}"
  netlify deploy --prod
  echo -e "${GREEN}✅ Frontend deployed to Netlify!${NC}"
else
  echo -e "${YELLOW}⚠️  Netlify CLI not found. Please deploy manually or install:${NC}"
  echo "   npm install -g netlify-cli"
fi

cd ..

# ============================================
# BACKEND DEPLOYMENT
# ============================================
echo ""
echo -e "${BLUE}🔧 Deploying Backend Updates...${NC}"

# Check if we're on EC2 or local
if [ -f "/home/ec2-user/fuel_finder/backend/package.json" ]; then
  echo "Detected EC2 environment"
  BACKEND_PATH="/home/ec2-user/fuel_finder/backend"
else
  echo "Using local backend path"
  BACKEND_PATH="./backend"
fi

cd "$BACKEND_PATH" || exit

# Restart backend (PM2 or manual)
if command -v pm2 &> /dev/null; then
  echo -e "${BLUE}🔄 Restarting PM2 process...${NC}"
  pm2 restart fuel-finder-api
  echo -e "${GREEN}✅ Backend restarted via PM2!${NC}"
else
  echo -e "${YELLOW}⚠️  PM2 not found. Please restart manually:${NC}"
  echo "   cd backend && node app.js"
fi

cd - > /dev/null

# ============================================
# DEPLOYMENT SUMMARY
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 FEATURES DEPLOYED:"
echo "   1. ✅ Fuel Prices Display on station cards"
echo "   2. ✅ Edit Station modal with fuel price editing"
echo "   3. ✅ Backend API endpoint: PUT /api/owner/stations/:id/fuel-price"
echo ""
echo "📁 FILES MODIFIED:"
echo "   Frontend:"
echo "   • OwnerDashboard.tsx (+240 lines)"
echo "   • OwnerDashboard.css (+204 lines)"
echo ""
echo "   Backend:"
echo "   • ownerController.js (+76 lines)"
echo "   • ownerRoutes.js (+8 lines)"
echo ""
echo "🧪 TESTING INSTRUCTIONS:"
echo "   1. Navigate to: https://ifuel-dangay-portal.netlify.app/owner/login"
echo "   2. Login with owner API key"
echo "   3. Click 'Stations' tab"
echo "   4. Verify fuel prices display on station cards"
echo "   5. Click 'Edit Station' button"
echo "   6. Update station details and fuel prices"
echo "   7. Save and verify changes persist"
echo ""
echo "📖 DOCUMENTATION:"
echo "   See OWNER_STATIONS_FEATURES.md for complete details"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
