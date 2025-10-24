# Database Connection Issue - RESOLVED ✅

## Problem
Backend was failing to connect to Supabase PostgreSQL with error:
```
❌ Database connection failed: Connection terminated due to connection timeout
```

## Root Causes Identified

### 1. Wrong Port (Transaction Mode vs Session Mode)
- **Problem**: Using port `6543` (Supabase Transaction Mode Pooler)
- **Issue**: Transaction mode has limitations with PostGIS queries and long-running connections
- **Solution**: Switch to port `5432` (Session Mode Pooler)

### 2. Wrong Database Name
- **Problem**: Using `DB_NAME=fuel_finder`
- **Issue**: Tables actually exist in the `postgres` database (Supabase default)
- **Solution**: Change to `DB_NAME=postgres`

### 3. Short Connection Timeout
- **Problem**: `DB_CONNECTION_TIMEOUT_MS=2000` (2 seconds)
- **Issue**: Too short for Supabase pooler connections from remote servers
- **Solution**: Increase to `DB_CONNECTION_TIMEOUT_MS=20000` (20 seconds)

## Solution Applied

### Updated `.env` Configuration
```env
# Database Configuration (Supabase PostgreSQL with SSL)
DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
DB_PORT=5432                    # Changed from 6543
DB_NAME=postgres                # Changed from fuel_finder
DB_USER=postgres.ycmoophkkikrltgroane
DB_PASSWORD=c5hCVCx93SB3uzHF
DB_SSL=true

# Database Pool Configuration
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=20000  # Increased from 2000
```

## Verification Results

Using the diagnostic tool (`test-db-connection.js`):

```
✅ DNS Resolution: Success
✅ TCP Connection: Success
✅ PostgreSQL Connection: Success (658ms)
✅ PostgreSQL Version: 17.6
✅ PostGIS Extension: 3.3
✅ All Required Tables: Present
   - stations (3 records)
   - pois
   - images
   - fuel_prices
   - fuel_price_reports
```

## Files Updated

1. **`/home/keil/fuel_finder/backend/.env`** - Local development config
2. **`/home/keil/fuel_finder/backend/.env.production`** - Production config
3. **`/home/keil/fuel_finder/backend/.env.local.template`** - Template for local dev

## Supabase Connection Modes Explained

### Transaction Mode (Port 6543)
- **Use Case**: Serverless functions, short-lived connections
- **Limitations**: 
  - No prepared statements
  - No session-level features
  - Can drop connections unexpectedly
  - Not ideal for PostGIS queries

### Session Mode (Port 5432) ✅ RECOMMENDED
- **Use Case**: Traditional applications, long-running servers
- **Benefits**:
  - Full PostgreSQL feature support
  - Prepared statements work
  - PostGIS queries work reliably
  - Connection pooling works properly

## Diagnostic Tools Created

### 1. `test-db-connection.js`
Comprehensive connection diagnostic tool that tests:
- DNS resolution
- TCP connectivity
- PostgreSQL authentication
- PostGIS extension
- Table existence
- Sample queries

**Usage:**
```bash
cd /home/keil/fuel_finder/backend
node test-db-connection.js
```

### 2. `test-supabase-direct.js`
Tests multiple connection methods to find the working configuration.

### 3. `test-supabase-correct.js`
Tests different Supabase connection modes and database names.

## Next Steps

### 1. Restart Your Backend
```bash
# If using PM2
pm2 restart fuel-finder --update-env

# Or if running directly
npm start
```

### 2. Verify Connection
Check PM2 logs:
```bash
pm2 logs fuel-finder --lines 30
```

You should see:
```
✅ Database connected successfully
✅ PostGIS version: 3.3
🎯 Database connection verified successfully
🎉 Server ready to accept connections!
```

### 3. Update Render Environment Variables
If deploying to Render, update these environment variables:
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `DB_CONNECTION_TIMEOUT_MS=20000`

## Important Notes

### Database Name Clarification
- Your Supabase project uses the default `postgres` database
- All your tables (stations, pois, images, etc.) are in the `postgres` database
- You don't need to create a separate `fuel_finder` database
- This is normal for Supabase projects

### Connection Timeout
- 20 seconds is appropriate for:
  - Remote connections
  - Supabase pooler
  - Network latency
  - SSL handshake time
- Don't reduce below 10 seconds for production

### SSL Configuration
- `DB_SSL=true` is **required** for Supabase
- `rejectUnauthorized: false` is set in `db.js` (line 22)
- This is safe for Supabase managed databases

## Troubleshooting

If connection still fails:

### Check Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → Database
4. Verify:
   - Database is active
   - Connection pooler is enabled
   - Your IP is not blocked

### Test Connection Manually
```bash
node test-db-connection.js
```

### Check Firewall
Ensure port 5432 is not blocked:
```bash
telnet aws-1-ap-southeast-1.pooler.supabase.com 5432
```

### Verify Credentials
Double-check in Supabase Dashboard:
- Settings → Database → Connection string
- Compare with your `.env` values

## Related Documentation

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PostGIS with Supabase](https://supabase.com/docs/guides/database/extensions/postgis)
- [Node.js pg Library](https://node-postgres.com/)

---
**Last Updated**: 2025-10-13  
**Status**: ✅ RESOLVED  
**Resolution Time**: ~30 minutes  
**Root Cause**: Wrong port (6543→5432) and database name (fuel_finder→postgres)
