#!/bin/bash

# ============================================
# Image Duplication Fix - Deployment Script
# ============================================
# Fixes SQL Cartesian Product causing image duplicates
# Adds DISTINCT to JSON_AGG for images in station/POI queries

set -e  # Exit on any error

echo "=========================================="
echo "IMAGE DUPLICATION FIX - DEPLOYMENT"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "repositories/stationRepository.js" ]; then
    echo -e "${RED}Error: Must run from backend directory${NC}"
    echo "Usage: cd backend && ./deploy-image-duplication-fix.sh"
    exit 1
fi

echo -e "${BLUE}Step 1: Backing up current files...${NC}"
BACKUP_DIR="backups/image-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp repositories/stationRepository.js "$BACKUP_DIR/"
cp repositories/poiRepository.js "$BACKUP_DIR/"
echo -e "${GREEN}✓ Backed up to: $BACKUP_DIR${NC}"
echo ""

echo -e "${BLUE}Step 2: Verifying fix is applied...${NC}"

# Check if DISTINCT is present in stationRepository
if grep -q "JSON_AGG(DISTINCT" repositories/stationRepository.js; then
    echo -e "${GREEN}✓ stationRepository.js has DISTINCT fix${NC}"
else
    echo -e "${RED}✗ stationRepository.js missing DISTINCT fix${NC}"
    echo -e "${YELLOW}Please apply the fix first!${NC}"
    exit 1
fi

# Check if DISTINCT is present in poiRepository
if grep -q "JSON_AGG(DISTINCT" repositories/poiRepository.js; then
    echo -e "${GREEN}✓ poiRepository.js has DISTINCT fix${NC}"
else
    echo -e "${RED}✗ poiRepository.js missing DISTINCT fix${NC}"
    echo -e "${YELLOW}Please apply the fix first!${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 3: Checking PM2 status...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 is installed${NC}"
    
    # Check if app is running
    if pm2 list | grep -q "fuel-finder-backend"; then
        echo -e "${BLUE}Step 4: Restarting application with PM2...${NC}"
        pm2 restart fuel-finder-backend
        echo -e "${GREEN}✓ Application restarted${NC}"
        echo ""
        
        echo -e "${BLUE}Step 5: Checking application status...${NC}"
        sleep 2
        pm2 status fuel-finder-backend
        echo ""
        
        echo -e "${BLUE}Step 6: Showing recent logs...${NC}"
        pm2 logs fuel-finder-backend --lines 20 --nostream
        
    else
        echo -e "${YELLOW}⚠ fuel-finder-backend not found in PM2${NC}"
        echo -e "${YELLOW}Starting new PM2 process...${NC}"
        pm2 start server_modular_entry.js --name fuel-finder-backend
        pm2 save
        echo -e "${GREEN}✓ Application started${NC}"
    fi
else
    echo -e "${YELLOW}⚠ PM2 not found, using manual restart${NC}"
    echo ""
    
    echo -e "${BLUE}Step 4: Killing old Node processes...${NC}"
    pkill -f "node.*server" || echo "No existing processes found"
    echo ""
    
    echo -e "${BLUE}Step 5: Starting application...${NC}"
    echo -e "${YELLOW}Note: Run this in a separate terminal or use PM2 for production${NC}"
    echo -e "${YELLOW}Command: node server_modular_entry.js${NC}"
    echo ""
    echo -e "${YELLOW}Would you like to start the server now? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        node server_modular_entry.js
    else
        echo -e "${YELLOW}Skipping server start. Start manually when ready.${NC}"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Testing Instructions:${NC}"
echo "1. Test station images:"
echo "   curl http://localhost:3000/api/stations | jq '.[] | {id, name, images: .images | length}'"
echo ""
echo "2. Test in browser:"
echo "   - Open Fuel Finder app"
echo "   - Click any station marker"
echo "   - Verify image carousel shows correct count (no duplicates)"
echo ""
echo "3. Check logs for errors:"
echo "   pm2 logs fuel-finder-backend --lines 50"
echo ""
echo -e "${BLUE}Rollback Instructions:${NC}"
echo "If issues occur, restore from backup:"
echo "   cp $BACKUP_DIR/stationRepository.js repositories/"
echo "   cp $BACKUP_DIR/poiRepository.js repositories/"
echo "   pm2 restart fuel-finder-backend"
echo ""
echo -e "${GREEN}✓ Fix applied successfully!${NC}"
