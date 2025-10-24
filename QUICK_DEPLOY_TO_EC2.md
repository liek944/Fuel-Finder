# Quick Deploy Owner Detection Fix to EC2

## The Problem (Fixed)
- Error: "Subdomain 'fuelfinder' is not registered"
- Owner portal couldn't load at `ifuel-dangay-portal.netlify.app`

## The Fix
Changed `backend/middleware/ownerDetection.js` to check `x-owner-domain` header **FIRST** before hostname.

---

## Deploy to EC2 (Choose One Method)

### Method 1: Copy File + Restart (FASTEST)

```bash
# 1. Copy the fixed file to EC2
scp backend/middleware/ownerDetection.js ubuntu@YOUR_EC2_IP:/home/ubuntu/fuel_finder/backend/middleware/

# 2. SSH and restart
ssh ubuntu@YOUR_EC2_IP
cd /home/ubuntu/fuel_finder/backend
pm2 restart all
pm2 logs --lines 30
```

### Method 2: Git Push + Pull (RECOMMENDED)

```bash
# 1. Commit the fix locally
git add backend/middleware/ownerDetection.js
git commit -m "Fix owner detection priority - check header first"
git push origin main

# 2. SSH into EC2 and pull
ssh ubuntu@YOUR_EC2_IP
cd /home/ubuntu/fuel_finder
git pull origin main
pm2 restart all
pm2 logs --lines 30
```

---

## Verify the Fix

1. **Check PM2 logs:**
```bash
pm2 logs --lines 50
```

Look for: `🏷️  Owner domain from header: ifuel-dangay`

2. **Test the portal:**
- Visit: `https://ifuel-dangay-portal.netlify.app`
- Should load without "not registered" error
- Login with API key: `H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=`

3. **Test API directly:**
```bash
curl -H "x-owner-domain: ifuel-dangay" \
     https://fuelfinder.duckdns.org/api/owner/info
```

Should return:
```json
{
  "name": "iFuel Dangay Station",
  "domain": "ifuel-dangay",
  "contact_person": "Your Name",
  "email": "owner@ifuel-dangay.com"
}
```

---

## If Something Goes Wrong

### Rollback:
```bash
ssh ubuntu@YOUR_EC2_IP
cd /home/ubuntu/fuel_finder/backend
git checkout HEAD~1 middleware/ownerDetection.js
pm2 restart all
```

### Check PM2 status:
```bash
pm2 list
pm2 logs --err --lines 50
```

---

## Summary

**File Modified:** `backend/middleware/ownerDetection.js`  
**Change:** Header detection BEFORE hostname detection  
**Why:** Netlify frontend sends subdomain in header, not hostname  
**Deploy Time:** ~2 minutes  
**Restart Required:** Yes (PM2)

---

**Ready to deploy!** 🚀
