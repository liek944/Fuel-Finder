# ⛽ Multiple Fuel Types Feature

## Overview

The Fuel Finder app now supports **multiple fuel types per station** (Regular, Premium, Diesel, etc.). Each station can have different prices for different fuel types, and when users report prices, only the specific fuel type is updated.

---

## ✨ Key Features

### For Users
- **View Multiple Fuel Types**: See all available fuel types and their prices in station popups
- **Fuel Type-Specific Reporting**: Report prices for specific fuel types (Regular, Diesel, Premium, etc.)
- **Price Filtering**: Filter stations by maximum price across all fuel types
- **Community Indicators**: See which prices were updated by the community

### For Admins
- **Manage Fuel Prices**: Add, update, or delete fuel prices for specific fuel types
- **Fuel Type Validation**: Only valid fuel types are accepted (Regular, Premium, Diesel, Premium Diesel, E85, LPG)
- **Independent Updates**: Updating one fuel type doesn't affect others

---

## 🏗️ Technical Implementation

### Database Schema

#### New Table: `fuel_prices`
```sql
CREATE TABLE fuel_prices (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('Regular', 'Premium', 'Diesel', 'Premium Diesel', 'E85', 'LPG')),
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    price_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_updated_by VARCHAR(255), -- 'admin' or 'community'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(station_id, fuel_type)
);
```

**Key Features:**
- Each station can have multiple fuel types
- Unique constraint ensures only one price per fuel type per station
- Tracks who updated the price (admin or community)
- Timestamps for price updates

#### Enhanced `stations` Table
- The `fuel_price` column is kept for **backward compatibility**
- It's automatically updated to the **cheapest fuel price** when fuel_prices are modified
- Legacy code can still use `fuel_price` while new code uses `fuel_prices`

---

## 🔌 API Endpoints

### 1. Get Fuel Prices for a Station (Public)
```
GET /api/stations/:id/fuel-prices
```

**Response:**
```json
{
  "station_id": 5,
  "fuel_prices": [
    {
      "id": 1,
      "station_id": 5,
      "fuel_type": "Regular",
      "price": 58.50,
      "price_updated_at": "2025-10-13T12:00:00Z",
      "price_updated_by": "community"
    },
    {
      "id": 2,
      "station_id": 5,
      "fuel_type": "Diesel",
      "price": 55.00,
      "price_updated_at": "2025-10-13T12:00:00Z",
      "price_updated_by": "admin"
    }
  ],
  "count": 2
}
```

---

### 2. Update Fuel Price (Admin Only)
```
PUT /api/stations/:id/fuel-prices/:fuelType
Headers: x-api-key: YOUR_ADMIN_API_KEY
```

**Request Body:**
```json
{
  "price": 58.50,
  "updated_by": "admin"
}
```

**Valid Fuel Types:**
- `Regular`
- `Premium`
- `Diesel`
- `Premium Diesel`
- `E85`
- `LPG`

**Response:**
```json
{
  "message": "Fuel price updated successfully",
  "fuel_price": {
    "id": 1,
    "station_id": 5,
    "fuel_type": "Regular",
    "price": 58.50,
    "price_updated_at": "2025-10-13T12:00:00Z",
    "price_updated_by": "admin"
  }
}
```

**Effect:**
- Updates or creates the fuel price for the specific fuel type
- Updates the station's legacy `fuel_price` to the cheapest available price
- Clears the application cache

---

### 3. Delete Fuel Price (Admin Only)
```
DELETE /api/stations/:id/fuel-prices/:fuelType
Headers: x-api-key: YOUR_ADMIN_API_KEY
```

**Response:**
```json
{
  "message": "Fuel price deleted successfully",
  "deleted": {
    "id": 1,
    "station_id": 5,
    "fuel_type": "Regular",
    "price": 58.50
  }
}
```

---

## 🎨 Frontend Integration

### Station Interface
```typescript
interface FuelPrice {
  fuel_type: string;
  price: number;
  price_updated_at?: string;
  price_updated_by?: string;
}

interface Station {
  id: number;
  name: string;
  brand: string;
  fuel_price: number; // Legacy field
  fuel_prices?: FuelPrice[]; // New field
  // ... other fields
}
```

### Display in Station Popup
The station popup now displays all available fuel types:

```
Fuel Prices:
  Regular: ₱58.50/L (community)
  Diesel: ₱55.00/L
  Premium: ₱62.00/L
```

- Community-updated prices show a "(community)" indicator
- If no fuel_prices are available, falls back to the legacy fuel_price

### Price Filtering
The price filter now checks **all fuel types**:
- A station is included if **any** fuel type is within the max price
- Falls back to legacy `fuel_price` if no fuel_prices are available

---

## 🔄 Price Reporting Integration

### How It Works
1. User selects a fuel type (Regular, Diesel, Premium) in the price report form
2. User submits a price for that specific fuel type
3. Report is stored in `fuel_price_reports` table with the fuel type
4. When admin verifies the report:
   - The specific fuel type price is updated in `fuel_prices` table
   - Other fuel types remain unchanged
   - Station's legacy `fuel_price` is updated to the cheapest price

### Example Flow
```
1. Station has:
   - Regular: ₱58.00
   - Diesel: ₱55.00

2. User reports Diesel at ₱54.50

3. Admin verifies report

4. Station now has:
   - Regular: ₱58.00 (unchanged)
   - Diesel: ₱54.50 (updated)
   - Legacy fuel_price: ₱54.50 (updated to cheapest)
```

---

## 🚀 Setup Instructions

### 1. Run Database Migration

Apply the migration to add the fuel_prices table:

```bash
# Using psql
psql -U postgres -d fuel_finder -f backend/database/migrations/002_add_fuel_types.sql

# Or if using Supabase/managed database
# Run the SQL file contents in the SQL editor
```

### 2. Restart Backend Server

The new API endpoints are automatically available:

```bash
cd backend
npm start
```

### 3. Frontend Already Updated

The frontend has been updated to display multiple fuel types. No additional changes needed.

---

## 📊 Database Functions

### Core Functions

1. **`getStationFuelPrices(stationId)`** - Get all fuel prices for a station
2. **`updateStationFuelPrice(stationId, fuelType, price, updatedBy)`** - Update or add a fuel price
3. **`deleteStationFuelPrice(stationId, fuelType)`** - Delete a fuel price entry
4. **`verifyPriceReport(reportId, verifiedBy)`** - Enhanced to update specific fuel type

### Enhanced Queries

All station queries now include fuel_prices:
- `getNearbyStations()` - Returns stations with fuel_prices array
- `getAllStations()` - Returns stations with fuel_prices array
- Station data includes both legacy `fuel_price` and new `fuel_prices` array

---

## 🔒 Data Migration

### Automatic Migration
The migration script automatically:
1. Creates the `fuel_prices` table
2. Migrates existing `fuel_price` data to `fuel_prices` as "Regular" fuel type
3. Preserves the legacy `fuel_price` column for backward compatibility
4. Creates indexes for efficient queries

### Backward Compatibility
- Old code using `fuel_price` continues to work
- `fuel_price` is automatically updated to the cheapest fuel price
- New code can use `fuel_prices` array for detailed information

---

## 🎯 Use Cases

### For Drivers
1. **Compare Fuel Types**: See prices for different fuel types at each station
2. **Find Cheapest Diesel**: Filter stations by diesel price
3. **Report Specific Prices**: Report prices for the fuel type they use

### For Station Owners
1. **Multiple Fuel Types**: Display all fuel types they offer
2. **Independent Pricing**: Update prices for each fuel type separately
3. **Community Contributions**: Benefit from community price updates

### For Admins
1. **Manage Prices**: Add/update/delete prices for specific fuel types
2. **Verify Reports**: Approve community reports for specific fuel types
3. **Price Analytics**: Track price trends by fuel type

---

## 🔮 Future Enhancements

### Potential Features
- **Fuel Type Availability**: Mark which fuel types are currently available
- **Price History by Fuel Type**: Track historical prices for each fuel type
- **Fuel Type Preferences**: Let users set preferred fuel type for filtering
- **Fuel Type Icons**: Visual indicators for available fuel types
- **Bulk Price Updates**: Update multiple fuel types at once
- **Fuel Type Recommendations**: Suggest stations based on user's vehicle fuel type

### Performance Optimizations
- **Caching**: Cache fuel prices separately from station data
- **Indexing**: Add composite indexes for common queries
- **Aggregation**: Pre-compute min/max prices by fuel type

---

## 🧪 Testing

### Manual Testing

1. **View Fuel Prices:**
   ```bash
   curl http://localhost:3001/api/stations/1/fuel-prices
   ```

2. **Update Fuel Price (requires API key):**
   ```bash
   curl -X PUT http://localhost:3001/api/stations/1/fuel-prices/Regular \
     -H "x-api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"price": 58.50, "updated_by": "admin"}'
   ```

3. **Report Price for Specific Fuel Type:**
   - Open station popup
   - Click "Report Price"
   - Select fuel type (Regular, Diesel, Premium)
   - Enter price and submit

4. **Verify Price Report:**
   - Admin verifies report via API
   - Only the specific fuel type is updated
   - Other fuel types remain unchanged

---

## 📝 Developer Notes

### Code Locations

**Backend:**
- Migration: `backend/database/migrations/002_add_fuel_types.sql`
- Database functions: `backend/database/db.js` (lines 767-831, 604-652)
- API endpoints: `backend/server.js` (lines 1885-2024)

**Frontend:**
- Type definitions: `frontend/src/components/MainApp.tsx` (lines 24-36)
- Display logic: `frontend/src/components/MainApp.tsx` (lines 1153-1170)
- Filter logic: `frontend/src/components/MainApp.tsx` (lines 828-831)

### Dependencies

No new npm packages required. Uses existing:
- PostgreSQL for database
- Express.js for API
- React for UI components

---

## ❓ FAQ

**Q: What happens to existing fuel_price data?**
A: It's automatically migrated to the fuel_prices table as "Regular" fuel type. The legacy column is kept for backward compatibility.

**Q: Can I still use the old fuel_price column?**
A: Yes, it's automatically updated to the cheapest fuel price. However, new code should use fuel_prices for detailed information.

**Q: What fuel types are supported?**
A: Regular, Premium, Diesel, Premium Diesel, E85, and LPG. More can be added by updating the CHECK constraint.

**Q: How does price filtering work with multiple fuel types?**
A: A station is included if ANY fuel type is within the max price filter.

**Q: What happens when a user reports a price?**
A: The report includes the fuel type. When verified, only that specific fuel type is updated.

---

## 🎓 Thesis Integration

### Relevant Chapters

**Chapter 3 - Methodology:**
- Multi-dimensional data modeling (fuel types as separate entities)
- Database normalization (separate fuel_prices table)
- API design for CRUD operations on fuel prices

**Chapter 4 - Results:**
- Fuel type availability statistics
- Price distribution by fuel type
- Community contribution metrics by fuel type

**Chapter 5 - Recommendations:**
- Expand to more fuel types (E10, E20, etc.)
- Add fuel type availability tracking
- Implement fuel type-based route optimization

### Academic Terms

- **Relational Data Modeling**: Separate table for fuel prices with foreign key relationship
- **Data Normalization**: Eliminating redundancy by separating fuel prices from station data
- **Backward Compatibility**: Maintaining legacy fields while introducing new features
- **RESTful API Design**: Resource-based endpoints for fuel price management
- **Type Safety**: TypeScript interfaces for fuel price data structures

---

**Version:** 1.0.0  
**Date:** October 13, 2025  
**Author:** Fuel Finder Development Team
