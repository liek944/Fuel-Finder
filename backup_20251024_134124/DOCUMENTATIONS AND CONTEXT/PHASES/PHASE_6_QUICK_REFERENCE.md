# Phase 6 - Quick Reference Guide

## Trip Summary & Analytics - Quick Start

**Version**: 6.0.0  
**Phase**: 6 - Trip Summary & Analytics

---

## 🚀 Quick Start (30 seconds)

### 1. Import Components

```typescript
import TripSummaryCard from '../components/TripSummaryCard';
import { calculateTripAnalytics } from '../utils/tripAnalytics';
import '../styles/TripSummaryCard.css';
```

### 2. Basic Usage

```typescript
<TripSummaryCard
  trip={myTrip}
  showDetailedMetrics={true}
  showFuelCost={true}
/>
```

### 3. With TripReplayVisualizer

```typescript
<TripReplayVisualizer
  trip={myTrip}
  showSummary={true}
  showControls={true}
/>
```

---

## 📊 Common Patterns

### Pattern 1: Calculate Trip Metrics

```typescript
import { calculateTripAnalytics } from '../utils/tripAnalytics';

const analytics = calculateTripAnalytics(trip);

console.log(`Distance: ${analytics.totalDistance.toFixed(2)} km`);
console.log(`Duration: ${analytics.formattedDuration}`);
console.log(`Speed: ${analytics.averageSpeed.toFixed(1)} km/h`);
console.log(`Cost: ₱${analytics.estimatedFuelCost.toFixed(2)}`);
```

### Pattern 2: Custom Fuel Configuration

```typescript
const [fuelConfig, setFuelConfig] = useState({
  pricePerLiter: 70.0,
  fuelEfficiency: 15.0,
  currency: '₱'
});

<TripSummaryCard
  trip={trip}
  fuelConfig={fuelConfig}
  allowConfigEdit={true}
  onConfigChange={setFuelConfig}
/>
```

### Pattern 3: Standalone Analytics

```typescript
import { 
  calculateTotalDistance,
  calculateDuration,
  formatDistance,
  formatDuration
} from '../utils/tripAnalytics';

const distance = calculateTotalDistance(trip.coordinates);
const duration = calculateDuration(trip.coordinates);

console.log(`Trip: ${formatDistance(distance)} in ${formatDuration(duration)}`);
```

### Pattern 4: Stop Detection

```typescript
import { detectStops, formatDuration } from '../utils/tripAnalytics';

const stops = detectStops(trip.coordinates);

console.log(`Detected ${stops.length} stops:`);
stops.forEach((stop, i) => {
  console.log(`  Stop ${i + 1}: ${formatDuration(stop.duration)}`);
});
```

### Pattern 5: Multiple Trip Statistics

```typescript
import { calculateTripStatistics } from '../utils/tripAnalytics';

const allTrips = await tripSessionManager.getAllTrips();
const stats = calculateTripStatistics(allTrips);

console.log(`Total: ${stats.totalDistance.toFixed(1)} km`);
console.log(`Average: ${stats.averageTripDistance.toFixed(1)} km`);
```

---

## 🎯 Metric Calculations

### Distance

```typescript
// Haversine distance between two points
import { haversineDistance } from '../utils/tripAnalytics';
const dist = haversineDistance(13.0827, 121.0, 13.0830, 121.002);

// Total trip distance
import { calculateTotalDistance } from '../utils/tripAnalytics';
const total = calculateTotalDistance(trip.coordinates);

// Format for display
import { formatDistance } from '../utils/tripAnalytics';
const formatted = formatDistance(5.234); // "5.2 km"
```

### Duration

```typescript
// Calculate duration
import { calculateDuration } from '../utils/tripAnalytics';
const duration = calculateDuration(trip.coordinates);

// Format for display
import { formatDuration } from '../utils/tripAnalytics';
const formatted = formatDuration(1830000); // "30:30"
```

### Speed

```typescript
// Average speed
import { calculateAverageSpeed } from '../utils/tripAnalytics';
const avgSpeed = calculateAverageSpeed(distance, duration);

// Maximum speed
import { calculateMaxSpeed } from '../utils/tripAnalytics';
const maxSpeed = calculateMaxSpeed(trip.coordinates);

// Format for display
import { formatSpeed } from '../utils/tripAnalytics';
const formatted = formatSpeed(45.678); // "45.7 km/h"
```

### Fuel Cost

```typescript
// Estimate fuel cost
import { estimateFuelCost } from '../utils/tripAnalytics';
const cost = estimateFuelCost(50, {
  pricePerLiter: 65.0,
  fuelEfficiency: 12.0,
  currency: '₱'
});

// Format for display
import { formatCurrency } from '../utils/tripAnalytics';
const formatted = formatCurrency(cost, '₱'); // "₱270.83"
```

---

## ⚙️ Configuration Options

### Fuel Cost Configuration

```typescript
interface FuelCostConfig {
  pricePerLiter: number;    // ₱65.00 (default)
  fuelEfficiency: number;   // 12.0 km/L (default)
  currency: string;         // '₱' (default)
}

// Default configuration
import { DEFAULT_FUEL_CONFIG } from '../utils/tripAnalytics';
```

### Stop Detection Configuration

```typescript
interface StopDetectionConfig {
  speedThreshold: number;   // 5 km/h (default)
  minDuration: number;      // 30 seconds (default)
}

// Default configuration
import { DEFAULT_STOP_CONFIG } from '../utils/tripAnalytics';
```

### Component Props

```typescript
// TripSummaryCard props
<TripSummaryCard
  trip={trip}                          // Required
  fuelConfig={customConfig}            // Optional
  stopConfig={customStopConfig}        // Optional
  showDetailedMetrics={true}           // Default: true
  showFuelCost={true}                  // Default: true
  showEmissions={false}                // Default: false
  allowConfigEdit={false}              // Default: false
  className="custom-class"             // Optional
  onConfigChange={(config) => {}}      // Optional
/>

// TripReplayVisualizer props (Phase 6 additions)
<TripReplayVisualizer
  trip={trip}
  showSummary={true}                   // Default: true
  showDetailedMetrics={true}           // Default: true
  allowConfigEdit={false}              // Default: false
  fuelConfig={customConfig}            // Optional
  stopConfig={customStopConfig}        // Optional
  onFuelConfigChange={(config) => {}}  // Optional
/>
```

---

## 🎨 Styling

### CSS Classes

```css
/* Main container */
.trip-summary-card { }

/* Header */
.summary-header { }
.summary-title { }
.summary-subtitle { }

/* Metrics */
.metrics-grid { }
.primary-metrics { }
.detailed-metrics { }
.trip-metric { }
.trip-metric.highlight { }

/* Configuration */
.fuel-config-section { }
.config-form { }
.form-group { }
.form-input { }

/* Trip info */
.trip-info { }
.info-item { }
```

### Custom Styling

```typescript
<TripSummaryCard
  trip={trip}
  className="my-custom-summary"
/>
```

```css
.my-custom-summary {
  max-width: 500px;
  margin: 20px auto;
}

.my-custom-summary .trip-metric.highlight {
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
}
```

---

## 📱 Responsive Breakpoints

```css
/* Desktop: > 1024px */
.trip-summary-container {
  max-width: 450px;
  position: absolute;
  top: 20px;
  right: 20px;
}

/* Tablet: 769-1024px */
@media (max-width: 1024px) {
  .trip-summary-container {
    max-width: 400px;
  }
}

/* Mobile: ≤ 768px */
@media (max-width: 768px) {
  .trip-summary-container {
    position: relative;
    width: 100%;
    margin-top: 16px;
  }
}

/* Small Mobile: ≤ 480px */
@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 🔧 Troubleshooting

### Issue: Analytics show zero values

**Cause:** Empty or invalid coordinates array

**Solution:**
```typescript
if (trip.coordinates.length < 2) {
  console.error('Need at least 2 GPS points');
  return;
}

const analytics = calculateTripAnalytics(trip);
```

### Issue: Fuel cost seems incorrect

**Cause:** Wrong fuel configuration

**Solution:**
```typescript
// Check your configuration
console.log('Fuel config:', fuelConfig);

// Use correct values for your region
const config = {
  pricePerLiter: 65.0,  // Update to current price
  fuelEfficiency: 12.0, // Update to your vehicle
  currency: '₱'
};
```

### Issue: Summary card not visible

**Cause:** CSS not imported or container hidden

**Solution:**
```typescript
// Import CSS
import '../styles/TripSummaryCard.css';

// Check showSummary prop
<TripReplayVisualizer
  trip={trip}
  showSummary={true}  // Must be true
/>
```

### Issue: Stop detection too sensitive

**Cause:** Low speed threshold

**Solution:**
```typescript
const stopConfig = {
  speedThreshold: 10,  // Increase threshold
  minDuration: 60      // Increase minimum duration
};

<TripSummaryCard
  trip={trip}
  stopConfig={stopConfig}
/>
```

### Issue: Performance issues with large trips

**Cause:** Too many GPS points

**Solution:**
```typescript
// Use memoization
const analytics = useMemo(
  () => calculateTripAnalytics(trip, fuelConfig),
  [trip, fuelConfig]
);

// Or simplify coordinates
const simplified = simplifyCoordinates(trip.coordinates, 0.0001);
```

---

## 💡 Tips & Tricks

### Tip 1: Optimize Re-renders

```typescript
// Use useMemo for expensive calculations
const analytics = useMemo(
  () => calculateTripAnalytics(trip, fuelConfig),
  [trip, fuelConfig]
);
```

### Tip 2: Persist Fuel Configuration

```typescript
// Save to localStorage
const saveFuelConfig = (config: FuelCostConfig) => {
  localStorage.setItem('fuelConfig', JSON.stringify(config));
  setFuelConfig(config);
};

// Load from localStorage
useEffect(() => {
  const saved = localStorage.getItem('fuelConfig');
  if (saved) {
    setFuelConfig(JSON.parse(saved));
  }
}, []);
```

### Tip 3: Format Numbers for Display

```typescript
import { formatDistance, formatSpeed, formatCurrency } from '../utils/tripAnalytics';

// Always use formatters for consistent display
const display = {
  distance: formatDistance(analytics.totalDistance),
  speed: formatSpeed(analytics.averageSpeed),
  cost: formatCurrency(analytics.estimatedFuelCost, '₱')
};
```

### Tip 4: Handle Edge Cases

```typescript
// Check for valid trip data
if (!trip || !trip.coordinates || trip.coordinates.length < 2) {
  return <div>Insufficient trip data</div>;
}

// Handle zero duration
if (analytics.duration === 0) {
  return <div>Trip has no duration</div>;
}
```

### Tip 5: Combine with Other Features

```typescript
// Show summary after replay completes
const [showSummary, setShowSummary] = useState(false);

<TripReplayVisualizer
  trip={trip}
  showSummary={showSummary}
  onStateChange={(state) => {
    if (state === 'completed') {
      setShowSummary(true);
    }
  }}
/>
```

---

## 📖 Common Use Cases

### Use Case 1: Trip History Dashboard

```typescript
const TripHistory = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  
  useEffect(() => {
    tripSessionManager.getAllTrips().then(setTrips);
  }, []);
  
  return (
    <div>
      {trips.map(trip => (
        <TripSummaryCard
          key={trip.id}
          trip={trip}
          showDetailedMetrics={false}
        />
      ))}
    </div>
  );
};
```

### Use Case 2: Fuel Cost Tracker

```typescript
const FuelTracker = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const stats = calculateTripStatistics(trips);
  
  return (
    <div>
      <h2>Total Fuel Cost: {formatCurrency(stats.totalFuelCost, '₱')}</h2>
      <p>Total Distance: {formatDistance(stats.totalDistance)}</p>
      <p>Average Trip: {formatDistance(stats.averageTripDistance)}</p>
    </div>
  );
};
```

### Use Case 3: Live Trip Monitor

```typescript
const LiveMonitor = ({ tripId }: { tripId: string }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await tripSessionManager.getTrip(tripId);
      setTrip(updated);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [tripId]);
  
  if (!trip) return null;
  
  return <TripSummaryCard trip={trip} />;
};
```

### Use Case 4: Comparison View

```typescript
const TripComparison = ({ trip1, trip2 }: { trip1: Trip; trip2: Trip }) => {
  const analytics1 = calculateTripAnalytics(trip1);
  const analytics2 = calculateTripAnalytics(trip2);
  
  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <TripSummaryCard trip={trip1} />
      <TripSummaryCard trip={trip2} />
    </div>
  );
};
```

### Use Case 5: Export Summary

```typescript
const exportSummary = (trip: Trip) => {
  const analytics = calculateTripAnalytics(trip);
  
  const summary = {
    name: trip.name,
    distance: formatDistance(analytics.totalDistance),
    duration: analytics.formattedDuration,
    avgSpeed: formatSpeed(analytics.averageSpeed),
    fuelCost: formatCurrency(analytics.estimatedFuelCost, '₱'),
    stops: analytics.stopCount
  };
  
  const json = JSON.stringify(summary, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${trip.name}-summary.json`;
  a.click();
};
```

---

## 🔗 Related Documentation

- **Complete Guide**: `PHASE_6_COMPLETE.md`
- **API Reference**: `PHASE_6_API_DOCUMENTATION.md`
- **Integration Guide**: `PHASE_6_INTEGRATION_GUIDE.md`
- **Phase 5 (Playback)**: `PHASE_5_COMPLETE.md`
- **Phase 4 (Animation)**: `PHASE_4_COMPLETE.md`

---

## 📞 Quick Links

### Source Files
- Analytics: `frontend/src/utils/tripAnalytics.ts`
- Component: `frontend/src/components/TripSummaryCard.tsx`
- Styles: `frontend/src/styles/TripSummaryCard.css`
- Examples: `frontend/src/examples/TripSummaryExample.tsx`

### Key Functions
- `calculateTripAnalytics()` - Main analytics function
- `haversineDistance()` - Distance calculation
- `detectStops()` - Stop detection
- `estimateFuelCost()` - Fuel cost estimation

### Key Components
- `<TripSummaryCard />` - Analytics display
- `<TripReplayVisualizer />` - Integrated replay + analytics

---

**Last Updated**: October 12, 2025  
**Version**: 6.0.0  
**Status**: Production Ready
