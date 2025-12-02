#!/bin/bash

# Deploy Owner Portal 500 Error Fix to EC2
# Fixes PostgreSQL DISTINCT with JSONB issue in ownerController.js

set -e  # Exit on any error

echo "🚀 Deploying Owner Portal 500 Error Fix"
echo "========================================"
echo ""
echo "This fixes:"
echo "  ❌ 500 error on /api/owner/stations"
echo "  ❌ 500 error on /api/owner/price-reports/:id/verify"
echo "  ❌ Dashboard not loading station data"
echo ""
echo "Root cause: PostgreSQL DISTINCT with JSONB in ownerController.js"
echo "Solution: Remove DISTINCT from json_agg() calls"
echo ""
echo "========================================"
echo ""

# Configuration - UPDATE THESE!
EC2_HOST="${EC2_HOST:-fuelfinder.duckdns.org}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_KEY="${EC2_KEY:-~/.ssh/fuel-finder.pem}"
REMOTE_PATH="${REMOTE_PATH:-/home/ubuntu/fuel_finder}"
PM2_APP_NAME="${PM2_APP_NAME:-fuel-finder-api}"

# Check if SSH key exists
if [ ! -f "$EC2_KEY" ]; then
  echo "⚠️  Warning: SSH key not found at $EC2_KEY"
  echo "Please set EC2_KEY environment variable or update script"
  echo ""
  read -p "Continue with manual deployment instructions? (y/n): " choice
  if [ "$choice" != "y" ] && [ "$choice" != "Y" ]; then
    exit 1
  fi
  MANUAL_MODE=true
fi

# Check if we're in the right directory
if [ ! -f "backend/controllers/ownerController.js" ]; then
  echo "❌ Error: Run this script from the project root directory"
  echo "Current directory: $(pwd)"
  exit 1
fi

echo "📋 Deployment Configuration:"
echo "  • EC2 Host: $EC2_HOST"
echo "  • EC2 User: $EC2_USER"
echo "  • Remote Path: $REMOTE_PATH"
echo "  • PM2 App: $PM2_APP_NAME"
echo ""

if [ "$MANUAL_MODE" = true ]; then
  echo "📝 Manual Deployment Instructions:"
  echo ""
  echo "1. Upload the fixed file:"
  echo "   scp -i $EC2_KEY backend/controllers/ownerController.js $EC2_USER@$EC2_HOST:$REMOTE_PATH/backend/controllers/"
  echo ""
  echo "2. SSH into EC2:"
  echo "   ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
  echo ""
  echo "3. Restart PM2:"
  echo "   cd $REMOTE_PATH/backend"
  echo "   pm2 restart $PM2_APP_NAME"
  echo ""
  echo "4. Check logs:"
  echo "   pm2 logs $PM2_APP_NAME --lines 50"
  echo ""
  exit 0
fi

# Automatic deployment
read -p "Deploy to EC2 now? (y/n): " choice

if [ "$choice" != "y" ] && [ "$choice" != "Y" ]; then
  echo "Deployment cancelled."
  exit 0
fi

echo ""
echo "📤 Step 1: Uploading ownerController.js to EC2..."
scp -i "$EC2_KEY" backend/controllers/ownerController.js "$EC2_USER@$EC2_HOST:$REMOTE_PATH/backend/controllers/" || {
  echo "❌ Upload failed!"
  exit 1
}
echo "✅ File uploaded successfully"
echo ""

echo "🔄 Step 2: Restarting PM2 on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $REMOTE_PATH/backend && pm2 restart $PM2_APP_NAME" || {
  echo "❌ PM2 restart failed!"
  exit 1
}
echo "✅ PM2 restarted successfully"
echo ""

echo "📊 Step 3: Checking PM2 status..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pm2 status $PM2_APP_NAME"
echo ""

echo "📋 Step 4: Showing recent logs..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pm2 logs $PM2_APP_NAME --lines 20 --nostream"
echo ""

echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "🧪 Test the fix:"
echo ""
echo "1. API Test (dashboard):"
echo "   curl -X GET 'https://$EC2_HOST/api/owner/dashboard' \\"
echo "     -H 'x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=' \\"
echo "     -H 'x-owner-domain: ifuel-dangay'"
echo ""
echo "2. API Test (stations):"
echo "   curl -X GET 'https://$EC2_HOST/api/owner/stations' \\"
echo "     -H 'x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=' \\"
echo "     -H 'x-owner-domain: ifuel-dangay'"
echo ""
echo "3. Browser Test:"
echo "   • Visit: https://ifuel-dangay-portal.netlify.app"
echo "   • Login with API key"
echo "   • Check all tabs load (Overview, Stations, Pending Reports)"
echo "   • Try approving/rejecting a report"
echo ""
echo "Expected: All endpoints return 200 OK (no more 500 errors)"
echo ""
echo "📝 Full documentation: FIX_OWNER_500_ERROR.md"
echo "========================================"
