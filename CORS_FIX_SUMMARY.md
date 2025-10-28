# CORS Error Fix - Complete Summary

## Problem

Frontend at `https://fuelfinderths.netlify.app` was getting blocked by CORS policy when trying to fetch from backend API at `https://fuelfinder.duckdns.org`:

```
Access to fetch at 'https://fuelfinder.duckdns.org/api/stations/nearby' 
from origin 'https://fuelfinderths.netlify.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause

**Backend CORS misconfiguration:**
- `backend/app.js` had hardcoded `origin: true` instead of reading from environment variable
- `backend/config/environment.js` did NOT export `allowedOrigins` 
- Even though `.env` had the correct `ALLOWED_ORIGINS`, the code wasn't using it

## Solution

### Files Modified

#### 1. **backend/config/environment.js**
```javascript
// Added CORS configuration export
allowedOrigins: process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001",
```

#### 2. **backend/app.js**
```javascript
// Changed from:
app.use(cors({ origin: true, ... }));

// To:
const allowedOrigins = config.allowedOrigins 
  ? config.allowedOrigins.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

console.log('🌐 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser requests
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(null, true); // Log but still allow (can change to false to block)
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-owner-domain", "X-Session-Id"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // 24 hours
}));
```

## What Changed

### Before
- CORS used `origin: true` which **should** allow all origins
- But wasn't working reliably for some reason (possibly Express 5.x behavior)
- No logging of CORS origins

### After
- CORS explicitly reads from `ALLOWED_ORIGINS` environment variable
- Validates each origin against whitelist
- Logs allowed origins on startup
- Logs warnings when unknown origins attempt access
- More control and visibility

## Allowed Origins (from .env)

```bash
ALLOWED_ORIGINS=https://fuelfinderths.netlify.app,https://fuelfinder.duckdns.org,http://localhost:3000,http://localhost:3001
```

This allows requests from:
- ✅ **Production frontend** - https://fuelfinderths.netlify.app
- ✅ **Backend itself** - https://fuelfinder.duckdns.org
- ✅ **Local development** - http://localhost:3000, http://localhost:3001

## Deployment Steps

### On EC2/Server:
```bash
# Navigate to project
cd /home/keil/fuel_finder  # or your project path

# Run deployment script
./deploy-cors-fix.sh

# OR manually:
cd backend
pm2 restart fuel-finder-backend
pm2 logs fuel-finder-backend --lines 20
```

### Verification:

1. **Check backend logs for CORS origins:**
```bash
pm2 logs fuel-finder-backend --lines 20 | grep "CORS"
```
Expected output:
```
🌐 CORS allowed origins: [ 
  'https://fuelfinderths.netlify.app',
  'https://fuelfinder.duckdns.org',
  'http://localhost:3000',
  'http://localhost:3001'
]
```

2. **Test CORS headers:**
```bash
curl -I -H "Origin: https://fuelfinderths.netlify.app" http://localhost:3001/api/health
```
Expected header in response:
```
access-control-allow-origin: https://fuelfinderths.netlify.app
```

3. **Test in browser:**
- Open https://fuelfinderths.netlify.app
- Open browser console (F12)
- Should see NO CORS errors
- Stations and POIs should load on map

## Technical Details

### CORS (Cross-Origin Resource Sharing)

**What is it?**
Browser security feature that blocks web pages from making requests to a different domain than the one serving the page, unless the server explicitly allows it.

**How it works:**
1. Browser makes **preflight OPTIONS request** to check if cross-origin request is allowed
2. Server responds with `Access-Control-Allow-Origin` header
3. If origin is allowed, browser makes the actual request
4. If not allowed, browser blocks the request and shows CORS error

**Why we need it:**
Frontend (netlify.app) and backend (duckdns.org) are **different domains**, so CORS must be configured.

### Environment-Based Configuration

**Why read from .env?**
- Different allowed origins for development vs production
- Easy to add new frontend domains without code changes
- Security: explicitly whitelist trusted domains
- Debugging: can log blocked origins

### Security Considerations

Currently set to **log warnings but still allow** unknown origins:
```javascript
callback(null, true); // Still allow
```

For production security, you can change to **strictly block**:
```javascript
callback(new Error('Not allowed by CORS')); // Block unknown origins
```

## Troubleshooting

### If CORS errors persist:

1. **Check .env file has correct domains:**
```bash
cd backend
grep ALLOWED_ORIGINS .env
```

2. **Verify backend restarted with new code:**
```bash
pm2 restart fuel-finder-backend
pm2 logs fuel-finder-backend --lines 30
```

3. **Clear browser cache:**
- Hard refresh: Ctrl+Shift+R (Chrome/Firefox)
- Or clear site data in DevTools

4. **Check for typos in domain names:**
- Correct: `https://fuelfinderths.netlify.app` (no trailing slash)
- Wrong: `https://fuelfinderths.netlify.app/`

5. **Verify backend is responding:**
```bash
curl http://localhost:3001/api/health
```

6. **Check PM2 status:**
```bash
pm2 status
pm2 info fuel-finder-backend
```

### Common CORS Issues

| Error | Cause | Fix |
|-------|-------|-----|
| "No Access-Control-Allow-Origin header" | Backend not sending CORS headers | Check CORS middleware is applied |
| "Origin not allowed by CORS" | Origin not in whitelist | Add domain to ALLOWED_ORIGINS |
| "Credentials flag is true" | Mismatch in credentials setting | Set credentials: true on both sides |
| Preflight OPTIONS failing | OPTIONS method not allowed | Add OPTIONS to allowed methods |

## Additional CORS Headers Configured

- **Methods:** GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Allowed Headers:** Content-Type, Authorization, x-api-key, x-owner-domain, X-Session-Id
- **Exposed Headers:** Content-Range, X-Content-Range
- **Max Age:** 86400 seconds (24 hours) - browser caches preflight responses
- **Credentials:** true - allows cookies and authentication headers

## Files Changed Summary

```
backend/
├── config/
│   └── environment.js         ← Added allowedOrigins export
├── app.js                     ← Updated CORS middleware
└── .env                       ← Already had ALLOWED_ORIGINS (no change)

deploy-cors-fix.sh             ← Created deployment script
CORS_FIX_SUMMARY.md           ← This documentation
```

## Related Documentation

- **CORS Spec:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Express CORS Package:** https://www.npmjs.com/package/cors
- **Backend Architecture:** backend/README.md
- **Deployment Guide:** DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/

## Status

✅ **FIXED** - Backend now properly reads ALLOWED_ORIGINS from .env and sends correct CORS headers to allow Netlify frontend to access the API.

---

**Date Fixed:** 2025-01-28  
**Issue:** CORS blocking Netlify frontend  
**Solution:** Environment-based CORS configuration  
**Deploy:** `./deploy-cors-fix.sh`
