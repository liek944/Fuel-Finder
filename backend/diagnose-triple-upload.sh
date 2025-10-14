#!/bin/bash

echo "======================================"
echo "🔍 TRIPLE UPLOAD BUG DIAGNOSTIC SCRIPT"
echo "======================================"
echo ""

# Function to check if SSH is available
check_ssh() {
    if command -v ssh &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if we can access PM2 locally
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 found locally"
    echo ""
    
    echo "1️⃣ Checking PM2 Status"
    echo "----------------------"
    pm2 list
    echo ""
    
    echo "2️⃣ Checking PM2 Instances for fuel-finder"
    echo "-----------------------------------------"
    pm2 show fuel-finder 2>/dev/null | grep -E "mode|instances|script|exec mode" || echo "⚠️  fuel-finder not found in PM2"
    echo ""
    
    echo "3️⃣ Checking for Multiple Node Processes"
    echo "---------------------------------------"
    NODE_PROCESSES=$(ps aux | grep "[n]ode.*server.js" | wc -l)
    echo "Number of node server.js processes: $NODE_PROCESSES"
    ps aux | grep "[n]ode.*server.js" || echo "No node server.js processes found"
    echo ""
    
    echo "4️⃣ Checking for Multiple PM2 Daemons"
    echo "------------------------------------"
    PM2_DAEMONS=$(ps aux | grep "[P]M2" | wc -l)
    echo "Number of PM2 daemon processes: $PM2_DAEMONS"
    ps aux | grep "[P]M2" || echo "No PM2 daemons found"
    echo ""
    
    echo "5️⃣ Recent PM2 Logs (last 50 lines)"
    echo "----------------------------------"
    pm2 logs fuel-finder --lines 50 --nostream 2>/dev/null || echo "⚠️  Could not retrieve logs"
    echo ""
    
    echo "6️⃣ Checking for Request IDs in Logs"
    echo "-----------------------------------"
    pm2 logs fuel-finder --lines 200 --nostream 2>/dev/null | grep "🆔" | tail -20 || echo "⚠️  No request ID logs found"
    echo ""
    
    echo "7️⃣ Checking for Duplicate Request Blocks"
    echo "----------------------------------------"
    pm2 logs fuel-finder --lines 200 --nostream 2>/dev/null | grep "DUPLICATE" || echo "ℹ️  No duplicate blocks found (this might be okay)"
    echo ""
    
    echo "======================================"
    echo "🎯 DIAGNOSTICS COMPLETE"
    echo "======================================"
    echo ""
    echo "📋 Expected Values:"
    echo "  - PM2 instances: 1"
    echo "  - PM2 mode: fork"
    echo "  - Node processes: 1"
    echo "  - PM2 daemons: 1"
    echo ""
    echo "⚠️  If you see multiple instances or processes,"
    echo "   run: pm2 delete all && pm2 start ecosystem.config.js && pm2 save"
    echo ""
else
    echo "⚠️  PM2 not found locally"
    echo ""
    echo "This script needs to run on the server where fuel-finder backend is deployed."
    echo ""
    if check_ssh; then
        echo "💡 You can SSH into the server and run this script there:"
        echo "   ssh ubuntu@fuelfinder.duckdns.org"
        echo "   cd ~/fuel_finder/backend"
        echo "   bash diagnose-triple-upload.sh"
    else
        echo "💡 To diagnose the server, SSH into it and run this script."
    fi
fi
