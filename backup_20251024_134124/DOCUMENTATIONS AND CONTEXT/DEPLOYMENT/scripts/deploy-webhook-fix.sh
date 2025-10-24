#!/bin/bash
# Deploy PayMongo Webhook Type Casting Fix
# Date: October 16, 2025
# Fixes: Database type mismatch causing webhook failures

echo "=================================================="
echo "🔧 Deploying PayMongo Webhook Fix"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Fix Details:${NC}"
echo "   - File: backend/database/db.js"
echo "   - Function: updateDonationStatus()"
echo "   - Issue: PostgreSQL type inference error"
echo "   - Solution: Explicit VARCHAR type casting"
echo ""

# Step 1: Backup current version
echo -e "${YELLOW}1️⃣  Creating backup...${NC}"
if [ -f backend/database/db.js ]; then
    cp backend/database/db.js backend/database/db.js.backup-$(date +%Y%m%d-%H%M%S)
    echo -e "${GREEN}   ✅ Backup created${NC}"
else
    echo -e "${RED}   ❌ db.js not found!${NC}"
    exit 1
fi
echo ""

# Step 2: Verify fix is present
echo -e "${YELLOW}2️⃣  Verifying fix is applied...${NC}"
if grep -q "VARCHAR(50)" backend/database/db.js && grep -q "updateDonationStatus" backend/database/db.js; then
    echo -e "${GREEN}   ✅ Type casting fix detected in code${NC}"
else
    echo -e "${RED}   ❌ Fix not found in db.js${NC}"
    echo "   Please ensure the fix has been applied to the code."
    exit 1
fi
echo ""

# Step 3: Check if running on production server
echo -e "${YELLOW}3️⃣  Checking environment...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}   ✅ PM2 detected (production environment)${NC}"
    IS_PRODUCTION=true
else
    echo -e "${YELLOW}   ⚠️  PM2 not detected (local environment)${NC}"
    IS_PRODUCTION=false
fi
echo ""

# Step 4: Restart backend service
if [ "$IS_PRODUCTION" = true ]; then
    echo -e "${YELLOW}4️⃣  Restarting backend service...${NC}"
    cd backend
    pm2 restart fuel-finder
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✅ Backend restarted successfully${NC}"
    else
        echo -e "${RED}   ❌ Failed to restart backend${NC}"
        exit 1
    fi
    echo ""
    
    # Step 5: Check logs
    echo -e "${YELLOW}5️⃣  Checking logs...${NC}"
    echo "   Waiting 3 seconds for startup..."
    sleep 3
    pm2 logs fuel-finder --lines 20 --nostream
    echo ""
    
    echo -e "${YELLOW}6️⃣  Monitoring for errors...${NC}"
    echo "   Watching logs for 10 seconds (Ctrl+C to stop)..."
    timeout 10s pm2 logs fuel-finder | grep -E "(error|Error|ERROR|✅|❌)" || true
    echo ""
else
    echo -e "${YELLOW}4️⃣  Local environment detected${NC}"
    echo "   To apply fix on production server:"
    echo "   1. Push changes to Git repository"
    echo "   2. SSH to production server"
    echo "   3. Run: cd ~/Fuel-FInder && git pull"
    echo "   4. Run: pm2 restart fuel-finder"
    echo ""
fi

# Final instructions
echo "=================================================="
echo -e "${GREEN}✅ Deployment Steps Completed${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}📋 Next Steps - Test the Fix:${NC}"
echo ""
echo "1️⃣  Make a test donation:"
echo "   - Go to: https://fuelfinderths.netlify.app"
echo "   - Click: 💝 Support Community"
echo "   - Amount: ₱100"
echo "   - Complete PayMongo checkout"
echo ""
echo "2️⃣  Watch webhook logs:"
echo "   pm2 logs fuel-finder | grep -E '(Webhook|Donation)'"
echo ""
echo "   ✅ Success looks like:"
echo "   📬 Webhook received: link.payment.paid"
echo "   ✅ Donation payment succeeded: link_xxx (₱100.00)"
echo ""
echo "   ❌ Failure looks like:"
echo "   ❌ Webhook error: error: inconsistent types"
echo ""
echo "3️⃣  Verify stats updated:"
echo "   curl https://fuelfinder.duckdns.org/api/donations/stats | jq"
echo ""
echo "4️⃣  Check recent donors:"
echo "   curl https://fuelfinder.duckdns.org/api/donations/recent | jq"
echo ""
echo "=================================================="
echo -e "${YELLOW}📚 Documentation:${NC}"
echo "   PAYMONGO_WEBHOOK_TYPE_CASTING_FIX.md"
echo "   DONATION_TESTING_GUIDE.md"
echo "=================================================="
echo ""

if [ "$IS_PRODUCTION" = true ]; then
    echo -e "${GREEN}🎉 Fix deployed! Ready for testing.${NC}"
else
    echo -e "${YELLOW}⚠️  Run this script on production server to deploy.${NC}"
fi
echo ""
