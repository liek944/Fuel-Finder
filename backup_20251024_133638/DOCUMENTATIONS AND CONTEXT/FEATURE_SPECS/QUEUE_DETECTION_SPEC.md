# 🚦 Real-Time Queue Detection - Implementation Specification

**Feature**: Live Station Congestion Indicators  
**Priority**: 🟢 HIGH (Quick Win)  
**Estimated Effort**: 1-2 weeks  
**Version**: 1.0

---

## 🎯 Overview

### Problem Statement
Users waste time waiting in long queues at fuel stations. They need to know which stations are busy BEFORE arriving.

### Solution Strategy
**Multi-Signal Queue Detection System** combining:

1. **Active Check-ins**: Users manually report "I'm refueling here"
2. **Passive Detection**: Trip recorder detects users stopped at stations
3. **Dwell Time Analysis**: Multiple users at same location = queue
4. **Historical Patterns**: "Usually busy 5-7 PM on weekdays"
5. **Predictive Modeling**: Payday rush, weekend patterns

### Innovation
**Your Enhanced Idea**: Track multiple users at a station location. If 3+ users are at the same station for >5 minutes, automatically flag as "Busy".

### Success Metrics
- ✅ 90%+ accuracy in congestion detection
- ✅ Real-time updates (< 30 second latency)
- ✅ 30%+ reduction in user wait times
- ✅ 60%+ user engagement with feature

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│          DETECTION SOURCES                          │
├─────────────┬─────────────┬──────────────┬─────────┤
│   Manual    │    Trip     │   Location   │ Payment │
│  Check-ins  │  Recorder   │   Tracking   │  Events │
└──────┬──────┴──────┬──────┴───────┬──────┴────┬────┘
       │             │              │           │
       └─────────────┴──────────────┴───────────┘
                      ▼
       ┌──────────────────────────────┐
       │  Congestion Detection Engine │
       │  (Redis + Node.js)           │
       └──────────────┬───────────────┘
                      │
       ┌──────────────┴───────────────┐
       │  Real-time State Manager     │
       │  - Active users per station  │
       │  - Dwell time tracking       │
       │  - Queue length estimation   │
       └──────────────┬───────────────┘
                      │
       ┌──────────────┴───────────────┐
       │   Broadcast to Clients       │
       │   - WebSocket (optional)     │
       │   - Polling (every 30s)      │
       └──────────────────────────────┘
```

---

## 🗄️ Database Schema

### 1. `station_checkins` - Active Check-ins

```sql
CREATE TABLE station_checkins (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  user_session_id VARCHAR(255) NOT NULL,
  
  -- Check-in data
  checkin_type VARCHAR(20) NOT NULL,  -- 'manual', 'trip_pause', 'location_based'
  checkin_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checkout_at TIMESTAMP,  -- NULL = still at station
  
  -- Location verification (within 50m of station)
  user_lat DECIMAL(10,8),
  user_lng DECIMAL(11,8),
  distance_from_station_meters INTEGER,
  
  -- Dwell time tracking
  dwell_time_seconds INTEGER,  -- Updated periodically
  is_refueling BOOLEAN DEFAULT TRUE,  -- vs just passing by
  
  -- Metadata
  user_agent VARCHAR(50),  -- Mobile, Desktop
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checkins_station ON station_checkins(station_id);
CREATE INDEX idx_checkins_session ON station_checkins(user_session_id);
CREATE INDEX idx_checkins_active ON station_checkins(station_id, checkout_at) 
  WHERE checkout_at IS NULL;  -- Fast lookup for active users
CREATE INDEX idx_checkins_timestamp ON station_checkins(checkin_at);
```

### 2. `station_congestion_cache` - Real-time Status

```sql
CREATE TABLE station_congestion_cache (
  station_id INTEGER PRIMARY KEY REFERENCES stations(id) ON DELETE CASCADE,
  
  -- Real-time metrics
  active_users INTEGER DEFAULT 0,
  estimated_queue_length INTEGER DEFAULT 0,
  avg_dwell_time_seconds INTEGER DEFAULT 0,
  
  -- Congestion level
  congestion_level VARCHAR(20) DEFAULT 'unknown',  -- empty, moderate, busy, very_busy
  congestion_score INTEGER DEFAULT 0,  -- 0-100
  
  -- Time estimates
  estimated_wait_minutes INTEGER DEFAULT 0,
  last_checkout_at TIMESTAMP,
  
  -- Update tracking
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_quality VARCHAR(20) DEFAULT 'low',  -- low, medium, high (based on sample size)
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_congestion_level ON station_congestion_cache(congestion_level);
CREATE INDEX idx_congestion_updated ON station_congestion_cache(last_updated);
```

### 3. `station_congestion_history` - Historical Patterns

```sql
CREATE TABLE station_congestion_history (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  
  -- Time context
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  day_of_week INTEGER,  -- 0=Sunday, 6=Saturday
  hour_of_day INTEGER,  -- 0-23
  is_payday BOOLEAN DEFAULT FALSE,  -- 15th or 30th
  is_weekend BOOLEAN DEFAULT FALSE,
  is_holiday BOOLEAN DEFAULT FALSE,
  
  -- Metrics snapshot
  active_users INTEGER,
  avg_dwell_time_seconds INTEGER,
  congestion_level VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_station ON station_congestion_history(station_id);
CREATE INDEX idx_history_time ON station_congestion_history(day_of_week, hour_of_day);
CREATE INDEX idx_history_recorded ON station_congestion_history(recorded_at);
```

### 4. `station_congestion_patterns` - Predictive Data

```sql
CREATE TABLE station_congestion_patterns (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  
  -- Pattern identification
  day_of_week INTEGER,
  hour_of_day INTEGER,
  context VARCHAR(50),  -- 'normal', 'payday', 'weekend', 'holiday'
  
  -- Aggregated metrics (from history)
  avg_active_users DECIMAL(4,2),
  avg_congestion_score DECIMAL(5,2),
  typical_congestion_level VARCHAR(20),
  sample_count INTEGER,  -- How many data points
  
  -- Confidence
  confidence DECIMAL(3,2) DEFAULT 0.5,  -- 0.0 - 1.0
  
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(station_id, day_of_week, hour_of_day, context)
);

CREATE INDEX idx_patterns_station ON station_congestion_patterns(station_id);
CREATE INDEX idx_patterns_time ON station_congestion_patterns(day_of_week, hour_of_day);
```

---

## 🔌 API Endpoints

### 1. Check-in to Station (Public)

**POST** `/api/stations/:id/checkin`

**Description**: User reports they're at a station (manual or automatic).

**Request Body**:
```json
{
  "sessionId": "session_abc123",
  "location": {
    "lat": 12.5774,
    "lng": 121.4127
  },
  "checkinType": "manual",  // or "trip_pause", "location_based"
  "isRefueling": true
}
```

**Response**:
```json
{
  "success": true,
  "checkin": {
    "id": 42,
    "stationId": 15,
    "checkinAt": "2025-10-18T14:35:22Z",
    "distanceFromStation": 12  // meters
  },
  "currentStatus": {
    "activeUsers": 3,
    "congestionLevel": "moderate",
    "estimatedWaitMinutes": 5
  }
}
```

---

### 2. Check-out from Station (Public)

**POST** `/api/stations/:id/checkout`

**Description**: User finished refueling.

**Request Body**:
```json
{
  "sessionId": "session_abc123",
  "checkinId": 42  // Optional: if known
}
```

**Response**:
```json
{
  "success": true,
  "dwellTime": 420,  // seconds
  "message": "Thanks! Your visit helps others know wait times."
}
```

---

### 3. Get Station Congestion (Public)

**GET** `/api/stations/:id/congestion`

**Description**: Get current and predicted congestion.

**Response**:
```json
{
  "success": true,
  "station": {
    "id": 15,
    "name": "Petron Roxas"
  },
  "current": {
    "congestionLevel": "moderate",  // empty, moderate, busy, very_busy
    "congestionScore": 45,  // 0-100
    "activeUsers": 3,
    "estimatedQueueLength": 2,
    "estimatedWaitMinutes": 5,
    "avgDwellTimeSeconds": 420,
    "dataQuality": "high",  // low, medium, high
    "lastUpdated": "2025-10-18T14:35:22Z"
  },
  "predicted": {
    "nextHour": "moderate",
    "confidence": 0.75,
    "pattern": "Usually moderate on Saturdays 2-3 PM"
  },
  "historicalContext": {
    "typicalForNow": "moderate",
    "comparisonToTypical": "same",  // quieter, same, busier
    "basedOnSamples": 45
  }
}
```

---

### 4. Get All Congestion Status (Public)

**GET** `/api/stations/congestion/all`

**Description**: Get congestion for all stations (for map display).

**Query Parameters**:
- `lat`, `lng` (optional): Center point for filtering
- `radiusMeters` (optional): Radius to filter

**Response**:
```json
{
  "success": true,
  "stations": [
    {
      "id": 15,
      "name": "Petron Roxas",
      "location": {"lat": 12.5774, "lng": 121.4127},
      "congestionLevel": "moderate",
      "congestionScore": 45,
      "activeUsers": 3,
      "estimatedWaitMinutes": 5,
      "icon": "🟡"  // 🟢 empty, 🟡 moderate, 🔴 busy
    }
  ],
  "timestamp": "2025-10-18T14:35:22Z",
  "nextUpdate": "2025-10-18T14:36:00Z"  // Refresh every 30s
}
```

---

### 5. Admin: Get Congestion Analytics (Protected)

**GET** `/api/admin/congestion/analytics`

**Headers**: `x-api-key: ADMIN_KEY`

**Query Parameters**:
- `stationId` (optional): Specific station
- `startDate`, `endDate`: Date range

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalCheckins": 1523,
    "avgDwellTime": 380,
    "peakHour": "17:00-18:00",
    "busiestDay": "Saturday",
    "busiestStation": {
      "id": 15,
      "name": "Petron Roxas",
      "avgActiveUsers": 5.2
    }
  },
  "patterns": [
    {
      "stationId": 15,
      "dayOfWeek": "Saturday",
      "hourRange": "14:00-18:00",
      "avgCongestion": "busy",
      "confidence": 0.85
    }
  ]
}
```

---

## 🧮 Congestion Detection Algorithm

### Core Logic

```javascript
// backend/services/congestionDetector.js
class CongestionDetector {
  constructor(db, redis) {
    this.db = db;
    this.redis = redis;
    
    // Thresholds
    this.PROXIMITY_THRESHOLD_METERS = 50;  // User within 50m = at station
    this.MIN_DWELL_TIME_REFUELING = 180;   // 3 minutes
    this.CHECKOUT_TIMEOUT = 900;           // 15 min = auto checkout
    
    // Congestion levels
    this.LEVELS = {
      empty: { min: 0, max: 1, wait: 0 },
      moderate: { min: 2, max: 3, wait: 5 },
      busy: { min: 4, max: 6, wait: 10 },
      very_busy: { min: 7, max: 999, wait: 20 }
    };
  }
  
  // Main detection method
  async detectCongestion(stationId) {
    // 1. Get active users at this station
    const activeUsers = await this.getActiveUsers(stationId);
    
    // 2. Calculate metrics
    const metrics = {
      activeUsers: activeUsers.length,
      avgDwellTime: this.calculateAvgDwellTime(activeUsers),
      queueLength: Math.max(0, activeUsers.length - 2), // Assume 2 pumps
      estimatedWait: this.estimateWaitTime(activeUsers)
    };
    
    // 3. Determine congestion level
    const level = this.getCongestionLevel(metrics.activeUsers);
    const score = this.calculateScore(metrics);
    
    // 4. Get data quality
    const quality = this.assessDataQuality(activeUsers.length);
    
    // 5. Update cache
    await this.updateCongestionCache(stationId, {
      ...metrics,
      congestionLevel: level,
      congestionScore: score,
      dataQuality: quality
    });
    
    // 6. Record history (for pattern learning)
    await this.recordHistory(stationId, metrics, level);
    
    return { level, score, metrics, quality };
  }
  
  // Get all users currently at a station
  async getActiveUsers(stationId) {
    const result = await this.db.query(`
      SELECT 
        id,
        user_session_id,
        checkin_at,
        dwell_time_seconds,
        checkin_type,
        EXTRACT(EPOCH FROM (NOW() - checkin_at)) as seconds_at_station
      FROM station_checkins
      WHERE station_id = $1
        AND checkout_at IS NULL
        AND checkin_at > NOW() - INTERVAL '15 minutes'
      ORDER BY checkin_at ASC
    `, [stationId]);
    
    // Auto-checkout stale sessions
    const now = Date.now();
    const activeUsers = result.rows.filter(user => {
      const secondsAtStation = user.seconds_at_station;
      if (secondsAtStation > this.CHECKOUT_TIMEOUT) {
        this.autoCheckout(user.id, stationId);
        return false;
      }
      return true;
    });
    
    return activeUsers;
  }
  
  // Calculate congestion score (0-100)
  calculateScore(metrics) {
    let score = 0;
    
    // Factor 1: Number of active users (50% weight)
    score += Math.min(50, metrics.activeUsers * 10);
    
    // Factor 2: Average dwell time (30% weight)
    // Longer dwell = slower service = more congestion
    const dwellFactor = Math.min(30, (metrics.avgDwellTime / 600) * 30);
    score += dwellFactor;
    
    // Factor 3: Queue length (20% weight)
    score += Math.min(20, metrics.queueLength * 5);
    
    return Math.round(Math.min(100, score));
  }
  
  // Determine congestion level from active users
  getCongestionLevel(activeUsers) {
    for (const [level, range] of Object.entries(this.LEVELS)) {
      if (activeUsers >= range.min && activeUsers <= range.max) {
        return level;
      }
    }
    return 'unknown';
  }
  
  // Estimate wait time in minutes
  estimateWaitTime(activeUsers) {
    if (activeUsers.length === 0) return 0;
    
    const avgDwellTime = this.calculateAvgDwellTime(activeUsers);
    const queueLength = Math.max(0, activeUsers.length - 2); // 2 pumps
    
    // If queue exists, wait = (queue length × avg service time) / num pumps
    if (queueLength > 0) {
      return Math.round((queueLength * avgDwellTime) / 120); // 2 pumps, seconds to minutes
    }
    
    // No queue, but might wait for pump
    return Math.round(avgDwellTime / 120);
  }
  
  // Calculate average dwell time
  calculateAvgDwellTime(activeUsers) {
    if (activeUsers.length === 0) return 0;
    
    const totalDwellTime = activeUsers.reduce((sum, user) => {
      return sum + (user.seconds_at_station || 0);
    }, 0);
    
    return Math.round(totalDwellTime / activeUsers.length);
  }
  
  // Assess data quality
  assessDataQuality(sampleSize) {
    if (sampleSize >= 5) return 'high';
    if (sampleSize >= 2) return 'medium';
    return 'low';
  }
  
  // Update cache table
  async updateCongestionCache(stationId, data) {
    await this.db.query(`
      INSERT INTO station_congestion_cache (
        station_id, 
        active_users, 
        estimated_queue_length,
        avg_dwell_time_seconds,
        congestion_level,
        congestion_score,
        estimated_wait_minutes,
        data_quality,
        last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (station_id) DO UPDATE SET
        active_users = EXCLUDED.active_users,
        estimated_queue_length = EXCLUDED.estimated_queue_length,
        avg_dwell_time_seconds = EXCLUDED.avg_dwell_time_seconds,
        congestion_level = EXCLUDED.congestion_level,
        congestion_score = EXCLUDED.congestion_score,
        estimated_wait_minutes = EXCLUDED.estimated_wait_minutes,
        data_quality = EXCLUDED.data_quality,
        last_updated = NOW()
    `, [
      stationId,
      data.activeUsers,
      data.queueLength,
      data.avgDwellTime,
      data.congestionLevel,
      data.congestionScore,
      data.estimatedWait,
      data.dataQuality
    ]);
  }
  
  // Record for historical pattern analysis
  async recordHistory(stationId, metrics, level) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();
    const isPayday = [15, 30].includes(now.getDate());
    const isWeekend = [0, 6].includes(dayOfWeek);
    
    await this.db.query(`
      INSERT INTO station_congestion_history (
        station_id,
        day_of_week,
        hour_of_day,
        is_payday,
        is_weekend,
        active_users,
        avg_dwell_time_seconds,
        congestion_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      stationId,
      dayOfWeek,
      hourOfDay,
      isPayday,
      isWeekend,
      metrics.activeUsers,
      metrics.avgDwellTime,
      level
    ]);
  }
}

module.exports = CongestionDetector;
```

---

## 🤖 Automatic Detection from Trip Recorder

### Integration Strategy

```javascript
// backend/services/tripCongestionIntegration.js
class TripCongestionIntegration {
  constructor(congestionDetector, db) {
    this.detector = congestionDetector;
    this.db = db;
  }
  
  // Called when trip recorder detects a pause
  async onTripPause(sessionId, location, pauseDuration) {
    // 1. Check if pause location is near a station
    const nearbyStation = await this.findNearbyStation(location);
    
    if (!nearbyStation) return;
    
    // 2. If pause > 3 minutes and within 50m, likely refueling
    const isLikelyRefueling = pauseDuration >= 180 && 
                               nearbyStation.distance < 50;
    
    if (isLikelyRefueling) {
      // 3. Auto check-in
      await this.autoCheckin(sessionId, nearbyStation.id, location, 'trip_pause');
      
      // 4. Update congestion
      await this.detector.detectCongestion(nearbyStation.id);
    }
  }
  
  // Called when trip resumes after pause
  async onTripResume(sessionId) {
    // Auto check-out
    await this.autoCheckout(sessionId);
  }
  
  async findNearbyStation(location) {
    const result = await this.db.query(`
      SELECT 
        id,
        name,
        ST_Distance(
          geom,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM stations
      WHERE ST_DWithin(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        100
      )
      ORDER BY distance ASC
      LIMIT 1
    `, [location.lng, location.lat]);
    
    return result.rows[0] || null;
  }
}
```

---

## 💻 Frontend Implementation

### Map Marker Enhancement

```typescript
// frontend/src/components/CongestionMarker.tsx
const CongestionIndicator = ({ station }) => {
  const getIcon = () => {
    switch (station.congestionLevel) {
      case 'empty': return '🟢';
      case 'moderate': return '🟡';
      case 'busy': return '🔴';
      case 'very_busy': return '🚨';
      default: return '⚪';
    }
  };
  
  const getColor = () => {
    switch (station.congestionLevel) {
      case 'empty': return '#4ade80';
      case 'moderate': return '#fbbf24';
      case 'busy': return '#f87171';
      case 'very_busy': return '#dc2626';
      default: return '#9ca3af';
    }
  };
  
  return (
    <div className="congestion-badge" style={{ backgroundColor: getColor() }}>
      {getIcon()} {station.estimatedWaitMinutes > 0 && `${station.estimatedWaitMinutes} min`}
    </div>
  );
};
```

### Station Popup Enhancement

```typescript
// Add to station popup in MainApp.tsx
{station.congestion && (
  <div className="congestion-info">
    <h4>Queue Status</h4>
    <div className="congestion-level">
      <span className={`badge-${station.congestion.level}`}>
        {station.congestion.level.toUpperCase()}
      </span>
      {station.congestion.activeUsers > 0 && (
        <span>{station.congestion.activeUsers} users here now</span>
      )}
    </div>
    
    {station.congestion.estimatedWaitMinutes > 0 && (
      <div className="wait-estimate">
        ⏱️ Est. wait: {station.congestion.estimatedWaitMinutes} minutes
      </div>
    )}
    
    {station.congestion.predicted && (
      <div className="prediction">
        📊 {station.congestion.predicted.pattern}
      </div>
    )}
    
    <button onClick={() => checkinToStation(station.id)}>
      📍 I'm Here (Help others!)
    </button>
  </div>
)}
```

---

## 📋 Implementation Checklist

### Phase 1: Core Detection (Week 1)
- [ ] Create database tables
- [ ] Implement `CongestionDetector` class
- [ ] Create check-in/check-out API endpoints
- [ ] Build background job to update all stations every 30s
- [ ] Add congestion data to `/api/stations` responses

### Phase 2: Trip Integration (Week 1)
- [ ] Integrate with trip recorder pause detection
- [ ] Auto check-in on pause at station
- [ ] Auto check-out on trip resume
- [ ] Test accuracy of automatic detection

### Phase 3: Frontend (Week 2)
- [ ] Add congestion badges to map markers
- [ ] Update station popups with queue info
- [ ] Create "I'm Here" check-in button
- [ ] Add congestion filter to station list
- [ ] Show historical patterns in popup

### Phase 4: Analytics & Patterns (Week 2)
- [ ] Build pattern aggregation job (daily)
- [ ] Create prediction algorithm
- [ ] Add admin analytics dashboard
- [ ] Implement quality scoring

### Phase 5: Optimization
- [ ] Add Redis caching for real-time data
- [ ] Optimize database queries
- [ ] Add WebSocket for live updates (optional)
- [ ] Performance testing

---

## 🧪 Testing Strategy

### Manual Testing
1. Check-in at station via mobile
2. Verify marker changes color
3. Wait 5 minutes, check dwell time updates
4. Check-out, verify status updates
5. Have 3 friends check-in simultaneously, verify "busy" status

### Automated Tests
```javascript
describe('Congestion Detection', () => {
  test('detects empty station correctly', async () => {
    const result = await detector.detectCongestion(stationId);
    expect(result.level).toBe('empty');
    expect(result.metrics.activeUsers).toBe(0);
  });
  
  test('detects moderate congestion with 3 users', async () => {
    // Create 3 check-ins
    await checkin(stationId, 'user1');
    await checkin(stationId, 'user2');
    await checkin(stationId, 'user3');
    
    const result = await detector.detectCongestion(stationId);
    expect(result.level).toBe('moderate');
    expect(result.metrics.activeUsers).toBe(3);
  });
});
```

---

## 🚀 Rollout Plan

### Week 1: Beta Testing
- Deploy to 5 high-traffic stations
- Recruit 20 beta testers
- Monitor accuracy and performance

### Week 2: Phased Rollout
- Enable for all stations
- Announce feature to users
- Monitor engagement metrics

### Week 3: Optimization
- Analyze patterns
- Tune thresholds
- Add predictive features

**Estimated Total Time**: 2 weeks  
**Impact**: HIGH - Unique differentiator  
**Complexity**: MEDIUM - Leverages existing infrastructure
