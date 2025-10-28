#!/bin/bash

# Deploy Review Widget Fix
# Fixes: 1) TypeError in API calls, 2) Popup disappearing when buttons clicked
# Date: October 28, 2024

set -e

echo "=================================================="
echo "🔧 DEPLOYING REVIEW WIDGET POPUP FIX"
echo "=================================================="
echo ""
echo "Issues Fixed:"
echo "✓ TypeError: Cannot read properties of undefined (reading 'startsWith')"
echo "✓ Review widget disappearing when buttons clicked"
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
  echo "❌ Error: Must run from project root directory"
  exit 1
fi

# Navigate to frontend
cd frontend

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Building frontend..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "=================================================="
echo "📋 DEPLOYMENT STEPS"
echo "=================================================="
echo ""
echo "Frontend build is ready in: frontend/dist/"
echo ""
echo "OPTION 1: Manual Netlify Deploy"
echo "  1. Go to Netlify dashboard"
echo "  2. Drag and drop the 'dist' folder"
echo "  3. Wait for deployment to complete"
echo ""
echo "OPTION 2: Netlify CLI Deploy"
echo "  cd frontend"
echo "  netlify deploy --prod --dir=dist"
echo ""
echo "OPTION 3: Git Push (if auto-deploy enabled)"
echo "  git add ."
echo "  git commit -m 'fix: Review widget API calls and popup persistence'"
echo "  git push origin main"
echo ""
echo "=================================================="
echo "🧪 TESTING CHECKLIST"
echo "=================================================="
echo ""
echo "After deployment, test the following:"
echo ""
echo "✓ Open browser console (F12) - No TypeError errors"
echo "✓ Click station marker"
echo "✓ Review summary loads without errors"
echo "✓ Click 'View All Reviews' - popup stays open"
echo "✓ Click 'Write a Review' - popup stays open"
echo "✓ Select rating stars - popup stays open"
echo "✓ Click 'Submit' - popup stays open, review submits"
echo "✓ Click 'Cancel' - popup stays open, form closes"
echo "✓ Click '✕' close - popup stays open, form closes"
echo ""
echo "=================================================="
echo "📄 Documentation"
echo "=================================================="
echo ""
echo "Full fix details: DOCUMENTATIONS AND CONTEXT/FIXES/REVIEW_WIDGET_POPUP_FIX.md"
echo ""
echo "Related fixes:"
echo "  - EDIT_BUTTON_POPUP_FIX.md (same pattern)"
echo "  - REVIEWS_SYSTEM_DOCUMENTATION.md (full system)"
echo ""
echo "✅ DEPLOYMENT SCRIPT COMPLETE"
echo "=================================================="
