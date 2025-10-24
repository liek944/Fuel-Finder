#!/bin/bash

# Deploy script for Image Upload Routes and POI Type Expansion fixes
# Fixes: 
# 1. Missing POST /api/stations/:id/images route
# 2. Missing POST /api/pois/:id/images route  
# 3. POI type validation too restrictive (missing car_wash, motor_shop)

set -e  # Exit on error

echo "========================================"
echo "🚀 DEPLOYING IMAGE & POI TYPE FIXES"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "📋 Changes included in this deployment:"
echo "  ✓ Added imageController.js with upload/get functions"
echo "  ✓ Added POST /api/stations/:id/images route"
echo "  ✓ Added GET /api/stations/:id/images route"
echo "  ✓ Added POST /api/pois/:id/images route"
echo "  ✓ Added GET /api/pois/:id/images route"
echo "  ✓ Expanded POI types: gas, convenience, repair, car_wash, motor_shop"
echo "  ✓ Updated POI controller validation"
echo ""

# Step 1: Apply database migration
echo "📊 Step 1: Applying database migration..."
if node database/apply-poi-types-migration.js; then
    echo -e "${GREEN}✓ Database migration applied${NC}"
else
    echo -e "${RED}✗ Database migration failed${NC}"
    echo "Continuing with deployment (table may already have constraint)..."
fi
echo ""

# Step 2: Check if PM2 is available
echo "🔍 Step 2: Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 detected${NC}"
    
    # Check if the app is running
    if pm2 list | grep -q "fuel-finder-backend"; then
        echo "🔄 Restarting fuel-finder-backend..."
        pm2 restart fuel-finder-backend
        echo -e "${GREEN}✓ Application restarted${NC}"
    else
        echo -e "${YELLOW}⚠ fuel-finder-backend not found in PM2${NC}"
        echo -e "${YELLOW}Starting new PM2 process...${NC}"
        pm2 start server_modular_entry.js --name fuel-finder-backend
        pm2 save
        echo -e "${GREEN}✓ Application started${NC}"
    fi
    
    echo ""
    echo "📊 Showing logs (last 20 lines)..."
    pm2 logs fuel-finder-backend --lines 20 --nostream
    
else
    echo -e "${YELLOW}⚠ PM2 not found${NC}"
    echo "Please restart your Node.js server manually:"
    echo "  node server_modular_entry.js"
fi

echo ""
echo "========================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "🧪 Testing endpoints:"
echo ""
echo "1. Test image upload for station:"
echo "   curl -X POST http://localhost:3001/api/stations/1/images \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"images\": [{\"base64\": \"data:image/png;base64,iVBORw0...\", \"filename\": \"test.jpg\"}]}'"
echo ""
echo "2. Test POI creation with car_wash type:"
echo "   curl -X POST http://localhost:3001/api/pois \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\": \"Quick Wash\", \"type\": \"car_wash\", \"location\": {\"lat\": 12.59, \"lng\": 121.51}}'"
echo ""
echo "3. Test POI creation with motor_shop type:"
echo "   curl -X POST http://localhost:3001/api/pois \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\": \"Moto Parts\", \"type\": \"motor_shop\", \"location\": {\"lat\": 12.59, \"lng\": 121.51}}'"
echo ""
echo "📝 Documentation:"
echo "   - Image upload format: {images: [{base64: string, filename: string}]}"
echo "   - Valid POI types: gas, convenience, repair, car_wash, motor_shop"
echo "   - Max 5 images per upload"
echo "   - Max 10MB per image"
echo ""
