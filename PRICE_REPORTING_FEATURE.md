# 💰 Community-Based Fuel Price Reporting Feature

## Overview

The Fuel Finder app now includes a **community-based fuel price reporting system** that allows regular users to submit fuel price updates for stations. This feature enables crowdsourced price information to keep fuel prices current and accurate.

---

## ✨ Key Features

### For Regular Users (Public Access)
- **Submit Price Reports**: Users can report fuel prices for any station directly from the map popup
- **View Recent Reports**: See community-submitted price reports with timestamps
- **Multiple Fuel Types**: Support for Regular, Premium, and Diesel fuel prices
- **Optional Notes**: Add context or details to price reports
- **Rate Limited**: Protected by rate limiting to prevent spam (10 requests per minute per IP)

### For Admins (API Key Protected)
- **Verify Reports**: Admin can verify community reports as accurate
- **Auto-Update Prices**: Verified reports automatically update the station's official price
- **View Analytics**: Access to price report statistics and trends

---

## 🏗️ Technical Implementation

### Database Schema

#### New Table: `fuel_price_reports`
```sql
CREATE TABLE fuel_price_reports (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id),
    fuel_type VARCHAR(50) DEFAULT 'Regular',
    price DECIMAL(10, 2) NOT NULL,
    reporter_ip VARCHAR(45),
    reporter_identifier VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Enhanced `stations` Table
- Added `price_updated_at` column to track when price was last updated
- Added `price_updated_by` column to indicate source ('admin' or 'community')

---

## 🔌 API Endpoints

### 1. Submit Price Report (Public)
```
POST /api/stations/:id/report-price
```

**Request Body:**
```json
{
  "fuel_type": "Regular",
  "price": 58.50,
  "notes": "Confirmed at pump today"
}
```

**Response:**
```json
{
  "message": "Price report submitted successfully",
  "report": {
    "id": 123,
    "station_id": 5,
    "fuel_type": "Regular",
    "price": 58.50,
    "created_at": "2025-10-09T10:30:00Z",
    "is_verified": false
  }
}
```

**Validation:**
- Price must be between ₱30 and ₱200 per liter
- Station must exist
- Rate limited to 10 requests per minute per IP

---

### 2. Get Price Reports (Public)
```
GET /api/stations/:id/price-reports?limit=10
```

**Response:**
```json
{
  "station_id": 5,
  "reports": [
    {
      "id": 123,
      "fuel_type": "Regular",
      "price": 58.50,
      "is_verified": true,
      "verified_by": "admin",
      "verified_at": "2025-10-09T11:00:00Z",
      "notes": "Confirmed at pump today",
      "created_at": "2025-10-09T10:30:00Z"
    }
  ],
  "statistics": {
    "total_reports": 45,
    "verified_reports": 12,
    "avg_price": "58.75",
    "min_price": "57.50",
    "max_price": "60.00",
    "last_report_date": "2025-10-09T10:30:00Z"
  }
}
```

---

### 3. Get Average Price (Public)
```
GET /api/stations/:id/average-price?days=7
```

**Response:**
```json
{
  "station_id": 5,
  "days_analyzed": 7,
  "fuel_types": [
    {
      "fuel_type": "Regular",
      "avg_price": "58.75",
      "report_count": 15,
      "min_price": "57.50",
      "max_price": "60.00"
    }
  ]
}
```

---

### 4. Verify Price Report (Admin Only)
```
PATCH /api/price-reports/:id/verify
Headers: x-api-key: YOUR_ADMIN_API_KEY
```

**Request Body:**
```json
{
  "verified_by": "admin_name"
}
```

**Response:**
```json
{
  "message": "Price report verified and station price updated",
  "report": {
    "station_id": 5,
    "price": 58.50,
    "fuel_type": "Regular"
  },
  "station": {
    "id": 5,
    "name": "Shell Station",
    "fuel_price": 58.50,
    "price_updated_at": "2025-10-09T11:00:00Z"
  }
}
```

**Effect:** 
- Marks the report as verified
- Updates the station's official `fuel_price` to the reported value
- Sets `price_updated_by` to 'community'
- Clears the application cache

---

## 🎨 Frontend Integration

### PriceReportWidget Component

The feature is implemented as a reusable React component that displays in station popups:

```tsx
<PriceReportWidget
  stationId={station.id}
  stationName={station.name}
/>
```

**Widget Features:**
- Toggle between "Report Price" and "View Reports" modes
- Form validation with error messages
- Success confirmation messages
- Recent reports list with verification badges
- Relative timestamps (e.g., "5 min ago", "2 hours ago")
- Responsive design with inline styles

---

## 🚀 Setup Instructions

### 1. Run Database Migration

Apply the migration to add the price reporting tables:

```bash
# Using psql
psql -U postgres -d fuel_finder -f backend/database/migrations/001_add_price_reports.sql

# Or update your schema.sql and reinitialize
npm run db:init
```

### 2. Restart Backend Server

The new API endpoints are automatically available once the server restarts:

```bash
cd backend
npm start
```

### 3. Frontend Already Integrated

The PriceReportWidget is already integrated into MainApp.tsx station popups. No additional frontend changes needed.

---

## 🔒 Security Features

### Rate Limiting
- **Public endpoints**: Limited to 10 requests per minute per IP
- **Admin endpoints**: Same rate limiting applies

### Input Validation
- **Price range**: ₱30 - ₱200 per liter (reasonable for Philippine fuel market)
- **Station verification**: Ensures station exists before accepting report
- **SQL injection prevention**: All queries use parameterized statements

### Abuse Prevention
- **IP tracking**: Stores reporter IP for abuse monitoring
- **Browser fingerprinting**: Optional identifier for duplicate detection
- **Admin verification**: Reports must be verified before updating official prices

### Data Privacy
- Reporter IPs are stored but not exposed via public API
- No personal user data is collected
- Browser fingerprints are hashed and truncated

---

## 📊 Database Functions

### Core Functions

1. **`submitPriceReport(reportData)`** - Submit new price report
2. **`getPriceReports(stationId, limit)`** - Get recent reports for a station
3. **`getLatestVerifiedPrice(stationId)`** - Get most recent verified price
4. **`getAveragePriceFromReports(stationId, days)`** - Calculate average from recent reports
5. **`verifyPriceReport(reportId, verifiedBy)`** - Verify report and update station price
6. **`cleanupOldReports(daysOld)`** - Delete unverified reports older than X days
7. **`getPriceReportStats(stationId)`** - Get statistics for a station

### Maintenance

**Cleanup Old Reports:**
```javascript
const { cleanupOldReports } = require('./database/db');

// Delete unverified reports older than 30 days
const deletedCount = await cleanupOldReports(30);
console.log(`Deleted ${deletedCount} old reports`);
```

---

## 📈 Analytics View

A database view `price_report_summary` provides aggregated statistics:

```sql
SELECT * FROM price_report_summary WHERE station_id = 5;
```

Returns:
- Station details
- Official price and last update
- Total reports (last 30 days)
- Verified reports count
- Average/min/max reported prices
- Last report date

---

## 🎯 Use Cases

### For Drivers
1. **Check Current Prices**: View community-reported prices before refueling
2. **Contribute Data**: Help others by reporting prices after refueling
3. **Compare Stations**: See price trends across different stations

### For Admins
1. **Verify Reports**: Review and approve community submissions
2. **Monitor Trends**: Track price changes over time
3. **Identify Outliers**: Spot unusual price reports for investigation

### For the System
1. **Crowdsourced Updates**: Keep prices current without manual admin updates
2. **Price History**: Build historical price data for analytics
3. **Community Engagement**: Encourage user participation

---

## 🔮 Future Enhancements

### Potential Features
- **User Reputation System**: Track reliable reporters
- **Auto-Verification**: Verify reports with multiple confirmations
- **Price Change Notifications**: Alert users when prices drop
- **Price Prediction**: ML model to predict future price trends
- **Anonymous Reporting**: Option to submit without IP tracking
- **Report Comments**: Allow users to discuss price reports
- **Photo Attachments**: Upload photos of price boards for verification

### Performance Optimizations
- **Caching**: Cache recent reports for faster retrieval
- **Pagination**: Add pagination for large report lists
- **Aggregation**: Pre-compute statistics for popular stations

---

## 🧪 Testing

### Manual Testing

1. **Submit a Price Report:**
   - Open a station popup
   - Click "Report Price"
   - Enter price and submit
   - Verify success message

2. **View Reports:**
   - Click "View Reports" button
   - Check that reports display correctly
   - Verify timestamps and verification badges

3. **Admin Verification (requires API key):**
   ```bash
   curl -X PATCH http://localhost:3001/api/price-reports/1/verify \
     -H "x-api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"verified_by": "admin"}'
   ```

### API Testing

Test all endpoints using the examples in the API section above.

---

## 📝 Developer Notes

### Code Locations

**Backend:**
- Database schema: `backend/database/schema.sql` (lines 59-84)
- Database functions: `backend/database/db.js` (lines 445-617)
- API endpoints: `backend/server.js` (lines 1378-1626)
- Migration: `backend/database/migrations/001_add_price_reports.sql`

**Frontend:**
- PriceReportWidget: `frontend/src/components/MainApp.tsx` (lines 203-552)
- Integration: `frontend/src/components/MainApp.tsx` (line 1168)

### Dependencies

No new npm packages required. Uses existing:
- Express.js for API
- PostgreSQL for database
- React for UI components

---

## ❓ FAQ

**Q: Can users report prices without an account?**
A: Yes, the feature is fully anonymous. Only IP address is tracked for abuse prevention.

**Q: How are fake reports prevented?**
A: Through rate limiting, IP tracking, and admin verification before prices are officially updated.

**Q: Can I disable this feature?**
A: The backend endpoints remain active, but you can remove the `<PriceReportWidget>` component from MainApp.tsx to hide it from users.

**Q: What happens to unverified reports?**
A: They're displayed to users but don't update official prices. Old unverified reports can be cleaned up with the `cleanupOldReports()` function.

**Q: How do I become an admin to verify reports?**
A: Set the `ADMIN_API_KEY` environment variable in your backend and use it in the `x-api-key` header for admin endpoints.

---

## 🎓 Thesis Integration

### Relevant Chapters

**Chapter 3 - Methodology:**
- Community-based data collection approach
- Crowdsourcing as data validation method
- API design for public participation

**Chapter 4 - Results:**
- Price report submission statistics
- Community engagement metrics
- Price accuracy improvements

**Chapter 5 - Recommendations:**
- Expand crowdsourcing to other data (services, hours)
- Implement user reputation system
- Add machine learning for price prediction

### Academic Terms

- **Crowdsourced Data Collection**: Community-contributed fuel price information
- **Data Validation**: Admin verification of community submissions
- **Temporal Data Tracking**: Historical price trend analysis
- **User-Generated Content**: Community price reports
- **Anonymous Participation**: Privacy-preserving data contribution

---

## 📞 Support

For issues or questions about this feature:
1. Check the API endpoint logs in backend console
2. Review the database migration status
3. Test with Postman or curl first
4. Check browser console for frontend errors

---

**Version:** 1.0.0  
**Date:** October 9, 2025  
**Author:** Fuel Finder Development Team
