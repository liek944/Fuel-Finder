# CORS Fix - Urgent Deployment Needed

## 🚨 Issue Found
The owner portal now shows correctly, but CORS is blocking the `x-owner-domain` header.

**Error**: 
```
Access-Control-Allow-Headers in preflight response does not allow x-owner-domain
```

## ✅ Fix Applied
Added `x-owner-domain` to CORS allowed headers in `backend/app.js`.

---

## 🚀 Deploy to EC2 NOW

### Option 1: Quick Manual Upload (Fastest)

Copy these **2 files** to your EC2:

```bash
# Replace these with your actual values:
EC2_KEY="~/path/to/your-key.pem"
EC2_USER="ubuntu"
EC2_HOST="your-ec2-ip-or-hostname"
EC2_PATH="/home/ubuntu/fuel_finder/backend"

# Upload the files
scp -i $EC2_KEY backend/middleware/ownerDetection.js $EC2_USER@$EC2_HOST:$EC2_PATH/middleware/
scp -i $EC2_KEY backend/app.js $EC2_USER@$EC2_HOST:$EC2_PATH/

# SSH in and restart
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST
cd /home/ubuntu/fuel_finder/backend
pm2 restart fuel-finder-api
pm2 logs fuel-finder-api --lines 50
```

### Option 2: Using Git (If backend is in Git repo)

```bash
# On your local machine
git add backend/app.js backend/middleware/ownerDetection.js
git commit -m "Fix CORS for owner portal Netlify deployment"
git push origin main

# On EC2
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/fuel_finder/backend
git pull origin main
pm2 restart fuel-finder-api
pm2 logs fuel-finder-api --lines 50
```

### Option 3: Using the Upload Script

```bash
# Edit the script first with your EC2 details
nano upload-to-ec2.sh

# Then run it
./upload-to-ec2.sh
```

---

## 🧪 Test After Deployment

1. Visit: `https://ifuel-dangay-portal.netlify.app`
2. Enter API key: `H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=`
3. Click "Login to Dashboard"

**Expected Result**: 
- ✅ No CORS errors
- ✅ Successfully logs in
- ✅ Dashboard shows station data

**Check EC2 logs**:
```bash
pm2 logs fuel-finder-api
```

Should see:
```
🏷️  Owner domain from header: ifuel-dangay
✅ Owner authenticated: iFuel Dangay Station (ifuel-dangay)
```

---

## 📝 What Changed

### File 1: `backend/app.js` (Line 29)
```javascript
// BEFORE
allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],

// AFTER
allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-owner-domain"],
```

### File 2: `backend/middleware/ownerDetection.js`
Added support for `x-owner-domain` header detection (already uploaded in previous step).

---

## ⚡ Fastest Deploy Command

```bash
# Copy-paste this entire block (update the variables first):

EC2_KEY="~/your-key.pem"
EC2_USER="ubuntu"
EC2_HOST="your.ec2.hostname"
EC2_PATH="/home/ubuntu/fuel_finder/backend"

scp -i $EC2_KEY backend/app.js $EC2_USER@$EC2_HOST:$EC2_PATH/ && \
scp -i $EC2_KEY backend/middleware/ownerDetection.js $EC2_USER@$EC2_HOST:$EC2_PATH/middleware/ && \
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST "cd $EC2_PATH && pm2 restart fuel-finder-api && pm2 logs fuel-finder-api --lines 20"
```

---

## 🎯 Status

- ✅ Frontend deployed (owner login shows)
- ⚠️ **Backend needs deployment** (CORS fix)
- ⏳ Waiting for you to deploy to EC2

Once deployed, the owner portal will work perfectly! 🚀
