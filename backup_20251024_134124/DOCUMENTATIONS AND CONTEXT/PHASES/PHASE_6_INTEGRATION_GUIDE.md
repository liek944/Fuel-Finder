# Phase 6 - Integration Guide

## Trip Summary & Analytics Integration

Complete step-by-step guide for integrating Phase 6 Trip Summary & Analytics into your application.

**Version**: 6.0.0  
**Date**: October 12, 2025

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Basic Integration](#basic-integration)
4. [Advanced Integration](#advanced-integration)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Prerequisites

### Required Dependencies

```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "typescript": "^4.9.5",
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0"
}
```

### Required Files

Ensure these Phase 6 files exist:
- ✅ `frontend/src/utils/tripAnalytics.ts`
- ✅ `frontend/src/components/TripSummaryCard.tsx`
- ✅ `frontend/src/styles/TripSummaryCard.css`

### Previous Phases

Phase 6 builds on:
- ✅ Phase 1-2: Trip recording and management
- ✅ Phase 3: Route visualization
- ✅ Phase 4: Replay animation
- ✅ Phase 5: Playback controls

---

## Installation Steps

### Step 1: Verify File Structure

```bash
frontend/src/
├── components/
│   ├── TripSummaryCard.tsx          # ✅ New in Phase 6
│   └── TripReplayVisualizer.tsx     # ✅ Enhanced in Phase 6
├── styles/
│   ├── TripSummaryCard.css          # ✅ New in Phase 6
│   └── TripReplayVisualizer.css     # ✅ Enhanced in Phase 6
├── utils/
│   └── tripAnalytics.ts             # ✅ New in Phase 6
└── examples/
    └── TripSummaryExample.tsx       # ✅ New in Phase 6
```

### Step 2: Import Styles

Add to your main CSS or component:

```typescript
// In your main App.tsx or component file
import './styles/TripSummaryCard.css';
```

Or in your main CSS file:

```css
/* In App.css or index.css */
@import './styles/TripSummaryCard.css';
```

### Step 3: Verify TypeScript Configuration

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

---

## Basic Integration

### Scenario 1: Standalone Summary Card

Display analytics for a single trip.

```typescript
import React, { useEffect, useState } from 'react';
import TripSummaryCard from './components/TripSummaryCard';
import { tripSessionManager } from './utils/tripSessionManager';
import { Trip } from './utils/indexedDB';
import './styles/TripSummaryCard.css';

function TripSummaryPage() {
  const [trip, setTrip] = useState<Trip | null>(null);
  
  useEffect(() => {
    // Load a trip
    tripSessionManager.getTrip('trip-id').then(setTrip);
  }, []);
  
  if (!trip) return <div>Loading...</div>;
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Trip Summary</h1>
      <TripSummaryCard
        trip={trip}
        showDetailedMetrics={true}
        showFuelCost={true}
      />
    </div>
  );
}

export default TripSummaryPage;
```

### Scenario 2: With Map Replay

Integrate summary with trip replay visualization.

```typescript
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import TripReplayVisualizer from './components/TripReplayVisualizer';
import { tripSessionManager } from './utils/tripSessionManager';
import { Trip } from './utils/indexedDB';
import 'leaflet/dist/leaflet.css';
import './styles/TripReplayVisualizer.css';
import './styles/TripSummaryCard.css';

function TripReplayPage() {
  const [trip, setTrip] = useState<Trip | null>(null);
  
  useEffect(() => {
    tripSessionManager.getTrip('trip-id').then(setTrip);
  }, []);
  
  if (!trip || trip.coordinates.length < 2) {
    return <div>Loading trip...</div>;
  }
  
  // Calculate center from coordinates
  const center: [number, number] = [
    trip.coordinates[0].latitude,
    trip.coordinates[0].longitude
  ];
  
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        <TripReplayVisualizer
          trip={trip}
          showControls={true}
          showSummary={true}
          showDetailedMetrics={true}
          autoFollow={true}
        />
      </MapContainer>
    </div>
  );
}

export default TripReplayPage;
```

### Scenario 3: Trip List with Summaries

Display multiple trips with their analytics.

```typescript
import React, { useEffect, useState } from 'react';
import TripSummaryCard from './components/TripSummaryCard';
import { tripSessionManager } from './utils/tripSessionManager';
import { Trip } from './utils/indexedDB';
import './styles/TripSummaryCard.css';

function TripListPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  
  useEffect(() => {
    tripSessionManager.getAllTrips().then(setTrips);
  }, []);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Trip History</h1>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {trips.map(trip => (
          <TripSummaryCard
            key={trip.id}
            trip={trip}
            showDetailedMetrics={false}
            showFuelCost={true}
          />
        ))}
      </div>
    </div>
  );
}

export default TripListPage;
```

---

## Advanced Integration

### Scenario 1: Editable Fuel Configuration

Allow users to customize fuel settings.

```typescript
import React, { useEffect, useState } from 'react';
import TripSummaryCard from './components/TripSummaryCard';
import { FuelCostConfig, DEFAULT_FUEL_CONFIG } from './utils/tripAnalytics';
import { Trip } from './utils/indexedDB';

function TripWithConfig() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [fuelConfig, setFuelConfig] = useState<FuelCostConfig>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('fuelConfig');
    return saved ? JSON.parse(saved) : DEFAULT_FUEL_CONFIG;
  });
  
  const handleConfigChange = (newConfig: FuelCostConfig) => {
    setFuelConfig(newConfig);
    // Save to localStorage
    localStorage.setItem('fuelConfig', JSON.stringify(newConfig));
    console.log('Fuel configuration updated:', newConfig);
  };
  
  return (
    <TripSummaryCard
      trip={trip!}
      fuelConfig={fuelConfig}
      allowConfigEdit={true}
      onConfigChange={handleConfigChange}
      showDetailedMetrics={true}
    />
  );
}
```

### Scenario 2: Real-time Analytics During Recording

Show live analytics while recording a trip.

```typescript
import React, { useEffect, useState } from 'react';
import TripSummaryCard from './components/TripSummaryCard';
import { locationRecorder } from './utils/locationRecorder';
import { Trip } from './utils/indexedDB';

function LiveTripMonitor() {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  
  useEffect(() => {
    // Poll for active trip updates
    const interval = setInterval(async () => {
      const activeTrip = await tripSessionManager.getActiveTrip();
      if (activeTrip) {
        setCurrentTrip(activeTrip);
      }
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);
  
  if (!currentTrip) {
    return <div>No active trip</div>;
  }
  
  return (
    <div>
      <h2>🔴 Recording: {currentTrip.name}</h2>
      <TripSummaryCard
        trip={currentTrip}
        showDetailedMetrics={true}
        showFuelCost={true}
      />
    </div>
  );
}
```

### Scenario 3: Analytics Dashboard

Aggregate statistics across all trips.

```typescript
import React, { useEffect, useState } from 'react';
import { calculateTripStatistics } from './utils/tripAnalytics';
import { tripSessionManager } from './utils/tripSessionManager';
import { Trip } from './utils/indexedDB';

function AnalyticsDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  
  useEffect(() => {
    tripSessionManager.getAllTrips().then(setTrips);
  }, []);
  
  const stats = calculateTripStatistics(trips);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>📊 Analytics Dashboard</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard 
          title="Total Trips" 
          value={stats.totalTrips} 
          icon="🚗"
        />
        <StatCard 
          title="Total Distance" 
          value={`${stats.totalDistance.toFixed(1)} km`} 
          icon="📍"
        />
        <StatCard 
          title="Total Fuel Cost" 
          value={`₱${stats.totalFuelCost.toFixed(2)}`} 
          icon="⛽"
        />
        <StatCard 
          title="Average Trip" 
          value={`${stats.averageTripDistance.toFixed(1)} km`} 
          icon="📊"
        />
      </div>
      
      <h2>Recent Trips</h2>
      {trips.slice(0, 5).map(trip => (
        <TripSummaryCard
          key={trip.id}
          trip={trip}
          showDetailedMetrics={false}
        />
      ))}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #2196F3, #1976D2)',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '14px', opacity: 0.9 }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{value}</div>
    </div>
  );
}
```

### Scenario 4: Custom Stop Detection

Implement custom stop detection logic.

```typescript
import React, { useMemo } from 'react';
import TripSummaryCard from './components/TripSummaryCard';
import { StopDetectionConfig } from './utils/tripAnalytics';
import { Trip } from './utils/indexedDB';

function CustomStopDetection({ trip }: { trip: Trip }) {
  // Custom stop configuration for urban driving
  const urbanStopConfig: StopDetectionConfig = useMemo(() => ({
    speedThreshold: 3,  // More sensitive (3 km/h)
    minDuration: 60     // Longer stops only (60 seconds)
  }), []);
  
  // Custom stop configuration for highway driving
  const highwayStopConfig: StopDetectionConfig = useMemo(() => ({
    speedThreshold: 10, // Less sensitive (10 km/h)
    minDuration: 120    // Much longer stops (2 minutes)
  }), []);
  
  // Choose config based on average speed
  const stopConfig = trip.coordinates.length > 0 
    ? (calculateAverageSpeed(trip) > 50 ? highwayStopConfig : urbanStopConfig)
    : urbanStopConfig;
  
  return (
    <TripSummaryCard
      trip={trip}
      stopConfig={stopConfig}
      showDetailedMetrics={true}
    />
  );
}
```

### Scenario 5: Export Analytics

Export trip analytics to JSON or CSV.

```typescript
import { calculateTripAnalytics, formatDistance, formatSpeed, formatCurrency } from './utils/tripAnalytics';
import { Trip } from './utils/indexedDB';

function exportTripAnalytics(trip: Trip, format: 'json' | 'csv' = 'json') {
  const analytics = calculateTripAnalytics(trip);
  
  if (format === 'json') {
    const data = {
      tripName: trip.name,
      distance: formatDistance(analytics.totalDistance),
      duration: analytics.formattedDuration,
      averageSpeed: formatSpeed(analytics.averageSpeed),
      maxSpeed: formatSpeed(analytics.maxSpeed),
      fuelCost: formatCurrency(analytics.estimatedFuelCost, '₱'),
      stops: analytics.stopCount,
      gpsPoints: analytics.pointCount,
      startTime: new Date(analytics.startTime).toISOString(),
      endTime: new Date(analytics.endTime).toISOString()
    };
    
    const json = JSON.stringify(data, null, 2);
    downloadFile(`${trip.name}-analytics.json`, json, 'application/json');
  } else if (format === 'csv') {
    const csv = [
      'Trip Name,Distance (km),Duration,Avg Speed (km/h),Max Speed (km/h),Fuel Cost,Stops,GPS Points',
      `${trip.name},${analytics.totalDistance.toFixed(2)},${analytics.formattedDuration},${analytics.averageSpeed.toFixed(1)},${analytics.maxSpeed.toFixed(1)},${analytics.estimatedFuelCost.toFixed(2)},${analytics.stopCount},${analytics.pointCount}`
    ].join('\n');
    
    downloadFile(`${trip.name}-analytics.csv`, csv, 'text/csv');
  }
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Configuration

### Global Fuel Configuration

Set up application-wide fuel configuration.

```typescript
// src/config/fuelConfig.ts
import { FuelCostConfig } from '../utils/tripAnalytics';

export const APP_FUEL_CONFIG: FuelCostConfig = {
  pricePerLiter: 65.0,  // Update based on current prices
  fuelEfficiency: 12.0, // Update based on vehicle type
  currency: '₱'
};

// Load from environment variables
export const loadFuelConfigFromEnv = (): FuelCostConfig => ({
  pricePerLiter: parseFloat(process.env.REACT_APP_FUEL_PRICE || '65.0'),
  fuelEfficiency: parseFloat(process.env.REACT_APP_FUEL_EFFICIENCY || '12.0'),
  currency: process.env.REACT_APP_CURRENCY || '₱'
});
```

### User Preferences

Store user preferences for analytics display.

```typescript
// src/utils/userPreferences.ts
interface AnalyticsPreferences {
  showDetailedMetrics: boolean;
  showFuelCost: boolean;
  showEmissions: boolean;
  allowConfigEdit: boolean;
  fuelConfig: FuelCostConfig;
}

export const savePreferences = (prefs: AnalyticsPreferences) => {
  localStorage.setItem('analyticsPreferences', JSON.stringify(prefs));
};

export const loadPreferences = (): AnalyticsPreferences | null => {
  const saved = localStorage.getItem('analyticsPreferences');
  return saved ? JSON.parse(saved) : null;
};
```

---

## Testing

### Unit Tests

Test analytics functions.

```typescript
// src/utils/tripAnalytics.test.ts
import { haversineDistance, calculateTotalDistance, formatDistance } from './tripAnalytics';

describe('tripAnalytics', () => {
  test('haversineDistance calculates correctly', () => {
    const dist = haversineDistance(13.0827, 121.0, 13.0830, 121.002);
    expect(dist).toBeCloseTo(0.223, 2);
  });
  
  test('formatDistance handles small distances', () => {
    expect(formatDistance(0.5)).toBe('500 m');
  });
  
  test('formatDistance handles large distances', () => {
    expect(formatDistance(15.7)).toBe('15.7 km');
  });
});
```

### Component Tests

Test TripSummaryCard rendering.

```typescript
// src/components/TripSummaryCard.test.tsx
import { render, screen } from '@testing-library/react';
import TripSummaryCard from './TripSummaryCard';
import { Trip } from '../utils/indexedDB';

const mockTrip: Trip = {
  id: 'test-1',
  name: 'Test Trip',
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  isActive: false,
  coordinates: [
    { latitude: 13.0827, longitude: 121.0, timestamp: Date.now() - 3600000, accuracy: 10, altitude: null, heading: null, speed: null },
    { latitude: 13.0830, longitude: 121.002, timestamp: Date.now(), accuracy: 10, altitude: null, heading: 45, speed: 30 }
  ]
};

test('renders trip summary card', () => {
  render(<TripSummaryCard trip={mockTrip} />);
  expect(screen.getByText('Trip Summary')).toBeInTheDocument();
  expect(screen.getByText('Test Trip')).toBeInTheDocument();
});
```

### Integration Tests

Test complete workflow.

```typescript
// src/integration/tripAnalytics.integration.test.ts
import { tripSessionManager } from '../utils/tripSessionManager';
import { calculateTripAnalytics } from '../utils/tripAnalytics';

test('complete analytics workflow', async () => {
  // Create trip
  const trip = await tripSessionManager.createTrip('Integration Test');
  
  // Add GPS points
  await tripSessionManager.addGPSPoint(trip.id, {
    latitude: 13.0827,
    longitude: 121.0,
    timestamp: Date.now(),
    accuracy: 10,
    altitude: null,
    heading: null,
    speed: null
  });
  
  // Calculate analytics
  const analytics = calculateTripAnalytics(trip);
  
  expect(analytics.totalDistance).toBeGreaterThanOrEqual(0);
  expect(analytics.pointCount).toBeGreaterThan(0);
  
  // Cleanup
  await tripSessionManager.deleteTrip(trip.id);
});
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "Cannot find module './utils/tripAnalytics'"

**Solution:**
```bash
# Verify file exists
ls frontend/src/utils/tripAnalytics.ts

# If missing, copy from Phase 6 files
cp PHASE_6_FILES/tripAnalytics.ts frontend/src/utils/
```

#### Issue 2: CSS styles not applied

**Solution:**
```typescript
// Ensure CSS is imported
import '../styles/TripSummaryCard.css';

// Or in App.tsx
import './styles/TripSummaryCard.css';
```

#### Issue 3: Analytics show NaN or Infinity

**Solution:**
```typescript
// Check for valid coordinates
if (!trip.coordinates || trip.coordinates.length < 2) {
  console.error('Invalid trip data');
  return;
}

// Check for zero duration
if (analytics.duration === 0) {
  console.warn('Trip has zero duration');
}
```

#### Issue 4: Performance issues with large trips

**Solution:**
```typescript
// Use memoization
const analytics = useMemo(
  () => calculateTripAnalytics(trip, fuelConfig),
  [trip.id, fuelConfig] // Only recalculate when trip ID or config changes
);
```

---

## Best Practices

### 1. Memoize Expensive Calculations

```typescript
const analytics = useMemo(
  () => calculateTripAnalytics(trip, fuelConfig),
  [trip, fuelConfig]
);
```

### 2. Handle Loading States

```typescript
if (!trip) {
  return <div>Loading trip data...</div>;
}

if (trip.coordinates.length < 2) {
  return <div>Insufficient GPS data</div>;
}
```

### 3. Persist User Configuration

```typescript
useEffect(() => {
  localStorage.setItem('fuelConfig', JSON.stringify(fuelConfig));
}, [fuelConfig]);
```

### 4. Validate Input Data

```typescript
const isValidTrip = (trip: Trip): boolean => {
  return trip.coordinates.length >= 2 &&
         trip.startTime > 0 &&
         (trip.endTime === null || trip.endTime > trip.startTime);
};
```

### 5. Provide Fallback Values

```typescript
const analytics = calculateTripAnalytics(trip, fuelConfig) || {
  totalDistance: 0,
  duration: 0,
  // ... other defaults
};
```

---

## Next Steps

After successful integration:

1. ✅ Test with real trip data
2. ✅ Customize fuel configuration for your region
3. ✅ Adjust stop detection thresholds
4. ✅ Implement user preferences
5. ✅ Add export functionality
6. ✅ Deploy to production

---

**Last Updated**: October 12, 2025  
**Version**: 6.0.0  
**Status**: Production Ready
