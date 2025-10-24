# Price Chart Fix - "b.map is not a function" Error

## Problem
The fuel price trend chart in the Admin Dashboard Statistics tab was showing "Error: b.map is not a function" instead of displaying the price movement graph.

## Root Causes

### 1. Frontend Data Structure Mismatch
**File**: `frontend/src/components/FuelPriceTrendChart.tsx`

**Issue**: The component was trying to call `.map()` directly on the API response object, which has the structure:
```javascript
{
  success: true,
  data: [...]  // actual array
}
```

But the code was treating it as if the response itself was the array.

**Fix**: Extract the `data` property from the response object:
```javascript
const responseData = await response.json();
const data: TrendData[] = responseData.data || responseData;

// Added validation
if (!Array.isArray(data)) {
  throw new Error("Invalid data format received from server");
}
```

### 2. Backend Column Name Mismatch
**File**: `backend/repositories/priceRepository.js`

**Issue**: The SQL query returned a column named `date`, but the frontend TypeScript interface expected `report_date`:
```typescript
interface TrendData {
  report_date: string;  // Frontend expects this
  fuel_type: string;
  average_price: string;
}
```

**Fix**: Changed SQL query to use `report_date` as the column alias:
```sql
SELECT 
  DATE(created_at) as report_date,  -- Was: as date
  fuel_type,
  ROUND(AVG(price)::numeric, 2) as average_price,
  COUNT(*) as report_count
FROM fuel_price_reports
WHERE created_at >= NOW() - INTERVAL '${days} days'
  AND is_verified = true
GROUP BY DATE(created_at), fuel_type
ORDER BY report_date DESC, fuel_type
```

## Files Modified
1. `frontend/src/components/FuelPriceTrendChart.tsx` - Fixed data extraction and added validation
2. `backend/repositories/priceRepository.js` - Fixed column name in `getPriceReportTrends()`

## Testing
1. Go to Admin Portal → Price Reports tab
2. Click on "Statistics" tab
3. Scroll down to see the "Fuel Price Trends" chart
4. The chart should display properly with data for Diesel, Premium, and Regular fuel types
5. Try changing the time range (7/30/90 days) - chart should update

## Deployment

### Backend
```bash
cd backend
pm2 restart fuel-finder
# or
pm2 restart server_modular_entry
```

### Frontend
```bash
cd frontend
npm run build
# Deploy to Netlify (automatic if push to main)
```

## Related Components
- **FuelPriceTrendChart.tsx**: Chart component using Chart.js
- **PriceReportsManagement.tsx**: Parent component that renders the chart in Statistics tab
- **priceRepository.js**: Backend database queries for price trends
- **adminController.js**: API endpoint handler for `/api/admin/price-reports/trends`

## API Endpoint
- **GET** `/api/admin/price-reports/trends?days=30`
- **Auth**: Requires admin API key in `x-api-key` header
- **Response**: 
  ```json
  {
    "success": true,
    "data": [
      {
        "report_date": "2024-10-23",
        "fuel_type": "Diesel",
        "average_price": "65.50",
        "report_count": 12
      }
    ]
  }
  ```
