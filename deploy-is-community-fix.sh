#!/bin/bash

# Deploy is_community Column Fix to EC2
# Adds missing is_community column to fuel_prices table

set -e

echo "🚀 Deploying is_community Column Fix"
echo "====================================="
echo ""
echo "This fixes:"
echo "  ❌ column 'is_community' does not exist error"
echo "  ❌ 500 error on /api/owner/stations"
echo "  ❌ 500 error on /api/owner/price-reports/:id/verify"
echo ""
echo "Solution: Add is_community column to fuel_prices table"
echo ""
echo "====================================="
echo ""

# Configuration
EC2_HOST="${EC2_HOST:-fuelfinder.duckdns.org}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_KEY="${EC2_KEY:-~/.ssh/fuel-finder.pem}"
REMOTE_PATH="${REMOTE_PATH:-/home/ubuntu/Fuel-FInder}"

# Check if files exist
if [ ! -f "backend/database/migrations/007_add_is_community_to_fuel_prices.sql" ]; then
  echo "❌ Error: Migration file not found"
  exit 1
fi

if [ ! -f "backend/database/apply-migration-007.js" ]; then
  echo "❌ Error: Migration script not found"
  exit 1
fi

echo "📋 What will be deployed:"
echo "  • Migration 007 SQL file"
echo "  • Migration application script"
echo ""
echo "📋 Deployment target:"
echo "  • EC2 Host: $EC2_HOST"
echo "  • Remote Path: $REMOTE_PATH"
echo ""

read -p "Deploy to EC2 now? (y/n): " choice

if [ "$choice" != "y" ] && [ "$choice" != "Y" ]; then
  echo ""
  echo "📝 Manual deployment instructions:"
  echo ""
  echo "1. Upload migration files:"
  echo "   scp -i $EC2_KEY \\"
  echo "     backend/database/migrations/007_add_is_community_to_fuel_prices.sql \\"
  echo "     backend/database/apply-migration-007.js \\"
  echo "     $EC2_USER@$EC2_HOST:$REMOTE_PATH/backend/database/"
  echo ""
  echo "2. SSH into EC2:"
  echo "   ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
  echo ""
  echo "3. Run migration:"
  echo "   cd $REMOTE_PATH/backend/database"
  echo "   node apply-migration-007.js"
  echo ""
  echo "4. Verify:"
  echo "   pm2 logs fuel-finder --lines 30"
  echo ""
  exit 0
fi

echo ""
echo "📤 Step 1: Uploading migration SQL..."
scp -i "$EC2_KEY" \
  backend/database/migrations/007_add_is_community_to_fuel_prices.sql \
  "$EC2_USER@$EC2_HOST:$REMOTE_PATH/backend/database/migrations/" || {
  echo "❌ Upload failed!"
  exit 1
}
echo "✅ Migration SQL uploaded"
echo ""

echo "📤 Step 2: Uploading migration script..."
scp -i "$EC2_KEY" \
  backend/database/apply-migration-007.js \
  "$EC2_USER@$EC2_HOST:$REMOTE_PATH/backend/database/" || {
  echo "❌ Upload failed!"
  exit 1
}
echo "✅ Migration script uploaded"
echo ""

echo "⚙️  Step 3: Running migration on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
  "cd $REMOTE_PATH/backend/database && node apply-migration-007.js" || {
  echo "❌ Migration failed!"
  echo ""
  echo "Check EC2 logs:"
  echo "  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
  echo "  cd $REMOTE_PATH/backend"
  echo "  pm2 logs fuel-finder"
  exit 1
}
echo ""

echo "🔄 Step 4: Restarting backend..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
  "cd $REMOTE_PATH/backend && pm2 restart fuel-finder" || {
  echo "⚠️  Warning: PM2 restart failed, but migration was successful"
}
echo "✅ Backend restarted"
echo ""

echo "📊 Step 5: Checking logs..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
  "pm2 logs fuel-finder --lines 20 --nostream"
echo ""

echo "====================================="
echo "✅ Migration Complete!"
echo "====================================="
echo ""
echo "🧪 Test the fix:"
echo ""
echo "1. API Test (stations):"
echo "   curl -X GET 'https://$EC2_HOST/api/owner/stations' \\"
echo "     -H 'x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=' \\"
echo "     -H 'x-owner-domain: ifuel-dangay'"
echo ""
echo "2. Browser Test:"
echo "   • Visit: https://ifuel-dangay-portal.netlify.app"
echo "   • Login and check all tabs load"
echo "   • Try approving/rejecting a report"
echo ""
echo "Expected: No more 'is_community does not exist' errors"
echo ""
echo "📝 Full documentation: FIX_IS_COMMUNITY_COLUMN.md"
echo "====================================="
