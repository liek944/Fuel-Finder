#!/bin/bash

# Admin Dashboard Rate Limit Fix Deployment Script
# Fixes 429 errors caused by auto-refresh hitting rate limits

set -e

echo "========================================"
echo "Admin Rate Limit Fix Deployment"
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
echo "  1. New admin rate limiter (60 requests/min)"
echo "  2. Updated admin routes to use new limiter"
echo ""

# Verify required files exist
echo -e "${YELLOW}🔍 Verifying files...${NC}"

if [ ! -f "middleware/adminRateLimiter.js" ]; then
    echo -e "${RED}❌ Missing: middleware/adminRateLimiter.js${NC}"
    exit 1
fi

if [ ! -f "routes/adminRoutes.js" ]; then
    echo -e "${RED}❌ Missing: routes/adminRoutes.js${NC}"
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

# Backup current files (optional but recommended)
echo -e "${YELLOW}📦 Creating backup...${NC}"
BACKUP_DIR="backups/rate-limit-fix-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -f "routes/adminRoutes.js" ] && cp routes/adminRoutes.js "$BACKUP_DIR/"
echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
echo ""

# Show what will change
echo -e "${YELLOW}📝 Changes to be applied:${NC}"
echo ""
echo "File: routes/adminRoutes.js"
echo "  - Import: rateLimiter → adminRateLimiter"
echo "  - Middleware: rateLimit → adminRateLimit"
echo ""
echo "File: middleware/adminRateLimiter.js (NEW)"
echo "  - Rate limit: 10/min → 60/min"
echo "  - Window: 60 seconds"
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

# Files are already in place (edited by Cascade), just need to restart
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
echo "📊 New Rate Limits:"
echo "   Admin API: 60 requests/minute"
echo "   Public API: 10 requests/minute (unchanged)"
echo ""
echo "🧪 Test the fix:"
echo "   1. Open admin dashboard"
echo "   2. Navigate to User Analytics"
echo "   3. Wait 2+ minutes with auto-refresh enabled"
echo "   4. Check console - no 429 errors should appear"
echo ""
echo "📋 Check logs:"
echo "   pm2 logs $APP_NAME"
echo ""
echo "🔙 Rollback (if needed):"
echo "   cp $BACKUP_DIR/adminRoutes.js routes/"
echo "   rm middleware/adminRateLimiter.js"
echo "   pm2 restart $APP_NAME"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Frontend also needs rebuild/redeploy${NC}"
echo "   UserAnalytics.tsx refresh interval: 10s → 30s"
echo "   Run: cd ../frontend && npm run build"
echo ""
