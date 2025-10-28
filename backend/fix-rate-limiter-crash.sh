#!/bin/bash

# Fix Rate Limiter Crash - Deploy to EC2
# Fixes: TypeError: createRateLimiter is not a function

set -e

echo "🔧 Deploying rate limiter fix to EC2..."

# Upload the fixed rate limiter file
echo "📤 Uploading fixed rateLimiter.js..."
scp backend/middleware/rateLimiter.js ubuntu@fuelfinder.duckdns.org:~/Fuel-FInder/backend/middleware/

# Restart PM2
echo "🔄 Restarting backend server..."
ssh ubuntu@fuelfinder.duckdns.org << 'EOF'
cd ~/Fuel-FInder/backend
pm2 restart fuel-finder
pm2 logs fuel-finder --lines 20 --nostream
EOF

echo ""
echo "✅ Fix deployed successfully!"
echo ""
echo "🧪 Test with:"
echo "   curl https://fuelfinder.duckdns.org/api/health"
echo ""
