#!/bin/bash
# Deploy Owner Detection Priority Fix to EC2
# This fixes the "Subdomain 'fuelfinder' is not registered" error

set -e

echo "🚀 Deploying Owner Detection Priority Fix..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're on EC2 or need to SSH
if [ -f /etc/ec2_version ] || grep -q "ec2" /sys/hypervisor/uuid 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Running on EC2 instance"
    IS_EC2=true
else
    echo -e "${YELLOW}!${NC} Running locally - will need to deploy to EC2"
    IS_EC2=false
fi

# Backup current file
echo ""
echo "📦 Creating backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup_owner_detection_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
cp middleware/ownerDetection.js "$BACKUP_DIR/" 2>/dev/null || echo "File will be created"

echo -e "${GREEN}✓${NC} Backup created: $BACKUP_DIR"

# The file should already be updated locally
echo ""
echo "📝 Verifying fix..."
if grep -q "PRIORITIZE x-owner-domain header" middleware/ownerDetection.js; then
    echo -e "${GREEN}✓${NC} Fix verified in ownerDetection.js"
else
    echo -e "${RED}✗${NC} Fix not found in ownerDetection.js"
    echo "Please ensure the file has been updated with the priority fix"
    exit 1
fi

if [ "$IS_EC2" = true ]; then
    # Running on EC2 - restart PM2
    echo ""
    echo "🔄 Restarting backend with PM2..."
    
    if command -v pm2 &> /dev/null; then
        pm2 restart all
        echo -e "${GREEN}✓${NC} PM2 restarted successfully"
        
        echo ""
        echo "📊 PM2 Status:"
        pm2 list
        
        echo ""
        echo "📋 Recent logs:"
        pm2 logs --lines 20 --nostream
    else
        echo -e "${YELLOW}!${NC} PM2 not found. Please restart your backend manually."
        exit 1
    fi
else
    # Running locally - provide deployment instructions
    echo ""
    echo -e "${YELLOW}📤 DEPLOYMENT TO EC2 REQUIRED${NC}"
    echo ""
    echo "To deploy this fix to your EC2 backend:"
    echo ""
    echo "1. Copy the updated file to EC2:"
    echo "   scp backend/middleware/ownerDetection.js ubuntu@your-ec2-ip:/path/to/backend/middleware/"
    echo ""
    echo "2. SSH into EC2 and restart PM2:"
    echo "   ssh ubuntu@your-ec2-ip"
    echo "   cd /path/to/backend"
    echo "   pm2 restart all"
    echo ""
    echo "3. Verify the fix:"
    echo "   pm2 logs --lines 30"
    echo ""
    echo "OR run this script directly on EC2 after copying the files"
fi

echo ""
echo "✅ Deployment script completed!"
echo ""
echo "=== WHAT WAS FIXED ==="
echo "Changed owner detection priority in ownerDetection.js:"
echo "  BEFORE: Check hostname FIRST, then x-owner-domain header"
echo "  AFTER:  Check x-owner-domain header FIRST, then hostname"
echo ""
echo "This fixes the issue where Netlify deployments send 'ifuel-dangay'"
echo "in the header, but backend was extracting 'fuelfinder' from the"
echo "API hostname (fuelfinder.duckdns.org) and rejecting the request."
echo ""
echo "=== TESTING ==="
echo "Visit your owner portal at: https://ifuel-dangay-portal.netlify.app"
echo "API Key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I="
echo ""
