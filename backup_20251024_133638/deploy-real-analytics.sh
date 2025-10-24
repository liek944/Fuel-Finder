#!/bin/bash

# Deploy Real User Analytics Fix
# Connects real heartbeat tracking to admin analytics dashboard

echo "================================================"
echo "🚀 Deploying Real User Analytics Integration"
echo "================================================"
echo ""
echo "⚠️  WARNING: This will restart your backend server"
echo "📝 Changes:"
echo "   • Added /api/user/heartbeat endpoint"
echo "   • Connected real userActivityTracker to admin dashboard"
echo "   • Replaced mock data with real in-memory tracking"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📦 Creating backup..."
BACKUP_DIR="backups/real-analytics-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup files that were modified
cp routes/index.js "$BACKUP_DIR/index.js.backup" 2>/dev/null || true
cp controllers/adminController.js "$BACKUP_DIR/adminController.js.backup" 2>/dev/null || true
cp repositories/userRepository.js "$BACKUP_DIR/userRepository.js.backup" 2>/dev/null || true
cp services/userActivityTracker.js "$BACKUP_DIR/userActivityTracker.js.backup" 2>/dev/null || true

echo "✅ Backup created at: $BACKUP_DIR"
echo ""

echo "🔍 Verifying new files exist..."
if [ ! -f "routes/userRoutes.js" ]; then
    echo "❌ ERROR: routes/userRoutes.js not found!"
    exit 1
fi

echo "✅ All files verified"
echo ""

echo "🔄 Restarting backend server..."

# Check if using PM2
if command -v pm2 &> /dev/null; then
    echo "   Using PM2..."
    pm2 restart fuel-finder-backend || pm2 restart all
    echo ""
    echo "📊 PM2 Status:"
    pm2 list
    echo ""
    echo "📋 Recent logs:"
    pm2 logs fuel-finder-backend --lines 20 --nostream
elif systemctl is-active --quiet fuel-finder-backend; then
    echo "   Using systemd..."
    sudo systemctl restart fuel-finder-backend
    sudo systemctl status fuel-finder-backend --no-pager
else
    echo "⚠️  No PM2 or systemd found. Please restart manually:"
    echo "   npm start"
fi

echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "================================================"
echo ""
echo "📝 What Changed:"
echo "   ✅ Created routes/userRoutes.js (heartbeat endpoint)"
echo "   ✅ Updated routes/index.js (registered /api/user routes)"
echo "   ✅ Updated controllers/adminController.js (uses real tracker)"
echo "   ✅ Updated services/userActivityTracker.js (added getActivityLogs)"
echo "   ✅ Deprecated repositories/userRepository.js (marked as mock data)"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Open main app: https://fuelfinderhts.netlify.app"
echo "   2. Check browser console for heartbeat logs (every 60s)"
echo "   3. Open admin portal analytics tab"
echo "   4. Verify real user count appears (should show 1+ active user)"
echo "   5. Check device type and location data"
echo ""
echo "📚 Endpoints Available:"
echo "   POST /api/user/heartbeat        - Record user activity"
echo "   GET  /api/user/count            - Get active user count"
echo "   GET  /api/admin/users/stats     - User statistics (admin)"
echo "   GET  /api/admin/users/active    - Active users list (admin)"
echo "   GET  /api/admin/users/activity  - Activity logs (admin)"
echo ""
echo "🔗 Documentation: REAL_ANALYTICS_INTEGRATION.md"
echo ""
