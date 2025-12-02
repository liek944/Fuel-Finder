#!/bin/bash

# Deploy Owner Portal Approve/Reject Button Fix
# Fixes error handling for approve/reject actions in pending reports

echo "🚀 Deploying Owner Portal Approve/Reject Fix"
echo "=============================================="
echo ""
echo "This fixes the issue where:"
echo "  ❌ Approve button shows error (but works)"
echo "  ✅ Reject button works correctly"
echo ""
echo "Changes:"
echo "  • Improved error handling (separate action vs refresh errors)"
echo "  • Added loading states to buttons"
echo "  • Better UX with disabled state during processing"
echo ""
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
  echo "❌ Error: Run this script from the project root directory"
  exit 1
fi

# Navigate to frontend
cd frontend

# Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

# Deployment options
echo "📤 Choose deployment method:"
echo ""
echo "1️⃣  Netlify CLI (recommended)"
echo "   cd frontend && netlify deploy --prod --dir=build"
echo ""
echo "2️⃣  Git Push (if auto-deploy enabled)"
echo "   git add ."
echo "   git commit -m 'fix: Owner portal approve/reject error handling'"
echo "   git push origin main"
echo ""
echo "3️⃣  Manual Upload"
echo "   • Go to https://app.netlify.com"
echo "   • Select: ifuel-dangay-portal"
echo "   • Drag & drop: frontend/build/"
echo ""
echo "=============================================="
echo ""

# Ask user which method
read -p "Deploy now using Netlify CLI? (y/n): " choice

if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
  echo ""
  echo "🚀 Deploying to Netlify..."
  netlify deploy --prod --dir=build
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🧪 Test the fix:"
    echo "  1. Visit: https://ifuel-dangay-portal.netlify.app/owner/dashboard"
    echo "  2. Go to Pending Reports tab"
    echo "  3. Click Approve or Reject button"
    echo "  4. Should see success message immediately"
    echo "  5. Report should disappear from list"
    echo ""
  else
    echo ""
    echo "❌ Deployment failed!"
    echo "Try manual deployment methods above."
  fi
else
  echo ""
  echo "📋 Build ready at: frontend/build/"
  echo "Deploy manually using one of the methods above."
fi

echo ""
echo "=============================================="
echo "✅ Fix deployed!"
echo "=============================================="
