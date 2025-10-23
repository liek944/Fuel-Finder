#!/bin/bash
# Deployment script for price reports table name fix
# Fixes "relation price_reports does not exist" error

echo "============================================"
echo "Deploying Price Reports Table Name Fix"
echo "============================================"

# Navigate to backend directory
cd "$(dirname "$0")"
echo "Current directory: $(pwd)"

# Stop the existing PM2 process
echo ""
echo "📦 Stopping PM2 process..."
pm2 stop fuel-finder

# Pull latest changes (if on EC2)
if [ -d ".git" ]; then
    echo ""
    echo "📥 Pulling latest changes from git..."
    git pull
fi

# Install any new dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Restart PM2 process
echo ""
echo "🚀 Restarting PM2 process..."
pm2 restart fuel-finder

# Wait for server to start
sleep 3

# Show PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 status

# Show recent logs
echo ""
echo "📋 Recent Logs:"
pm2 logs fuel-finder --lines 30 --nostream

echo ""
echo "============================================"
echo "✅ Deployment Complete!"
echo "============================================"
echo ""
echo "Test the fixes:"
echo "  - GET  /api/admin/price-reports/pending"
echo "  - GET  /api/admin/price-reports/stats"
echo "  - POST /api/stations/:id/report-price"
echo ""
