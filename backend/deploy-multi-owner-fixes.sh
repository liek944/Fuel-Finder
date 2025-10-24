#!/bin/bash

# Multi-Owner Backend Fixes Deployment Script
# Fixes database imports and adds per-owner rate limiting

set -e

echo "========================================"
echo "Multi-Owner System Backend Fixes"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from backend directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Changes being deployed:${NC}"
echo "  1. Fixed ownerAuth.js database import (db → pool)"
echo "  2. Fixed ownerDetection.js database query (db → pool)"
echo "  3. Added per-owner rate limiting (ownerRateLimiter.js)"
echo "  4. Updated ownerRoutes.js to use per-owner rate limiter"
echo ""

# Verify required files exist
echo -e "${YELLOW}🔍 Verifying files...${NC}"

if [ ! -f "middleware/ownerAuth.js" ]; then
    echo -e "${RED}❌ Missing: middleware/ownerAuth.js${NC}"
    exit 1
fi

if [ ! -f "middleware/ownerDetection.js" ]; then
    echo -e "${RED}❌ Missing: middleware/ownerDetection.js${NC}"
    exit 1
fi

if [ ! -f "middleware/ownerRateLimiter.js" ]; then
    echo -e "${RED}❌ Missing: middleware/ownerRateLimiter.js${NC}"
    exit 1
fi

if [ ! -f "routes/ownerRoutes.js" ]; then
    echo -e "${RED}❌ Missing: routes/ownerRoutes.js${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All files present${NC}"
echo ""

# Check current process
echo -e "${YELLOW}🔍 Checking current process...${NC}"
if pm2 list | grep -q "fuel-finder-api"; then
    APP_NAME="fuel-finder-api"
    echo -e "${GREEN}✅ Found PM2 process: $APP_NAME${NC}"
else
    echo -e "${YELLOW}⚠️  No PM2 process found. Will need manual restart.${NC}"
    APP_NAME=""
fi
echo ""

# Backup current files
echo -e "${YELLOW}📦 Creating backup...${NC}"
BACKUP_DIR="backups/multi-owner-fixes-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -f "middleware/ownerAuth.js" ] && cp middleware/ownerAuth.js "$BACKUP_DIR/"
[ -f "middleware/ownerDetection.js" ] && cp middleware/ownerDetection.js "$BACKUP_DIR/"
[ -f "routes/ownerRoutes.js" ] && cp routes/ownerRoutes.js "$BACKUP_DIR/"
echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
echo ""

# Show what changed
echo -e "${YELLOW}📝 Changes applied:${NC}"
echo ""
echo "File: middleware/ownerAuth.js"
echo "  - Import: const db = require('../database/db') → const { pool } = require('../config/database')"
echo ""
echo "File: middleware/ownerDetection.js"
echo "  - Query: db.query(...) → pool.query(...)"
echo ""
echo "File: middleware/ownerRateLimiter.js (NEW)"
echo "  - Per-owner rate limiting: 100 requests/min per owner"
echo "  - Isolated buckets prevent one owner affecting others"
echo ""
echo "File: routes/ownerRoutes.js"
echo "  - Added: const ownerRateLimit = require('../middleware/ownerRateLimiter')"
echo "  - Added: router.use(ownerRateLimit)"
echo ""

# Confirm deployment
read -p "Deploy these changes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🚀 Deploying changes...${NC}"

# Files are already in place (edited by Cascade)
echo -e "${GREEN}✅ Files updated${NC}"

# Restart application
if [ -n "$APP_NAME" ]; then
    echo ""
    echo -e "${YELLOW}🔄 Restarting application...${NC}"
    pm2 restart $APP_NAME
    
    # Wait a moment for restart
    sleep 2
    
    # Check status
    if pm2 list | grep -q "online.*$APP_NAME"; then
        echo -e "${GREEN}✅ Application restarted successfully${NC}"
    else
        echo -e "${RED}❌ Application may have failed to restart. Check logs:${NC}"
        echo "   pm2 logs $APP_NAME"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}⚠️  Manual restart required:${NC}"
    echo "   pm2 restart fuel-finder-api"
    echo "   OR"
    echo "   npm start"
fi

echo ""
echo -e "${GREEN}========================================"
echo "✅ Deployment Complete!"
echo "========================================${NC}"
echo ""
echo "📊 Multi-Owner System Status:"
echo "   Backend: ✅ Ready"
echo "   Frontend: ❌ Not yet implemented"
echo ""
echo "🔧 Owner Rate Limits:"
echo "   Public API: 10 requests/minute"
echo "   Admin API: 60 requests/minute"
echo "   Owner API: 100 requests/minute per owner"
echo ""
echo "🧪 Test owner endpoints:"
echo "   1. Create owner account in database"
echo "   2. Assign stations to owner"
echo "   3. Test with subdomain + API key:"
echo "      curl -H 'Host: ownerdomain.fuelfinder.com' \\"
echo "           -H 'x-api-key: API_KEY_HERE' \\"
echo "           https://fuelfinder.duckdns.org/api/owner/dashboard"
echo ""
echo "📋 Check logs:"
echo "   pm2 logs $APP_NAME"
echo ""
echo "🔙 Rollback (if needed):"
echo "   cp $BACKUP_DIR/ownerAuth.js middleware/"
echo "   cp $BACKUP_DIR/ownerDetection.js middleware/"
echo "   cp $BACKUP_DIR/ownerRoutes.js routes/"
echo "   rm middleware/ownerRateLimiter.js"
echo "   pm2 restart $APP_NAME"
echo ""
echo "📖 Documentation:"
echo "   See DOCUMENTATIONS AND CONTEXT/MULTI_OWNER_SYSTEM_GUIDE.md"
echo ""
