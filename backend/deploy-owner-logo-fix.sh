#!/bin/bash

# Deploy Owner Logo Fix
# Adds theme_config to owner detection middleware so logos display on login page

echo "🎨 Deploying Owner Logo Fix..."
echo "============================================"

# Navigate to backend directory
cd "$(dirname "$0")" || exit 1

echo ""
echo "📋 Changes:"
echo "  - Added theme_config to detectOwner SQL query"
echo "  - Added theme_config to optionalOwnerDetection SQL query"
echo "  - Enables /api/owner/info to return logoUrl and theme colors"
echo ""

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting backend with PM2..."
    pm2 restart fuel-finder-backend
    echo "✅ PM2 restart complete"
else
    echo "⚠️  PM2 not found. Please restart your backend manually:"
    echo "   npm start"
fi

echo ""
echo "============================================"
echo "✅ Deployment Complete!"
echo ""
echo "🧪 Test Commands:"
echo ""
echo "1. Test owner info endpoint (replace with your backend URL and subdomain):"
echo "   curl -s -H 'x-owner-domain: ifuel-dangay' https://fuelfinder.duckdns.org/api/owner/info | jq"
echo ""
echo "2. Check for theme_config in response:"
echo "   curl -s -H 'x-owner-domain: ifuel-dangay' https://fuelfinder.duckdns.org/api/owner/info | jq '.theme_config'"
echo ""
echo "3. Check for logoUrl specifically:"
echo "   curl -s -H 'x-owner-domain: ifuel-dangay' https://fuelfinder.duckdns.org/api/owner/info | jq '.theme_config.logoUrl'"
echo ""
echo "Expected output: Your logo URL or null (not undefined)"
echo ""
echo "📱 Frontend Testing:"
echo "   Navigate to: https://ifuel-dangay.fuelfinder.com/login"
echo "   Open browser DevTools → Network tab"
echo "   Look for /api/owner/info request"
echo "   Verify response includes theme_config with logoUrl"
echo ""
