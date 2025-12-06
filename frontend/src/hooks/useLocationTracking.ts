import { useState, useEffect, useRef, useCallback } from "react";
import { arrivalNotifications } from "../utils/arrivalNotifications";

/**
 * Distance calculation using Haversine formula
 */
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface LocationTrackingOptions {
  /** Minimum time between position updates in ms (default: 3000) */
  throttleMs?: number;
  /** Maximum accuracy to accept in meters (default: 50) */
  maxAccuracyMeters?: number;
  /** Time after which a position is considered stale in ms (default: 20000) */
  stalePositionMs?: number;
  /** Default fallback position if geolocation fails */
  defaultPosition?: [number, number];
}

interface LocationState {
  /** Current position as [lat, lng] tuple, or null if not yet available */
  position: [number, number] | null;
  /** GPS accuracy in meters, or null if not available */
  accuracy: number | null;
  /** Current speed in meters/second, or null if not moving/unavailable */
  speed: number | null;
  /** Timestamp of last location update */
  lastUpdate: number;
  /** Whether initial location is still being acquired */
  loading: boolean;
}

const DEFAULT_POSITION: [number, number] = [12.5966, 121.5258]; // Oriental Mindoro
const DEFAULT_THROTTLE_MS = 3000;
const DEFAULT_MAX_ACCURACY_METERS = 50;
const DEFAULT_STALE_POSITION_MS = 20000;
const MOVEMENT_THRESHOLD_METERS = 20;

/**
 * Hook to track user's geolocation with smart throttling and accuracy filtering.
 * 
 * Features:
 * - Continuous location tracking via watchPosition
 * - Throttling to prevent excessive updates (default: 3s)
 * - Accuracy filtering to ignore imprecise GPS readings
 * - Movement detection to allow updates when user moves significantly
 * - Speed tracking from GPS data
 * 
 * @example
 * const { position, accuracy, speed, loading } = useLocationTracking();
 */
export function useLocationTracking(options?: LocationTrackingOptions): LocationState {
  const {
    throttleMs = DEFAULT_THROTTLE_MS,
    maxAccuracyMeters = DEFAULT_MAX_ACCURACY_METERS,
    stalePositionMs = DEFAULT_STALE_POSITION_MS,
    defaultPosition = DEFAULT_POSITION,
  } = options || {};

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(true);

  // Refs for throttling logic
  const lastUpdateRef = useRef<number>(0);
  const lastAcceptedPositionRef = useRef<[number, number] | null>(null);
  const lastAccuracyRef = useRef<number | null>(null);

  useEffect(() => {
    let watchId: number | null = null;

    console.log("🌍 Starting continuous location tracking...");

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const newPosition: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        const newAccuracy = pos.coords.accuracy;
        const newSpeed = pos.coords.speed;

        const previousPosition = lastAcceptedPositionRef.current;
        const previousAccuracy = lastAccuracyRef.current;
        const timeSinceUpdate = now - lastUpdateRef.current;

        // Reject low-accuracy updates if we have a recent good position
        if (
          previousPosition &&
          previousAccuracy !== null &&
          newAccuracy > maxAccuracyMeters &&
          timeSinceUpdate < stalePositionMs
        ) {
          console.log("📍 Ignoring low-accuracy location update:", {
            lat: newPosition[0].toFixed(6),
            lng: newPosition[1].toFixed(6),
            accuracy: `±${Math.round(newAccuracy)}m`,
          });
          setLoading(false);
          return;
        }

        // Smart throttling: update if enough time passed or moved significantly
        let shouldUpdate = timeSinceUpdate >= throttleMs;

        if (previousPosition && timeSinceUpdate < throttleMs) {
          const distanceKm = calculateDistance(
            previousPosition[0],
            previousPosition[1],
            newPosition[0],
            newPosition[1]
          );
          const distanceMeters = distanceKm * 1000;
          // Allow update if moved more than threshold even within throttle period
          shouldUpdate = distanceMeters > MOVEMENT_THRESHOLD_METERS;
        }

        if (!previousPosition || shouldUpdate) {
          console.log("📍 Location updated:", {
            lat: newPosition[0].toFixed(6),
            lng: newPosition[1].toFixed(6),
            accuracy: `±${Math.round(newAccuracy)}m`,
          });

          setPosition(newPosition);
          setAccuracy(newAccuracy);
          setSpeed(newSpeed);
          setLastUpdate(now);
          lastUpdateRef.current = now;
          lastAcceptedPositionRef.current = newPosition;
          lastAccuracyRef.current = newAccuracy;

          // Update arrival notifications with new position
          arrivalNotifications.updatePosition(newPosition[0], newPosition[1]);
        }

        setLoading(false);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);

        // Only set default location if we don't have a position yet
        if (!lastAcceptedPositionRef.current) {
          console.log("📍 Using default location (Oriental Mindoro)");
          setPosition(defaultPosition);
          lastAcceptedPositionRef.current = defaultPosition;
          lastAccuracyRef.current = null;
          lastUpdateRef.current = Date.now();
          setLastUpdate(Date.now());
        }

        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log("🛑 Stopped location tracking");
      }
    };
  }, [throttleMs, maxAccuracyMeters, stalePositionMs, defaultPosition]);

  return { position, accuracy, speed, lastUpdate, loading };
}

export default useLocationTracking;
