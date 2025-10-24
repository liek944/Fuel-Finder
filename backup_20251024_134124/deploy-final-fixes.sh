#!/bin/bash
# Deploy Final Database Query Fixes

echo "🔧 Deploying Final Database Fixes..."
echo ""
echo "Fixes included:"
echo "  ✅ stationRepository.js - Removed DISTINCT from JSON_AGG"
echo "  ✅ poiRepository.js - Removed non-existent columns"
echo ""

# Check if we're on EC2
if [ -f "/home/ubuntu/Fuel-FInder/backend/package.json" ]; then
    cd /home/ubuntu/Fuel-FInder/backend
    SERVER="EC2"
else
    cd /home/keil/fuel_finder/backend
    SERVER="LOCAL"
fi

echo "📍 Server: $SERVER"
echo ""

# Check PM2
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting with PM2..."
    pm2 restart fuel-finder
    
    echo ""
    echo "✅ Restarted successfully!"
    echo ""
    
    echo "📋 Server Status:"
    pm2 list | grep fuel-finder
    
    echo ""
    echo "📋 Recent Logs (watch for errors):"
    pm2 logs fuel-finder --lines 40 --nostream
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ ALL FIXES DEPLOYED!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🧪 Test now:"
    echo "  curl https://fuelfinder.duckdns.org/api/stations"
    echo "  curl https://fuelfinder.duckdns.org/api/pois"
    echo ""
    echo "🌐 Open frontend:"
    echo "  https://fuelfinder.duckdns.org"
    echo ""
    echo "📊 Monitor logs:"
    echo "  pm2 logs fuel-finder"
    
else
    echo "⚠️  PM2 not found, starting manually..."
    npm start
fi
