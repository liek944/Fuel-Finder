# Phase 6 - API Documentation

## Trip Analytics API Reference

Complete API documentation for Phase 6 Trip Summary & Analytics.

**Version**: 6.0.0  
**Date**: October 12, 2025

---

## Table of Contents

1. [Analytics Functions](#analytics-functions)
2. [Component API](#component-api)
3. [Type Definitions](#type-definitions)
4. [Configuration Interfaces](#configuration-interfaces)
5. [Usage Examples](#usage-examples)

---

## Analytics Functions

### Distance Calculation

#### `haversineDistance(lat1, lon1, lat2, lon2): number`

Calculate distance between two GPS points using the Haversine formula.

**Parameters:**
- `lat1: number` - Latitude of first point (degrees)
- `lon1: number` - Longitude of first point (degrees)
- `lat2: number` - Latitude of second point (degrees)
- `lon2: number` - Longitude of second point (degrees)

**Returns:** `number` - Distance in kilometers

**Example:**
```typescript
const distance = haversineDistance(13.0827, 121.0, 13.0830, 121.002);
console.log(distance); // 0.223 km
```

**Algorithm:**
```
R = 6371 km (Earth's radius)
dLat = lat2 - lat1 (in radians)
dLon = lon2 - lon1 (in radians)
a = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLon/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c
```

---

#### `calculateTotalDistance(coordinates: GPSPoint[]): number`

Calculate total distance for an array of GPS coordinates.

**Parameters:**
- `coordinates: GPSPoint[]` - Array of GPS points

**Returns:** `number` - Total distance in kilometers

**Example:**
```typescript
const trip = await tripSessionManager.getTrip('trip-id');
const distance = calculateTotalDistance(trip.coordinates);
console.log(`Total distance: ${distance.toFixed(2)} km`);
```

**Performance:**
- 100 points: < 1ms
- 1000 points: < 5ms
- 10000 points: < 50ms

---

#### `formatDistance(kilometers: number): string`

Format distance with appropriate unit.

**Parameters:**
- `kilometers: number` - Distance in kilometers

**Returns:** `string` - Formatted distance string

**Example:**
```typescript
formatDistance(0.5);   // "500 m"
formatDistance(1.234); // "1.23 km"
formatDistance(15.7);  // "15.7 km"
```

**Rules:**
- < 1 km: Display in meters (rounded)
- < 10 km: Display with 2 decimal places
- ≥ 10 km: Display with 1 decimal place

---

### Duration Analysis

#### `calculateDuration(coordinates: GPSPoint[]): number`

Calculate trip duration from GPS timestamps.

**Parameters:**
- `coordinates: GPSPoint[]` - Array of GPS points with timestamps

**Returns:** `number` - Duration in milliseconds

**Example:**
```typescript
const duration = calculateDuration(trip.coordinates);
console.log(`Duration: ${duration / 1000 / 60} minutes`);
```

---

#### `formatDuration(milliseconds: number): string`

Format duration as HH:MM:SS or MM:SS.

**Parameters:**
- `milliseconds: number` - Duration in milliseconds

**Returns:** `string` - Formatted duration string

**Example:**
```typescript
formatDuration(330000);    // "5:30"
formatDuration(3665000);   // "1:01:05"
formatDuration(9005000);   // "2:30:05"
```

**Format Rules:**
- < 1 hour: "MM:SS"
- ≥ 1 hour: "H:MM:SS"
- Zero-padded minutes and seconds

---

#### `calculateMovingTime(duration: number, stops: StopSegment[]): number`

Calculate moving time excluding stops.

**Parameters:**
- `duration: number` - Total duration in milliseconds
- `stops: StopSegment[]` - Array of detected stops

**Returns:** `number` - Moving time in milliseconds

**Example:**
```typescript
const stops = detectStops(coordinates);
const movingTime = calculateMovingTime(duration, stops);
console.log(`Moving: ${formatDuration(movingTime)}`);
```

---

### Speed Metrics

#### `calculateAverageSpeed(distance: number, duration: number): number`

Calculate average speed.

**Parameters:**
- `distance: number` - Distance in kilometers
- `duration: number` - Duration in milliseconds

**Returns:** `number` - Average speed in km/h

**Example:**
```typescript
const avgSpeed = calculateAverageSpeed(10.5, 1800000); // 10.5 km in 30 min
console.log(avgSpeed); // 21.0 km/h
```

**Formula:**
```
hours = duration / (1000 × 60 × 60)
speed = distance / hours
```

---

#### `calculateMaxSpeed(coordinates: GPSPoint[]): number`

Calculate maximum speed from GPS points.

**Parameters:**
- `coordinates: GPSPoint[]` - Array of GPS points

**Returns:** `number` - Maximum speed in km/h

**Example:**
```typescript
const maxSpeed = calculateMaxSpeed(trip.coordinates);
console.log(`Max speed: ${maxSpeed.toFixed(1)} km/h`);
```

**Method:**
- Calculate speed between each consecutive point pair
- Return the maximum value found

---

#### `formatSpeed(kmh: number): string`

Format speed with unit.

**Parameters:**
- `kmh: number` - Speed in km/h

**Returns:** `string` - Formatted speed string

**Example:**
```typescript
formatSpeed(45.678); // "45.7 km/h"
formatSpeed(0);      // "0.0 km/h"
```

---

### Fuel Economics

#### `estimateFuelCost(distance: number, config?: FuelCostConfig): number`

Estimate fuel cost for a trip.

**Parameters:**
- `distance: number` - Distance in kilometers
- `config?: FuelCostConfig` - Fuel configuration (optional)

**Returns:** `number` - Estimated cost in currency units

**Example:**
```typescript
const cost = estimateFuelCost(50, {
  pricePerLiter: 65.0,
  fuelEfficiency: 12.0,
  currency: '₱'
});
console.log(cost); // 270.83
```

**Formula:**
```
litersUsed = distance / fuelEfficiency
cost = litersUsed × pricePerLiter
```

---

#### `formatCurrency(amount: number, currency?: string): string`

Format currency amount.

**Parameters:**
- `amount: number` - Amount to format
- `currency?: string` - Currency symbol (default: '₱')

**Returns:** `string` - Formatted currency string

**Example:**
```typescript
formatCurrency(270.83, '₱');  // "₱270.83"
formatCurrency(50.5, '$');    // "$50.50"
```

---

#### `calculateFuelEfficiency(distance: number, fuelUsed: number): number`

Calculate fuel efficiency.

**Parameters:**
- `distance: number` - Distance in kilometers
- `fuelUsed: number` - Fuel used in liters

**Returns:** `number` - Fuel efficiency in km/L

**Example:**
```typescript
const efficiency = calculateFuelEfficiency(120, 10);
console.log(efficiency); // 12.0 km/L
```

---

### Stop Detection

#### `detectStops(coordinates: GPSPoint[], config?: StopDetectionConfig): StopSegment[]`

Detect stops in a trip using speed-based algorithm.

**Parameters:**
- `coordinates: GPSPoint[]` - Array of GPS points
- `config?: StopDetectionConfig` - Detection configuration (optional)

**Returns:** `StopSegment[]` - Array of detected stops

**Example:**
```typescript
const stops = detectStops(trip.coordinates, {
  speedThreshold: 5,    // km/h
  minDuration: 30       // seconds
});

stops.forEach(stop => {
  console.log(`Stop: ${formatDuration(stop.duration)}`);
});
```

**Algorithm:**
1. Calculate speed between consecutive points
2. Mark segments below speed threshold
3. Group consecutive slow segments
4. Filter by minimum duration
5. Return stop segments

---

### Comprehensive Analytics

#### `calculateTripAnalytics(trip, fuelConfig?, stopConfig?): TripAnalytics`

Calculate all analytics metrics for a trip.

**Parameters:**
- `trip: Trip | GPSPoint[]` - Trip object or coordinates array
- `fuelConfig?: FuelCostConfig` - Fuel configuration (optional)
- `stopConfig?: StopDetectionConfig` - Stop detection config (optional)

**Returns:** `TripAnalytics` - Complete analytics object

**Example:**
```typescript
const analytics = calculateTripAnalytics(trip, {
  pricePerLiter: 65.0,
  fuelEfficiency: 12.0,
  currency: '₱'
});

console.log(analytics);
// {
//   totalDistance: 15.5,
//   duration: 1800000,
//   averageSpeed: 31.0,
//   maxSpeed: 65.0,
//   estimatedFuelCost: 84.38,
//   pointCount: 150,
//   stopCount: 3,
//   movingTime: 1620000,
//   averageMovingSpeed: 34.4,
//   startTime: 1697097600000,
//   endTime: 1697099400000,
//   formattedDuration: "30:00",
//   formattedMovingTime: "27:00"
// }
```

---

### Additional Utilities

#### `estimateCO2Emissions(distance: number, emissionFactor?: number): number`

Estimate CO₂ emissions.

**Parameters:**
- `distance: number` - Distance in kilometers
- `emissionFactor?: number` - Emission factor in kg/km (default: 0.12)

**Returns:** `number` - CO₂ emissions in kg

**Example:**
```typescript
const emissions = estimateCO2Emissions(50);
console.log(`CO₂: ${emissions.toFixed(2)} kg`); // "CO₂: 6.00 kg"
```

---

#### `calculateTripStatistics(trips: Trip[]): AggregateStats`

Calculate aggregate statistics for multiple trips.

**Parameters:**
- `trips: Trip[]` - Array of trips

**Returns:** `AggregateStats` - Aggregate statistics

**Example:**
```typescript
const stats = calculateTripStatistics(allTrips);
console.log(`Total distance: ${stats.totalDistance.toFixed(1)} km`);
console.log(`Average trip: ${stats.averageTripDistance.toFixed(1)} km`);
```

---

## Component API

### TripSummaryCard

Display trip analytics in a beautiful card.

#### Props

```typescript
interface TripSummaryCardProps {
  /** Trip data to analyze (required) */
  trip: Trip;
  
  /** Fuel cost configuration */
  fuelConfig?: FuelCostConfig;
  
  /** Stop detection configuration */
  stopConfig?: StopDetectionConfig;
  
  /** Show detailed metrics section */
  showDetailedMetrics?: boolean;
  
  /** Show fuel cost estimation */
  showFuelCost?: boolean;
  
  /** Show CO₂ emissions */
  showEmissions?: boolean;
  
  /** Allow editing fuel configuration */
  allowConfigEdit?: boolean;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Callback when fuel config changes */
  onConfigChange?: (config: FuelCostConfig) => void;
}
```

#### Usage

```typescript
<TripSummaryCard
  trip={myTrip}
  fuelConfig={{
    pricePerLiter: 65.0,
    fuelEfficiency: 12.0,
    currency: '₱'
  }}
  showDetailedMetrics={true}
  showFuelCost={true}
  allowConfigEdit={true}
  onConfigChange={(config) => {
    console.log('New config:', config);
  }}
/>
```

---

### TripReplayVisualizer (Enhanced)

Enhanced with trip summary analytics.

#### New Props (Phase 6)

```typescript
interface TripReplayVisualizerProps {
  // ... existing props ...
  
  /** Show trip summary analytics */
  showSummary?: boolean;
  
  /** Fuel cost configuration */
  fuelConfig?: FuelCostConfig;
  
  /** Stop detection configuration */
  stopConfig?: StopDetectionConfig;
  
  /** Show detailed metrics in summary */
  showDetailedMetrics?: boolean;
  
  /** Allow fuel configuration editing */
  allowConfigEdit?: boolean;
  
  /** Callback when fuel config changes */
  onFuelConfigChange?: (config: FuelCostConfig) => void;
}
```

#### Usage

```typescript
<MapContainer>
  <TileLayer />
  <TripReplayVisualizer
    trip={myTrip}
    showControls={true}
    showSummary={true}
    showDetailedMetrics={true}
    allowConfigEdit={true}
    fuelConfig={{
      pricePerLiter: 65.0,
      fuelEfficiency: 12.0,
      currency: '₱'
    }}
    onFuelConfigChange={(config) => {
      saveFuelConfig(config);
    }}
  />
</MapContainer>
```

---

## Type Definitions

### TripAnalytics

Complete analytics result object.

```typescript
interface TripAnalytics {
  /** Total distance in kilometers */
  totalDistance: number;
  
  /** Trip duration in milliseconds */
  duration: number;
  
  /** Average speed in km/h */
  averageSpeed: number;
  
  /** Maximum speed in km/h */
  maxSpeed: number;
  
  /** Estimated fuel cost */
  estimatedFuelCost: number;
  
  /** Number of GPS points */
  pointCount: number;
  
  /** Number of detected stops */
  stopCount: number;
  
  /** Moving time (excluding stops) in milliseconds */
  movingTime: number;
  
  /** Average moving speed in km/h */
  averageMovingSpeed: number;
  
  /** Start timestamp */
  startTime: number;
  
  /** End timestamp */
  endTime: number;
  
  /** Formatted duration string (HH:MM:SS) */
  formattedDuration: string;
  
  /** Formatted moving time string (HH:MM:SS) */
  formattedMovingTime: string;
}
```

---

### StopSegment

Detected stop information.

```typescript
interface StopSegment {
  /** Index of first GPS point in stop */
  startIndex: number;
  
  /** Index of last GPS point in stop */
  endIndex: number;
  
  /** Duration of stop in milliseconds */
  duration: number;
}
```

---

### AggregateStats

Statistics for multiple trips.

```typescript
interface AggregateStats {
  /** Total number of trips */
  totalTrips: number;
  
  /** Total distance across all trips (km) */
  totalDistance: number;
  
  /** Total duration across all trips (ms) */
  totalDuration: number;
  
  /** Total fuel cost across all trips */
  totalFuelCost: number;
  
  /** Average trip distance (km) */
  averageTripDistance: number;
  
  /** Average trip duration (ms) */
  averageTripDuration: number;
  
  /** Longest trip distance (km) */
  longestTrip: number;
  
  /** Shortest trip distance (km) */
  shortestTrip: number;
}
```

---

## Configuration Interfaces

### FuelCostConfig

Fuel cost calculation parameters.

```typescript
interface FuelCostConfig {
  /** Fuel price per liter */
  pricePerLiter: number;
  
  /** Vehicle fuel efficiency in km/L */
  fuelEfficiency: number;
  
  /** Currency symbol */
  currency: string;
}
```

**Default:**
```typescript
const DEFAULT_FUEL_CONFIG: FuelCostConfig = {
  pricePerLiter: 65.0,  // PHP (Philippines)
  fuelEfficiency: 12.0, // km/L (average sedan)
  currency: '₱'
};
```

---

### StopDetectionConfig

Stop detection algorithm parameters.

```typescript
interface StopDetectionConfig {
  /** Minimum speed threshold in km/h */
  speedThreshold: number;
  
  /** Minimum duration in seconds */
  minDuration: number;
}
```

**Default:**
```typescript
const DEFAULT_STOP_CONFIG: StopDetectionConfig = {
  speedThreshold: 5,  // km/h
  minDuration: 30     // seconds
};
```

---

## Usage Examples

### Example 1: Basic Analytics

```typescript
import { calculateTripAnalytics } from '../utils/tripAnalytics';

const trip = await tripSessionManager.getTrip('trip-id');
const analytics = calculateTripAnalytics(trip);

console.log(`Distance: ${analytics.totalDistance.toFixed(2)} km`);
console.log(`Duration: ${analytics.formattedDuration}`);
console.log(`Avg Speed: ${analytics.averageSpeed.toFixed(1)} km/h`);
console.log(`Fuel Cost: ₱${analytics.estimatedFuelCost.toFixed(2)}`);
```

### Example 2: Custom Fuel Configuration

```typescript
const customConfig: FuelCostConfig = {
  pricePerLiter: 70.0,
  fuelEfficiency: 15.0,
  currency: '₱'
};

const analytics = calculateTripAnalytics(trip, customConfig);
console.log(`Fuel cost: ${formatCurrency(analytics.estimatedFuelCost, '₱')}`);
```

### Example 3: Stop Detection

```typescript
const stops = detectStops(trip.coordinates, {
  speedThreshold: 3,  // More sensitive
  minDuration: 60     // Longer stops only
});

console.log(`Found ${stops.length} stops`);
stops.forEach((stop, i) => {
  console.log(`Stop ${i + 1}: ${formatDuration(stop.duration)}`);
});
```

### Example 4: Complete Integration

```typescript
import TripSummaryCard from '../components/TripSummaryCard';
import { useState } from 'react';

function MyComponent() {
  const [fuelConfig, setFuelConfig] = useState(DEFAULT_FUEL_CONFIG);
  
  return (
    <TripSummaryCard
      trip={trip}
      fuelConfig={fuelConfig}
      showDetailedMetrics={true}
      allowConfigEdit={true}
      onConfigChange={setFuelConfig}
    />
  );
}
```

### Example 5: Multiple Trip Statistics

```typescript
const allTrips = await tripSessionManager.getAllTrips();
const stats = calculateTripStatistics(allTrips);

console.log(`Total trips: ${stats.totalTrips}`);
console.log(`Total distance: ${stats.totalDistance.toFixed(1)} km`);
console.log(`Total cost: ₱${stats.totalFuelCost.toFixed(2)}`);
console.log(`Average trip: ${stats.averageTripDistance.toFixed(1)} km`);
```

---

## Error Handling

### Empty Coordinates

```typescript
const analytics = calculateTripAnalytics({ coordinates: [] });
// Returns zero values for all metrics
```

### Invalid Data

```typescript
try {
  const distance = haversineDistance(NaN, 0, 0, 0);
} catch (error) {
  console.error('Invalid coordinates:', error);
}
```

### Null Safety

```typescript
const trip = await tripSessionManager.getTrip('invalid-id');
if (!trip) {
  console.error('Trip not found');
  return;
}

const analytics = calculateTripAnalytics(trip);
```

---

## Performance Considerations

### Optimization Tips

1. **Memoize expensive calculations:**
```typescript
const analytics = useMemo(
  () => calculateTripAnalytics(trip, fuelConfig),
  [trip, fuelConfig]
);
```

2. **Lazy load detailed metrics:**
```typescript
{showDetailedMetrics && (
  <DetailedMetrics analytics={analytics} />
)}
```

3. **Debounce configuration updates:**
```typescript
const debouncedUpdate = useMemo(
  () => debounce(onConfigChange, 500),
  [onConfigChange]
);
```

4. **Cache analytics results:**
```typescript
const analyticsCache = new Map<string, TripAnalytics>();
```

---

## Browser Compatibility

All functions use standard JavaScript features compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

No polyfills required.

---

**Last Updated**: October 12, 2025  
**Version**: 6.0.0  
**Status**: Production Ready
