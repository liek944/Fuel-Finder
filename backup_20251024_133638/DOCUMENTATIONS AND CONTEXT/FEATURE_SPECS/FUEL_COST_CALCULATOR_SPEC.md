# 💰 Fuel Cost Calculator - Implementation Specification

**Feature**: Route-Based Fuel Cost Predictor  
**Priority**: 🟢 HIGH (Quick Win)  
**Estimated Effort**: 2 weeks  
**Version**: 1.0

---

## 🎯 Overview

Calculate estimated fuel consumption and cost BEFORE starting navigation based on:
- Distance (from OSRM route)
- Elevation changes
- Vehicle type
- Driving style (eco/normal/sporty)
- Current fuel prices

### Success Metrics
- ✅ 80%+ users find estimates accurate (±10%)
- ✅ Response time < 500ms
- ✅ 50%+ users check cost before navigation

---

## 🗄️ Database Schema

### `vehicle_profiles`
```sql
CREATE TABLE vehicle_profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,  -- Sedan, SUV, Pickup, Motorcycle
  fuel_type VARCHAR(20) NOT NULL,  -- Gasoline, Diesel
  
  city_consumption DECIMAL(4,2) NOT NULL,     -- L/100km
  highway_consumption DECIMAL(4,2) NOT NULL,
  combined_consumption DECIMAL(4,2) NOT NULL,
  
  elevation_factor DECIMAL(3,2) DEFAULT 0.15,
  manufacturer VARCHAR(100),
  year INTEGER,
  engine_size DECIMAL(3,1),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO vehicle_profiles (name, category, fuel_type, city_consumption, highway_consumption, combined_consumption, manufacturer, year) VALUES
('Toyota Vios 1.3 MT', 'Sedan', 'Gasoline', 8.5, 6.2, 7.1, 'Toyota', 2020),
('Toyota Fortuner 2.4 AT', 'SUV', 'Diesel', 10.5, 7.8, 8.9, 'Toyota', 2021),
('Honda Click 150i', 'Motorcycle', 'Gasoline', 2.5, 2.0, 2.2, 'Honda', 2022);
```

### `user_vehicles`
```sql
CREATE TABLE user_vehicles (
  id SERIAL PRIMARY KEY,
  user_session_id VARCHAR(255) NOT NULL,
  vehicle_profile_id INTEGER REFERENCES vehicle_profiles(id),
  nickname VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  custom_consumption DECIMAL(4,2),
  driving_style VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### POST `/api/route/calculate-cost`

**Request**:
```json
{
  "start": {"lat": 12.5774, "lng": 121.4127},
  "end": {"lat": 12.5234, "lng": 121.3567},
  "vehicleProfileId": 1,
  "drivingStyle": "normal",
  "includeAlternatives": true
}
```

**Response**:
```json
{
  "success": true,
  "primaryRoute": {
    "distance": 15430,
    "duration": 1320,
    "fuelConsumption": {
      "liters": 1.24,
      "adjustments": {
        "elevation": 0.05,
        "drivingStyle": 0.0
      }
    },
    "cost": {
      "total": 68.20,
      "perKilometer": 4.42,
      "breakdown": {
        "baseCost": 64.80,
        "elevationSurcharge": 3.40
      }
    },
    "fuelPrice": {
      "pricePerLiter": 52.26,
      "source": "average_nearby"
    }
  },
  "alternativeRoutes": [
    {
      "distance": 17200,
      "cost": {"total": 72.10},
      "savings": -3.90
    }
  ]
}
```

### GET `/api/vehicles/profiles`

**Response**:
```json
{
  "success": true,
  "profiles": [
    {
      "id": 1,
      "name": "Toyota Vios 1.3 MT",
      "category": "Sedan",
      "fuelType": "Gasoline",
      "combinedConsumption": 7.1
    }
  ]
}
```

---

## 🧮 Calculation Algorithm

```javascript
// backend/services/fuelCalculator.js
function calculateFuelConsumption(distance_km, vehicleProfile, elevationGain_m, drivingStyle) {
  // 1. Base consumption
  let baseConsumption = (distance_km / 100) * vehicleProfile.combined_consumption;
  
  // 2. Elevation adjustment (+15% per 100m)
  let elevationFactor = 1 + ((elevationGain_m / 100) * 0.15);
  
  // 3. Driving style adjustment
  const styleMultipliers = {
    'eco': 0.90,     // -10%
    'normal': 1.00,
    'sporty': 1.20   // +20%
  };
  let styleMultiplier = styleMultipliers[drivingStyle] || 1.0;
  
  // 4. Final calculation
  let totalConsumption = baseConsumption * elevationFactor * styleMultiplier;
  
  return {
    liters: parseFloat(totalConsumption.toFixed(3)),
    breakdown: {
      base: baseConsumption,
      elevationAdjustment: (elevationFactor - 1) * baseConsumption,
      styleAdjustment: (styleMultiplier - 1) * baseConsumption * elevationFactor
    }
  };
}

function calculateCost(consumptionLiters, fuelType, nearbyStations) {
  // Get average price from nearby stations
  const relevantPrices = nearbyStations
    .flatMap(s => s.fuel_prices)
    .filter(fp => fp.fuel_type === fuelType && fp.price > 0)
    .map(fp => fp.price);
  
  const avgPrice = relevantPrices.length > 0
    ? relevantPrices.reduce((a, b) => a + b) / relevantPrices.length
    : 55.00; // Default fallback
  
  return {
    total: parseFloat((consumptionLiters * avgPrice).toFixed(2)),
    pricePerLiter: parseFloat(avgPrice.toFixed(2)),
    perKilometer: parseFloat((consumptionLiters * avgPrice / distance_km).toFixed(2))
  };
}

module.exports = { calculateFuelConsumption, calculateCost };
```

---

## 💻 Frontend Components

```typescript
// frontend/src/components/FuelCostCalculator.tsx
import React, { useState, useEffect } from 'react';

const FuelCostCalculator = ({ start, end, onCalculated }) => {
  const [vehicle, setVehicle] = useState(null);
  const [style, setStyle] = useState('normal');
  const [cost, setCost] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (start && end && vehicle) calculateCost();
  }, [start, end, vehicle, style]);
  
  const calculateCost = async () => {
    setLoading(true);
    const response = await fetch('/api/route/calculate-cost', {
      method: 'POST',
      body: JSON.stringify({ start, end, vehicleProfileId: vehicle.id, drivingStyle: style })
    });
    const data = await response.json();
    setCost(data);
    onCalculated(data);
    setLoading(false);
  };
  
  return (
    <div className="fuel-cost-card">
      <VehicleSelector selected={vehicle} onSelect={setVehicle} />
      
      {cost && (
        <>
          <div className="cost-main">₱{cost.primaryRoute.cost.total}</div>
          <div className="cost-breakdown">
            <div>
              <div className="cost-value">{cost.primaryRoute.distance / 1000} km</div>
              <div className="cost-sublabel">Distance</div>
            </div>
            <div>
              <div className="cost-value">{cost.primaryRoute.fuelConsumption.liters} L</div>
              <div className="cost-sublabel">Fuel Needed</div>
            </div>
            <div>
              <div className="cost-value">₱{cost.primaryRoute.cost.perKilometer}</div>
              <div className="cost-sublabel">Per Km</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

---

## 🧪 Testing

### Unit Tests
```javascript
test('calculates consumption correctly', () => {
  const vehicle = { combined_consumption: 7.1, elevation_factor: 0.15 };
  const result = calculateFuelConsumption(15.43, vehicle, 45, 'normal');
  expect(result.liters).toBeCloseTo(1.24, 2);
});

test('applies elevation adjustment', () => {
  const flat = calculateFuelConsumption(10, vehicle, 0, 'normal');
  const hilly = calculateFuelConsumption(10, vehicle, 200, 'normal');
  expect(hilly.liters).toBeGreaterThan(flat.liters);
});
```

---

## 📋 Implementation Checklist

- [ ] Create database tables
- [ ] Implement calculation engine
- [ ] Create API endpoints
- [ ] Build vehicle selector UI
- [ ] Integrate with routing
- [ ] Add caching layer
- [ ] Write unit tests
- [ ] User acceptance testing
- [ ] Deploy and monitor

**Estimated Time**: 2 weeks  
**Files to Create**: 5  
**Files to Modify**: 3
