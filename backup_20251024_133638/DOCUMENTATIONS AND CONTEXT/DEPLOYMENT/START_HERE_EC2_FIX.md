# 🚨 START HERE - EC2 Triple Upload Fix

## 🔍 What You Told Me
> "The image upload feature was fine when backend was hosted on **Render.com**  
> BUT this issue appeared when migrated to **AWS EC2**"

## 💡 This Changes Everything!

**Good news:** Your code is likely fine!  
**Bad news:** Your EC2 infrastructure has multiple instances running.

---

## 🎯 Most Likely Cause

When you migrated to EC2, one of these happened:

1. **PM2 was started multiple times** → 3 node processes running
2. **AWS Auto-Scaling Group** → 3 EC2 instances launched
3. **Load Balancer** → Distributing to 3 backend targets
4. **PM2 in cluster mode** → 3 worker processes

All causing **the same upload to be processed 3 times**.

---

## ⚡ FASTEST FIX (Do This First!)

### On Your Local Machine:
```bash
# Transfer the fix script to EC2
scp ec2-fix-triple-upload.sh ubuntu@fuelfinder.duckdns.org:~/
```

### SSH into EC2:
```bash
ssh ubuntu@fuelfinder.duckdns.org
```

### Run the automated fix:
```bash
cd ~
chmod +x ec2-fix-triple-upload.sh
./ec2-fix-triple-upload.sh
```

This script will:
- ✅ Check current state
- ✅ Stop all PM2 processes
- ✅ Kill all node processes
- ✅ Restart with 1 instance in fork mode
- ✅ Verify the fix

**OR use the one-liner** (see `RUN_THIS_ON_EC2.txt`)

---

## 📋 Alternative: Manual Fix

If you prefer to do it manually:

```bash
# SSH into EC2
ssh ubuntu@fuelfinder.duckdns.org

# Stop everything
pm2 delete all
pkill -f "node.*server.js"
sleep 3

# Restart correctly
cd ~/fuel_finder/backend
pm2 start ecosystem.config.js
pm2 save

# Verify
pm2 list  # Should show 1 instance, fork mode
ps aux | grep "node.*server.js" | grep -v grep | wc -l  # Should output: 1
```

---

## ✅ How to Verify It Worked

### 1. Check Process Count
```bash
ps aux | grep "node.*server.js" | grep -v grep | wc -l
```
**MUST output:** `1`

### 2. Check PM2
```bash
pm2 list
```
**Should show:**
- Only **1 row** for fuel-finder
- Mode: **fork** (NOT cluster)
- Status: **online**

### 3. Test Upload
1. Go to admin portal
2. Upload **1 image**
3. Check database → Should have **only 1 image**

---

## 🔍 If Still Not Fixed

### Check AWS Infrastructure:

#### 1. EC2 Instances Count
**AWS Console → EC2 → Instances**
- How many instances are running? Should be **1**

#### 2. Auto-Scaling Group
**AWS Console → EC2 → Auto Scaling Groups**
- Desired Capacity: **1**
- Min: **1**
- Max: **1** (or higher if you want scaling later)

#### 3. Load Balancer Targets
**AWS Console → EC2 → Load Balancers → Target Groups**
- Healthy targets: **1**

**If any of these show 3** → That's your problem!

---

## 📊 Why Render.com Worked But EC2 Doesn't

| Aspect | Render.com | AWS EC2 |
|--------|------------|---------|
| Process Management | Automatic | Manual (PM2) |
| Scaling | Managed | You configure it |
| Default Instances | 1 | You decide |
| Configuration | Zero-config | Requires setup |

**On Render:** Platform ensures 1 instance runs  
**On EC2:** You must configure PM2/auto-scaling correctly

---

## 🎯 Expected State After Fix

### Application Level:
```
✅ 1 PM2 process (fork mode)
✅ 1 node process
✅ Listening on port 3001 only
```

### AWS Level:
```
✅ 1 EC2 instance running
✅ Auto-scaling: 1/1/1 (min/desired/max)
✅ Load balancer: 1 healthy target
```

### Functionality:
```
✅ Upload 1 image → 1 image in database
✅ No duplicate uploads
✅ Backend logs show 1 request ID per upload
```

---

## 📁 Files to Help You

**Quick reference:**
- `EC2_QUICK_FIX.md` - One-page quick fix
- `RUN_THIS_ON_EC2.txt` - Exact commands to copy-paste

**Detailed guides:**
- `AWS_EC2_TRIPLE_UPLOAD_FIX.md` - Complete EC2 diagnostics
- `ec2-fix-triple-upload.sh` - Automated fix script

**For context:**
- `TRIPLE_UPLOAD_FIX_COMPREHENSIVE.md` - Full technical guide
- `FIX_NAVIGATION.md` - Navigate all documentation

---

## 🚨 Critical Points

1. **Frontend code is probably fine** - No need to rebuild/redeploy frontend
2. **Focus on EC2 server** - This is where the issue is
3. **PM2 is the key** - Must be exactly 1 instance in fork mode
4. **AWS infrastructure** - Check if auto-scaling launched multiple instances

---

## 🆘 Need Help?

If the fix doesn't work, provide this information:

**From EC2 (SSH in and run these):**
```bash
pm2 list
pm2 show fuel-finder
ps aux | grep node
cat ~/fuel_finder/backend/ecosystem.config.js
netstat -tlnp | grep node
```

**From AWS Console:**
- Number of running EC2 instances
- Auto-Scaling Group settings (min/desired/max)
- Load Balancer target count
- Screenshot of target health

---

## ⏱️ Time Estimate

- **Read this guide:** 5 minutes
- **Run the fix:** 2 minutes
- **Verify it worked:** 3 minutes
- **Total:** ~10 minutes

---

## 🎯 TL;DR

1. SSH into EC2: `ssh ubuntu@fuelfinder.duckdns.org`
2. Run: `pm2 delete all && pkill -f "node.*server.js" && sleep 3 && cd ~/fuel_finder/backend && pm2 start ecosystem.config.js && pm2 save`
3. Verify: `ps aux | grep "node.*server.js" | grep -v grep | wc -l` → Should output `1`
4. Test upload → Should work!

**If still broken:** Check AWS Console for multiple EC2 instances.

---

**Ready?** → Open `RUN_THIS_ON_EC2.txt` and copy-paste the commands!
