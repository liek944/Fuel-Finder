#!/bin/bash

echo "🔄 Deploying POI Interface Fix (Frontend)..."
echo ""
echo "This fix updates AdminPortal POI TypeScript interface to include address, phone, and operating_hours."
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Building frontend..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build successful!"
  echo ""
  echo "📋 Changes deployed:"
  echo "   - frontend/src/components/AdminPortal.tsx (POI interface updated)"
  echo "   - Removed type assertions: (poi as any).address → poi.address"
  echo ""
  echo "🚀 Deploy to Netlify:"
  echo "   netlify deploy --prod --dir=dist"
  echo ""
else
  echo ""
  echo "❌ Build failed. Deployment aborted."
  exit 1
fi
