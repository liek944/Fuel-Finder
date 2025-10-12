/**
 * Trip Summary Example
 * 
 * Demonstrates usage of TripSummaryCard component with various configurations.
 * 
 * @module TripSummaryExample
 * @version 6.0.0
 * @since Phase 6
 */

import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import TripReplayVisualizer from '../components/TripReplayVisualizer';
import { Trip } from '../utils/indexedDB';
import { FuelCostConfig, DEFAULT_FUEL_CONFIG } from '../utils/tripAnalytics';
import '../styles/TripReplayVisualizer.css';
import '../styles/TripSummaryCard.css';

/**
 * Example trip data for demonstration
 */
const exampleTrip: Trip = {
  id: 'example-trip-1',
  name: 'Morning Commute',
  startTime: Date.now() - 3600000, // 1 hour ago
  endTime: Date.now(),
  isActive: false,
  coordinates: [
    { latitude: 13.0827, longitude: 121.0, timestamp: Date.now() - 3600000, accuracy: 10, altitude: null, heading: null, speed: null },
    { latitude: 13.0830, longitude: 121.002, timestamp: Date.now() - 3540000, accuracy: 10, altitude: null, heading: 45, speed: 30 },
    { latitude: 13.0835, longitude: 121.005, timestamp: Date.now() - 3480000, accuracy: 10, altitude: null, heading: 45, speed: 40 },
    { latitude: 13.0840, longitude: 121.008, timestamp: Date.now() - 3420000, accuracy: 10, altitude: null, heading: 50, speed: 45 },
    { latitude: 13.0845, longitude: 121.012, timestamp: Date.now() - 3360000, accuracy: 10, altitude: null, heading: 55, speed: 50 },
    { latitude: 13.0850, longitude: 121.015, timestamp: Date.now() - 3300000, accuracy: 10, altitude: null, heading: 60, speed: 55 },
    { latitude: 13.0855, longitude: 121.018, timestamp: Date.now() - 3240000, accuracy: 10, altitude: null, heading: 65, speed: 60 },
    { latitude: 13.0860, longitude: 121.022, timestamp: Date.now() - 3180000, accuracy: 10, altitude: null, heading: 70, speed: 50 },
    { latitude: 13.0865, longitude: 121.025, timestamp: Date.now() - 3120000, accuracy: 10, altitude: null, heading: 75, speed: 45 },
    { latitude: 13.0870, longitude: 121.028, timestamp: Date.now() - 3060000, accuracy: 10, altitude: null, heading: 80, speed: 40 },
    { latitude: 13.0875, longitude: 121.030, timestamp: Date.now() - 3000000, accuracy: 10, altitude: null, heading: 85, speed: 35 },
    { latitude: 13.0880, longitude: 121.032, timestamp: Date.now() - 2940000, accuracy: 10, altitude: null, heading: 90, speed: 30 },
    { latitude: 13.0885, longitude: 121.035, timestamp: Date.now() - 2880000, accuracy: 10, altitude: null, heading: 95, speed: 25 },
    { latitude: 13.0890, longitude: 121.038, timestamp: Date.now() - 2820000, accuracy: 10, altitude: null, heading: 100, speed: 20 },
    { latitude: 13.0895, longitude: 121.040, timestamp: Date.now() - 2760000, accuracy: 10, altitude: null, heading: 105, speed: 15 },
    { latitude: 13.0900, longitude: 121.042, timestamp: Date.now(), accuracy: 10, altitude: null, heading: 110, speed: 10 }
  ]
};

/**
 * TripSummaryExample Component
 * 
 * Example 1: Basic usage with default settings
 */
export const BasicSummaryExample: React.FC = () => {
  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.0860, 121.022]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <TripReplayVisualizer
          trip={exampleTrip}
          showSummary={true}
          showControls={true}
          autoFollow={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 2: With custom fuel configuration
 */
export const CustomFuelConfigExample: React.FC = () => {
  const [fuelConfig, setFuelConfig] = useState<FuelCostConfig>({
    pricePerLiter: 70.0, // Higher fuel price
    fuelEfficiency: 15.0, // Better fuel efficiency
    currency: '₱'
  });

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.0860, 121.022]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <TripReplayVisualizer
          trip={exampleTrip}
          showSummary={true}
          showControls={true}
          fuelConfig={fuelConfig}
          allowConfigEdit={true}
          onFuelConfigChange={setFuelConfig}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 3: Detailed metrics with editable configuration
 */
export const DetailedMetricsExample: React.FC = () => {
  const [fuelConfig, setFuelConfig] = useState<FuelCostConfig>(DEFAULT_FUEL_CONFIG);

  const handleConfigChange = (newConfig: FuelCostConfig) => {
    console.log('Fuel configuration updated:', newConfig);
    setFuelConfig(newConfig);
  };

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.0860, 121.022]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <TripReplayVisualizer
          trip={exampleTrip}
          showSummary={true}
          showDetailedMetrics={true}
          showControls={true}
          autoFollow={false}
          fuelConfig={fuelConfig}
          allowConfigEdit={true}
          onFuelConfigChange={handleConfigChange}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 4: Summary only (no controls)
 */
export const SummaryOnlyExample: React.FC = () => {
  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.0860, 121.022]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <TripReplayVisualizer
          trip={exampleTrip}
          showSummary={true}
          showControls={false}
          showRoute={true}
          showTraveledPath={false}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 5: Mobile-optimized layout
 */
export const MobileOptimizedExample: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapContainer
        center={[13.0860, 121.022]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <TripReplayVisualizer
          trip={exampleTrip}
          showSummary={true}
          showDetailedMetrics={false}
          showControls={true}
          autoFollow={true}
        />
      </MapContainer>
    </div>
  );
};

export default BasicSummaryExample;
