#!/bin/bash
# Deploy fix for price reports statistics not updating
# Issue: Missing fields in stats response (avg_price_all, most_reported_station, etc.)

echo "============================================"
echo "🔧 Deploying Price Reports Statistics Fix"
echo "============================================"
echo ""

# Change to backend directory
cd "$(dirname "$0")"

echo "📋 Fix Summary:"
echo "  ✓ Added most_reported_station field (missing in stats)"
echo "  ✓ Added most_reported_station_count field"
echo "  ✓ Added last_report_date field"
echo "  ✓ Added verification_rate calculation"
echo "  ✓ Fixed field naming mismatches:"
echo "    - average_price → avg_price_all"
echo "    - stations_with_reports → unique_stations_reported"
echo "    - reports_last_24h → reports_today"
echo "  ✓ Fixed response format (removed wrapper)"
echo ""

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting with PM2..."
    
    # Check if app is running in PM2
    if pm2 list | grep -q "backend"; then
        echo "   Restarting backend process..."
        pm2 restart backend
    else
        echo "   Starting new backend process..."
        pm2 start server_modular_entry.js --name backend
    fi
    
    echo "✅ PM2 restart complete"
    echo ""
    pm2 status
else
    echo "⚠️  PM2 not found. Manual restart required:"
    echo "   node server_modular_entry.js"
    echo ""
    echo "   OR if using legacy server:"
    echo "   node server.js"
fi

echo ""
echo "============================================"
echo "✅ Deployment Complete"
echo "============================================"
echo ""
echo "🧪 Test the fix:"
echo "   GET /api/admin/price-reports/stats"
echo ""
echo "Expected response fields:"
echo "  • total_reports"
echo "  • verified_reports"
echo "  • pending_reports"
echo "  • reports_today"
echo "  • unique_stations_reported"
echo "  • avg_price_all"
echo "  • most_reported_station ← NEW"
echo "  • most_reported_station_count ← NEW"
echo "  • last_report_date ← NEW"
echo "  • verification_rate ← NEW"
echo ""
echo "Files Modified:"
echo "  • backend/repositories/priceRepository.js"
echo "  • backend/controllers/adminController.js"
echo ""
