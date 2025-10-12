/**
 * Trip Replay Visualizer Examples
 * 
 * Comprehensive examples demonstrating various use cases for trip replay animation.
 * 
 * Examples:
 * 1. Basic replay with default settings
 * 2. Custom animation speed and interpolation
 * 3. Auto-follow camera mode
 * 4. Custom vehicle icon
 * 5. Programmatic control
 * 6. Multiple trip comparison
 * 
 * @module TripReplayVisualizerExample
 * @version 4.0.0
 * @since Phase 4
 */

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import TripReplayVisualizer from '../components/TripReplayVisualizer';
import { Trip, GPSPoint } from '../utils/indexedDB';
import { TripReplayAnimator, createTripReplayAnimator, AnimationState } from '../utils/tripReplayAnimator';
import '../styles/TripReplayVisualizer.css';

/**
 * Generate sample trip data for examples
 */
function generateSampleTrip(name: string, startLat: number, startLng: number, points: number = 50): Trip {
  const coordinates: GPSPoint[] = [];
  const startTime = Date.now() - points * 5000; // 5 seconds between points

  for (let i = 0; i < points; i++) {
    // Create a spiral pattern
    const angle = (i / points) * Math.PI * 4;
    const radius = (i / points) * 0.05;
    
    coordinates.push({
      latitude: startLat + Math.cos(angle) * radius,
      longitude: startLng + Math.sin(angle) * radius,
      timestamp: startTime + i * 5000,
      accuracy: 10 + Math.random() * 5,
      altitude: 100 + Math.random() * 50,
      heading: (angle * 180 / Math.PI) % 360,
      speed: 10 + Math.random() * 5
    });
  }

  return {
    id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    startTime,
    endTime: startTime + points * 5000,
    coordinates,
    isActive: false
  };
}

/**
 * Example 1: Basic Replay
 * 
 * Simple trip replay with default settings.
 */
export const Example1_BasicReplay: React.FC = () => {
  const trip = generateSampleTrip('Basic Trip', 13.4, 121.2, 30);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <h3>Example 1: Basic Replay</h3>
      <MapContainer
        center={[13.4, 121.2]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <TripReplayVisualizer
          trip={trip}
          showControls={true}
          showRoute={true}
          showTraveledPath={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 2: Custom Speed & Interpolation
 * 
 * Replay with custom animation speed and interpolation settings.
 */
export const Example2_CustomSpeed: React.FC = () => {
  const trip = generateSampleTrip('Fast Trip', 13.42, 121.22, 40);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <h3>Example 2: Custom Speed (2x) with High Interpolation</h3>
      <MapContainer
        center={[13.42, 121.22]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <TripReplayVisualizer
          trip={trip}
          animationConfig={{
            speed: 2,
            interpolate: true,
            interpolationSteps: 20
          }}
          showControls={true}
          showRoute={true}
          showTraveledPath={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 3: Auto-Follow Camera
 * 
 * Camera automatically follows the animated vehicle.
 */
export const Example3_AutoFollow: React.FC = () => {
  const trip = generateSampleTrip('Follow Trip', 13.38, 121.18, 50);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <h3>Example 3: Auto-Follow Camera</h3>
      <MapContainer
        center={[13.38, 121.18]}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <TripReplayVisualizer
          trip={trip}
          autoFollow={true}
          showControls={true}
          showRoute={true}
          showTraveledPath={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 4: Custom Vehicle Icon
 * 
 * Replay with a custom vehicle marker icon.
 */
export const Example4_CustomIcon: React.FC = () => {
  const trip = generateSampleTrip('Custom Icon Trip', 13.44, 121.24, 35);

  const customVehicleIcon = `
    <div style="
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <span style="font-size: 24px;">🚗</span>
      </div>
    </div>
  `;

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <h3>Example 4: Custom Vehicle Icon</h3>
      <MapContainer
        center={[13.44, 121.24]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <TripReplayVisualizer
          trip={trip}
          vehicleIconHtml={customVehicleIcon}
          vehicleIconSize={50}
          showControls={true}
          showRoute={true}
          showTraveledPath={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 5: Programmatic Control
 * 
 * Control animation programmatically with custom buttons.
 */
export const Example5_ProgrammaticControl: React.FC = () => {
  const trip = generateSampleTrip('Controlled Trip', 13.36, 121.16, 40);
  const animatorRef = useRef<TripReplayAnimator | null>(null);
  const [state, setState] = useState<AnimationState>('idle');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!animatorRef.current) {
      animatorRef.current = createTripReplayAnimator(trip.coordinates);
      
      animatorRef.current.subscribe((position, animState) => {
        setState(animState);
        setProgress(position.progress);
      });
    }

    return () => {
      if (animatorRef.current) {
        animatorRef.current.dispose();
      }
    };
  }, [trip.coordinates]);

  const handlePlay = () => animatorRef.current?.play();
  const handlePause = () => animatorRef.current?.pause();
  const handleRestart = () => animatorRef.current?.restart();
  const handleSeek = (percent: number) => animatorRef.current?.seek(percent / 100);

  return (
    <div style={{ width: '100%', height: '700px' }}>
      <h3>Example 5: Programmatic Control</h3>
      
      {/* Custom Control Panel */}
      <div style={{
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '10px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button onClick={handlePlay} style={{ padding: '8px 16px' }}>▶ Play</button>
        <button onClick={handlePause} style={{ padding: '8px 16px' }}>⏸ Pause</button>
        <button onClick={handleRestart} style={{ padding: '8px 16px' }}>↻ Restart</button>
        <button onClick={() => handleSeek(25)} style={{ padding: '8px 16px' }}>25%</button>
        <button onClick={() => handleSeek(50)} style={{ padding: '8px 16px' }}>50%</button>
        <button onClick={() => handleSeek(75)} style={{ padding: '8px 16px' }}>75%</button>
        <div style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
          State: {state} | Progress: {(progress * 100).toFixed(1)}%
        </div>
      </div>

      <MapContainer
        center={[13.36, 121.16]}
        zoom={13}
        style={{ width: '100%', height: 'calc(100% - 70px)' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <TripReplayVisualizer
          trip={trip}
          showControls={false}
          showRoute={true}
          showTraveledPath={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Example 6: Trip Selector
 * 
 * Select and replay different trips.
 */
export const Example6_TripSelector: React.FC = () => {
  const trips = [
    generateSampleTrip('Morning Commute', 13.40, 121.20, 30),
    generateSampleTrip('Evening Drive', 13.42, 121.22, 40),
    generateSampleTrip('Weekend Trip', 13.38, 121.18, 50)
  ];

  const [selectedTrip, setSelectedTrip] = useState<Trip>(trips[0]);
  const [key, setKey] = useState(0); // Force re-render on trip change

  const handleTripChange = (trip: Trip) => {
    setSelectedTrip(trip);
    setKey(prev => prev + 1); // Force new animator instance
  };

  return (
    <div style={{ width: '100%', height: '700px' }}>
      <h3>Example 6: Trip Selector</h3>
      
      {/* Trip Selector */}
      <div style={{
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '10px'
      }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Trip:</label>
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => handleTripChange(trip)}
            style={{
              padding: '8px 16px',
              marginRight: '8px',
              background: selectedTrip.id === trip.id ? '#2196F3' : 'white',
              color: selectedTrip.id === trip.id ? 'white' : 'black',
              border: '2px solid #2196F3',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {trip.name}
          </button>
        ))}
      </div>

      <MapContainer
        center={[13.40, 121.20]}
        zoom={12}
        style={{ width: '100%', height: 'calc(100% - 70px)' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <TripReplayVisualizer
          key={key}
          trip={selectedTrip}
          showControls={true}
          showRoute={true}
          showTraveledPath={true}
          autoFollow={true}
        />
      </MapContainer>
    </div>
  );
};

/**
 * All Examples Container
 */
const TripReplayVisualizerExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState<number>(1);

  const examples = [
    { id: 1, title: 'Basic Replay', component: Example1_BasicReplay },
    { id: 2, title: 'Custom Speed', component: Example2_CustomSpeed },
    { id: 3, title: 'Auto-Follow', component: Example3_AutoFollow },
    { id: 4, title: 'Custom Icon', component: Example4_CustomIcon },
    { id: 5, title: 'Programmatic Control', component: Example5_ProgrammaticControl },
    { id: 6, title: 'Trip Selector', component: Example6_TripSelector }
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || Example1_BasicReplay;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Trip Replay Visualizer Examples</h1>
      <p>Interactive examples demonstrating trip replay animation features.</p>

      {/* Example Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {examples.map((example) => (
          <button
            key={example.id}
            onClick={() => setActiveExample(example.id)}
            style={{
              padding: '10px 20px',
              background: activeExample === example.id ? '#2196F3' : 'white',
              color: activeExample === example.id ? 'white' : 'black',
              border: '2px solid #2196F3',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeExample === example.id ? 'bold' : 'normal'
            }}
          >
            {example.id}. {example.title}
          </button>
        ))}
      </div>

      {/* Active Example */}
      <div style={{
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        background: 'white'
      }}>
        <ActiveComponent />
      </div>

      {/* Documentation Link */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h4>📚 Documentation</h4>
        <p>
          For complete API documentation and integration guides, see:
        </p>
        <ul>
          <li><code>PHASE_4_API_DOCUMENTATION.md</code> - Complete API reference</li>
          <li><code>PHASE_4_QUICK_REFERENCE.md</code> - Quick start guide</li>
          <li><code>PHASE_4_INTEGRATION_GUIDE.md</code> - Integration instructions</li>
        </ul>
      </div>
    </div>
  );
};

export default TripReplayVisualizerExamples;
