#!/bin/bash

# Deploy Owner Reviews Bug Fix
# Fixes the issue where reviews don't appear in Owner Portal but work in Admin Portal
# 
# Bug: reviewController.js was accessing req.ownerId (which doesn't exist)
# Fix: Changed to req.ownerData.id (which is set by ownerAuth middleware)

echo "🚀 Deploying Owner Reviews Bug Fix..."
echo ""

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
  echo "❌ Error: Must run this script from the backend directory"
  exit 1
fi

# Backup current server
echo "📦 Creating backup..."
cp controllers/reviewController.js controllers/reviewController.js.backup.$(date +%Y%m%d_%H%M%S)

echo "✅ Backup created"
echo ""

# Show what changed
echo "📝 Changes made:"
echo "  - reviewController.js: Fixed req.ownerId → req.ownerData.id"
echo "  - getReviewsForOwner() function (line 317)"
echo "  - updateReviewStatusByOwner() function (line 354)"
echo ""

# Restart the server (assuming PM2)
echo "🔄 Restarting server..."

if command -v pm2 &> /dev/null; then
  pm2 restart fuel-finder-backend || pm2 restart all
  echo "✅ Server restarted with PM2"
elif command -v systemctl &> /dev/null; then
  sudo systemctl restart fuel-finder || echo "⚠️  Systemctl restart failed - please restart manually"
else
  echo "⚠️  Please restart your server manually"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing checklist:"
echo "  1. Login to Owner Portal with API key"
echo "  2. Navigate to Reviews tab"
echo "  3. Verify reviews appear (should show reviews for owner's stations)"
echo "  4. Test status filtering (All, Published, Rejected)"
echo "  5. Test station filtering"
echo "  6. Test hide/publish actions"
echo ""
echo "🔍 Check logs:"
echo "  pm2 logs fuel-finder-backend --lines 50"
echo ""
