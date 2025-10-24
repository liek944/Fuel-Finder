#!/bin/bash
# Restart Fuel Finder Backend with Price Reporting Fix

echo "🔧 Restarting Fuel Finder Backend with Price Reporting Fix..."
echo ""

# Check if running locally or on server
if command -v pm2 &> /dev/null; then
    echo "📦 Detected PM2 - Restarting with PM2..."
    pm2 delete fuel-finder 2>/dev/null || true
    pm2 start server_modular_entry.js --name fuel-finder
    pm2 save
    echo ""
    echo "✅ Server restarted with PM2"
    echo ""
    echo "📊 PM2 Status:"
    pm2 list
    echo ""
    echo "📋 Recent Logs:"
    pm2 logs fuel-finder --lines 20 --nostream
else
    echo "🖥️  Local Development - Starting with npm..."
    npm start
fi

echo ""
echo "✅ Backend is now using modular architecture with price reporting routes!"
echo ""
echo "🧪 Test the fix with:"
echo "   curl -X POST http://localhost:3001/api/stations/52/report-price \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"fuel_type\":\"Regular\",\"price\":65.5}'"
echo ""
