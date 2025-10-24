# 🔔 Smart Price Alerts - Implementation Specification

**Feature**: AI-Powered "Refuel Now" Notifications  
**Priority**: 🟢 HIGH (Killer Feature)  
**Estimated Effort**: 2-3 weeks  
**Dependencies**: Price prediction ML model  
**Version**: 1.0

---

## 🎯 Overview

### Problem Statement
Users miss optimal refueling times and pay more than necessary. They need proactive alerts when:
- Prices are about to rise
- They're running low on fuel
- A better price is available nearby
- Special promotions are active

### Solution
**Intelligent Alert System** that learns user behavior and predicts optimal refueling times using:
1. **ML Price Predictions** (LSTM model)
2. **User Pattern Learning** (from trip history)
3. **Fuel Level Estimation** (distance-based)
4. **Location-Aware Recommendations**

### Success Metrics
- ✅ 70%+ alert accuracy (prices do change as predicted)
- ✅ Users save average ₱50/month by following alerts
- ✅ 40%+ alert engagement rate
- ✅ < 5% false positive rate

---

## 🗄️ Database Schema

### 1. `price_predictions`
```sql
CREATE TABLE price_predictions (
  id SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES stations(id),
  fuel_type VARCHAR(20) NOT NULL,
  
  -- Prediction data
  current_price DECIMAL(10,2) NOT NULL,
  predicted_price DECIMAL(10,2) NOT NULL,
  prediction_date DATE NOT NULL,  -- Which future date
  confidence DECIMAL(3,2),  -- 0.0 - 1.0
  
  -- Change indicators
  change_amount DECIMAL(10,2),  -- +/- PHP
  change_percentage DECIMAL(5,2),  -- +/- %
  trend VARCHAR(20),  -- rising, falling, stable
  
  -- Model metadata
  model_version VARCHAR(20),
  predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(station_id, fuel_type, prediction_date)
);

CREATE INDEX idx_predictions_station ON price_predictions(station_id);
CREATE INDEX idx_predictions_date ON price_predictions(prediction_date);
CREATE INDEX idx_predictions_trend ON price_predictions(trend);
```

### 2. `user_fuel_profiles`
```sql
CREATE TABLE user_fuel_profiles (
  id SERIAL PRIMARY KEY,
  user_session_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Vehicle info
  vehicle_profile_id INTEGER REFERENCES vehicle_profiles(id),
  tank_capacity_liters DECIMAL(5,2),  -- e.g., 40L
  preferred_fuel_type VARCHAR(20),  -- Gasoline, Diesel
  
  -- Refueling patterns (learned)
  avg_refuel_frequency_days DECIMAL(4,2),  -- e.g., 7.5 days
  avg_liters_per_refuel DECIMAL(5,2),  -- e.g., 30L
  last_refuel_date DATE,
  estimated_current_fuel_liters DECIMAL(5,2),
  
  -- Alert preferences
  alert_threshold_percentage INTEGER DEFAULT 25,  -- Alert at 25% tank
  price_change_threshold DECIMAL(5,2) DEFAULT 2.00,  -- Alert if ±₱2
  preferred_alert_time TIME DEFAULT '08:00:00',
  alert_enabled BOOLEAN DEFAULT TRUE,
  
  -- Location context
  home_location_lat DECIMAL(10,8),
  home_location_lng DECIMAL(11,8),
  work_location_lat DECIMAL(10,8),
  work_location_lng DECIMAL(11,8),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fuel_profiles_session ON user_fuel_profiles(user_session_id);
CREATE INDEX idx_fuel_profiles_refuel_date ON user_fuel_profiles(last_refuel_date);
```

### 3. `price_alerts`
```sql
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  user_session_id VARCHAR(255) NOT NULL,
  station_id INTEGER REFERENCES stations(id),
  
  -- Alert type
  alert_type VARCHAR(50) NOT NULL,  
  -- 'price_rising', 'price_falling', 'low_fuel', 'better_price_nearby', 'promotion'
  
  -- Alert content
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,  -- Deep link to station
  
  -- Metrics
  current_price DECIMAL(10,2),
  predicted_price DECIMAL(10,2),
  savings_amount DECIMAL(10,2),
  urgency VARCHAR(20),  -- low, medium, high, urgent
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, seen, acted, dismissed
  sent_at TIMESTAMP,
  seen_at TIMESTAMP,
  acted_at TIMESTAMP,
  
  -- Delivery
  delivery_method VARCHAR(20),  -- push, email, sms, in_app
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_alerts_user ON price_alerts(user_session_id);
CREATE INDEX idx_alerts_status ON price_alerts(status);
CREATE INDEX idx_alerts_created ON price_alerts(created_at);
```

### 4. `alert_performance`
```sql
CREATE TABLE alert_performance (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES price_alerts(id),
  
  -- Prediction accuracy
  predicted_price DECIMAL(10,2),
  actual_price DECIMAL(10,2),
  prediction_error DECIMAL(10,2),
  was_accurate BOOLEAN,  -- Within ±5% tolerance
  
  -- User action
  user_acted BOOLEAN DEFAULT FALSE,
  action_taken VARCHAR(50),  -- refueled, dismissed, ignored
  time_to_action_hours INTEGER,
  
  -- Feedback
  user_rating INTEGER,  -- 1-5 stars
  user_feedback TEXT,
  
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_perf_alert ON alert_performance(alert_id);
```

---

## 🔌 API Endpoints

### 1. Generate Price Predictions (Background Job)

**POST** `/api/admin/prices/predict`  
**Headers**: `x-api-key: ADMIN_KEY`

**Description**: Run ML model to predict prices for next 7 days.

**Request Body**:
```json
{
  "daysAhead": 7,
  "stationIds": [1, 2, 3],  // Empty = all stations
  "fuelTypes": ["Gasoline", "Diesel", "Premium"]
}
```

**Response**:
```json
{
  "success": true,
  "predictions": {
    "generated": 145,
    "stations": 48,
    "dateRange": ["2025-10-19", "2025-10-25"]
  },
  "model": {
    "version": "v1.2",
    "accuracy": 0.87,
    "lastTrained": "2025-10-15"
  }
}
```

---

### 2. Get User Fuel Profile (Public)

**GET** `/api/user/fuel-profile`  
**Query**: `?sessionId=session_abc123`

**Response**:
```json
{
  "success": true,
  "profile": {
    "vehicleType": "Toyota Vios 1.3 MT",
    "tankCapacity": 40,
    "preferredFuelType": "Gasoline",
    "estimatedCurrentFuel": 12.5,
    "fuelPercentage": 31,
    "avgRefuelFrequency": 7.5,
    "lastRefuelDate": "2025-10-11",
    "daysUntilEmpty": 2.3,
    "alertThreshold": 25,
    "alertsEnabled": true
  }
}
```

---

### 3. Update User Fuel Profile (Public)

**PUT** `/api/user/fuel-profile`

**Request Body**:
```json
{
  "sessionId": "session_abc123",
  "tankCapacity": 40,
  "preferredFuelType": "Gasoline",
  "lastRefuelDate": "2025-10-18",
  "litersRefueled": 35,
  "alertThreshold": 20,
  "preferredAlertTime": "08:00:00",
  "homeLocation": {"lat": 12.5774, "lng": 121.4127},
  "workLocation": {"lat": 12.5234, "lng": 121.3567}
}
```

**Response**:
```json
{
  "success": true,
  "profile": {
    "estimatedCurrentFuel": 35,
    "fuelPercentage": 88,
    "daysUntilEmpty": 9.2
  }
}
```

---

### 4. Get Alerts for User (Public)

**GET** `/api/user/alerts`  
**Query**: `?sessionId=session_abc123&status=pending`

**Response**:
```json
{
  "success": true,
  "alerts": [
    {
      "id": 42,
      "type": "price_rising",
      "urgency": "high",
      "title": "⚠️ Prices Rising Tomorrow!",
      "message": "Gasoline prices expected to rise ₱2.50/L tomorrow. Refuel today at Petron Roxas (₱52.50/L) to save ₱100 on your usual 40L tank.",
      "station": {
        "id": 15,
        "name": "Petron Roxas",
        "distance": 2300,
        "currentPrice": 52.50,
        "predictedPrice": 55.00
      },
      "savingsAmount": 100,
      "expiresAt": "2025-10-18T23:59:59Z",
      "createdAt": "2025-10-18T08:00:00Z"
    },
    {
      "id": 43,
      "type": "low_fuel",
      "urgency": "medium",
      "title": "⛽ Running Low on Fuel",
      "message": "Your tank is at 22% (8.8L). You'll need to refuel in 2 days based on your driving patterns.",
      "station": {
        "id": 12,
        "name": "Shell Bongabong",
        "distance": 1500,
        "currentPrice": 53.20
      },
      "expiresAt": "2025-10-20T23:59:59Z"
    }
  ],
  "count": 2
}
```

---

### 5. Mark Alert as Seen/Acted (Public)

**PATCH** `/api/user/alerts/:id/status`

**Request Body**:
```json
{
  "sessionId": "session_abc123",
  "status": "acted",  // seen, acted, dismissed
  "action": "refueled",  // Optional: what they did
  "rating": 5  // Optional: 1-5 stars
}
```

---

### 6. Generate Alerts for All Users (Background Job)

**POST** `/api/admin/alerts/generate`  
**Headers**: `x-api-key: ADMIN_KEY`

**Description**: Scan all users and generate personalized alerts.

**Response**:
```json
{
  "success": true,
  "alertsGenerated": 234,
  "breakdown": {
    "price_rising": 89,
    "price_falling": 45,
    "low_fuel": 67,
    "better_price_nearby": 33
  },
  "usersNotified": 187
}
```

---

## 🤖 Alert Generation Algorithm

### Main Alert Engine

```javascript
// backend/services/alertEngine.js
class PriceAlertEngine {
  constructor(db, mlModel) {
    this.db = db;
    this.mlModel = mlModel;
  }
  
  // Main method: Generate alerts for all users
  async generateAlertsForAllUsers() {
    const users = await this.getActiveUsers();
    const alerts = [];
    
    for (const user of users) {
      const userAlerts = await this.generateUserAlerts(user);
      alerts.push(...userAlerts);
    }
    
    // Send alerts
    await this.sendAlerts(alerts);
    
    return alerts;
  }
  
  // Generate alerts for a single user
  async generateUserAlerts(user) {
    const alerts = [];
    
    // 1. Check for price changes
    const priceAlert = await this.checkPriceChanges(user);
    if (priceAlert) alerts.push(priceAlert);
    
    // 2. Check fuel level
    const fuelAlert = await this.checkFuelLevel(user);
    if (fuelAlert) alerts.push(fuelAlert);
    
    // 3. Check for better nearby prices
    const betterPriceAlert = await this.checkBetterPrices(user);
    if (betterPriceAlert) alerts.push(betterPriceAlert);
    
    // 4. Check for promotions
    const promoAlert = await this.checkPromotions(user);
    if (promoAlert) alerts.push(promoAlert);
    
    return alerts;
  }
  
  // Alert Type 1: Price Rising/Falling
  async checkPriceChanges(user) {
    // Get predictions for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const predictions = await this.db.query(`
      SELECT 
        p.*,
        s.id as station_id,
        s.name as station_name,
        ST_Distance(
          s.geom,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM price_predictions p
      JOIN stations s ON s.id = p.station_id
      WHERE p.fuel_type = $3
        AND p.prediction_date = $4
        AND p.confidence >= 0.7
        AND ABS(p.change_amount) >= $5
        AND ST_DWithin(
          s.geom,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          5000  -- 5km radius
        )
      ORDER BY distance ASC
      LIMIT 1
    `, [
      user.home_location_lng,
      user.home_location_lat,
      user.preferred_fuel_type,
      tomorrow.toISOString().split('T')[0],
      user.price_change_threshold
    ]);
    
    if (predictions.rows.length === 0) return null;
    
    const pred = predictions.rows[0];
    
    // Generate alert
    if (pred.change_amount > 0) {
      // Price RISING - Alert to refuel NOW
      const savingsOnFullTank = pred.change_amount * (user.tank_capacity - user.estimated_current_fuel_liters);
      
      return {
        userId: user.user_session_id,
        stationId: pred.station_id,
        type: 'price_rising',
        urgency: pred.change_amount >= 3 ? 'high' : 'medium',
        title: `⚠️ Prices Rising ${pred.change_percentage > 0 ? '+' : ''}${pred.change_percentage}%!`,
        message: `${user.preferred_fuel_type} prices expected to rise ₱${pred.change_amount}/L tomorrow. Refuel today at ${pred.station_name} (₱${pred.current_price}/L) to save ₱${savingsOnFullTank.toFixed(0)}.`,
        currentPrice: pred.current_price,
        predictedPrice: pred.predicted_price,
        savingsAmount: savingsOnFullTank,
        expiresAt: tomorrow
      };
    } else if (pred.change_amount < -1) {
      // Price FALLING - Alert to wait
      return {
        userId: user.user_session_id,
        type: 'price_falling',
        urgency: 'low',
        title: `💰 Prices Dropping Tomorrow!`,
        message: `${user.preferred_fuel_type} prices expected to drop ₱${Math.abs(pred.change_amount)}/L tomorrow. Consider waiting to refuel.`,
        currentPrice: pred.current_price,
        predictedPrice: pred.predicted_price,
        expiresAt: tomorrow
      };
    }
    
    return null;
  }
  
  // Alert Type 2: Low Fuel
  async checkFuelLevel(user) {
    const fuelPercentage = (user.estimated_current_fuel_liters / user.tank_capacity) * 100;
    
    if (fuelPercentage <= user.alert_threshold_percentage) {
      // User is running low
      const daysUntilEmpty = user.estimated_current_fuel_liters / 
                            (user.avg_liters_per_refuel / user.avg_refuel_frequency_days);
      
      // Find nearest station
      const nearestStation = await this.findNearestStation(
        user.home_location_lat,
        user.home_location_lng,
        user.preferred_fuel_type
      );
      
      return {
        userId: user.user_session_id,
        stationId: nearestStation?.id,
        type: 'low_fuel',
        urgency: fuelPercentage <= 15 ? 'high' : 'medium',
        title: `⛽ Running Low on Fuel`,
        message: `Your tank is at ${Math.round(fuelPercentage)}% (${user.estimated_current_fuel_liters.toFixed(1)}L). You'll need to refuel in ${Math.ceil(daysUntilEmpty)} days based on your driving patterns.`,
        station: nearestStation,
        expiresAt: new Date(Date.now() + daysUntilEmpty * 24 * 60 * 60 * 1000)
      };
    }
    
    return null;
  }
  
  // Alert Type 3: Better Price Nearby
  async checkBetterPrices(user) {
    // Get user's usual station (most frequent)
    const usualStation = await this.getUserUsualStation(user.user_session_id);
    if (!usualStation) return null;
    
    // Find cheaper stations nearby
    const cheaperStations = await this.db.query(`
      SELECT 
        s.id,
        s.name,
        fp.price as current_price,
        ST_Distance(
          s.geom,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM stations s
      JOIN fuel_prices fp ON fp.station_id = s.id
      WHERE fp.fuel_type = $3
        AND fp.price < $4 - $5  -- At least ₱2 cheaper
        AND s.id != $6
        AND ST_DWithin(
          s.geom,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          3000  -- 3km radius
        )
      ORDER BY fp.price ASC
      LIMIT 1
    `, [
      user.home_location_lng,
      user.home_location_lat,
      user.preferred_fuel_type,
      usualStation.price,
      2.00,  // Threshold
      usualStation.id
    ]);
    
    if (cheaperStations.rows.length > 0) {
      const cheaper = cheaperStations.rows[0];
      const savings = (usualStation.price - cheaper.current_price) * user.avg_liters_per_refuel;
      
      return {
        userId: user.user_session_id,
        stationId: cheaper.id,
        type: 'better_price_nearby',
        urgency: 'low',
        title: `💡 Cheaper Price Nearby!`,
        message: `${cheaper.name} has ${user.preferred_fuel_type} for ₱${cheaper.current_price}/L (₱${(usualStation.price - cheaper.current_price).toFixed(2)} cheaper). Save ₱${savings.toFixed(0)} per tank!`,
        currentPrice: cheaper.current_price,
        savingsAmount: savings,
        station: cheaper
      };
    }
    
    return null;
  }
  
  // Update fuel estimation based on trips
  async updateFuelEstimation(userId) {
    // Get trips since last refuel
    const trips = await this.getTripsComplete(userId);
    
    if (trips.length === 0) return;
    
    const user = await this.getUserProfile(userId);
    
    // Calculate total distance
    const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);
    
    // Estimate fuel consumed (using vehicle profile)
    const vehicle = await this.getVehicleProfile(user.vehicle_profile_id);
    const fuelConsumed = (totalDistance / 1000 / 100) * vehicle.combined_consumption;
    
    // Update estimated fuel
    const newFuelLevel = Math.max(0, user.estimated_current_fuel_liters - fuelConsumed);
    
    await this.db.query(`
      UPDATE user_fuel_profiles
      SET estimated_current_fuel_liters = $1,
          updated_at = NOW()
      WHERE user_session_id = $2
    `, [newFuelLevel, userId]);
  }
}

module.exports = PriceAlertEngine;
```

---

## 🧠 ML Price Prediction Model

### Model Architecture (Python)

```python
# ml/price_predictor.py
import numpy as np
import pandas as pd
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler

class FuelPricePredictor:
    def __init__(self):
        self.model = None
        self.scaler = MinMaxScaler()
        self.lookback = 30  # Use 30 days of history
        
    def build_model(self, input_shape):
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(25),
            Dense(1)  # Predict next day price
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        self.model = model
        return model
    
    def prepare_data(self, prices, external_features=None):
        """
        prices: array of historical prices
        external_features: oil prices, holidays, etc.
        """
        # Normalize
        prices_scaled = self.scaler.fit_transform(prices.reshape(-1, 1))
        
        # Create sequences
        X, y = [], []
        for i in range(self.lookback, len(prices_scaled) - 7):
            X.append(prices_scaled[i-self.lookback:i, 0])
            y.append(prices_scaled[i+7, 0])  # Predict 7 days ahead
        
        return np.array(X), np.array(y)
    
    def predict_price(self, recent_prices):
        """Predict price for 7 days from now"""
        if len(recent_prices) < self.lookback:
            raise ValueError(f"Need at least {self.lookback} days of data")
        
        # Prepare input
        scaled = self.scaler.transform(recent_prices[-self.lookback:].reshape(-1, 1))
        X = scaled.reshape(1, self.lookback, 1)
        
        # Predict
        prediction_scaled = self.model.predict(X)
        prediction = self.scaler.inverse_transform(prediction_scaled)
        
        return float(prediction[0][0])
```

---

## 💻 Frontend Components

```typescript
// frontend/src/components/AlertsPanel.tsx
const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const sessionId = userTracking.getSessionId();
  
  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  const loadAlerts = async () => {
    const response = await fetch(`/api/user/alerts?sessionId=${sessionId}&status=pending`);
    const data = await response.json();
    setAlerts(data.alerts);
  };
  
  const markActed = async (alertId) => {
    await fetch(`/api/user/alerts/${alertId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ sessionId, status: 'acted', action: 'refueled' })
    });
    loadAlerts();
  };
  
  return (
    <div className="alerts-panel">
      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.urgency}`}>
          <div className="alert-header">
            <h3>{alert.title}</h3>
            <span className="urgency-badge">{alert.urgency}</span>
          </div>
          <p>{alert.message}</p>
          
          {alert.station && (
            <div className="alert-station">
              <strong>{alert.station.name}</strong>
              <span>{(alert.station.distance / 1000).toFixed(1)} km away</span>
              <span>₱{alert.station.currentPrice}/L</span>
            </div>
          )}
          
          {alert.savingsAmount && (
            <div className="alert-savings">
              💰 Save ₱{alert.savingsAmount.toFixed(0)}
            </div>
          )}
          
          <div className="alert-actions">
            <button onClick={() => navigateToStation(alert.station.id)}>
              Navigate
            </button>
            <button onClick={() => markActed(alert.id)}>
              Refueled
            </button>
            <button onClick={() => dismissAlert(alert.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Core (Week 1)
- [ ] Create database tables
- [ ] Implement fuel profile management API
- [ ] Build alert generation engine
- [ ] Create alert storage and retrieval

### Phase 2: ML Model (Week 2)
- [ ] Collect historical price data
- [ ] Train LSTM model
- [ ] Create prediction API endpoint
- [ ] Schedule daily prediction job

### Phase 3: Alert Logic (Week 2)
- [ ] Implement price change detection
- [ ] Implement fuel level tracking
- [ ] Implement better price detection
- [ ] Test alert accuracy

### Phase 4: Frontend (Week 3)
- [ ] Build alerts panel UI
- [ ] Add fuel profile settings
- [ ] Implement push notifications (optional)
- [ ] Add alert performance feedback

### Phase 5: Testing & Tuning
- [ ] Beta test with 50 users
- [ ] Measure alert accuracy
- [ ] Tune ML model
- [ ] Optimize alert timing

**Estimated Time**: 3 weeks  
**Impact**: VERY HIGH - Game changer  
**Complexity**: HIGH - Requires ML
