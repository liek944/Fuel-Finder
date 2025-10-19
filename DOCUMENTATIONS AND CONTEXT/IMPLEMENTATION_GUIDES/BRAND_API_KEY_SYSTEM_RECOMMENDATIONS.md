# 🔑 Brand/Client API Key System Implementation Guide

## 📋 Overview

This document outlines the implementation of a **Brand API Key System** for the Fuel Finder application, allowing fuel station brands/clients to:

1. **Verify price reports** submitted by users for their own stations only
2. **View analytics** and insights for their stations (read-only access)
3. **Manage their own stations** (optional - add/edit their stations)
4. **Receive notifications** about new price reports or updates

This system creates different **permission tiers** for various stakeholders:
- **Super Admin** (current system) - Full system access
- **Brand Owner** - Access to their own stations only
- **Analytics Viewer** - Read-only analytics access for specific brands

---

## 🎯 Business Use Cases

### Use Case 1: Brand Price Verification
**Scenario**: Shell Philippines wants to verify community-submitted price reports for all Shell stations in Oriental Mindoro.

**Implementation**:
- Shell receives a brand-specific API key linked to brand="Shell"
- Can only approve/reject price reports for Shell stations
- Receives webhook notifications when new reports are submitted
- Dashboard shows pending reports for their stations

### Use Case 2: Analytics Partnership
**Scenario**: A fuel distributor wants to track fuel price trends across multiple brands without modifying data.

**Implementation**:
- Distributor receives read-only API key
- Can access analytics endpoints for aggregated data
- Cannot modify stations, prices, or verify reports
- Dashboard shows trends, heatmaps, and statistics

### Use Case 3: Franchise Management
**Scenario**: Local fuel chain (e.g., "iFUEL") wants to manage their own stations and monitor performance.

**Implementation**:
- iFUEL receives brand management API key
- Can add/edit/delete only their own stations
- Can set official fuel prices for their stations
- Can view detailed analytics for their brand

---

## 🗄️ Database Schema Changes

### 1. Create `brands` Table
```sql
-- Store brand/client information
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE, -- e.g., "Shell", "Petron", "iFUEL"
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    webhook_url TEXT, -- URL to send notifications
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_active ON brands(is_active);
```

### 2. Create `api_keys` Table
```sql
-- Store API keys for brands and clients
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed API key (bcrypt)
    key_prefix VARCHAR(16) NOT NULL, -- First 8 chars for identification (e.g., "fuelffdr_")
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Descriptive name (e.g., "Shell Production Key")
    permission_level VARCHAR(50) NOT NULL CHECK (permission_level IN ('super_admin', 'brand_owner', 'brand_moderator', 'analytics_viewer')),
    
    -- Permissions granularity
    can_verify_reports BOOLEAN DEFAULT FALSE,
    can_manage_stations BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_update_prices BOOLEAN DEFAULT FALSE,
    
    -- Scope restrictions
    allowed_station_ids INTEGER[], -- NULL = all stations for that brand
    allowed_regions TEXT[], -- e.g., ['Roxas', 'Calapan']
    
    -- Security & tracking
    last_used_at TIMESTAMP,
    last_used_ip VARCHAR(45),
    usage_count INTEGER DEFAULT 0,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP, -- Optional expiration
    created_by VARCHAR(255), -- Admin who created it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    revoked_by VARCHAR(255),
    revoked_reason TEXT
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_brand ON api_keys(brand_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

### 3. Update `stations` Table
```sql
-- Link stations to brands
ALTER TABLE stations 
ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;

CREATE INDEX idx_stations_brand_id ON stations(brand_id);

-- Migrate existing brand data
INSERT INTO brands (name, display_name) 
SELECT DISTINCT brand, brand 
FROM stations 
WHERE brand IS NOT NULL AND brand != ''
ON CONFLICT (name) DO NOTHING;

-- Link existing stations to brands
UPDATE stations s
SET brand_id = b.id
FROM brands b
WHERE s.brand = b.name;
```

### 4. Create `api_key_logs` Table
```sql
-- Track all API key usage for security and analytics
CREATE TABLE IF NOT EXISTS api_key_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_payload JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_key_logs_key_id ON api_key_logs(api_key_id);
CREATE INDEX idx_api_key_logs_created ON api_key_logs(created_at DESC);
CREATE INDEX idx_api_key_logs_endpoint ON api_key_logs(endpoint);
```

### 5. Update `fuel_price_reports` Table
```sql
-- Track which API key verified the report
ALTER TABLE fuel_price_reports 
ADD COLUMN IF NOT EXISTS verified_by_api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL;

CREATE INDEX idx_price_reports_verified_by_key ON fuel_price_reports(verified_by_api_key_id);
```

---

## 🔐 API Key Format & Security

### API Key Format
```
fuelffdr_prod_abc123def456ghi789jkl012mno345pqr678stu901
│        │    └─────────────────────────────────────────────┘
│        │                    Random secure token (40 chars)
│        └──── Environment indicator (prod/test/dev)
└───────────── Service identifier
```

### Security Implementation

1. **Key Generation**
```javascript
const crypto = require('crypto');
const bcrypt = require('bcrypt');

function generateApiKey(brand, environment = 'prod') {
  const prefix = `fuelffdr_${environment}`;
  const randomToken = crypto.randomBytes(30).toString('hex'); // 60 chars
  const fullKey = `${prefix}_${randomToken}`;
  
  return {
    plainKey: fullKey, // Show this ONCE to the user
    keyHash: bcrypt.hashSync(fullKey, 10), // Store this in database
    keyPrefix: fullKey.substring(0, 16) // Store for identification
  };
}
```

2. **Key Validation**
```javascript
async function validateApiKey(providedKey) {
  // Extract prefix for quick lookup
  const prefix = providedKey.substring(0, 16);
  
  // Find key by prefix
  const apiKeyRecord = await pool.query(
    'SELECT * FROM api_keys WHERE key_prefix = $1 AND is_active = true',
    [prefix]
  );
  
  if (apiKeyRecord.rows.length === 0) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  const record = apiKeyRecord.rows[0];
  
  // Check expiration
  if (record.expires_at && new Date() > new Date(record.expires_at)) {
    return { valid: false, error: 'API key expired' };
  }
  
  // Verify hash
  const isValid = bcrypt.compareSync(providedKey, record.key_hash);
  
  if (isValid) {
    // Update usage tracking
    await pool.query(
      'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1, last_used_ip = $1 WHERE id = $2',
      [req.ip, record.id]
    );
    
    return { 
      valid: true, 
      apiKey: record,
      brandId: record.brand_id,
      permissions: {
        canVerifyReports: record.can_verify_reports,
        canManageStations: record.can_manage_stations,
        canViewAnalytics: record.can_view_analytics,
        canUpdatePrices: record.can_update_prices
      }
    };
  }
  
  return { valid: false, error: 'Invalid API key' };
}
```

3. **Rate Limiting (Per API Key)**
```javascript
const apiKeyRateLimits = new Map(); // api_key_id -> { count, reset }

function apiKeyRateLimit(apiKeyId, limitPerHour) {
  const now = Date.now();
  let bucket = apiKeyRateLimits.get(apiKeyId);
  
  if (!bucket || now > bucket.reset) {
    bucket = { count: 1, reset: now + (60 * 60 * 1000) }; // 1 hour
  } else {
    bucket.count += 1;
  }
  
  apiKeyRateLimits.set(apiKeyId, bucket);
  
  if (bucket.count > limitPerHour) {
    throw new Error('API key rate limit exceeded');
  }
}
```

---

## 🚀 New API Endpoints

### Admin Endpoints (Super Admin Only)

#### 1. Create Brand
```http
POST /api/admin/brands
Headers:
  x-api-key: <ADMIN_API_KEY>
Body:
{
  "name": "Shell",
  "display_name": "Shell Philippines",
  "description": "Leading fuel brand",
  "contact_email": "api@shell.com.ph",
  "webhook_url": "https://shell.com.ph/webhooks/fuelfinder"
}
```

#### 2. Generate API Key for Brand
```http
POST /api/admin/brands/:brandId/api-keys
Headers:
  x-api-key: <ADMIN_API_KEY>
Body:
{
  "name": "Shell Production Key",
  "permission_level": "brand_moderator",
  "can_verify_reports": true,
  "can_view_analytics": true,
  "can_update_prices": false,
  "can_manage_stations": false,
  "rate_limit_per_hour": 5000,
  "expires_at": "2026-12-31T23:59:59Z"
}
Response:
{
  "api_key": "fuelffdr_prod_abc123...", // ⚠️ SHOW ONLY ONCE
  "key_id": 123,
  "key_prefix": "fuelffdr_prod_abc",
  "brand": "Shell",
  "permissions": {...},
  "warning": "Store this key securely. It will not be shown again."
}
```

#### 3. List API Keys
```http
GET /api/admin/api-keys
GET /api/admin/brands/:brandId/api-keys
Headers:
  x-api-key: <ADMIN_API_KEY>
```

#### 4. Revoke API Key
```http
DELETE /api/admin/api-keys/:keyId
Headers:
  x-api-key: <ADMIN_API_KEY>
Body:
{
  "reason": "Security rotation"
}
```

### Brand Owner Endpoints (Brand-Specific API Key)

#### 5. Get My Brand Stations
```http
GET /api/brand/stations
Headers:
  x-api-key: <BRAND_API_KEY>
Response:
{
  "brand": {
    "id": 1,
    "name": "Shell",
    "display_name": "Shell Philippines"
  },
  "stations": [
    {
      "id": 6,
      "name": "Shell Roxas",
      "brand": "Shell",
      "fuel_prices": [...],
      "pending_reports_count": 3
    }
  ]
}
```

#### 6. Verify Price Report (Brand-Specific)
```http
PATCH /api/brand/price-reports/:reportId/verify
Headers:
  x-api-key: <BRAND_API_KEY>
Body:
{
  "is_verified": true,
  "apply_to_official_price": true,
  "notes": "Verified by Shell admin"
}
```

**Authorization Logic**:
```javascript
// Verify that the report belongs to a station owned by this brand
const report = await getReportById(reportId);
if (report.station.brand_id !== apiKey.brand_id) {
  return res.status(403).json({ error: 'Unauthorized - station not owned by your brand' });
}
```

#### 7. Get Pending Reports for My Brand
```http
GET /api/brand/price-reports/pending
Headers:
  x-api-key: <BRAND_API_KEY>
Query Params:
  ?station_id=6 (optional)
  ?fuel_type=Diesel (optional)
  ?limit=50
```

#### 8. Update Official Fuel Price (If Permitted)
```http
PUT /api/brand/stations/:stationId/fuel-prices/:fuelType
Headers:
  x-api-key: <BRAND_API_KEY>
Body:
{
  "price": 62.50,
  "effective_date": "2025-10-18"
}
```

### Analytics Endpoints (Read-Only)

#### 9. Get Brand Analytics Dashboard
```http
GET /api/analytics/brand/:brandId/dashboard
Headers:
  x-api-key: <ANALYTICS_API_KEY>
Response:
{
  "brand": "Shell",
  "date_range": "last_30_days",
  "summary": {
    "total_stations": 5,
    "total_price_reports": 127,
    "avg_price_diesel": 59.25,
    "avg_price_premium": 62.10,
    "avg_price_regular": 58.75
  },
  "price_trends": [
    { "date": "2025-10-01", "avg_diesel": 59.00, "reports_count": 12 },
    { "date": "2025-10-02", "avg_diesel": 59.10, "reports_count": 15 }
  ],
  "top_stations": [
    { "station_id": 6, "name": "Shell Roxas", "reports_count": 45 }
  ]
}
```

#### 10. Get Price Comparison Report
```http
GET /api/analytics/price-comparison
Headers:
  x-api-key: <ANALYTICS_API_KEY>
Query Params:
  ?brands[]=Shell&brands[]=Petron&brands[]=Caltex
  ?fuel_type=Diesel
  ?region=Roxas
```

#### 11. Get Geographic Heatmap Data
```http
GET /api/analytics/heatmap
Headers:
  x-api-key: <ANALYTICS_API_KEY>
Query Params:
  ?brand=Shell (optional)
  ?fuel_type=Diesel
```

---

## 🔧 Implementation Steps

### Phase 1: Database Setup (Week 1)
1. ✅ Create migration files for all new tables
2. ✅ Add brand_id to existing stations
3. ✅ Create indexes for performance
4. ✅ Migrate existing brand data

**Files to Create**:
- `/backend/database/migrations/005_create_brands_and_api_keys.sql`

### Phase 2: Core API Key System (Week 1-2)
1. ✅ Implement API key generation utility
2. ✅ Create middleware for API key validation
3. ✅ Add permission checking logic
4. ✅ Implement rate limiting per API key
5. ✅ Add API key logging system

**Files to Modify**:
- `/backend/utils/apiKeyManager.js` (new)
- `/backend/middleware/brandAuth.js` (new)
- `/backend/server.js` (update)

### Phase 3: Admin Endpoints (Week 2)
1. ✅ Brand CRUD endpoints
2. ✅ API key generation endpoints
3. ✅ API key management (list, revoke, stats)

**Files to Modify**:
- `/backend/routes/admin.js` (new)

### Phase 4: Brand Owner Endpoints (Week 3)
1. ✅ Brand-scoped station listing
2. ✅ Price report verification (brand-specific)
3. ✅ Fuel price updates (if permitted)
4. ✅ Webhook notifications for new reports

**Files to Modify**:
- `/backend/routes/brand.js` (new)
- `/backend/utils/webhooks.js` (new)

### Phase 5: Analytics Endpoints (Week 3-4)
1. ✅ Dashboard data endpoints
2. ✅ Price trend analytics
3. ✅ Geographic analytics
4. ✅ Comparison reports

**Files to Modify**:
- `/backend/routes/analytics.js` (new)
- `/backend/utils/analyticsQueries.js` (new)

### Phase 6: Frontend Integration (Week 4-5)
1. ✅ Brand dashboard UI component
2. ✅ Price report moderation interface
3. ✅ Analytics visualization charts
4. ✅ API key management UI (admin)

**Files to Create**:
- `/frontend/src/components/BrandDashboard.tsx`
- `/frontend/src/components/PriceReportQueue.tsx`
- `/frontend/src/components/AnalyticsDashboard.tsx`
- `/frontend/src/components/ApiKeyManager.tsx`

### Phase 7: Testing & Documentation (Week 5-6)
1. ✅ API endpoint testing
2. ✅ Permission boundary testing
3. ✅ Rate limiting verification
4. ✅ API documentation (Postman/Swagger)
5. ✅ Client onboarding guide

---

## 📊 Example Use Case Flow

### Scenario: Shell Verifies a Community Price Report

1. **User submits price report**:
   ```http
   POST /api/price-reports
   Body: {
     "station_id": 6,
     "fuel_type": "Diesel",
     "price": 59.50
   }
   ```

2. **System sends webhook to Shell**:
   ```json
   POST https://shell.com.ph/webhooks/fuelfinder
   {
     "event": "price_report.created",
     "report_id": 1234,
     "station": {
       "id": 6,
       "name": "Shell Roxas",
       "brand": "Shell"
     },
     "fuel_type": "Diesel",
     "reported_price": 59.50,
     "reporter_ip": "203.x.x.x",
     "created_at": "2025-10-18T10:30:00Z"
   }
   ```

3. **Shell admin reviews and verifies**:
   ```http
   PATCH /api/brand/price-reports/1234/verify
   Headers: x-api-key: fuelffdr_prod_shell_abc123...
   Body: {
     "is_verified": true,
     "apply_to_official_price": true
   }
   ```

4. **System updates official price**:
   - Updates `fuel_prices` table with new price
   - Sets `price_updated_by = 'brand_shell'`
   - Marks report as verified
   - Logs action to `api_key_logs`

5. **Shell views analytics**:
   ```http
   GET /api/analytics/brand/shell/dashboard
   Headers: x-api-key: fuelffdr_prod_shell_abc123...
   ```

---

## 🔒 Security Considerations

### 1. **Key Storage**
- ✅ Never store plain API keys in database
- ✅ Use bcrypt for hashing (cost factor 10+)
- ✅ Store only prefix for quick lookup
- ✅ Rotate keys every 6-12 months

### 2. **Permission Boundaries**
```javascript
// Example permission check
function checkStationOwnership(stationId, brandId) {
  const station = await getStation(stationId);
  if (station.brand_id !== brandId) {
    throw new Error('Unauthorized - station not owned by your brand');
  }
}
```

### 3. **Rate Limiting**
- Per API key: 1000-5000 requests/hour
- Per IP: 100 requests/hour (unauthenticated)
- Sliding window algorithm for fairness

### 4. **Audit Logging**
- Log every API key usage
- Track IP addresses and timestamps
- Detect suspicious patterns (e.g., rapid location changes)

### 5. **Webhook Security**
```javascript
// Sign webhook payloads
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

headers['X-FuelFinder-Signature'] = signature;
```

---

## 💡 Additional Recommendations

### 1. **API Key Tiers (Monetization)**
- **Free Tier**: 1,000 requests/month, view-only
- **Basic Tier**: 10,000 requests/month, verification + analytics
- **Premium Tier**: 100,000 requests/month, full management + webhooks
- **Enterprise Tier**: Unlimited, dedicated support, custom integrations

### 2. **Webhook Events**
Notify brands about:
- `price_report.created` - New report submitted
- `price_report.threshold_reached` - Multiple reports with price deviation
- `station.price_changed` - Official price updated
- `station.new_review` - New review/rating submitted
- `analytics.weekly_summary` - Weekly digest

### 3. **Brand Portal UI**
Create a separate branded portal:
- **URL**: `https://brands.fuelfinder.com`
- **Features**:
  - Dashboard with key metrics
  - Price report moderation queue
  - Station management
  - Analytics charts (Chart.js/Recharts)
  - API key management
  - Webhook configuration

### 4. **Mobile App Support**
- Provide SDK for mobile apps (React Native, Flutter)
- OAuth2 integration for brand apps
- Push notifications for urgent reports

### 5. **Data Export**
```http
GET /api/analytics/export
Headers: x-api-key: <API_KEY>
Query: ?format=csv&date_range=last_30_days
```

### 6. **Real-time Notifications**
Implement WebSocket support:
```javascript
// Brand connects to WebSocket
const ws = new WebSocket('wss://fuelfinder.com/ws?api_key=...');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.type === 'price_report.created') {
    // Show notification to brand admin
  }
});
```

---

## 📈 Expected Impact

### Business Benefits
1. **Revenue Stream**: API access subscription model
2. **Data Quality**: Brand verification improves accuracy
3. **Brand Partnerships**: Stronger relationships with fuel companies
4. **Market Intelligence**: Competitive pricing insights

### Technical Benefits
1. **Scalability**: Distributed moderation workload
2. **Security**: Granular permission system
3. **Auditability**: Complete action logging
4. **Flexibility**: Easy to add new permission types

### User Benefits
1. **Accuracy**: Brand-verified prices
2. **Trust**: Official brand endorsement
3. **Updates**: Faster price corrections
4. **Transparency**: See verification status

---

## 🧪 Testing Checklist

### API Key Management
- [ ] Generate API key with correct format
- [ ] Validate API key successfully
- [ ] Reject invalid/expired keys
- [ ] Revoke API key immediately
- [ ] Rate limit enforcement

### Permissions
- [ ] Brand can only access own stations
- [ ] Analytics viewer cannot modify data
- [ ] Super admin has unrestricted access
- [ ] Permission boundaries respected

### Security
- [ ] API keys are hashed properly
- [ ] No plain keys in logs
- [ ] Webhook signatures validated
- [ ] SQL injection prevented
- [ ] XSS attacks prevented

### Analytics
- [ ] Dashboard loads correctly
- [ ] Data filtered by brand properly
- [ ] Date ranges work correctly
- [ ] Export functions work

---

## 📚 Documentation Files to Create

1. **API Reference**: `/docs/api/BRAND_API_REFERENCE.md`
2. **Quick Start Guide**: `/docs/guides/BRAND_QUICK_START.md`
3. **Webhook Guide**: `/docs/guides/WEBHOOKS.md`
4. **Security Best Practices**: `/docs/security/API_KEY_SECURITY.md`
5. **Migration Guide**: `/docs/migration/EXISTING_BRANDS.md`

---

## 🎓 Thesis Integration

### Chapter 3 - Methodology
**Section**: "Brand Integration API"
- Describe the architecture of the brand API system
- Explain permission levels and security measures
- Discuss the use of bcrypt for key hashing

### Chapter 4 - Results
**Section**: "Brand Partnership System Performance"
- Present API response times for brand endpoints
- Show analytics dashboard examples
- Discuss price verification accuracy improvements

### Chapter 5 - Future Work
**Section**: "Commercial Applications"
- Suggest monetization strategies
- Discuss enterprise feature expansion
- Propose machine learning for fraud detection

---

## 🚀 Quick Start (After Implementation)

### For Brand Owners
```bash
# 1. Request API key from admin
# 2. Test API key
curl -H "x-api-key: YOUR_KEY" https://fuelfinder.com/api/brand/stations

# 3. Set up webhook endpoint
# 4. Start verifying reports
```

### For Analytics Partners
```bash
# 1. Request analytics API key
# 2. Fetch dashboard data
curl -H "x-api-key: YOUR_KEY" https://fuelfinder.com/api/analytics/dashboard

# 3. Export data for analysis
curl -H "x-api-key: YOUR_KEY" "https://fuelfinder.com/api/analytics/export?format=csv"
```

---

## 📞 Support & Maintenance

### Monitoring
- Track API key usage per day
- Alert on suspicious patterns (>10x normal usage)
- Monitor webhook failures
- Track verification rates per brand

### Maintenance
- Rotate API keys annually
- Clean up revoked keys after 90 days
- Archive old API logs (>1 year)
- Update permission levels as needed

---

**Document Version**: 1.0  
**Last Updated**: October 18, 2025  
**Author**: Fuel Finder Development Team  
**Status**: Recommendation - Implementation Pending
