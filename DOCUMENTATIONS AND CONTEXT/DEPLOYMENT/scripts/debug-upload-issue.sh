#!/bin/bash

# Triple Upload Bug - Quick Diagnostic Script
# Run this script to check the current state and identify issues

echo "=================================="
echo "🔍 TRIPLE UPLOAD BUG DIAGNOSTIC"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running locally or on server
if [ -d "/home/ubuntu/fuel_finder" ]; then
    BACKEND_PATH="/home/ubuntu/fuel_finder/backend"
    ON_SERVER=true
else
    BACKEND_PATH="./backend"
    ON_SERVER=false
fi

echo "Running on: $(hostname)"
echo "Backend path: $BACKEND_PATH"
echo ""

# Function to check PM2
check_pm2() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  Checking PM2 Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ PM2 not found${NC}"
        echo "   This script needs to run on the server where PM2 is installed"
        return 1
    fi
    
    pm2 list
    echo ""
    
    # Count fuel-finder instances
    INSTANCE_COUNT=$(pm2 jlist 2>/dev/null | grep -o '"name":"fuel-finder"' | wc -l)
    
    if [ "$INSTANCE_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ fuel-finder not running in PM2${NC}"
        return 1
    elif [ "$INSTANCE_COUNT" -gt 1 ]; then
        echo -e "${RED}❌ PROBLEM: Multiple fuel-finder instances found: $INSTANCE_COUNT${NC}"
        echo -e "${YELLOW}   FIX: Run 'pm2 delete all && pm2 start ecosystem.config.js && pm2 save'${NC}"
        return 1
    else
        echo -e "${GREEN}✅ PM2 has exactly 1 fuel-finder instance${NC}"
    fi
    
    # Check exec mode
    EXEC_MODE=$(pm2 jlist 2>/dev/null | grep -A 5 '"name":"fuel-finder"' | grep '"exec_mode"' | cut -d'"' -f4)
    if [ "$EXEC_MODE" = "cluster_mode" ]; then
        echo -e "${RED}❌ PROBLEM: Running in cluster mode${NC}"
        echo -e "${YELLOW}   FIX: Should be 'fork_mode'${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Exec mode: $EXEC_MODE (correct)${NC}"
    fi
    
    echo ""
}

# Function to check node processes
check_node_processes() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "2️⃣  Checking Node Processes"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    NODE_COUNT=$(ps aux | grep "[n]ode.*server.js" | wc -l)
    
    echo "Node server.js processes: $NODE_COUNT"
    ps aux | grep "[n]ode.*server.js" | head -5
    echo ""
    
    if [ "$NODE_COUNT" -eq 1 ]; then
        echo -e "${GREEN}✅ Exactly 1 node process (correct)${NC}"
    elif [ "$NODE_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ No node processes found${NC}"
        return 1
    else
        echo -e "${RED}❌ PROBLEM: Multiple node processes: $NODE_COUNT${NC}"
        echo -e "${YELLOW}   This will cause triple uploads!${NC}"
        echo -e "${YELLOW}   FIX: pm2 delete all && pkill -f 'node.*server.js' && pm2 start ecosystem.config.js${NC}"
        return 1
    fi
    echo ""
}

# Function to check recent logs
check_logs() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "3️⃣  Checking Recent Upload Logs"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if ! command -v pm2 &> /dev/null; then
        echo "PM2 not available, skipping log check"
        return
    fi
    
    echo "Last 5 upload requests:"
    pm2 logs fuel-finder --nostream --lines 500 2>/dev/null | grep "🆔.*Image upload request started" | tail -5
    echo ""
    
    echo "Last 5 duplicate blocks:"
    DUPLICATE_COUNT=$(pm2 logs fuel-finder --nostream --lines 500 2>/dev/null | grep "DUPLICATE REQUEST BLOCKED" | wc -l)
    
    if [ "$DUPLICATE_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $DUPLICATE_COUNT duplicate blocks in recent logs${NC}"
        pm2 logs fuel-finder --nostream --lines 500 2>/dev/null | grep "DUPLICATE REQUEST BLOCKED" | tail -5
        echo ""
        echo -e "${YELLOW}   This means backend deduplication is working,${NC}"
        echo -e "${YELLOW}   but frontend is still making multiple requests.${NC}"
    else
        echo -e "${GREEN}✅ No duplicate blocks found (frontend might be working correctly)${NC}"
    fi
    echo ""
}

# Function to check ecosystem config
check_config() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "4️⃣  Checking Ecosystem Config"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -f "$BACKEND_PATH/ecosystem.config.js" ]; then
        echo "Contents of ecosystem.config.js:"
        cat "$BACKEND_PATH/ecosystem.config.js" | grep -A 2 -E "instances|exec_mode"
        echo ""
        
        INSTANCES=$(cat "$BACKEND_PATH/ecosystem.config.js" | grep "instances:" | grep -o "[0-9]")
        if [ "$INSTANCES" = "1" ]; then
            echo -e "${GREEN}✅ Config has instances: 1 (correct)${NC}"
        else
            echo -e "${RED}❌ PROBLEM: Config has instances: $INSTANCES${NC}"
        fi
        
        if grep -q "exec_mode.*fork" "$BACKEND_PATH/ecosystem.config.js"; then
            echo -e "${GREEN}✅ Config has exec_mode: fork (correct)${NC}"
        else
            echo -e "${RED}❌ PROBLEM: exec_mode is not 'fork'${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  ecosystem.config.js not found at $BACKEND_PATH${NC}"
    fi
    echo ""
}

# Function to provide recommendations
recommendations() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 RECOMMENDATIONS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Based on the diagnostics above, here's what to do:"
    echo ""
    echo "1️⃣  If multiple PM2 instances or node processes found:"
    echo "   → Run: pm2 delete all && pm2 start ecosystem.config.js && pm2 save"
    echo ""
    echo "2️⃣  If backend looks fine but still getting duplicates:"
    echo "   → Check frontend console logs"
    echo "   → Look for multiple 🆔 with different IDs"
    echo "   → Clear Service Worker in browser DevTools"
    echo ""
    echo "3️⃣  Test with browser DevTools Network tab:"
    echo "   → Count POST requests to /api/stations/*/images"
    echo "   → Should be exactly 1 per upload"
    echo ""
    echo "4️⃣  Check database directly:"
    echo "   → SELECT COUNT(*) FROM images WHERE station_id = <test_id>"
    echo "   → Compare with number of uploads you made"
    echo ""
}

# Run all checks
check_pm2
PM2_STATUS=$?

check_node_processes
NODE_STATUS=$?

check_config

check_logs

recommendations

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $PM2_STATUS -eq 0 ] && [ $NODE_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ Backend configuration looks GOOD${NC}"
    echo ""
    echo "If still experiencing triple uploads, the issue is likely in:"
    echo "  • Frontend (check browser console)"
    echo "  • Service Worker (clear it in DevTools)"
    echo "  • Network/Load balancer (check nginx config)"
else
    echo -e "${RED}❌ Backend has ISSUES that need to be fixed${NC}"
    echo ""
    echo "Follow the recommendations above to fix PM2/node process issues."
fi

echo ""
echo "For detailed testing guide, see:"
echo "  DOCUMENTATIONS AND CONTEXT/TRIPLE_UPLOAD_FIX_COMPREHENSIVE.md"
echo ""
