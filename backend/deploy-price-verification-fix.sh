#!/bin/bash

# Deploy Price Verification Fix
# Fixes the bug where verifying reports doesn't show "(community)" indicator
# and admin verification doesn't update actual fuel prices

echo "🚀 Deploying Price Verification Fix"
echo "===================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the backend directory."
  exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "❌ Error: PM2 is not installed"
  exit 1
fi

echo "📋 Changes being deployed:"
echo "  1. ownerController.js - Added price_updated_by='community' field"
echo "  2. priceRepository.js - Fixed admin verification to update fuel_prices table"
echo ""

# Restart the backend
echo "🔄 Restarting backend with PM2..."
pm2 restart fuel-finder-backend

# Wait for restart
sleep 3

# Check status
echo ""
echo "📊 PM2 Status:"
pm2 list | grep fuel-finder

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🧪 How to Test:"
echo "  1. Go to owner dashboard: ifuel-dangay-portal.netlify.app"
echo "  2. Verify a pending price report"
echo "  3. Check map - price should update with '(community)' indicator"
echo ""
echo "📝 What was fixed:"
echo "  • Owner verification now sets price_updated_by='community'"
echo "  • Admin verification now actually updates fuel_prices table"
echo "  • Both now properly set is_community=TRUE flag"
echo ""
echo "🔍 Check logs:"
echo "  pm2 logs fuel-finder-backend --lines 50"
