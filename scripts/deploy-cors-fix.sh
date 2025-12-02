#!/bin/bash
###############################################################################
# CORS Fix Deployment Script
# Fixes CORS error by updating backend to read ALLOWED_ORIGINS from .env
###############################################################################

set -e  # Exit on error

echo "🔧 Deploying CORS Fix..."
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}➤${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verify .env has correct origins
print_status "Step 1: Verifying ALLOWED_ORIGINS in .env..."
cd backend
if grep -q "ALLOWED_ORIGINS=https://fuelfinderths.netlify.app" .env; then
    print_success "Netlify domain found in ALLOWED_ORIGINS"
else
    print_error "Netlify domain NOT found in .env"
    echo "Current ALLOWED_ORIGINS:"
    grep "ALLOWED_ORIGINS" .env || echo "NOT SET"
    exit 1
fi

# Restart backend with PM2
print_status "Step 2: Restarting backend..."
pm2 restart fuel-finder-backend
if [ $? -eq 0 ]; then
    print_success "Backend restarted"
    sleep 3  # Wait for stabilization
else
    print_error "Backend restart failed"
    exit 1
fi

# Check backend logs for CORS origins
print_status "Step 3: Verifying CORS configuration..."
sleep 2
CORS_LOG=$(pm2 logs fuel-finder-backend --lines 20 --nostream | grep "CORS allowed origins" | tail -1)
if [[ $CORS_LOG == *"fuelfinderths.netlify.app"* ]]; then
    print_success "CORS configured correctly"
    echo "$CORS_LOG"
else
    print_error "CORS configuration not detected in logs"
    echo "Recent logs:"
    pm2 logs fuel-finder-backend --lines 10 --nostream
fi

# Test backend health
print_status "Step 4: Testing backend health..."
HEALTH=$(curl -s http://localhost:3001/api/health)
if [[ $HEALTH == *"ok"* ]]; then
    print_success "Backend is healthy"
else
    print_error "Backend health check failed"
    exit 1
fi

# Test CORS headers
print_status "Step 5: Testing CORS headers..."
CORS_TEST=$(curl -s -I -H "Origin: https://fuelfinderths.netlify.app" http://localhost:3001/api/health | grep -i "access-control-allow-origin")
if [[ $CORS_TEST == *"access-control-allow-origin"* ]]; then
    print_success "CORS headers present"
    echo "$CORS_TEST"
else
    print_error "CORS headers NOT found"
    echo "Response headers:"
    curl -s -I -H "Origin: https://fuelfinderths.netlify.app" http://localhost:3001/api/health
fi

cd ..

echo ""
echo "=========================================="
echo -e "${GREEN}✓ CORS Fix Deployed!${NC}"
echo "=========================================="
echo ""
echo "📋 Changes Applied:"
echo "  • config/environment.js - Added allowedOrigins"
echo "  • app.js - Updated CORS to read from .env"
echo "  • Backend restarted with new configuration"
echo ""
echo "🔗 Allowed Origins:"
echo "  • https://fuelfinderths.netlify.app"
echo "  • https://fuelfinder.duckdns.org"
echo "  • http://localhost:3000"
echo "  • http://localhost:3001"
echo ""
echo "🧪 Test in Browser:"
echo "  1. Open https://fuelfinderths.netlify.app"
echo "  2. Check browser console for errors"
echo "  3. Verify stations and POIs load on map"
echo ""
echo "📝 Monitoring:"
echo "  • Backend logs: pm2 logs fuel-finder-backend"
echo "  • CORS warnings will show in logs if blocked"
echo ""
print_success "Deployment complete! 🎉"
