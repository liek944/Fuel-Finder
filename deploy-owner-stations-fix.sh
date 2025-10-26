#!/bin/bash

# Deploy Owner Dashboard Stations Tab Fix
# Fixes TypeError: Cannot read properties of undefined (reading 'toFixed')

echo "🚀 Deploying Owner Dashboard Stations Tab Fix..."

# Navigate to frontend directory
cd frontend || exit

# Install dependencies (if needed)
echo "📦 Checking dependencies..."
npm install

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Frontend build successful!"
  
  # Optional: Deploy to Netlify (if you have netlify-cli installed)
  if command -v netlify &> /dev/null; then
    echo "🌐 Deploying to Netlify..."
    netlify deploy --prod
    echo "✅ Deployed to Netlify!"
  else
    echo "ℹ️  Netlify CLI not found. Please deploy manually or install netlify-cli:"
    echo "   npm install -g netlify-cli"
  fi
  
  echo ""
  echo "✅ FIX DEPLOYED SUCCESSFULLY!"
  echo ""
  echo "📋 What was fixed:"
  echo "   - Updated Station interface to match backend API response"
  echo "   - Changed from flat latitude/longitude to nested location.lat/lng"
  echo "   - Fixed .toFixed() error in Stations tab"
  echo ""
  echo "🧪 Test the fix:"
  echo "   1. Navigate to: https://ifuel-dangay-portal.netlify.app/owner/login"
  echo "   2. Login with your owner API key"
  echo "   3. Click on 'Stations' tab"
  echo "   4. Verify stations display correctly with coordinates"
  
else
  echo "❌ Build failed! Please check the errors above."
  exit 1
fi
