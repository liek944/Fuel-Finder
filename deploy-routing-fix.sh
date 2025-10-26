#!/bin/bash

# Deploy Routing Line Fix
# This script fixes the missing /api/route endpoint and adds debug logging to the frontend

echo "🔧 Deploying Routing Line Fix..."
echo ""

# Step 1: Restart backend to load new route
echo "📦 Step 1: Restarting backend..."
cd backend || exit 1

# Kill any existing backend processes
echo "   • Stopping existing backend processes..."
pkill -f "node.*server" || true
pkill -f "npm.*start" || true
sleep 2

# Start backend
echo "   • Starting backend..."
npm start &
BACKEND_PID=$!
echo "   ✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "   • Waiting for backend to be ready..."
sleep 5

cd ..

# Step 2: Rebuild frontend
echo ""
echo "🎨 Step 2: Rebuilding frontend with debug logging..."
cd frontend || exit 1

echo "   • Installing dependencies (if needed)..."
npm install --silent

echo "   • Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "   ✅ Frontend build successful"
else
    echo "   ❌ Frontend build failed"
    exit 1
fi

cd ..

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing instructions:"
echo "1. Open browser console (F12)"
echo "2. Click 'Route' button on any station marker"
echo "3. Look for these console messages:"
echo "   🗺️ Fetching route from: [URL]"
echo "   📍 Route data received: [data]"
echo "   📍 Coordinates count: [number]"
echo "   🔄 RouteData state changed: [object]"
echo ""
echo "4. You should see a BLUE LINE with moving arrows between your location and the station"
echo ""
echo "If the line still doesn't appear, check console for errors and report them."
echo ""
