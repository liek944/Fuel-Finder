#!/bin/bash

echo "==================================="
echo "🔍 PM2 Status Verification"
echo "==================================="
echo ""

echo "1. PM2 List (human readable):"
pm2 list
echo ""

echo "2. PM2 JSON output (for parsing):"
pm2 jlist 2>/dev/null | python3 -m json.tool 2>/dev/null || pm2 jlist
echo ""

echo "3. Detailed info for fuel-finder:"
pm2 show fuel-finder
echo ""

echo "4. Count PM2 instances (different methods):"
echo "   Method 1 (pm2 list):"
pm2 list | grep fuel-finder | wc -l
echo "   Method 2 (pm2 jlist):"
pm2 jlist 2>/dev/null | grep -o '"name":"fuel-finder"' | wc -l
echo ""

echo "5. Node processes:"
ps aux | grep "node.*server.js" | grep -v grep
NODE_COUNT=$(ps aux | grep "node.*server.js" | grep -v grep | wc -l)
echo "   Total: $NODE_COUNT"
echo ""

echo "6. Listening ports:"
netstat -tlnp 2>/dev/null | grep node || ss -tlnp | grep node
echo ""

echo "==================================="
echo "📊 ANALYSIS"
echo "==================================="
if [ "$NODE_COUNT" -eq 1 ]; then
    echo "✅ Backend application looks CORRECT (1 process)"
    echo ""
    echo "Since backend is fine but you're still getting triple uploads,"
    echo "the issue is likely at the INFRASTRUCTURE level:"
    echo ""
    echo "Check these:"
    echo "  1. AWS Auto-Scaling Group - Do you have 3 EC2 instances?"
    echo "  2. AWS Load Balancer - Does it show 3 healthy targets?"
    echo "  3. Nginx - Is there load balancing to multiple upstreams?"
    echo ""
    echo "To check AWS (from your local machine):"
    echo "  aws ec2 describe-instances --filters 'Name=tag:Name,Values=*fuel*' --query 'Reservations[].Instances[].InstanceId'"
else
    echo "❌ Multiple node processes: $NODE_COUNT"
    echo "   This is the problem! Run the fix script."
fi
