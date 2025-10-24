# Owner Access Control - Quick Reference Card

## 🚀 Quick Start

### 1. Apply Migration
```bash
cd backend
node database/apply-owner-migration.js
```

### 2. Save API Keys
Copy the API keys displayed after migration to a secure location.

### 3. Test Locally
```bash
# Start server
npm start

# Run tests
node test-owner-access.js
```

## 🔑 Owner API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/owner/info` | GET | None | Get public owner info |
| `/api/owner/dashboard` | GET | API Key | Get dashboard stats |
| `/api/owner/stations` | GET | API Key | List owner's stations |
| `/api/owner/stations/:id` | GET | API Key | Get station details |
| `/api/owner/stations/:id` | PUT | API Key | Update station |
| `/api/owner/price-reports/pending` | GET | API Key | Get pending reports |
| `/api/owner/price-reports/:id/verify` | POST | API Key | Verify price report |
| `/api/owner/price-reports/:id/reject` | POST | API Key | Reject price report |
| `/api/owner/activity-logs` | GET | API Key | Get activity history |
| `/api/owner/analytics` | GET | API Key | Get analytics data |

## 📡 Request Headers

All protected endpoints require:
```http
Host: {subdomain}.fuelfinder.com
x-api-key: {owner-api-key}
```

## 🧪 Test Commands

### Test Owner Detection
```bash
curl -H "Host: castillonfuels.fuelfinder.com" \
     http://localhost:3000/api/owner/info
```

### Test Dashboard (with API key)
```bash
curl -H "Host: castillonfuels.fuelfinder.com" \
     -H "x-api-key: YOUR_API_KEY" \
     http://localhost:3000/api/owner/dashboard
```

### Test Data Isolation
```bash
# Owner A's stations
curl -H "Host: castillonfuels.fuelfinder.com" \
     http://localhost:3000/api/stations

# Owner B's stations  
curl -H "Host: santosgas.fuelfinder.com" \
     http://localhost:3000/api/stations
```

### Verify Price Report
```bash
curl -X POST \
     -H "Host: castillonfuels.fuelfinder.com" \
     -H "x-api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"notes":"Verified"}' \
     http://localhost:3000/api/owner/price-reports/1/verify
```

## 🗄️ Database Queries

### Get Owner API Key
```sql
SELECT name, domain, api_key 
FROM owners 
WHERE domain = 'castillonfuels';
```

### Check Station Ownership
```sql
SELECT s.name, s.brand, o.name as owner_name
FROM stations s
LEFT JOIN owners o ON o.id = s.owner_id
WHERE s.id = 1;
```

### View Recent Activity
```sql
SELECT * FROM owner_activity_logs
WHERE owner_id = 'uuid-here'
ORDER BY created_at DESC
LIMIT 20;
```

### Assign Station to Owner
```sql
UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'castillonfuels')
WHERE id = 1;
```

## 🔒 Security Checklist

- ✅ API keys are securely generated (32 bytes random)
- ✅ Failed authentication attempts are logged
- ✅ Data isolation prevents cross-owner access
- ✅ Subdomain validation prevents unauthorized access
- ✅ Activity logging tracks all owner actions
- ⚠️ Consider hashing API keys for production
- ⚠️ Implement rate limiting on verification endpoints
- ⚠️ Add API key expiration/rotation for production

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Owner not found" | Check subdomain exists in `owners` table |
| "Invalid API key" | Verify key matches exactly (copy-paste) |
| "Forbidden" on station update | Check station's `owner_id` matches |
| Server not responding | Ensure server is running: `npm start` |
| No stations returned | Verify stations are assigned: `UPDATE stations SET owner_id = '...'` |

## 📁 File Structure

```
backend/
├── middleware/
│   ├── ownerDetection.js      # Subdomain detection
│   └── ownerAuth.js            # API key verification
├── routes/
│   └── ownerRoutes.js          # Owner endpoints
├── controllers/
│   └── ownerController.js      # Owner business logic
└── database/
    ├── migrations/
    │   └── 006_add_owner_based_access_control.sql
    └── apply-owner-migration.js
```

## 📞 Common Use Cases

### 1. Owner Login Flow
1. User accesses `castillonfuels.fuelfinder.com`
2. Frontend stores subdomain + API key
3. All requests include both in headers
4. Backend validates and returns owner-specific data

### 2. Price Verification Flow
1. Customer reports price via public endpoint
2. Report stored with `is_verified = false`
3. Owner fetches pending reports
4. Owner verifies → updates station price
5. Action logged for audit trail

### 3. Station Management
1. Owner lists their stations
2. Selects station to update
3. Makes PUT request with changes
4. System verifies ownership
5. Updates station if authorized

## 🎯 Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing API key) |
| 403 | Forbidden (invalid key or no access) |
| 404 | Not found (owner/station doesn't exist) |
| 500 | Server error |

## 📊 Sample Dashboard Response

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

---

**For detailed documentation, see:** `OWNER_ACCESS_CONTROL_GUIDE.md`
