# Owner-Based Access Control Implementation Guide

## 📋 Overview

This guide documents the complete owner-based access control system for Fuel Finder. The system enables multiple station owners to manage their own stations through unique subdomains and API keys.

## 🎯 System Architecture

### Multi-Tenant Design
- Each owner gets a unique subdomain (e.g., `castillonfuels.fuelfinder.com`)
- Subdomain detection automatically identifies the requesting owner
- API key authentication ensures secure access
- Data isolation prevents owners from accessing each other's data

### Key Components

1. **Database Layer**
   - `owners` table - Stores owner information and API keys
   - `owner_activity_logs` table - Audit trail of all owner actions
   - Foreign key `owner_id` on `stations` table
   - View `owner_dashboard_stats` for analytics

2. **Middleware Layer**
   - `ownerDetection.js` - Extracts subdomain and identifies owner
   - `ownerAuth.js` - Validates API keys and enforces access control

3. **API Layer**
   - Owner-specific routes (`/api/owner/*`)
   - Owner-filtered public routes (`/api/stations`)
   - Station management endpoints
   - Price report verification endpoints

## 🗄️ Database Schema

### Owners Table
```sql
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL UNIQUE,
    api_key TEXT NOT NULL UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    contact_person VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Updated Stations Table
```sql
ALTER TABLE stations 
ADD COLUMN owner_id UUID REFERENCES owners(id) ON DELETE SET NULL;
```

### Owner Activity Logs
```sql
CREATE TABLE owner_activity_logs (
    id SERIAL PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    price_report_id INTEGER REFERENCES fuel_price_reports(id) ON DELETE SET NULL,
    request_ip VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Installation & Setup

### Step 1: Apply Migration

```bash
cd backend
node database/apply-owner-migration.js
```

This will:
- Create the `owners` table
- Add `owner_id` to `stations` table
- Create sample owners with API keys
- Assign sample stations to owners
- Set up audit logging

### Step 2: Save API Keys

After running the migration, you'll see output like:

```
1. Castillon Fuels Corporation
   Subdomain: castillonfuels.fuelfinder.com
   API Key: xK8fJ2mP9qR4vW7tN3bH6yL1sD5gA8zC...
```

**⚠️ IMPORTANT:** Save these API keys securely! They're like passwords for owner access.

### Step 3: Configure DNS (Production)

For production deployment, configure DNS records:

```
castillonfuels.fuelfinder.com  →  Your server IP
santosgas.fuelfinder.com       →  Your server IP
roxaspetro.fuelfinder.com      →  Your server IP
```

Or use a wildcard DNS record:
```
*.fuelfinder.com  →  Your server IP
```

### Step 4: Test Locally (Development)

For local testing, you can modify your `/etc/hosts` file:

```bash
# Add to /etc/hosts
127.0.0.1  castillonfuels.localhost
127.0.0.1  santosgas.localhost
127.0.0.1  roxaspetro.localhost
```

Then access: `http://castillonfuels.localhost:3000`

## 🔑 API Endpoints

### Public Owner Endpoints (No API Key Required)

#### Get Owner Information
```http
GET /api/owner/info
Host: castillonfuels.fuelfinder.com
```

**Response:**
```json
{
  "name": "Castillon Fuels Corporation",
  "domain": "castillonfuels",
  "contact_person": "Juan Castillon",
  "email": "admin@castillonfuels.com",
  "phone": "+63-917-123-4567"
}
```

### Protected Owner Endpoints (API Key Required)

All protected endpoints require the `x-api-key` header:

```http
x-api-key: <owner-api-key>
```

#### Get Owner Dashboard
```http
GET /api/owner/dashboard
Host: castillonfuels.fuelfinder.com
x-api-key: xK8fJ2mP9qR4vW7tN3bH6yL1sD5gA8zC...
```

**Response:**
```json
{
  "owner_name": "Castillon Fuels Corporation",
  "domain": "castillonfuels",
  "total_stations": 5,
  "verified_reports": 23,
  "pending_reports": 3,
  "total_actions": 156,
  "last_activity": "2025-10-23T14:30:00Z"
}
```

#### Get Owner's Stations
```http
GET /api/owner/stations
Host: castillonfuels.fuelfinder.com
x-api-key: <api-key>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Shell Station",
    "brand": "Shell",
    "location": { "lat": 12.596, "lng": 121.526 },
    "address": "Roxas, Oriental Mindoro",
    "fuel_prices": [
      { "fuel_type": "Regular", "price": 58.50 },
      { "fuel_type": "Premium", "price": 62.30 }
    ]
  }
]
```

#### Update Station
```http
PUT /api/owner/stations/:id
Host: castillonfuels.fuelfinder.com
x-api-key: <api-key>
Content-Type: application/json

{
  "name": "Updated Station Name",
  "operating_hours": {
    "open": "06:00",
    "close": "22:00"
  }
}
```

#### Get Pending Price Reports
```http
GET /api/owner/price-reports/pending?limit=50
Host: castillonfuels.fuelfinder.com
x-api-key: <api-key>
```

**Response:**
```json
{
  "count": 3,
  "reports": [
    {
      "id": 45,
      "station_id": 1,
      "station_name": "Shell Station",
      "fuel_type": "Regular",
      "price": 59.00,
      "reporter_ip": "192.168.1.100",
      "notes": "Price updated this morning",
      "created_at": "2025-10-23T08:15:00Z"
    }
  ]
}
```

#### Verify Price Report
```http
POST /api/owner/price-reports/:id/verify
Host: castillonfuels.fuelfinder.com
x-api-key: <api-key>
Content-Type: application/json

{
  "notes": "Verified - price is correct"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Price report verified successfully for Shell Station",
  "report_id": 45,
  "station_id": 1,
  "fuel_type": "Regular",
  "price": 59.00
}
```

#### Reject Price Report
```http
POST /api/owner/price-reports/:id/reject
Host: castillonfuels.fuelfinder.com
x-api-key: <api-key>
Content-Type: application/json

{
  "reason": "Price is incorrect - still 58.50"
}
```

#### Get Activity Logs
```http
GET /api/owner/activity-logs?limit=100&offset=0
Host: castillonfuels.fuelfinder.com
x-api-key: <api-key>
```

#### Get Analytics
```http
GET /api/owner/analytics
Host: castillonfuels.fuelfinder.com
x-api-key: <api-key>
```

### Public Station Endpoints (Owner-Filtered)

When accessed through an owner subdomain, these public endpoints automatically filter by owner:

```http
GET /api/stations
Host: castillonfuels.fuelfinder.com
```
Returns only Castillon Fuels' stations

```http
GET /api/stations/nearby?lat=12.596&lng=121.526&radius=5000
Host: santosgas.fuelfinder.com
```
Returns only Santos Gas stations within the radius

## 🧪 Testing Guide

### 1. Test Owner Detection

```bash
# Test with curl
curl -H "Host: castillonfuels.fuelfinder.com" \
     http://localhost:3000/api/owner/info

# Expected: Returns Castillon Fuels info
```

### 2. Test Invalid Subdomain

```bash
curl -H "Host: unknownowner.fuelfinder.com" \
     http://localhost:3000/api/owner/info

# Expected: 404 error - owner not found
```

### 3. Test API Key Authentication

```bash
# Without API key (should fail)
curl -H "Host: castillonfuels.fuelfinder.com" \
     http://localhost:3000/api/owner/dashboard

# Expected: 401 Unauthorized
```

```bash
# With valid API key (should succeed)
curl -H "Host: castillonfuels.fuelfinder.com" \
     -H "x-api-key: YOUR_API_KEY_HERE" \
     http://localhost:3000/api/owner/dashboard

# Expected: Dashboard data
```

### 4. Test Invalid API Key

```bash
curl -H "Host: castillonfuels.fuelfinder.com" \
     -H "x-api-key: invalid-key-12345" \
     http://localhost:3000/api/owner/dashboard

# Expected: 403 Forbidden
```

### 5. Test Owner Data Isolation

```bash
# Get stations for owner A
curl -H "Host: castillonfuels.fuelfinder.com" \
     http://localhost:3000/api/stations

# Should only return Castillon Fuels stations

# Get stations for owner B
curl -H "Host: santosgas.fuelfinder.com" \
     http://localhost:3000/api/stations

# Should only return Santos Gas stations
```

### 6. Test Price Verification

```bash
# 1. Create a price report (public endpoint)
curl -X POST http://localhost:3000/api/stations/1/price-report \
     -H "Content-Type: application/json" \
     -d '{
       "fuel_type": "Regular",
       "price": 59.50,
       "notes": "Test price report"
     }'

# 2. Verify it as owner
curl -X POST -H "Host: castillonfuels.fuelfinder.com" \
     -H "x-api-key: YOUR_API_KEY_HERE" \
     http://localhost:3000/api/owner/price-reports/1/verify \
     -H "Content-Type: application/json" \
     -d '{"notes": "Verified"}'
```

## 🔒 Security Features

### 1. API Key Security
- API keys are generated using secure random bytes (32 bytes, base64 encoded)
- Keys are stored in plaintext in database (consider hashing for production)
- Failed authentication attempts are logged

### 2. Audit Logging
All owner actions are logged to `owner_activity_logs`:
- Authentication attempts (success/failure)
- Station updates
- Price verifications
- IP address and user agent tracking

### 3. Data Isolation
- Subdomain detection ensures owners only see their data
- Database queries automatically filter by `owner_id`
- Cross-owner access attempts are blocked

### 4. Rate Limiting
Owner endpoints can use existing rate limiting middleware:

```javascript
router.post("/price-reports/:id/verify", 
  rateLimit,  // Add this
  verifyOwnerApiKey,
  asyncHandler(ownerController.verifyPriceReport)
);
```

## 📊 Monitoring & Analytics

### View Owner Activity
```sql
SELECT 
  action_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM owner_activity_logs
WHERE owner_id = '<owner-uuid>'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action_type;
```

### Failed Authentication Attempts
```sql
SELECT 
  oal.*,
  o.name,
  o.domain
FROM owner_activity_logs oal
JOIN owners o ON o.id = oal.owner_id
WHERE action_type = 'auth_attempt'
  AND success = FALSE
ORDER BY created_at DESC
LIMIT 50;
```

### Most Active Owners
```sql
SELECT 
  o.name,
  o.domain,
  COUNT(oal.id) as total_actions,
  COUNT(CASE WHEN oal.action_type = 'verify_price' THEN 1 END) as verifications
FROM owners o
JOIN owner_activity_logs oal ON oal.owner_id = o.id
WHERE oal.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name, o.domain
ORDER BY total_actions DESC;
```

## 🛠️ Troubleshooting

### Issue: Owner not detected
**Symptoms:** `req.owner` is always null

**Solutions:**
1. Check that hostname includes subdomain
2. Verify subdomain exists in `owners` table
3. Check `is_active = TRUE` for owner
4. Test with curl: `curl -H "Host: subdomain.domain.com" http://localhost:3000/api/owner/info`

### Issue: API key authentication fails
**Symptoms:** 403 Forbidden even with correct key

**Solutions:**
1. Verify API key matches exactly (no extra spaces)
2. Check owner is active: `SELECT * FROM owners WHERE domain = 'subdomain'`
3. Review logs: `SELECT * FROM owner_activity_logs WHERE success = FALSE`
4. Ensure `x-api-key` header is being sent

### Issue: Can't access other owner's stations
**Symptoms:** Station updates fail with 403

**Solutions:**
1. This is expected behavior! Owners can only manage their own stations
2. Check station ownership: `SELECT owner_id FROM stations WHERE id = ?`
3. Assign station to owner: `UPDATE stations SET owner_id = '<owner-uuid>' WHERE id = ?`

## 🔮 Future Enhancements

### API Key Rotation
```sql
-- Add key rotation fields
ALTER TABLE owners ADD COLUMN api_key_expires_at TIMESTAMP;
ALTER TABLE owners ADD COLUMN previous_api_key TEXT;
```

### Two-Factor Authentication
- Add 2FA requirement for sensitive operations
- Store 2FA secrets in `owners` table
- Implement TOTP verification

### Owner Registration Portal
- Self-service owner registration
- Admin approval workflow
- Email verification

### Advanced Analytics Dashboard
- Real-time station metrics
- Price trend analysis
- Customer engagement statistics

## 📝 Code Examples

### Frontend: Calling Owner API

```javascript
// JavaScript example
const API_KEY = 'your-api-key-here';
const SUBDOMAIN = 'castillonfuels';

async function getOwnerDashboard() {
  const response = await fetch(
    `https://${SUBDOMAIN}.fuelfinder.com/api/owner/dashboard`,
    {
      headers: {
        'x-api-key': API_KEY
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

async function verifyPriceReport(reportId) {
  const response = await fetch(
    `https://${SUBDOMAIN}.fuelfinder.com/api/owner/price-reports/${reportId}/verify`,
    {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notes: 'Verified by owner'
      })
    }
  );
  
  return await response.json();
}
```

### Backend: Adding Owner to New Endpoint

```javascript
// In your controller
async function someOwnerAction(req, res) {
  const ownerId = req.ownerData.id;
  const ownerName = req.ownerData.name;
  
  // Your logic here - data is automatically filtered by owner
  
  // Log the action
  await logOwnerActivity(
    ownerId,
    'custom_action',
    null,
    req.ip,
    req.get('user-agent'),
    { some: 'details' }
  );
  
  res.json({ success: true });
}

// In your routes
router.post('/custom-endpoint',
  detectOwner,
  requireOwner,
  verifyOwnerApiKey,
  asyncHandler(ownerController.someOwnerAction)
);
```

## 📚 Related Documentation

- `MIGRATION_PLAN.md` - Backend modularization structure
- `FEATURE_SPECS/ADMIN_ANALYTICS_DASHBOARD_SPEC.md` - Admin dashboard features
- `THESIS_CONTEXT.md` - Complete system architecture

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review activity logs for errors
3. Test with curl commands provided
4. Check database for data consistency

---

**Implementation Date:** October 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
