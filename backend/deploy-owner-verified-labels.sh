#!/bin/bash

# Deploy Owner-Verified Price Labels Update
# Differentiates between owner verification and community verification

echo "🚀 Deploying Owner-Verified Labels Update"
echo "=========================================="
echo ""

echo "📋 Changes Summary:"
echo "  Backend:"
echo "    • ownerController.js - Changed price_updated_by from 'community' to 'owner'"
echo "    • is_community flag now set to FALSE for owner verifications"
echo ""
echo "  Frontend:"
echo "    • MainApp.tsx - Added '(verified by owner)' label in blue"
echo "    • AdminPortal.tsx - Added '(verified by owner)' label in blue"
echo "    • Kept '(community)' label in gray for admin verifications"
echo ""

# Backend deployment
if [ -f "package.json" ]; then
  echo "🔧 Restarting backend..."
  pm2 restart fuel-finder-backend
  sleep 2
  echo "✅ Backend restarted"
else
  echo "⚠️  Not in backend directory, skipping backend restart"
fi

echo ""
echo "📦 Frontend deployment needed:"
echo "  cd ../frontend"
echo "  npm run build"
echo "  # Deploy to Netlify"
echo ""

echo "✅ Backend deployment complete!"
echo ""
echo "🎨 Visual Changes:"
echo "  Owner verified:     ₱65.50/L (verified by owner) [BLUE]"
echo "  Community verified: ₱65.50/L (community) [GRAY]"
echo ""
echo "🧪 Test:"
echo "  1. Submit price report via MainApp"
echo "  2. Verify via Owner Dashboard → Shows '(verified by owner)' in blue"
echo "  3. Verify via Admin Portal → Shows '(community)' in gray"
