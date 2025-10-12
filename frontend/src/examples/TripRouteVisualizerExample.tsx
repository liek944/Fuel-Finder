/**
 * Trip Route Visualizer - Usage Examples
 * 
 * Demonstrates various use cases for the TripRouteVisualizer component.
 * Includes single trip, multiple trips, custom colors, and interactive features.
 * 
 * @module TripRouteVisualizerExample
 * @version 3.0.0
 * @since Phase 3
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import TripRouteVisualizer from '../components/TripRouteVisualizer';
import MultiTripVisualizer from '../components/MultiTripVisualizer';
import { tripSessionManager } from '../utils/tripSessionManager';
import { Trip } from '../utils/indexedDB';
import { COLOR_GRADIENTS } from '../utils/routeVisualizer';
import '../styles/TripRouteVisualizer.css';

/**
 * Example 1: Single Trip Visualization
 * 
 * Displays a single trip with default gradient (green to red)
 */
export const SingleTripExample: React.FC = () => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLatestTrip();
  }, []);

  const loadLatestTrip = async () => {
    try {
      const trips = await tripSessionManager.getSortedTrips({
        field: 'startTime',
        order: 'desc'
      });

      if (trips.length > 0 && trips[0].coordinates.length >= 2) {
        setTrip(trips[0]);
      }
    } catch (error) {
      console.error('Failed to load trip:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="route-loading">Loading trip...</div>;
  }

  if (!trip) {
    return <div className="route-error">No trips available for visualization</div>;
  }

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.4, 121.2]} // Oriental Mindoro
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <TripRouteVisualizer
          trip={trip}
          options={{
            gradient: COLOR_GRADIENTS.DEFAULT,
            weight: 4,
            opacity: 0.8,
            showStartMarker: true,
            showEndMarker: true,
            fitBounds: true
          }}
          showPopup={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 2: Custom Color Gradient
 * 
 * Demonstrates using custom color schemes
 */
export const CustomColorExample: React.FC = () => {
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    loadTrip();
  }, []);

  const loadTrip = async () => {
    const trips = await tripSessionManager.getAllTrips();
    if (trips.length > 0) {
      setTrip(trips[0]);
    }
  };

  if (!trip) return null;

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.4, 121.2]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* Blue to Orange gradient */}
        <TripRouteVisualizer
          trip={trip}
          options={{
            gradient: COLOR_GRADIENTS.BLUE_ORANGE,
            weight: 5,
            opacity: 0.9
          }}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 3: Multiple Trips Comparison
 * 
 * Displays multiple trips with distinct colors
 */
export const MultiTripExample: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      // Load last 3 completed trips
      const allTrips = await tripSessionManager.getFilteredTrips({
        isActive: false,
        minPoints: 10
      });

      const sorted = await tripSessionManager.getSortedTrips({
        field: 'startTime',
        order: 'desc'
      });

      setTrips(sorted.slice(0, 3));
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="route-loading">Loading trips...</div>;
  }

  if (trips.length === 0) {
    return <div className="route-error">No trips available</div>;
  }

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.4, 121.2]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <MultiTripVisualizer
          trips={trips}
          useDistinctColors={true}
          fitAllTrips={true}
          showPopups={true}
        />
      </MapContainer>

      {/* Trip Legend */}
      <div className="route-legend">
        <h4>Trips</h4>
        {trips.map((trip, index) => (
          <div key={trip.id} className="route-legend-item">
            <div
              className="route-legend-color"
              style={{
                background: `linear-gradient(to right, ${
                  [
                    'linear-gradient(to right, #00ff00, #ff0000)',
                    'linear-gradient(to right, #0066ff, #ff6600)',
                    'linear-gradient(to right, #9900ff, #ffff00)'
                  ][index % 3]
                })`
              }}
            />
            <span>{trip.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 4: Interactive Trip Selector
 * 
 * Allows user to select and visualize different trips
 */
export const InteractiveTripSelector: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const allTrips = await tripSessionManager.getFilteredTrips({
        isActive: false,
        minPoints: 5
      });
      setTrips(allTrips);
      if (allTrips.length > 0) {
        setSelectedTrip(allTrips[0]);
      }
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTripSelect = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      setSelectedTrip(trip);
    }
  };

  if (loading) {
    return <div className="route-loading">Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Trip Selector */}
      <div style={{
        padding: '16px',
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd'
      }}>
        <label htmlFor="trip-select" style={{ marginRight: '12px', fontWeight: 'bold' }}>
          Select Trip:
        </label>
        <select
          id="trip-select"
          value={selectedTrip?.id || ''}
          onChange={(e) => handleTripSelect(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          {trips.map(trip => (
            <option key={trip.id} value={trip.id}>
              {trip.name} ({new Date(trip.startTime).toLocaleDateString()})
            </option>
          ))}
        </select>

        {selectedTrip && (
          <span style={{ marginLeft: '20px', fontSize: '14px', color: '#666' }}>
            📍 {selectedTrip.coordinates.length} points
          </span>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        {selectedTrip ? (
          <MapContainer
            center={[13.4, 121.2]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            <TripRouteVisualizer
              key={selectedTrip.id} // Force re-render on trip change
              trip={selectedTrip}
              options={{
                gradient: COLOR_GRADIENTS.DEFAULT,
                fitBounds: true
              }}
              showPopup={true}
            />
          </MapContainer>
        ) : (
          <div className="route-error">No trip selected</div>
        )}
      </div>
    </div>
  );
};

/**
 * Example 5: Trip with Click Handler
 * 
 * Demonstrates handling route clicks
 */
export const ClickableRouteExample: React.FC = () => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [clickInfo, setClickInfo] = useState<string>('');

  useEffect(() => {
    loadTrip();
  }, []);

  const loadTrip = async () => {
    const trips = await tripSessionManager.getAllTrips();
    if (trips.length > 0) {
      setTrip(trips[0]);
    }
  };

  const handleRouteClick = (clickedTrip: Trip) => {
    setClickInfo(`Clicked on trip: ${clickedTrip.name} (${clickedTrip.coordinates.length} points)`);
  };

  if (!trip) return null;

  return (
    <div style={{ height: '600px', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[13.4, 121.2]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <TripRouteVisualizer
          trip={trip}
          onRouteClick={handleRouteClick}
        />
      </MapContainer>

      {clickInfo && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          {clickInfo}
        </div>
      )}
    </div>
  );
};

/**
 * Example 6: Minimal Route (No Markers)
 * 
 * Shows just the route polyline without start/end markers
 */
export const MinimalRouteExample: React.FC = () => {
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    loadTrip();
  }, []);

  const loadTrip = async () => {
    const trips = await tripSessionManager.getAllTrips();
    if (trips.length > 0) {
      setTrip(trips[0]);
    }
  };

  if (!trip) return null;

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={[13.4, 121.2]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <TripRouteVisualizer
          trip={trip}
          options={{
            showStartMarker: false,
            showEndMarker: false,
            weight: 3,
            opacity: 0.7
          }}
          showPopup={false}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Main Example Component
 * 
 * Demonstrates all examples with tabs
 */
const TripRouteVisualizerExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>('single');

  const examples = [
    { id: 'single', label: 'Single Trip', component: SingleTripExample },
    { id: 'custom', label: 'Custom Colors', component: CustomColorExample },
    { id: 'multi', label: 'Multiple Trips', component: MultiTripExample },
    { id: 'interactive', label: 'Interactive', component: InteractiveTripSelector },
    { id: 'clickable', label: 'Clickable', component: ClickableRouteExample },
    { id: 'minimal', label: 'Minimal', component: MinimalRouteExample }
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || SingleTripExample;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '16px',
        background: '#f5f5f5',
        borderBottom: '2px solid #ddd'
      }}>
        {examples.map(example => (
          <button
            key={example.id}
            onClick={() => setActiveExample(example.id)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: activeExample === example.id ? 'bold' : 'normal',
              background: activeExample === example.id ? '#0066ff' : 'white',
              color: activeExample === example.id ? 'white' : '#333',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {example.label}
          </button>
        ))}
      </div>

      {/* Active Example */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default TripRouteVisualizerExamples;
