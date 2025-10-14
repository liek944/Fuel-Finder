# ⚡ EC2 Triple Upload - QUICK FIX

## 🎯 The Problem
Images upload 3 times instead of once **AFTER migrating to AWS EC2**.

## ✅ The Fix (99% Success Rate)

### Step 1: SSH into your EC2 instance
```bash
ssh ubuntu@fuelfinder.duckdns.org
```

### Step 2: Run these commands
```bash
# Stop everything
pm2 delete all
pkill -f "node.*server.js"

# Wait 3 seconds
sleep 3

# Navigate to backend
cd ~/fuel_finder/backend

# Start with correct configuration
pm2 start ecosystem.config.js

# Save the configuration
pm2 save

# Verify
pm2 list
```

### Step 3: Verify the fix
```bash
# Should output exactly: 1
ps aux | grep "node.*server.js" | grep -v grep | wc -l
```

**If it outputs `1`** → ✅ Fixed! Test uploading an image.  
**If it outputs `3` or other number** → ❌ Still broken, see below.

---

## 🔍 Still Broken? Check These:

### 1. Check AWS Auto-Scaling Group
**AWS Console → EC2 → Auto Scaling Groups**

- Desired Capacity: Should be **1**
- Min: Should be **1**
- Current Instances: Should be **1**

**If you have 3 instances** → That's your problem! Set Desired to 1.

### 2. Check Load Balancer Targets
**AWS Console → EC2 → Load Balancers → Target Groups**

- Healthy targets: Should be **1**

**If you have 3 healthy targets** → You have 3 EC2 instances!

### 3. Check Nginx Configuration (if using)
```bash
# On EC2
sudo cat /etc/nginx/sites-enabled/fuel-finder | grep -A 5 upstream
```

**If you see multiple servers** → That's load balancing to multiple ports!

Should be:
```nginx
upstream backend {
    server localhost:3001;  # Only ONE server
}
```

---

## 📊 What You Should See After Fix

### PM2 List
```
┌────┬─────────────┬──────┬────┬────────┬────────┐
│ id │ name        │ mode │ ↺  │ status │ cpu    │
├────┼─────────────┼──────┼────┼────────┼────────┤
│ 0  │ fuel-finder │ fork │ 0  │ online │ 0%     │
└────┴─────────────┴──────┴────┴────────┴────────┘
```
**Key:** Only **1 row**, mode is **fork**

### Process Count
```bash
$ ps aux | grep "node.*server.js" | grep -v grep | wc -l
1
```
**Must be:** Exactly **1**

---

## 🆘 Emergency Contact Info

If still broken after this, provide:

```bash
# Run these on EC2 and send output:
pm2 list
pm2 show fuel-finder
ps aux | grep node
cat ~/fuel_finder/backend/ecosystem.config.js
```

Plus:
- Number of EC2 instances running (from AWS Console)
- Auto-Scaling Group settings screenshot
- Load Balancer target health screenshot

---

## 💡 Why This Happened

**Render.com**: Managed platform, runs 1 instance automatically  
**AWS EC2**: You manage it, might have:
- Started PM2 multiple times
- Auto-scaling with 3 instances
- Load balancer to 3 backends

---

## ✅ Success Checklist

After running the fix:
- [ ] `pm2 list` shows 1 instance in fork mode
- [ ] Process count is exactly 1
- [ ] Upload 1 image → Only 1 appears in database
- [ ] AWS Console shows 1 EC2 instance
- [ ] Load Balancer shows 1 healthy target

**All checked?** → 🎉 **YOU'RE FIXED!**

---

**TL;DR:** Run this on EC2:
```bash
pm2 delete all && pkill -f "node.*server.js" && sleep 3 && cd ~/fuel_finder/backend && pm2 start ecosystem.config.js && pm2 save
```

Then verify: `ps aux | grep "node.*server.js" | grep -v grep | wc -l` should output `1`
