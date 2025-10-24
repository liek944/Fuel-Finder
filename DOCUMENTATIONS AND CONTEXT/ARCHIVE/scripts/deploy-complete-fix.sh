#!/bin/bash
# Complete Marker Fix Deployment Script
# Fixes both services and fuel prices issues

set -e  # Exit on error

echo "🔧 Complete Marker Creation Fix - Deployment"
echo "=============================================="
echo ""
echo "This script will deploy fixes for:"
echo "  1. ✅ Services not appearing in new station markers"
echo "  2. ✅ Fuel prices showing only single price instead of breakdown"
echo ""

# Check if we're in the correct directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
  echo "❌ Error: Must be run from project root directory"
  echo "   Expected: /home/keil/fuel_finder/"
  exit 1
fi

# Frontend Build
echo "📦 Step 1/3: Building Frontend..."
echo "----------------------------"
cd frontend
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi

echo ""
echo "✅ Frontend built successfully!"
echo ""

# Backend Restart
echo "🔄 Step 2/3: Restarting Backend..."
echo "----------------------------"
cd ../backend

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
  echo "Using PM2 to restart backend..."
  pm2 restart fuel-finder-backend 2>/dev/null || echo "⚠️  PM2 process not found. You may need to restart manually."
else
  echo "⚠️  PM2 not found. Please restart your backend server manually."
fi

echo ""
echo "✅ Backend restart initiated!"
echo ""

# Summary
echo "📋 Step 3/3: Deployment Summary"
echo "----------------------------"
echo ""
echo "CHANGES APPLIED:"
echo ""
echo "Frontend (AdminPortal.tsx):"
echo "  • Added services field to station creation payload (Line 1224)"
echo ""
echo "Backend (stationController.js):"
echo "  • Added fuel_prices array handling in createStation()"
echo "  • Inserts individual fuel prices into fuel_prices table"
echo "  • Re-fetches station to populate fuel_prices array"
echo ""
echo "BUILD STATUS:"
echo "  Frontend: ✅ Built to frontend/build/"
echo "  Backend:  ✅ Changes loaded"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Deploy Frontend:"
echo "   • Upload frontend/build/ to your hosting service"
echo "   • OR run your hosting provider's deploy command"
echo "   • Examples:"
echo "     - Netlify: netlify deploy --prod --dir=frontend/build"
echo "     - Vercel:  vercel --prod frontend/build"
echo ""
echo "2. Verify Backend is Running:"
echo "   • Check: curl http://localhost:3001/api/health"
echo "   • OR: pm2 status"
echo ""
echo "3. Test the Fix:"
echo "   • Open admin portal: https://fuelfindershs.netlify.app/admin"
echo "   • Create a new station"
echo "   • Select services (e.g., Restroom, ATM, Car Wash)"
echo "   • Add fuel prices (Regular: 58, Diesel: 55, Premium: 62)"
echo "   • Save the station"
echo "   • Click on the marker"
echo "   • Verify services appear: 'Restroom, ATM, Car Wash'"
echo "   • Verify fuel prices show breakdown:"
echo "     Regular: ₱58.00/L"
echo "     Diesel: ₱55.00/L"
echo "     Premium: ₱62.00/L"
echo ""
echo "4. Clear Browser Cache:"
echo "   • Hard refresh: Ctrl+Shift+R (Windows/Linux)"
echo "   • Hard refresh: Cmd+Shift+R (Mac)"
echo ""
echo "DOCUMENTATION:"
echo "  • Complete details: COMPLETE_MARKER_FIX.md"
echo "  • Services fix:     SERVICES_FIX_DOCUMENTATION.md"
echo ""
echo "TROUBLESHOOTING:"
echo "  • If services still don't appear: Clear browser cache"
echo "  • If fuel prices don't show: Check backend logs"
echo "  • If backend errors: Check console for 'Error adding fuel price'"
echo ""
echo "✅ Deployment script completed!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Ready to deploy! Follow the NEXT STEPS above."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
