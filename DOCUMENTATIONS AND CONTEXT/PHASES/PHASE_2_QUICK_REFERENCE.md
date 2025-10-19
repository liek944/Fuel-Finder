# Phase 2 - Trip Session Manager Quick Reference

## Import

```typescript
import { tripSessionManager } from './utils/tripSessionManager';
```

---

## Common Operations

### Create Trip
```typescript
const trip = await tripSessionManager.createTrip('My Trip');
```

### Get All Trips
```typescript
const trips = await tripSessionManager.getAllTrips();
```

### Get Trip Metadata (Lightweight)
```typescript
const metadata = await tripSessionManager.getAllTripMetadata();
// Returns: { id, name, startTime, endTime, duration, pointCount, distance, averageSpeed }
```

### Rename Trip
```typescript
await tripSessionManager.renameTrip(tripId, 'New Name');
```

### Delete Trip
```typescript
await tripSessionManager.deleteTrip(tripId);
```

---

## Advanced Queries

### Filter Trips
```typescript
// Get completed trips from last 7 days
const recentTrips = await tripSessionManager.getFilteredTrips({
  isActive: false,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
});

// Get trips with at least 100 points
const longTrips = await tripSessionManager.getFilteredTrips({
  minPoints: 100
});

// Search by name
const results = await tripSessionManager.getFilteredTrips({
  searchTerm: 'manila'
});
```

### Sort Trips
```typescript
// Sort by duration (longest first)
const trips = await tripSessionManager.getSortedTrips({
  field: 'duration',
  order: 'desc'
});

// Sort by name (A-Z)
const trips = await tripSessionManager.getSortedTrips({
  field: 'name',
  order: 'asc'
});
```

### Filter + Sort
```typescript
const trips = await tripSessionManager.getTripsWithOptions(
  { isActive: false, minPoints: 50 },
  { field: 'startTime', order: 'desc' }
);
```

---

## Batch Operations

### Delete Multiple Trips
```typescript
const result = await tripSessionManager.deleteMultipleTrips([
  'trip_1', 'trip_2', 'trip_3'
]);
console.log(`Deleted: ${result.success}, Failed: ${result.failed}`);
```

### Batch Rename
```typescript
const result = await tripSessionManager.batchRenameTrips([
  { id: 'trip_1', name: 'Morning Drive' },
  { id: 'trip_2', name: 'Evening Return' }
]);
```

### Delete Old Trips
```typescript
// Delete trips older than 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const result = await tripSessionManager.deleteOldTrips(thirtyDaysAgo);
```

### Delete All Completed Trips
```typescript
const result = await tripSessionManager.deleteCompletedTrips();
```

---

## Utilities

### Storage Statistics
```typescript
const stats = await tripSessionManager.getStorageStats();
// Returns: { totalTrips, activeTrips, completedTrips, totalPoints, estimatedSizeKB }
```

### Validate Trip
```typescript
const validation = await tripSessionManager.validateTrip(tripId);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

### Check if Trip Exists
```typescript
const exists = await tripSessionManager.tripExists(tripId);
```

---

## Filter Options

```typescript
interface TripFilter {
  isActive?: boolean;           // true = recording, false = completed
  startDate?: Date;             // Trips started after this date
  endDate?: Date;               // Trips ended before this date
  minDuration?: number;         // Minimum duration (ms)
  maxDuration?: number;         // Maximum duration (ms)
  minPoints?: number;           // Minimum GPS points
  searchTerm?: string;          // Search in trip name
}
```

---

## Sort Options

**Fields**: `startTime`, `endTime`, `duration`, `pointCount`, `name`  
**Order**: `asc`, `desc`

```typescript
{ field: 'duration', order: 'desc' }
```

---

## Trip Metadata Structure

```typescript
interface TripMetadata {
  id: string;
  name: string;
  startTime: number;            // Timestamp (ms)
  endTime: number | null;
  duration: number | null;      // Milliseconds
  pointCount: number;
  isActive: boolean;
  distance?: number;            // Kilometers (Haversine)
  averageSpeed?: number;        // km/h
}
```

---

## Example: Trip List Component

```typescript
import React, { useEffect, useState } from 'react';
import { tripSessionManager, TripMetadata } from '../utils/tripSessionManager';

const TripList: React.FC = () => {
  const [trips, setTrips] = useState<TripMetadata[]>([]);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    const metadata = await tripSessionManager.getAllTripMetadata();
    setTrips(metadata);
  };

  const handleDelete = async (id: string) => {
    await tripSessionManager.deleteTrip(id);
    await loadTrips();
  };

  return (
    <div>
      {trips.map(trip => (
        <div key={trip.id}>
          <h3>{trip.name}</h3>
          <p>Distance: {trip.distance?.toFixed(2)} km</p>
          <p>Duration: {(trip.duration! / 60000).toFixed(0)} min</p>
          <button onClick={() => handleDelete(trip.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

---

## Performance Tips

✅ **Use metadata for lists** (avoids loading full coordinates)
✅ **Filter before sorting** (reduces data to sort)
✅ **Use batch operations** (more efficient than loops)
✅ **Monitor storage** with `getStorageStats()`

---

**Version**: 2.0.0  
**Last Updated**: 2025-10-12
