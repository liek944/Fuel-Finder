#!/bin/bash

# Deploy Toast Mobile UX Fix
# Date: 2025-10-28
# Fixes: Mobile toast taking over screen and appearing twice

echo "🎯 Deploying Toast Mobile UX Fix..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to frontend directory
cd "$(dirname "$0")" || exit 1

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🔨 Building production bundle...${NC}"
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Build successful!${NC}"
  echo ""
  echo "Changes deployed:"
  echo "  ✓ Fixed CSS media query conflicts"
  echo "  ✓ Added toast container for proper stacking"
  echo "  ✓ Implemented toast deduplication (1-second window)"
  echo "  ✓ Mobile toasts no longer take over screen"
  echo "  ✓ Toasts positioned above PWA button on mobile"
  echo ""
  echo "Next steps:"
  echo "  1. Test on mobile device or Chrome DevTools mobile view"
  echo "  2. Trigger routing with 'Go to Nearest' button"
  echo "  3. Verify toast appears once and stacks properly"
  echo "  4. Deploy to production: npm run deploy (if using Vercel/Netlify)"
else
  echo -e "${RED}❌ Build failed. Check errors above.${NC}"
  exit 1
fi
