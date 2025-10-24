# 🚀 Owner Portal - Quick Start

## ⚡ TL;DR

**The Issue**: `ifuel-dangay.duckdns.org` redirects to backend API (404) instead of showing a web page.

**The Fix**: Built a complete owner portal. Now you just need to deploy it!

---

## 🎯 Your Login Credentials

```
URL: https://ifuel-dangay.YOUR-DOMAIN.com
API Key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=
```

---

## 📋 Deploy in 3 Steps

### Step 1: Deploy to Netlify

```bash
cd frontend
npm install
npm run build

# Option A: Netlify CLI
netlify deploy --prod --dir=dist

# Option B: GitHub → Netlify Dashboard
git push
# Then connect on netlify.com
```

### Step 2: Configure Environment

In Netlify Dashboard → Site Settings → Environment Variables:

```
VITE_API_BASE_URL=https://fuelfinder.duckdns.org
```

### Step 3: Set Up DNS

Point your domain to Netlify:

```
ifuel-dangay.fuelfinder.com → CNAME → your-site.netlify.app
```

**Done!** 🎉

---

## 🧪 Test Locally First (Optional)

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm run dev

# Visit: http://ifuel-dangay.localhost:5173
# Login with API key above
```

---

## ✅ What You'll See

### Login Page
- Beautiful gradient background
- Owner name display
- API key input field

### Dashboard
- **Overview Tab**: Statistics (stations, reports, actions)
- **Stations Tab**: Your station details (IFuel Dangay)
- **Reports Tab**: Price reports to approve/reject

---

## 📚 Documentation

- **Complete Setup**: `OWNER_PORTAL_SETUP_GUIDE.md`
- **Full Summary**: `OWNER_PORTAL_COMPLETE_SUMMARY.md`
- **Multi-Owner Guide**: `DOCUMENTATIONS AND CONTEXT/MULTI_OWNER_SYSTEM_GUIDE.md`

---

## 🆘 Quick Troubleshooting

### Can't Login?
```bash
# Check backend is running
curl https://fuelfinder.duckdns.org/api/health

# Check owner in database
cd backend/database && node check-and-apply-owner-migration.js
```

### CORS Error?
Update `/backend/app.js`:
```javascript
origin: ['https://your-netlify-site.netlify.app']
```

### Still Stuck?
Check browser console (F12) for error messages.

---

## 🎉 That's It!

Your owner portal is ready. Just deploy and configure DNS!

**Questions?** Check the full guides listed above.
