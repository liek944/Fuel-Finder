#!/bin/bash
# Verify Donation Stats After Webhook Fix
# Run this to confirm stats are updating correctly

echo "=================================================="
echo "🔍 Verifying Donation System Status"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're on the production server
if [ -f "/home/ubuntu/Fuel-FInder/backend/.env" ]; then
    BASE_URL="http://localhost:3000"
    echo -e "${GREEN}✅ Running on production server${NC}"
else
    BASE_URL="https://fuelfinder.duckdns.org"
    echo -e "${YELLOW}⚠️  Running remotely${NC}"
fi
echo ""

# 1. Check Overall Stats
echo -e "${BLUE}📊 Overall Donation Statistics:${NC}"
curl -s "$BASE_URL/api/donations/stats" | jq '.'
echo ""

# 2. Check Recent Donors
echo -e "${BLUE}👥 Recent Donors (Last 5):${NC}"
curl -s "$BASE_URL/api/donations/recent?limit=5" | jq '.[] | {id, amount, donor_name, cause, status, created_at}'
echo ""

# 3. Check Donation Impacts by Cause
echo -e "${BLUE}🎯 Donation Impacts by Cause:${NC}"
curl -s "$BASE_URL/api/donations/impacts" | jq '.[] | {cause, total_amount, impact_metrics}'
echo ""

# 4. Summary
echo "=================================================="
echo -e "${GREEN}✅ Verification Complete${NC}"
echo "=================================================="
echo ""
echo "Expected Results:"
echo "  • Total donations > 0"
echo "  • Total amount matches sum of donations"
echo "  • Recent donors list shows donor names"
echo "  • All donations should have status: 'succeeded'"
echo "  • Impact metrics show liters_funded > 0"
echo ""
echo "If you see zeros or empty lists, webhooks may not have"
echo "processed yet. Wait 30 seconds and run this script again."
echo ""
