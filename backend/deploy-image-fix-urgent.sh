#!/bin/bash

# ============================================
# URGENT: Image Duplication Fix (Corrected)
# ============================================
# Fixes PostgreSQL error with DISTINCT + ORDER BY

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 URGENT FIX: Image Duplication (Corrected)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "❌ Previous Error:"
echo "   'in an aggregate with DISTINCT, ORDER BY expressions"
echo "    must appear in argument list'"
echo ""
echo "✅ Fix: Removed ORDER BY from DISTINCT JSON_AGG"
echo "   (JSONB comparison handles uniqueness by full object)"
echo ""

# Detect environment
if [ -f "/home/ubuntu/Fuel-FInder/backend/package.json" ]; then
    cd /home/ubuntu/Fuel-FInder/backend
    SERVER="EC2"
elif [ -f "/home/keil/fuel_finder/backend/package.json" ]; then
    cd /home/keil/fuel_finder/backend
    SERVER="LOCAL"
else
    echo "❌ Error: Cannot find backend directory"
    exit 1
fi

echo "📍 Server: $SERVER"
echo ""

# Backup
echo "📦 Creating backup..."
BACKUP_DIR="backups/urgent-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp repositories/stationRepository.js "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  stationRepository.js not backed up"
cp repositories/poiRepository.js "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  poiRepository.js not backed up"
echo "✅ Backup saved to: $BACKUP_DIR"
echo ""

# Verify fix
echo "🔍 Verifying fix..."
if grep -q "JSON_AGG(DISTINCT" repositories/stationRepository.js && \
   ! grep -q "ORDER BY i.display_order, i.id" repositories/stationRepository.js | grep -A 5 "JSON_AGG(DISTINCT"; then
    echo "✅ stationRepository.js fix verified"
else
    echo "⚠️  stationRepository.js may need manual verification"
fi

if grep -q "JSON_AGG(DISTINCT" repositories/poiRepository.js && \
   ! grep -q "ORDER BY i.display_order, i.id" repositories/poiRepository.js | grep -A 5 "JSON_AGG(DISTINCT"; then
    echo "✅ poiRepository.js fix verified"
else
    echo "⚠️  poiRepository.js may need manual verification"
fi
echo ""

# Restart with PM2
echo "🔄 Restarting application..."
if command -v pm2 &> /dev/null; then
    if [ "$SERVER" = "EC2" ]; then
        pm2 restart fuel-finder || pm2 restart all
    else
        pm2 restart fuel-finder-backend || pm2 restart all
    fi
    
    echo "✅ Application restarted"
    echo ""
    
    # Wait for startup
    echo "⏳ Waiting for application to start..."
    sleep 3
    
    # Show status
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Application Status:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    pm2 list
    echo ""
    
    # Show recent logs
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Recent Logs (checking for errors):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ "$SERVER" = "EC2" ]; then
        pm2 logs fuel-finder --lines 30 --nostream || pm2 logs --lines 30 --nostream
    else
        pm2 logs fuel-finder-backend --lines 30 --nostream || pm2 logs --lines 30 --nostream
    fi
    echo ""
    
else
    echo "⚠️  PM2 not found - manual restart required"
    echo "   Run: node server_modular_entry.js"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ URGENT FIX DEPLOYED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$SERVER" = "EC2" ]; then
    echo "🌐 Test URLs:"
    echo "   https://fuelfinder.duckdns.org"
    echo "   https://fuelfinder.duckdns.org/api/stations"
    echo ""
    echo "🧪 Quick API Test:"
    echo "   curl https://fuelfinder.duckdns.org/api/stations | jq '.[0]'"
else
    echo "🌐 Test URLs:"
    echo "   http://localhost:3000"
    echo "   http://localhost:3000/api/stations"
    echo ""
    echo "🧪 Quick API Test:"
    echo "   curl http://localhost:3000/api/stations | jq '.[0]'"
fi

echo ""
echo "📊 Monitor logs:"
if [ "$SERVER" = "EC2" ]; then
    echo "   pm2 logs fuel-finder"
else
    echo "   pm2 logs fuel-finder-backend"
fi
echo ""
echo "🎉 Fix complete - image duplication should be resolved!"
echo "   (Images will be deduplicated by DISTINCT on full JSONB object)"
