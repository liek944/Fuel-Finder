# Fix: "Error deleting station" Issue

## Problem
Delete station operation is failing with "Error deleting station" message in the admin portal.

## Root Cause
The ADMIN_API_KEY in your production environment is set to a placeholder value instead of the actual API key.

## Solution

### Update API Key on EC2 Server

1. SSH into your EC2 server
2. Navigate to backend directory
3. Edit the .env file
4. Update the ADMIN_API_KEY to: sirjeildeanedgar
5. Restart the backend with: pm2 restart fuel-finder-api
6. Use the same key in frontend admin portal

### Verification Steps

Check if the API key is working:
```bash
curl -X DELETE https://fuelfinder.duckdns.org/api/stations/999 \
  -H "x-api-key: sirjeildeanedgar" \
  -v
```

Expected: 404 Not Found (auth worked) or 401 Unauthorized (key mismatch)

### Check Backend Logs
```bash
pm2 logs fuel-finder-api --lines 50
```

Look for the configured API key in startup logs.
