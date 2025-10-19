# AWS EC2 Triple Upload Bug - Infrastructure Issue

## 🔴 Critical Finding
**The bug appeared AFTER migrating from Render.com to AWS EC2.**

This means the issue is **NOT in the code** - it's in the **AWS infrastructure setup**.

## 🎯 Most Likely Causes (EC2-Specific)

### 1. **PM2 Running in Cluster Mode** (Most Common)
EC2 might have auto-scaling or PM2 was started with `-i` flag

### 2. **Multiple PM2 Instances**
PM2 might have been started multiple times accidentally

### 3. **Load Balancer Configuration**
AWS ELB/ALB might be configured to send requests to 3 backend instances

### 4. **Auto-Scaling Group**
EC2 auto-scaling might have launched 3 instances

### 5. **Nginx Load Balancing**
Nginx might be configured with 3 upstream servers

---

## 🚀 IMMEDIATE FIX (Do This First!)

### Step 1: SSH into EC2
```bash
ssh ubuntu@fuelfinder.duckdns.org
# or whatever your EC2 SSH command is
```

### Step 2: Check Current PM2 Status
```bash
pm2 list
```

**Look for:**
- How many instances of `fuel-finder`?
- Is `mode` showing `cluster`?
- What does the `instances` column show?

### Step 3: Check Node Processes
```bash
ps aux | grep "node.*server.js" | grep -v grep
```

**Count the lines!** Should be **exactly 1**.

If you see **3 lines** → **THIS IS YOUR PROBLEM!**

### Step 4: Kill Everything and Restart Properly
```bash
# Stop ALL PM2 processes
pm2 delete all

# Kill any remaining node processes
pkill -f "node.*server.js"

# Wait 3 seconds
sleep 3

# Verify nothing is running
ps aux | grep "node.*server.js" | grep -v grep
# Should show NOTHING

# Navigate to backend
cd ~/fuel_finder/backend

# Start with FORK mode (NOT cluster)
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Verify
pm2 list
```

**Expected output:**
```
┌─────┬──────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ mode    │ ↺      │ status  │ cpu      │
├─────┼──────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ fuel-finder  │ fork    │ 0      │ online  │ 0%       │
└─────┴──────────────┴─────────┴─────────┴─────────┴──────────┘
```

**MUST BE:**
- ✅ Only **1 row** for fuel-finder
- ✅ Mode: **fork** (NOT cluster)
- ✅ Status: **online**

### Step 5: Verify Single Process
```bash
ps aux | grep "node.*server.js" | grep -v grep | wc -l
```

**MUST output:** `1`

If it outputs `3` or any other number, repeat Step 4.

### Step 6: Test Upload
Now try uploading an image. It should work with only 1 upload!

---

## 🔍 Deep Diagnostics for EC2

### Check 1: Is there a Load Balancer?
```bash
# Check if nginx is running
systemctl status nginx

# If nginx is running, check config
sudo cat /etc/nginx/sites-enabled/fuel-finder 2>/dev/null || \
sudo cat /etc/nginx/nginx.conf | grep -A 10 upstream
```

**Look for:**
```nginx
upstream backend {
    server localhost:3001;
    server localhost:3002;  ← BAD! Multiple backends
    server localhost:3003;  ← BAD! Multiple backends
}
```

**If found:** You have nginx load balancing to multiple backends!

**Fix:**
```bash
sudo nano /etc/nginx/sites-enabled/fuel-finder

# Change to single server:
upstream backend {
    server localhost:3001;
}

# Save and restart
sudo systemctl restart nginx
```

### Check 2: Check for Multiple Ports
```bash
# See what ports node is listening on
netstat -tlnp | grep node
```

**Expected:** Only port `3001`

**If you see:**
```
tcp  0  0  :::3001  :::*  LISTEN  12345/node
tcp  0  0  :::3002  :::*  LISTEN  12346/node  ← BAD!
tcp  0  0  :::3003  :::*  LISTEN  12347/node  ← BAD!
```

**This means 3 separate node processes are running!**

**Fix:** Kill all and restart (Step 4 above)

### Check 3: Check systemd Services
```bash
# Check if fuel-finder is also running as a systemd service
systemctl list-units | grep fuel

# If found:
systemctl status fuel-finder
```

**If it's running:** You might have BOTH systemd AND PM2 running the app!

**Fix:**
```bash
# Disable systemd service
sudo systemctl stop fuel-finder
sudo systemctl disable fuel-finder

# Use ONLY PM2
pm2 resurrect
```

### Check 4: Check Auto-Scaling Group (AWS Console)

1. Go to **AWS Console** → **EC2** → **Auto Scaling Groups**
2. Find your fuel-finder auto-scaling group
3. Check **Desired Capacity**, **Min**, and **Max**

**If Desired Capacity is 3:**
- You have 3 EC2 instances running!
- Each one is processing uploads
- **This is your problem!**

**Fix:**
- Set Desired Capacity to **1**
- Set Min to **1**
- Set Max to **1** (or keep higher if you want scaling, but adjust load balancer)

### Check 5: Check Elastic Load Balancer

1. Go to **AWS Console** → **EC2** → **Load Balancers**
2. Find your load balancer
3. Click **Target Groups**
4. Check how many **healthy targets**

**If you see 3 healthy targets:**
- Load balancer is distributing to 3 instances
- All 3 receive the upload request
- **This is your problem!**

**Options:**
- **Option A:** Keep 1 EC2 instance (recommended for now)
- **Option B:** Fix deduplication if you want multiple instances (advanced)

---

## 🧪 Quick Test Script for EC2

Run this on your EC2 instance:

```bash
#!/bin/bash

echo "=== EC2 TRIPLE UPLOAD DIAGNOSTIC ==="
echo ""

echo "1. PM2 Processes:"
pm2 list
echo ""

echo "2. Node Processes:"
ps aux | grep "node.*server.js" | grep -v grep
NODE_COUNT=$(ps aux | grep "node.*server.js" | grep -v grep | wc -l)
echo "Total node processes: $NODE_COUNT"
if [ "$NODE_COUNT" -ne 1 ]; then
    echo "❌ PROBLEM: Should be exactly 1, found $NODE_COUNT"
else
    echo "✅ Correct: 1 process"
fi
echo ""

echo "3. Listening Ports:"
netstat -tlnp 2>/dev/null | grep node || ss -tlnp | grep node
echo ""

echo "4. Nginx Status:"
systemctl status nginx --no-pager 2>/dev/null || echo "Nginx not running"
echo ""

echo "5. PM2 Startup Config:"
cat ~/.pm2/dump.pm2 2>/dev/null | grep -A 5 fuel-finder || echo "No PM2 startup config"
echo ""

echo "=== RECOMMENDATIONS ==="
if [ "$NODE_COUNT" -gt 1 ]; then
    echo "❌ Multiple node processes detected!"
    echo "   Run: pm2 delete all && pkill -f 'node.*server.js' && pm2 start ecosystem.config.js"
else
    echo "✅ Node processes look OK"
    echo "   Check AWS Load Balancer and Auto-Scaling Group"
fi
```

Save as `ec2-diagnostic.sh` and run:
```bash
chmod +x ec2-diagnostic.sh
./ec2-diagnostic.sh
```

---

## ✅ Expected State After Fix

### PM2
```bash
pm2 list
# Should show: 1 instance, fork mode, online
```

### Node Processes
```bash
ps aux | grep node | grep -v grep
# Should show: Exactly 1 line
```

### Ports
```bash
netstat -tlnp | grep node
# Should show: Only port 3001
```

### AWS Console
- Auto-Scaling Group: 1 instance
- Load Balancer Targets: 1 healthy target
- EC2 Instances: 1 running instance

---

## 🎯 Most Likely Fix

Based on EC2 migration issues, **99% chance** the fix is:

```bash
# On EC2 instance
pm2 delete all
pkill -f "node.*server.js"
cd ~/fuel_finder/backend
pm2 start ecosystem.config.js
pm2 save
```

Then verify:
```bash
pm2 list  # Should show 1 instance, fork mode
ps aux | grep "node.*server.js" | grep -v grep | wc -l  # Should output: 1
```

**Test upload** → Should work!

---

## 🔄 Why This Happened During Migration

### Render.com (Previous)
- Managed platform
- Handles process management automatically
- Always runs single instance by default
- ✅ **No duplicate uploads**

### AWS EC2 (Current)
- Manual setup required
- PM2 might be misconfigured
- Might have auto-scaling enabled
- Might have load balancer
- ❌ **Multiple instances = duplicate uploads**

---

## 📞 If Still Not Fixed

Provide this information:

```bash
# On EC2, run all these:
pm2 list
pm2 show fuel-finder
ps aux | grep node
netstat -tlnp | grep node
cat ~/fuel_finder/backend/ecosystem.config.js
```

And from AWS Console:
- Screenshot of Auto-Scaling Group settings
- Screenshot of Load Balancer target health
- Number of running EC2 instances

---

**TL;DR**: Run `pm2 delete all && pkill -f "node.*server.js" && pm2 start ecosystem.config.js` on EC2 and test again.
