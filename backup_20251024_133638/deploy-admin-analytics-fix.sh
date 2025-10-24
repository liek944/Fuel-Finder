#!/bin/bash

# Admin Analytics & Price Reports Fix Deployment Script
# Fixes 404 errors for user analytics and price management in admin portal
# Date: 2024-10-24

set -e  # Exit on any error

echo "=========================================="
echo "Admin Analytics & Price Reports Fix"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will deploy:${NC}"
echo "1. New userRepository.js for user analytics"
echo "2. Updated adminController.js with user analytics & fixed pagination"
echo "3. Updated adminRoutes.js with new routes"
echo "4. Updated priceRepository.js with getAllPriceReports function"
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run from backend directory.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend directory confirmed${NC}"
echo ""

# Backup current files
echo "Creating backup..."
BACKUP_DIR="backups/admin-analytics-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup files that will be modified
if [ -f "controllers/adminController.js" ]; then
    cp controllers/adminController.js "$BACKUP_DIR/"
    echo "  ✓ Backed up adminController.js"
fi

if [ -f "routes/adminRoutes.js" ]; then
    cp routes/adminRoutes.js "$BACKUP_DIR/"
    echo "  ✓ Backed up adminRoutes.js"
fi

if [ -f "repositories/priceRepository.js" ]; then
    cp repositories/priceRepository.js "$BACKUP_DIR/"
    echo "  ✓ Backed up priceRepository.js"
fi

echo -e "${GREEN}✓ Backup created in $BACKUP_DIR${NC}"
echo ""

# Check if files exist
echo "Verifying modified files..."
MISSING_FILES=0

if [ ! -f "repositories/userRepository.js" ]; then
    echo -e "${RED}✗ repositories/userRepository.js not found${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -f "controllers/adminController.js" ]; then
    echo -e "${RED}✗ controllers/adminController.js not found${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -f "routes/adminRoutes.js" ]; then
    echo -e "${RED}✗ routes/adminRoutes.js not found${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -f "repositories/priceRepository.js" ]; then
    echo -e "${RED}✗ repositories/priceRepository.js not found${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "${RED}Error: $MISSING_FILES required file(s) missing${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All required files present${NC}"
echo ""

# Restart the backend service
echo "Restarting backend service..."

if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    
    # Check if app is running
    if pm2 list | grep -q "fuel-finder-backend"; then
        pm2 restart fuel-finder-backend
        echo -e "${GREEN}✓ PM2 service restarted${NC}"
    else
        echo -e "${YELLOW}Warning: PM2 app 'fuel-finder-backend' not found${NC}"
        echo "You may need to start it manually with:"
        echo "  pm2 start server_modular_entry.js --name fuel-finder-backend"
    fi
    
    # Show logs
    echo ""
    echo "Checking logs..."
    pm2 logs fuel-finder-backend --lines 20 --nostream
    
elif command -v systemctl &> /dev/null; then
    echo "Using systemd..."
    sudo systemctl restart fuel-finder-backend
    echo -e "${GREEN}✓ Systemd service restarted${NC}"
    
    # Show status
    sudo systemctl status fuel-finder-backend --no-pager -l
    
else
    echo -e "${YELLOW}Warning: No service manager found (PM2 or systemd)${NC}"
    echo "Please restart your backend service manually"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "New endpoints available:"
echo "  GET  /api/admin/users/stats        - User statistics"
echo "  GET  /api/admin/users/active       - Active users list"
echo "  GET  /api/admin/users/activity     - User activity logs"
echo "  GET  /api/admin/price-reports      - All price reports with filters"
echo ""
echo "Fixed endpoints:"
echo "  GET  /api/admin/price-reports/pending - Now returns proper pagination"
echo ""
echo "Next steps:"
echo "1. Test the admin portal user analytics"
echo "2. Test the price reports management"
echo "3. Check PM2 logs for any errors"
echo ""
echo "To rollback if needed:"
echo "  cp $BACKUP_DIR/* [original locations]"
echo "  pm2 restart fuel-finder-backend"
echo ""
