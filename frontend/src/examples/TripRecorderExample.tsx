/**
 * Trip Recorder Usage Examples
 * Demonstrates various ways to use the Trip Recorder feature
 */

import React, { useState, useEffect } from 'react';
import { locationRecorder, RecorderState } from '../utils/locationRecorder';
import { tripDB, Trip, GPSPoint } from '../utils/indexedDB';

/**
 * Example 1: Basic Trip Recording
 */
export const BasicRecordingExample: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  useEffect(() => {
    const unsubscribe = locationRecorder.subscribe((state: RecorderState) => {
      setIsRecording(state.status === 'recording');
      setPointCount(state.pointsRecorded);
    });

    return unsubscribe;
  }, []);

  const handleStart = async () => {
    await locationRecorder.startRecording('My Trip');
  };

  const handleStop = async () => {
    const trip = await locationRecorder.stopRecording();
    console.log('Trip saved:', trip);
  };

  return (
    <div>
      <h3>Basic Recording Example</h3>
      {!isRecording ? (
        <button onClick={handleStart}>Start Recording</button>
      ) : (
        <>
          <p>Recording... {pointCount} points</p>
          <button onClick={handleStop}>Stop Recording</button>
        </>
      )}
    </div>
  );
};

/**
 * Example 2: Trip List with Delete
 */
export const TripListExample: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    const allTrips = await tripDB.getAllTrips();
    setTrips(allTrips);
  };

  const handleDelete = async (tripId: string) => {
    await tripDB.deleteTrip(tripId);
    loadTrips();
  };

  const formatDuration = (trip: Trip): string => {
    if (!trip.endTime) return 'In progress';
    const duration = trip.endTime - trip.startTime;
    const minutes = Math.floor(duration / 60000);
    return `${minutes} minutes`;
  };

  return (
    <div>
      <h3>Trip List Example</h3>
      <button onClick={loadTrips}>Refresh</button>
      <ul>
        {trips.map((trip) => (
          <li key={trip.id}>
            <strong>{trip.name}</strong>
            <br />
            Points: {trip.coordinates.length}
            <br />
            Duration: {formatDuration(trip)}
            <br />
            <button onClick={() => handleDelete(trip.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Example 3: Custom Configuration
 */
export const CustomConfigExample: React.FC = () => {
  const startLowPowerRecording = async () => {
    // Configure for battery saving
    locationRecorder.updateConfig({
      updateInterval: 10000, // 10 seconds
      highAccuracy: false, // Use network location
      minAccuracy: 100, // Accept lower accuracy
    });

    await locationRecorder.startRecording('Low Power Trip');
  };

  const startHighAccuracyRecording = async () => {
    // Configure for maximum accuracy
    locationRecorder.updateConfig({
      updateInterval: 1000, // 1 second
      highAccuracy: true, // Use GPS
      minAccuracy: 20, // Only accept high accuracy
    });

    await locationRecorder.startRecording('High Accuracy Trip');
  };

  return (
    <div>
      <h3>Custom Configuration Example</h3>
      <button onClick={startLowPowerRecording}>
        Start Low Power Recording
      </button>
      <button onClick={startHighAccuracyRecording}>
        Start High Accuracy Recording
      </button>
    </div>
  );
};

/**
 * Example 4: Real-time Statistics
 */
export const StatisticsExample: React.FC = () => {
  const [state, setState] = useState<RecorderState>(locationRecorder.getState());

  useEffect(() => {
    const unsubscribe = locationRecorder.subscribe(setState);
    return unsubscribe;
  }, []);

  const calculateDistance = (points: GPSPoint[]): number => {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      totalDistance += haversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }
    return totalDistance;
  };

  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
  };

  const distance = state.currentTrip
    ? calculateDistance(state.currentTrip.coordinates)
    : 0;

  return (
    <div>
      <h3>Real-time Statistics Example</h3>
      {state.status === 'recording' && state.currentTrip && (
        <div>
          <p>Trip: {state.currentTrip.name}</p>
          <p>Points: {state.pointsRecorded}</p>
          <p>Distance: {distance.toFixed(2)} km</p>
          {state.lastPoint && (
            <>
              <p>Current Speed: {state.lastPoint.speed ? `${(state.lastPoint.speed * 3.6).toFixed(1)} km/h` : 'N/A'}</p>
              <p>Accuracy: ±{state.lastPoint.accuracy?.toFixed(1)}m</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Example 5: Export Trip Data
 */
export const ExportExample: React.FC = () => {
  const exportToGeoJSON = async (tripId: string) => {
    const trip = await tripDB.getTrip(tripId);
    if (!trip) return;

    const geojson = {
      type: 'Feature',
      properties: {
        name: trip.name,
        startTime: trip.startTime,
        endTime: trip.endTime,
        pointCount: trip.coordinates.length,
      },
      geometry: {
        type: 'LineString',
        coordinates: trip.coordinates.map((point) => [
          point.longitude,
          point.latitude,
          point.altitude || 0,
        ]),
      },
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/\s+/g, '_')}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = async (tripId: string) => {
    const trip = await tripDB.getTrip(tripId);
    if (!trip) return;

    const csv = [
      'latitude,longitude,timestamp,accuracy,altitude,speed,heading',
      ...trip.coordinates.map((point) =>
        [
          point.latitude,
          point.longitude,
          point.timestamp,
          point.accuracy || '',
          point.altitude || '',
          point.speed || '',
          point.heading || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h3>Export Example</h3>
      <p>Export trip data to GeoJSON or CSV format</p>
      {/* Add trip selector and export buttons */}
    </div>
  );
};

/**
 * Example 6: Pause/Resume Recording
 */
export const PauseResumeExample: React.FC = () => {
  const [status, setStatus] = useState<string>('idle');

  useEffect(() => {
    const unsubscribe = locationRecorder.subscribe((state) => {
      setStatus(state.status);
    });
    return unsubscribe;
  }, []);

  const handleStart = async () => {
    await locationRecorder.startRecording('Pausable Trip');
  };

  const handlePause = () => {
    locationRecorder.pauseRecording();
  };

  const handleResume = () => {
    locationRecorder.resumeRecording();
  };

  const handleStop = async () => {
    await locationRecorder.stopRecording();
  };

  return (
    <div>
      <h3>Pause/Resume Example</h3>
      <p>Status: {status}</p>
      {status === 'idle' && (
        <button onClick={handleStart}>Start</button>
      )}
      {status === 'recording' && (
        <>
          <button onClick={handlePause}>Pause</button>
          <button onClick={handleStop}>Stop</button>
        </>
      )}
      {status === 'paused' && (
        <>
          <button onClick={handleResume}>Resume</button>
          <button onClick={handleStop}>Stop</button>
        </>
      )}
    </div>
  );
};

/**
 * Example 7: Permission Handling
 */
export const PermissionExample: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = async () => {
    if (!locationRecorder.isSupported()) {
      setError('Geolocation not supported');
      return;
    }

    const granted = await locationRecorder.requestPermission();
    setHasPermission(granted);
    
    if (!granted) {
      const state = locationRecorder.getState();
      setError(state.error);
    }
  };

  return (
    <div>
      <h3>Permission Handling Example</h3>
      <button onClick={checkPermission}>Check Permission</button>
      {hasPermission === true && <p>✅ Permission granted</p>}
      {hasPermission === false && <p>❌ Permission denied: {error}</p>}
    </div>
  );
};
