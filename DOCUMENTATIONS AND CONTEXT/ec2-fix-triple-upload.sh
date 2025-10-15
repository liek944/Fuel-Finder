#!/bin/bash

# EC2 Triple Upload Bug - Automated Fix Script
# Run this ON YOUR EC2 INSTANCE after SSH

set -e  # Exit on error

echo "========================================"
echo "🔧 EC2 Triple Upload Bug - Auto Fix"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check PM2
check_initial_state() {
    echo -e "${BLUE}📊 Checking current state...${NC}"
    echo ""
    
    echo "Current PM2 processes:"
    pm2 list
    echo ""
    
    echo "Current Node processes:"
    ps aux | grep "node.*server.js" | grep -v grep || echo "None found"
    NODE_COUNT=$(ps aux | grep "node.*server.js" | grep -v grep | wc -l)
    echo ""
    echo "Total node processes: $NODE_COUNT"
    
    if [ "$NODE_COUNT" -eq 1 ]; then
        echo -e "${GREEN}✅ Only 1 node process found - this is correct!${NC}"
        echo ""
        echo -e "${YELLOW}If still experiencing triple uploads, the issue might be:${NC}"
        echo "  - Load balancer configuration (check AWS Console)"
        echo "  - Auto-scaling group with multiple instances"
        echo "  - Nginx with multiple upstream servers"
        echo ""
        read -p "Do you still want to restart PM2? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Exiting without changes."
            exit 0
        fi
    elif [ "$NODE_COUNT" -gt 1 ]; then
        echo -e "${RED}❌ PROBLEM FOUND: $NODE_COUNT node processes detected!${NC}"
        echo -e "${RED}   This is causing the triple uploads.${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  No node processes found - fuel-finder might not be running${NC}"
        echo ""
    fi
}

# Function to stop everything
stop_all() {
    echo -e "${BLUE}🛑 Stopping all PM2 processes and node instances...${NC}"
    
    # Delete all PM2 processes
    pm2 delete all 2>/dev/null || echo "No PM2 processes to delete"
    
    # Kill any remaining node server processes
    pkill -f "node.*server.js" 2>/dev/null || echo "No node processes to kill"
    
    # Wait for processes to die
    sleep 3
    
    # Verify everything is stopped
    REMAINING=$(ps aux | grep "node.*server.js" | grep -v grep | wc -l)
    
    if [ "$REMAINING" -eq 0 ]; then
        echo -e "${GREEN}✅ All processes stopped successfully${NC}"
    else
        echo -e "${RED}❌ Warning: $REMAINING node processes still running${NC}"
        echo "Attempting force kill..."
        pkill -9 -f "node.*server.js" 2>/dev/null
        sleep 2
    fi
    echo ""
}

# Function to start fuel-finder
start_fuel_finder() {
    echo -e "${BLUE}🚀 Starting fuel-finder...${NC}"
    
    # Find backend directory
    if [ -d "/home/ubuntu/fuel_finder/backend" ]; then
        BACKEND_DIR="/home/ubuntu/fuel_finder/backend"
    elif [ -d "$HOME/fuel_finder/backend" ]; then
        BACKEND_DIR="$HOME/fuel_finder/backend"
    elif [ -d "./backend" ]; then
        BACKEND_DIR="./backend"
    else
        echo -e "${RED}❌ Error: Cannot find backend directory${NC}"
        echo "Please run this script from the fuel_finder directory or provide path"
        exit 1
    fi
    
    echo "Using backend directory: $BACKEND_DIR"
    cd "$BACKEND_DIR"
    
    # Check if ecosystem.config.js exists
    if [ ! -f "ecosystem.config.js" ]; then
        echo -e "${RED}❌ Error: ecosystem.config.js not found in $BACKEND_DIR${NC}"
        exit 1
    fi
    
    # Verify config has correct settings
    echo ""
    echo "Checking ecosystem.config.js configuration:"
    cat ecosystem.config.js | grep -A 2 -E "instances|exec_mode" || echo "Could not find config"
    echo ""
    
    # Start with PM2
    echo "Starting PM2..."
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    echo -e "${GREEN}✅ PM2 started and saved${NC}"
    echo ""
}

# Function to verify the fix
verify_fix() {
    echo -e "${BLUE}🔍 Verifying the fix...${NC}"
    echo ""
    
    sleep 2
    
    echo "PM2 Status:"
    pm2 list
    echo ""
    
    echo "Node Processes:"
    ps aux | grep "node.*server.js" | grep -v grep
    NODE_COUNT=$(ps aux | grep "node.*server.js" | grep -v grep | wc -l)
    echo ""
    
    echo "Listening Ports:"
    netstat -tlnp 2>/dev/null | grep node || ss -tlnp | grep node || echo "Could not check ports"
    echo ""
    
    echo "========================================"
    echo "📊 VERIFICATION RESULTS"
    echo "========================================"
    
    if [ "$NODE_COUNT" -eq 1 ]; then
        echo -e "${GREEN}✅ SUCCESS: Exactly 1 node process running${NC}"
        echo -e "${GREEN}✅ PM2 is configured correctly${NC}"
        echo ""
        echo -e "${GREEN}The triple upload bug should now be FIXED! 🎉${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Test uploading an image in the admin portal"
        echo "  2. Check the database to verify only 1 image was created"
        echo "  3. Monitor PM2 logs: pm2 logs fuel-finder"
        echo ""
        echo "If still experiencing issues, check:"
        echo "  - AWS Load Balancer configuration"
        echo "  - Auto-Scaling Group (should have min/max/desired = 1)"
        echo "  - Number of EC2 instances running (should be 1)"
    elif [ "$NODE_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ ERROR: No node processes running!${NC}"
        echo "fuel-finder failed to start. Check PM2 logs:"
        echo "  pm2 logs fuel-finder"
    else
        echo -e "${RED}❌ ERROR: Multiple node processes still running: $NODE_COUNT${NC}"
        echo ""
        echo "This should not happen. Possible causes:"
        echo "  1. Another process manager (systemd) is also running the app"
        echo "  2. Multiple PM2 daemons are running"
        echo ""
        echo "Try these commands:"
        echo "  systemctl list-units | grep fuel"
        echo "  ps aux | grep PM2"
    fi
    echo ""
}

# Main execution
echo "This script will:"
echo "  1. Check current PM2 and node process state"
echo "  2. Stop all PM2 processes and kill node processes"
echo "  3. Start fuel-finder with correct configuration (1 instance, fork mode)"
echo "  4. Verify the fix"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Run all steps
check_initial_state
stop_all
start_fuel_finder
verify_fix

# Final recommendations
echo "========================================"
echo "📝 POST-FIX CHECKLIST"
echo "========================================"
echo ""
echo "[ ] Test image upload in admin portal"
echo "[ ] Verify only 1 image in database"
echo "[ ] Check AWS Console - Auto-Scaling Group (should be 1 instance)"
echo "[ ] Check AWS Console - Load Balancer targets (should be 1 healthy)"
echo "[ ] Monitor logs: pm2 logs fuel-finder --lines 50"
echo ""
echo "If uploads are still tripled after this fix,"
echo "the issue is in AWS infrastructure (load balancer/auto-scaling),"
echo "not in the application itself."
echo ""
