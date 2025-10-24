# 🚀 Quick Setup Guide: Multiple Fuel Types Feature

## What Changed?

Stations can now have **multiple fuel types** (Regular, Diesel, Premium, etc.) with different prices. When users report prices, only the specific fuel type is updated.

---

## Setup Steps

### 1. Run Database Migration

```bash
# If using local PostgreSQL
psql -U postgres -d fuel_finder -f backend/database/migrations/002_add_fuel_types.sql

# If using Supabase or managed database
# Copy and run the SQL from backend/database/migrations/002_add_fuel_types.sql
# in your database SQL editor
```

**What this does:**
- Creates `fuel_prices` table
- Migrates existing prices to "Regular" fuel type
- Adds indexes for performance
- Creates a view for easy querying

### 2. Restart Backend

```bash
cd backend
npm start
```

The new endpoints are automatically available.

### 3. Test the Feature

**View fuel prices:**
```bash
curl http://localhost:3001/api/stations/1/fuel-prices
```

**Update a fuel price (requires API key):**
```bash
curl -X PUT http://localhost:3001/api/stations/1/fuel-prices/Diesel \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"price": 55.50}'
```

### 4. Frontend Already Updated

Open the app and click on any station marker. You'll see:
- All fuel types with their prices
- Community-updated prices marked with "(community)"
- Price reporting still works - now updates only the selected fuel type

---

## New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stations/:id/fuel-prices` | Public | Get all fuel prices for a station |
| PUT | `/api/stations/:id/fuel-prices/:fuelType` | Admin | Update fuel price for specific type |
| DELETE | `/api/stations/:id/fuel-prices/:fuelType` | Admin | Delete fuel price entry |

---

## Supported Fuel Types

- `Regular`
- `Premium`
- `Diesel`
- `Premium Diesel`
- `E85`
- `LPG`

---

## How Price Reporting Works Now

1. User clicks "Report Price" on a station
2. Selects fuel type (Regular, Diesel, Premium)
3. Enters price and submits
4. Admin verifies the report
5. **Only that specific fuel type is updated**
6. Other fuel types remain unchanged

---

## Example

**Before:**
```
Station: Shell Roxas
Price: ₱58.00/L
```

**After:**
```
Station: Shell Roxas
Fuel Prices:
  Regular: ₱58.00/L
  Diesel: ₱55.00/L
  Premium: ₱62.00/L (community)
```

---

## Backward Compatibility

- Old `fuel_price` column still exists
- Automatically updated to the **cheapest** fuel price
- Legacy code continues to work
- New code should use `fuel_prices` array

---

## Troubleshooting

**Migration fails:**
- Check if you have CREATE TABLE permissions
- Ensure PostGIS extension is enabled
- Check database connection

**Fuel prices not showing:**
- Run the migration first
- Restart the backend server
- Clear browser cache

**API returns 401:**
- Set `ADMIN_API_KEY` environment variable
- Include `x-api-key` header in requests

---

For detailed documentation, see: `DOCUMENTATIONS AND CONTEXT/FUEL_TYPES_FEATURE.md`
