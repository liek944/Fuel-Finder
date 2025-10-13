# Trip Session Manager - Phase 2 Documentation

## Overview

The **Trip Session Manager** is a robust, high-level API for managing trip sessions in the Fuel Finder web app. It provides clean async functions for CRUD operations, filtering, sorting, and batch operations with reliable IndexedDB persistence.

**Status**: ✅ Phase 2 Complete  
**Version**: 1.0.0  
**Date**: 2025-10-12

---

## Features

### ✅ Core Functionality

- **CRUD Operations**: Create, Read, Update, Delete trips
- **Batch Operations**: Process multiple trips efficiently
- **Filtering**: Query trips by various criteria
- **Sorting**: Order trips by different fields
- **Metadata Extraction**: Lightweight trip info without full coordinates
- **Distance Calculation**: Haversine formula for accurate distances
- **Speed Calculation**: Average speed computation
- **Data Validation**: Integrity checks for trip data
- **Storage Statistics**: Monitor IndexedDB usage

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Trip Session Manager (Singleton)              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  CRUD Operations                                  │ │
│  │  - createTrip()                                   │ │
│  │  - getTrip(), getAllTrips()                       │ │
│  │  - renameTrip()                                   │ │
│  │  - deleteTrip()                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Advanced Queries                                 │ │
│  │  - getFilteredTrips()                             │ │
│  │  - getSortedTrips()                               │ │
│  │  - getTripMetadata()                              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Batch Operations                                 │ │
│  │  - deleteMultipleTrips()                          │ │
│  │  - batchRenameTrips()                             │ │
│  │  - deleteOldTrips()                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Utilities                                        │ │
│  │  - calculateDistance()                            │ │
│  │  - calculateAverageSpeed()                        │ │
│  │  - validateTrip()                                 │ │
│  │  - getStorageStats()                              │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              IndexedDB Manager (tripDB)                 │
│  - Low-level database operations                       │
│  - Transaction management                              │
│  - Error handling                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Installation & Setup

The Trip Session Manager is already integrated into your project. Simply import it:

```typescript
import { tripSessionManager } from './utils/tripSessionManager';
```

---

## API Reference

### Create Operations

#### `createTrip(name?: string): Promise<Trip>`

Create a new trip session.

```typescript
// With custom name
const trip = await tripSessionManager.createTrip('Morning Commute');

// Auto-generated name
const trip = await tripSessionManager.createTrip();
// Name: "Trip 10/12/2025, 7:30:00 AM"
```

#### `createMultipleTrips(names: string[]): Promise<Trip[]>`

Create multiple trips at once.

```typescript
const trips = await tripSessionManager.createMultipleTrips([
  'Trip to Manila',
  'Return Journey',
  'Weekend Drive'
]);

console.log(`Created ${trips.length} trips`);
```

---

### Read Operations

#### `getTrip(id: string): Promise<Trip | null>`

Get a specific trip by ID.

```typescript
const trip = await tripSessionManager.getTrip('trip_1234567890_abc123');

if (trip) {
  console.log(`Trip: ${trip.name}`);
  console.log(`Points: ${trip.coordinates.length}`);
}
```

#### `getAllTrips(): Promise<Trip[]>`

Get all trips (sorted by start time, newest first).

```typescript
const trips = await tripSessionManager.getAllTrips();
console.log(`Total trips: ${trips.length}`);
```

#### `getActiveTrip(): Promise<Trip | null>`

Get the currently active trip (if any).

```typescript
const activeTrip = await tripSessionManager.getActiveTrip();

if (activeTrip) {
  console.log('Recording in progress:', activeTrip.name);
} else {
  console.log('No active recording');
}
```

#### `getFilteredTrips(filter: TripFilter): Promise<Trip[]>`

Get trips matching specific criteria.

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
const searchResults = await tripSessionManager.getFilteredTrips({
  searchTerm: 'manila'
});

// Complex filter
const filtered = await tripSessionManager.getFilteredTrips({
  isActive: false,
  minDuration: 30 * 60 * 1000, // 30 minutes
  maxDuration: 2 * 60 * 60 * 1000, // 2 hours
  minPoints: 50
});
```

**Filter Options:**
```typescript
interface TripFilter {
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number; // milliseconds
  maxDuration?: number; // milliseconds
  minPoints?: number;
  searchTerm?: string; // Search in trip name
}
```

#### `getSortedTrips(sortOptions: TripSortOptions): Promise<Trip[]>`

Get all trips sorted by a specific field.

```typescript
// Sort by start time (newest first)
const trips = await tripSessionManager.getSortedTrips({
  field: 'startTime',
  order: 'desc'
});

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

**Sort Fields:**
- `startTime` - Trip start timestamp
- `endTime` - Trip end timestamp
- `duration` - Trip duration (endTime - startTime)
- `pointCount` - Number of GPS points
- `name` - Trip name (alphabetical)

#### `getTripsWithOptions(filter?, sortOptions?): Promise<Trip[]>`

Combine filtering and sorting.

```typescript
const trips = await tripSessionManager.getTripsWithOptions(
  { isActive: false, minPoints: 50 },
  { field: 'duration', order: 'desc' }
);
```

#### `getTripMetadata(id: string): Promise<TripMetadata | null>`

Get lightweight trip info without full coordinates (efficient for lists).

```typescript
const metadata = await tripSessionManager.getTripMetadata(tripId);

if (metadata) {
  console.log(`Name: ${metadata.name}`);
  console.log(`Duration: ${metadata.duration}ms`);
  console.log(`Points: ${metadata.pointCount}`);
  console.log(`Distance: ${metadata.distance?.toFixed(2)} km`);
  console.log(`Avg Speed: ${metadata.averageSpeed?.toFixed(1)} km/h`);
}
```

**Metadata Structure:**
```typescript
interface TripMetadata {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
  duration: number | null; // milliseconds
  pointCount: number;
  isActive: boolean;
  distance?: number; // kilometers (Haversine)
  averageSpeed?: number; // km/h
}
```

#### `getAllTripMetadata(): Promise<TripMetadata[]>`

Get metadata for all trips (efficient for trip lists).

```typescript
const allMetadata = await tripSessionManager.getAllTripMetadata();

allMetadata.forEach(meta => {
  console.log(`${meta.name}: ${meta.distance?.toFixed(2)} km`);
});
```

---

### Update Operations

#### `renameTrip(id: string, newName: string): Promise<void>`

Rename a trip.

```typescript
await tripSessionManager.renameTrip(tripId, 'Updated Trip Name');
```

#### `batchRenameTrips(updates: Array<{id, name}>): Promise<BatchOperationResult>`

Rename multiple trips at once.

```typescript
const result = await tripSessionManager.batchRenameTrips([
  { id: 'trip_1', name: 'Morning Drive' },
  { id: 'trip_2', name: 'Evening Return' },
  { id: 'trip_3', name: 'Weekend Trip' }
]);

console.log(`Success: ${result.success}, Failed: ${result.failed}`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

#### `addGPSPoint(tripId: string, point: GPSPoint): Promise<void>`

Add a GPS point to a trip (used by location recorder).

```typescript
await tripSessionManager.addGPSPoint(tripId, {
  latitude: 13.1234,
  longitude: 121.5678,
  timestamp: Date.now(),
  accuracy: 15.5,
  speed: 25.0
});
```

#### `endTrip(id: string): Promise<void>`

Mark a trip as completed.

```typescript
await tripSessionManager.endTrip(tripId);
```

---

### Delete Operations

#### `deleteTrip(id: string): Promise<void>`

Delete a single trip.

```typescript
await tripSessionManager.deleteTrip(tripId);
```

#### `deleteMultipleTrips(ids: string[]): Promise<BatchOperationResult>`

Delete multiple trips at once.

```typescript
const result = await tripSessionManager.deleteMultipleTrips([
  'trip_1',
  'trip_2',
  'trip_3'
]);

console.log(`Deleted: ${result.success}, Failed: ${result.failed}`);
```

#### `deleteCompletedTrips(): Promise<BatchOperationResult>`

Delete all completed (non-active) trips.

```typescript
const result = await tripSessionManager.deleteCompletedTrips();
console.log(`Deleted ${result.success} completed trips`);
```

#### `deleteOldTrips(olderThan: Date): Promise<BatchOperationResult>`

Delete trips older than a specific date.

```typescript
// Delete trips older than 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const result = await tripSessionManager.deleteOldTrips(thirtyDaysAgo);

console.log(`Deleted ${result.success} old trips`);
```

#### `clearAllTrips(): Promise<void>`

⚠️ **DANGER**: Delete ALL trips (use with caution!).

```typescript
// Clear all trip data
await tripSessionManager.clearAllTrips();
```

---

### Utility Methods

#### `getStorageStats(): Promise<StorageStats>`

Get storage statistics.

```typescript
const stats = await tripSessionManager.getStorageStats();

console.log(`Total trips: ${stats.totalTrips}`);
console.log(`Active: ${stats.activeTrips}`);
console.log(`Completed: ${stats.completedTrips}`);
console.log(`Total points: ${stats.totalPoints}`);
console.log(`Estimated size: ${stats.estimatedSizeKB} KB`);
```

#### `tripExists(id: string): Promise<boolean>`

Check if a trip exists.

```typescript
const exists = await tripSessionManager.tripExists(tripId);
if (!exists) {
  console.log('Trip not found');
}
```

#### `validateTrip(id: string): Promise<ValidationResult>`

Validate trip data integrity.

```typescript
const validation = await tripSessionManager.validateTrip(tripId);

if (validation.valid) {
  console.log('Trip data is valid');
} else {
  console.error('Validation errors:', validation.errors);
}
```

---

## Usage Examples

### Example 1: Trip List Component

```typescript
import React, { useEffect, useState } from 'react';
import { tripSessionManager, TripMetadata } from '../utils/tripSessionManager';

const TripList: React.FC = () => {
  const [trips, setTrips] = useState<TripMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const metadata = await tripSessionManager.getAllTripMetadata();
      setTrips(metadata);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tripSessionManager.deleteTrip(id);
      await loadTrips(); // Refresh list
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    try {
      await tripSessionManager.renameTrip(id, newName);
      await loadTrips(); // Refresh list
    } catch (error) {
      console.error('Failed to rename trip:', error);
    }
  };

  if (loading) return <div>Loading trips...</div>;

  return (
    <div>
      <h2>My Trips ({trips.length})</h2>
      {trips.map(trip => (
        <div key={trip.id}>
          <h3>{trip.name}</h3>
          <p>Distance: {trip.distance?.toFixed(2)} km</p>
          <p>Duration: {(trip.duration! / 60000).toFixed(0)} min</p>
          <p>Avg Speed: {trip.averageSpeed?.toFixed(1)} km/h</p>
          <button onClick={() => handleDelete(trip.id)}>Delete</button>
          <button onClick={() => {
            const name = prompt('New name:', trip.name);
            if (name) handleRename(trip.id, name);
          }}>Rename</button>
        </div>
      ))}
    </div>
  );
};
```

### Example 2: Filtered Trip Search

```typescript
const SearchTrips: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<TripMetadata[]>([]);

  const handleSearch = async () => {
    try {
      const trips = await tripSessionManager.getTripsWithOptions(
        { 
          searchTerm,
          isActive: false 
        },
        { 
          field: 'startTime', 
          order: 'desc' 
        }
      );
      
      const metadata = trips.map(trip => 
        tripSessionManager.extractMetadata(trip)
      );
      setResults(metadata);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div>
      <input 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search trips..."
      />
      <button onClick={handleSearch}>Search</button>
      
      <div>
        {results.map(trip => (
          <div key={trip.id}>{trip.name}</div>
        ))}
      </div>
    </div>
  );
};
```

### Example 3: Batch Delete Old Trips

```typescript
const CleanupOldTrips: React.FC = () => {
  const handleCleanup = async () => {
    const confirmed = window.confirm(
      'Delete all trips older than 30 days?'
    );
    
    if (!confirmed) return;

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await tripSessionManager.deleteOldTrips(thirtyDaysAgo);
      
      alert(`Deleted ${result.success} trips. Failed: ${result.failed}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  return (
    <button onClick={handleCleanup}>
      Clean Up Old Trips
    </button>
  );
};
```

### Example 4: Storage Monitor

```typescript
const StorageMonitor: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const stats = await tripSessionManager.getStorageStats();
    setStats(stats);
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h3>Storage Statistics</h3>
      <p>Total Trips: {stats.totalTrips}</p>
      <p>Active: {stats.activeTrips}</p>
      <p>Completed: {stats.completedTrips}</p>
      <p>Total Points: {stats.totalPoints}</p>
      <p>Storage Used: {stats.estimatedSizeKB} KB</p>
      
      {stats.estimatedSizeKB > 10000 && (
        <p style={{ color: 'red' }}>
          Warning: High storage usage. Consider deleting old trips.
        </p>
      )}
    </div>
  );
};
```

### Example 5: Trip Analytics Dashboard

```typescript
const TripAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const metadata = await tripSessionManager.getAllTripMetadata();
    
    const totalDistance = metadata.reduce(
      (sum, trip) => sum + (trip.distance || 0), 
      0
    );
    
    const avgSpeed = metadata
      .filter(t => t.averageSpeed)
      .reduce((sum, t) => sum + t.averageSpeed!, 0) / metadata.length;
    
    const totalDuration = metadata.reduce(
      (sum, trip) => sum + (trip.duration || 0),
      0
    );

    setAnalytics({
      totalTrips: metadata.length,
      totalDistance: totalDistance.toFixed(2),
      avgSpeed: avgSpeed.toFixed(1),
      totalHours: (totalDuration / (1000 * 60 * 60)).toFixed(1)
    });
  };

  if (!analytics) return <div>Loading...</div>;

  return (
    <div>
      <h2>Trip Analytics</h2>
      <p>Total Trips: {analytics.totalTrips}</p>
      <p>Total Distance: {analytics.totalDistance} km</p>
      <p>Average Speed: {analytics.avgSpeed} km/h</p>
      <p>Total Time: {analytics.totalHours} hours</p>
    </div>
  );
};
```

---

## Data Structures

### Trip
```typescript
interface Trip {
  id: string;                  // Unique identifier
  name: string;                // Trip name
  startTime: number;           // Start timestamp (ms)
  endTime: number | null;      // End timestamp (ms) or null if active
  coordinates: GPSPoint[];     // Array of GPS points
  isActive: boolean;           // Recording status
}
```

### GPSPoint
```typescript
interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;           // meters
  altitude?: number | null;    // meters
  altitudeAccuracy?: number | null;
  heading?: number | null;     // degrees
  speed?: number | null;       // m/s
}
```

### TripMetadata
```typescript
interface TripMetadata {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;     // milliseconds
  pointCount: number;
  isActive: boolean;
  distance?: number;           // kilometers
  averageSpeed?: number;       // km/h
}
```

### BatchOperationResult
```typescript
interface BatchOperationResult {
  success: number;             // Number of successful operations
  failed: number;              // Number of failed operations
  errors: Array<{              // Error details
    id: string;
    error: string;
  }>;
}
```

---

## Performance Considerations

### Efficient Queries

✅ **Use metadata for lists** (avoids loading full coordinates):
```typescript
// Good - lightweight
const metadata = await tripSessionManager.getAllTripMetadata();

// Avoid - heavy if you only need metadata
const trips = await tripSessionManager.getAllTrips();
```

✅ **Filter before sorting**:
```typescript
const trips = await tripSessionManager.getTripsWithOptions(
  { isActive: false, minPoints: 50 }, // Filter first
  { field: 'duration', order: 'desc' } // Then sort
);
```

✅ **Batch operations for multiple updates**:
```typescript
// Good - single batch operation
await tripSessionManager.deleteMultipleTrips([id1, id2, id3]);

// Avoid - multiple individual operations
await tripSessionManager.deleteTrip(id1);
await tripSessionManager.deleteTrip(id2);
await tripSessionManager.deleteTrip(id3);
```

### Storage Management

- **Monitor storage**: Use `getStorageStats()` regularly
- **Clean old trips**: Implement periodic cleanup
- **Validate data**: Use `validateTrip()` for data integrity
- **Estimate size**: ~200 bytes per GPS point

---

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  await tripSessionManager.deleteTrip(tripId);
} catch (error) {
  console.error('Failed to delete trip:', error);
  // Show user-friendly error message
}
```

Batch operations return detailed error info:

```typescript
const result = await tripSessionManager.deleteMultipleTrips(ids);

if (result.failed > 0) {
  console.error('Some deletions failed:');
  result.errors.forEach(err => {
    console.error(`Trip ${err.id}: ${err.error}`);
  });
}
```

---

## Best Practices

### 1. Always Handle Errors
```typescript
try {
  const trip = await tripSessionManager.getTrip(id);
  if (!trip) {
    console.log('Trip not found');
    return;
  }
  // Process trip
} catch (error) {
  console.error('Error:', error);
}
```

### 2. Validate User Input
```typescript
const handleRename = async (id: string, newName: string) => {
  if (!newName || newName.trim().length === 0) {
    alert('Trip name cannot be empty');
    return;
  }
  
  try {
    await tripSessionManager.renameTrip(id, newName);
  } catch (error) {
    alert('Failed to rename trip');
  }
};
```

### 3. Confirm Destructive Actions
```typescript
const handleDelete = async (id: string) => {
  const confirmed = window.confirm('Delete this trip?');
  if (!confirmed) return;
  
  await tripSessionManager.deleteTrip(id);
};
```

### 4. Use Metadata for Lists
```typescript
// Efficient - only loads metadata
const metadata = await tripSessionManager.getAllTripMetadata();

// Load full trip only when needed
const handleViewTrip = async (id: string) => {
  const trip = await tripSessionManager.getTrip(id);
  // Display full trip details
};
```

### 5. Implement Pagination for Large Lists
```typescript
const getPagedTrips = async (page: number, pageSize: number) => {
  const allTrips = await tripSessionManager.getAllTripMetadata();
  const start = page * pageSize;
  const end = start + pageSize;
  return allTrips.slice(start, end);
};
```

---

## Testing

### Unit Test Example

```typescript
import { tripSessionManager } from './tripSessionManager';

describe('TripSessionManager', () => {
  it('should create a trip', async () => {
    const trip = await tripSessionManager.createTrip('Test Trip');
    expect(trip.name).toBe('Test Trip');
    expect(trip.isActive).toBe(true);
  });

  it('should filter trips by date', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trips = await tripSessionManager.getFilteredTrips({
      startDate: yesterday
    });
    expect(trips.length).toBeGreaterThan(0);
  });

  it('should calculate distance correctly', async () => {
    const trip = await tripSessionManager.getTrip(tripId);
    const metadata = await tripSessionManager.getTripMetadata(tripId);
    expect(metadata?.distance).toBeGreaterThan(0);
  });
});
```

---

## Migration from Phase 1

If you're using the old `tripDB` directly, migration is simple:

```typescript
// Old (Phase 1)
import { tripDB } from './utils/indexedDB';
const trips = await tripDB.getAllTrips();

// New (Phase 2) - same functionality, more features
import { tripSessionManager } from './utils/tripSessionManager';
const trips = await tripSessionManager.getAllTrips();

// Plus new features
const metadata = await tripSessionManager.getAllTripMetadata();
const filtered = await tripSessionManager.getFilteredTrips({ minPoints: 50 });
```

---

## Troubleshooting

### Issue: "Trip not found"
**Solution**: Check if trip ID is correct and trip exists:
```typescript
const exists = await tripSessionManager.tripExists(tripId);
```

### Issue: Distance calculation returns undefined
**Solution**: Trip needs at least 2 GPS points:
```typescript
const metadata = await tripSessionManager.getTripMetadata(tripId);
if (!metadata?.distance) {
  console.log('Not enough points for distance calculation');
}
```

### Issue: Batch operation fails silently
**Solution**: Check the result object:
```typescript
const result = await tripSessionManager.deleteMultipleTrips(ids);
console.log('Errors:', result.errors);
```

---

## Future Enhancements

### Phase 3: Route Visualization
- Display trips on Leaflet map
- Color-coded polylines
- Start/End markers

### Phase 4: Trip Analytics
- Elevation profiles
- Stop detection
- Fuel cost estimation

### Phase 5: Export/Import
- Export to GeoJSON, GPX, CSV
- Import trips from files
- Share trips with others

---

## Credits

**Project**: Fuel Finder Web Application  
**Thesis**: "Fuel Finder: An Online Fuel Station Locator and Navigation Web-App using OSRM A*-based Routing and OpenStreetMap"  
**Institution**: BSCS Program  
**Location**: Oriental Mindoro, Philippines

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2025-10-12
