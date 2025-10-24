# API Key Authentication Fix After Modularization

> **⚠️ IMPORTANT UPDATE:** There were TWO bugs causing the sign-in issue!
> See **API_KEY_SIGNIN_FIX_COMPLETE.md** for the complete fix including the frontend bug.

## 🐛 Problem Identified (Backend Only - Part 1 of 2)

After modularization, the admin dashboard API key authentication was not working because the `.env` file was not being loaded correctly.

### Root Cause

The `backend/config/environment.js` file was calling `require("dotenv").config()` without specifying a path. Since this file is located in a subdirectory (`backend/config/`), but the `.env` file is in the parent directory (`backend/`), dotenv was looking in the wrong location.

**File Structure:**
```
backend/
├── .env                    ← API key is here (ADMIN_API_KEY=...)
├── config/
│   └── environment.js      ← Was trying to load .env from here
└── server.js
```

## ✅ Fix Applied

Updated `backend/config/environment.js` to explicitly specify the path to the `.env` file:

**Before:**
```javascript
try {
  require("dotenv").config();
} catch (_) {}
```

**After:**
```javascript
const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch (_) {}
```

Also removed redundant dotenv loading from `server.js` since `environment.js` now properly handles it.

## 🔍 How to Verify the Fix

### 1. Check Server Logs

When you start the server, you should see:
```bash
🔑 ADMIN_API_KEY configured: "your_actual_key_here"
```

If it says `"NOT SET"`, the .env file is still not being loaded.

### 2. Test with Debug Endpoint

```bash
curl http://localhost:3001/api/admin/debug
```

You should see:
```json
{
  "adminApiKeyConfigured": true,
  "headerKeyProvided": false,
  "keyMatch": false,
  "configuredKey": "your_actual_key_here"
}
```

### 3. Test Admin Endpoints

Test creating a station WITH API key:
```bash
curl -X POST http://localhost:3001/api/stations \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_actual_key_here" \
  -d '{
    "name": "Test Station",
    "latitude": 13.41,
    "longitude": 121.41,
    "brand": "Test"
  }'
```

Should return: `201 Created` with station data

Test WITHOUT API key (should fail):
```bash
curl -X POST http://localhost:3001/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Station",
    "latitude": 13.41,
    "longitude": 121.41,
    "brand": "Test"
  }'
```

Should return:
```json
{
  "error": "Unauthorized",
  "message": "Valid API key required for admin operations"
}
```

## 🔐 Protected Endpoints

The following admin endpoints require the `x-api-key` header:

### Station Management
- `POST /api/stations` - Create station
- `PUT /api/stations/:id` - Update station
- `DELETE /api/stations/:id` - Delete station

### POI Management
- `POST /api/pois` - Create POI
- `PUT /api/pois/:id` - Update POI
- `DELETE /api/pois/:id` - Delete POI

### Image Management
- `POST /api/stations/:id/images` - Upload station images
- `POST /api/pois/:id/images` - Upload POI images
- `DELETE /api/images/:id` - Delete image
- `PATCH /api/images/:id/primary` - Set primary image

### Price Management
- `PUT /api/stations/:id/fuel-prices/:fuel_type` - Update fuel price
- `DELETE /api/stations/:id/fuel-prices/:fuel_type` - Delete fuel price
- `PATCH /api/price-reports/:id/verify` - Verify price report

### Admin Analytics
- `GET /api/admin/price-reports/stats` - Price report statistics
- `GET /api/admin/price-reports/trends` - Price trends

## 🚀 Deployment

If you're deploying to AWS EC2, make sure to:

1. **Update the backend files:**
   ```bash
   cd /path/to/fuel_finder/backend
   # Pull latest changes or manually update the files
   ```

2. **Verify .env file exists and contains ADMIN_API_KEY:**
   ```bash
   cat .env | grep ADMIN_API_KEY
   ```

3. **Restart the server:**
   ```bash
   # If using PM2:
   pm2 restart fuel-finder-backend
   
   # Or if using ecosystem.config.js:
   pm2 restart ecosystem.config.js
   
   # Or if running directly:
   pkill -f "node server.js"
   node server.js
   ```

4. **Check logs to verify API key is loaded:**
   ```bash
   pm2 logs fuel-finder-backend
   ```

## 📝 Admin Portal Configuration

Make sure your admin portal frontend is sending the API key in the header:

```javascript
const response = await fetch('http://your-api-url/api/stations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_actual_key_here'  // ← Must match ADMIN_API_KEY in .env
  },
  body: JSON.stringify(stationData)
});
```

## ⚠️ Security Notes

1. **Never commit .env files** - They're in `.gitignore` for a reason
2. **Use different keys for dev/prod** - Set different `ADMIN_API_KEY` values
3. **Rotate keys periodically** - Change the API key regularly
4. **Use HTTPS in production** - API keys sent over HTTP can be intercepted

## 🎯 Summary

The modularization broke API key authentication because `environment.js` couldn't find the `.env` file. This is now fixed by explicitly specifying the path to `.env` relative to the `environment.js` file location. All admin endpoints should now properly require and validate the API key.
