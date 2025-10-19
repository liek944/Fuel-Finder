# 📚 Open Dataset for Transportation Research - Implementation Guide

**Feature**: Anonymized trip data for academic and research use  
**Priority**: 🟢 DO FIRST (Low-Medium Effort, Very High Impact)  
**Status**: Planning Phase  
**Created**: October 15, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Why This Feature Matters](#why-this-feature-matters)
3. [System Architecture](#system-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Data Anonymization](#data-anonymization)
8. [Next Steps](#next-steps)

---

## 🎯 Overview

### Concept
Create an open-access, anonymized dataset of trip data from Fuel Finder users to support:
- **Academic research** in transportation, urban planning, and mobility
- **Government planning** for infrastructure development
- **Student projects** and thesis work
- **Open-source innovation** in navigation and routing

### Key Features
✅ **Free for researchers/students**  
✅ **Fully anonymized** (GDPR-compliant)  
✅ **API access** (RESTful JSON)  
✅ **CSV/GeoJSON exports** for analysis  
✅ **Citation requirement** (academic integrity)  
✅ **Opt-in participation** (user consent)  
✅ **Real-time updates** (monthly releases)

### What Makes It Unconventional
- **Giving back to academia**: Your thesis becomes a data provider for future research
- **Community-driven**: Users contribute to scientific advancement
- **Local focus**: Rare dataset for Oriental Mindoro transportation patterns
- **Open access**: No paywalls, democratized data

---

## 🌟 Why This Feature Matters

### For Your Thesis (BSCS)
1. **Academic Impact**: Creates measurable research contribution
2. **Innovation**: Demonstrates open data philosophy
3. **Credibility**: Shows real-world application beyond your project
4. **Publication potential**: Dataset can be cited in future papers

### For Oriental Mindoro
1. **First-of-its-kind**: No existing open transportation dataset
2. **Government value**: LGU can use for planning
3. **Tourism insights**: Popular routes, travel patterns
4. **Infrastructure planning**: Road usage, congestion patterns

### For Researchers
1. **Rare data source**: Provincial-level transportation data is scarce
2. **High quality**: GPS-tracked routes with timestamps
3. **Free access**: Most datasets require payment or partnerships
4. **Real-world**: Not simulated or modeled data

---

## 🏗️ System Architecture

### Current State (✅ Already Implemented)
Your app already has:
- **Trip Recorder** (`TripRecorder.tsx`) - Records GPS coordinates
- **IndexedDB Storage** - Local trip storage
- **GPS Data Structure** - Latitude, longitude, timestamp, speed, accuracy
- **Trip Metadata** - Name, start/end time, duration

### Architecture Diagram

```
FRONTEND (React)
    │
    ├─ Trip Recorder (existing) ──┐
    │                              │
    ├─ Consent Modal (NEW) ────────┤
    │                              │
    └─ Trip Submission (NEW) ──────┤
                                   │
                                   ▼ HTTPS
                            BACKEND (Node.js)
                                   │
    ├─ POST /api/research/submit-trip ──┐
    │                                     │
    ├─ Anonymization Service (NEW) ──────┤
    │                                     │
    ├─ PostgreSQL + PostGIS ──────────────┤
    │                                     │
    └─ Public API (GET endpoints) ────────┘
                                   │
                                   ▼
                          RESEARCHERS/STUDENTS
```

---

## 📊 Implementation Phases

### **Phase 1: Core Infrastructure** (1-2 weeks)
**Goal**: Basic data collection and storage

Tasks:
1. Create database schema
2. Build backend API endpoint for submission
3. Implement basic anonymization
4. Create user consent modal
5. Add opt-in toggle to settings

**Deliverable**: Users can opt-in and trips are saved anonymously

---

### **Phase 2: Data Anonymization** (1 week)
**Goal**: Ensure privacy compliance

Tasks:
1. Implement spatiotemporal cloaking
2. Hash user identifiers
3. Remove high-precision timestamps
4. Add data validation

**Deliverable**: Privacy-compliant anonymization

---

### **Phase 3: Public API** (1 week)
**Goal**: Enable researcher access

Tasks:
1. Create RESTful API with filters
2. Implement rate limiting
3. Add export endpoints (CSV, GeoJSON)
4. Write API documentation

**Deliverable**: Functional public API

---

### **Phase 4: Academic Integration** (1 week)
**Goal**: Make it officially citable

Tasks:
1. Create DOI for dataset
2. Write methodology documentation
3. Create citation format
4. Reach out to local universities

**Deliverable**: Citable research dataset

---

## 🗄️ Database Schema

### Table: `research_trips`
Anonymized trip metadata

```sql
CREATE TABLE IF NOT EXISTS research_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Anonymized identifiers
    anonymous_user_id VARCHAR(64) NOT NULL,  -- SHA256 hash
    
    -- Temporal (rounded)
    trip_date DATE NOT NULL,
    trip_hour INTEGER,  -- 0-23
    day_of_week INTEGER,  -- 0-6
    
    -- Trip metrics
    duration_seconds INTEGER NOT NULL,
    distance_meters NUMERIC(10, 2),
    avg_speed_kmh NUMERIC(5, 2),
    max_speed_kmh NUMERIC(5, 2),
    total_points INTEGER NOT NULL,
    
    -- Bounding box (general area)
    bbox_min_lat NUMERIC(9, 6),
    bbox_min_lon NUMERIC(9, 6),
    bbox_max_lat NUMERIC(9, 6),
    bbox_max_lon NUMERIC(9, 6),
    
    -- Quality
    avg_accuracy_meters NUMERIC(6, 2),
    is_high_quality BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_version VARCHAR(10) DEFAULT '1.0',
    
    CONSTRAINT valid_duration CHECK (duration_seconds > 0),
    CONSTRAINT valid_points CHECK (total_points >= 2)
);

CREATE INDEX idx_research_trips_date ON research_trips(trip_date);
CREATE INDEX idx_research_trips_hour ON research_trips(trip_hour);
CREATE INDEX idx_research_trips_dow ON research_trips(day_of_week);
```

### Table: `research_trip_points`
Anonymized GPS coordinates

```sql
CREATE TABLE IF NOT EXISTS research_trip_points (
    id BIGSERIAL PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES research_trips(id) ON DELETE CASCADE,
    
    -- Spatial (cloaked to ~100m)
    geom GEOMETRY(Point, 4326) NOT NULL,
    sequence INTEGER NOT NULL,
    
    -- Temporal (relative)
    relative_time_seconds INTEGER NOT NULL,
    
    -- Movement
    speed_kmh NUMERIC(5, 2),
    heading NUMERIC(5, 2),
    accuracy_meters NUMERIC(6, 2),
    elevation_meters NUMERIC(7, 2),
    
    CONSTRAINT valid_sequence CHECK (sequence >= 0)
);

CREATE INDEX idx_research_points_geom 
    ON research_trip_points USING GIST(geom);
CREATE INDEX idx_research_points_trip 
    ON research_trip_points(trip_id);
```

---

## 🔌 API Endpoints

### GET /api/research/trips
Query anonymized trips

**Parameters**:
- `date_from`, `date_to` - Date range
- `day_of_week` - Filter by day (0-6)
- `min_duration`, `max_duration` - Duration filters
- `bbox` - Geographic bounding box
- `limit`, `offset` - Pagination

**Response**:
```json
{
  "count": 234,
  "trips": [{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "trip_date": "2025-10-15",
    "trip_hour": 8,
    "duration_seconds": 1234,
    "distance_meters": 8543.21,
    "avg_speed_kmh": 35.2,
    "total_points": 412
  }]
}
```

### GET /api/research/trips/:id/points
Get GPS points for specific trip

### GET /api/research/export
Export data (CSV, GeoJSON, JSON)

### GET /api/research/stats
Dataset aggregate statistics

---

## 🔒 Data Anonymization

### Anonymization Techniques

**1. User ID Hashing**
```javascript
// Before: "user@email.com"
// After: "a3f5c7d9e1b2..." (SHA256)
```

**2. Temporal Cloaking**
```javascript
// Before: "2025-10-15T14:37:42.123Z"
// After: { date: "2025-10-15", hour: 14 }
```

**3. Spatial Cloaking**
```javascript
// Reduce precision to ~100m
function spatialCloaking(lat, lon) {
  const precision = 0.001;
  return {
    lat: Math.round(lat / precision) * precision,
    lon: Math.round(lon / precision) * precision
  };
}
```

**4. Home Location Detection**
- Detect frequent start/end points
- Exclude or blur likely home/work addresses

---

## 🚀 Next Steps

### Decision Points
1. **Scope**: Start with basic version or full features?
2. **Timeline**: When do you need this for thesis?
3. **Legal**: Need university ethics board approval?
4. **Partnerships**: Contact LGU or universities now?

### Implementation Order
1. **Start Small**: Phase 1 only (database + basic API)
2. **Get Feedback**: Share with thesis adviser
3. **Iterate**: Add features based on feedback
4. **Launch**: Announce when ready

### Questions for You
- Do you want to implement this now or after thesis defense?
- Should this be in Chapter 4 (Results) or Chapter 5 (Future Work)?
- Need help with any specific phase?

---

## 📚 Related Documentation

See also:
- `TRIP_RECORDER_DOCUMENTATION.md` - Existing trip recording system
- `THESIS_CONTEXT.md` - Overall thesis documentation
- `UNCONVENTIONAL_FEATURES_BRAINSTORM.md` - All feature ideas

---

**Status**: ✅ Planning Complete - Awaiting Your Decision  
**Next**: You decide scope and timeline  
**Contact**: Ready to implement when you are

