import { useCallback, useEffect, useRef, useState } from "react";
import { routingApi, RouteData } from "../api/routingApi";
import { arrivalNotifications } from "../utils/arrivalNotifications";
import { backgroundLocation } from "../capacitor/backgroundLocation";

export interface RoutableLocation {
  name: string;
  location: { lat: number; lng: number };
  id?: number;
}

export type LatLngTuple = [number, number];

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // km
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
}

export function useRoute(userPosition: LatLngTuple | null) {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routingTo, setRoutingTo] = useState<RoutableLocation | null>(null);
  const [routeStartPosition, setRouteStartPosition] = useState<LatLngTuple | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [lastRerouteAt, setLastRerouteAt] = useState<number | null>(null);

  const originalCoordsRef = useRef<LatLngTuple[] | null>(null);
  const lastTrimmedIndexRef = useRef<number>(0);
  const lastRerouteTimeRef = useRef<number | null>(null);
  const isReroutingRef = useRef(false);

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRoutingTo(null);
    setRouteStartPosition(null);

    // Clear destination from arrival notifications
    arrivalNotifications.clearDestination();

    // Stop native background tracking if running (no-op on web)
    backgroundLocation.stopTracking().catch(() => {});
    backgroundLocation.clearDestination().catch(() => {});

    originalCoordsRef.current = null;
    lastTrimmedIndexRef.current = 0;
    lastRerouteTimeRef.current = null;
    setLastRerouteAt(null);
  }, []);

  const routeTo = useCallback(
    async (location: RoutableLocation) => {
      if (!userPosition) return;

      setRoutingTo(location);
      setLoadingRoute(true);
      setRouteStartPosition(userPosition); // Store the starting position

      try {
        const data = await routingApi.route(
          userPosition[0],
          userPosition[1],
          location.location.lat,
          location.location.lng,
        );
        setRouteData(data || null);

        originalCoordsRef.current = data ? data.coordinates : null;
        lastTrimmedIndexRef.current = 0;

        // Set destination for arrival notifications
        arrivalNotifications.setDestination({
          name: location.name,
          location: location.location,
        });

        // Start native background tracking (no-op on web)
        try {
          const ok = await backgroundLocation.ensurePermissions();
          if (ok) {
            await backgroundLocation.setDestination({
              lat: location.location.lat,
              lng: location.location.lng,
              radiusM: 100,
            });
            await backgroundLocation.startTracking({ intervalMs: 2000, minDistanceM: 5 });
          }
        } catch (e) {
          console.warn("Background tracking unavailable:", e);
        }
      } catch (error) {
        console.error("Failed to get route:", error);
      } finally {
        setLoadingRoute(false);
      }
    },
    [userPosition],
  );

  const recalculateRouteFromCurrentPosition = useCallback(
    async () => {
      if (!userPosition || !routingTo) return;

      const now = Date.now();
      if (
        lastRerouteTimeRef.current &&
        now - lastRerouteTimeRef.current < 10000
      ) {
        return;
      }
      if (isReroutingRef.current) return;

      isReroutingRef.current = true;
      setLoadingRoute(true);
      lastRerouteTimeRef.current = now;
      setLastRerouteAt(now);

      try {
        const data = await routingApi.route(
          userPosition[0],
          userPosition[1],
          routingTo.location.lat,
          routingTo.location.lng,
        );
        setRouteData(data || null);
        originalCoordsRef.current = data ? data.coordinates : null;
        lastTrimmedIndexRef.current = 0;
        setRouteStartPosition(userPosition);
        console.log("🔁 Route recalculated from current position");
      } catch (error) {
        console.error("Failed to recalculate route:", error);
      } finally {
        isReroutingRef.current = false;
        setLoadingRoute(false);
      }
    },
    [userPosition, routingTo],
  );

  // Auto-clear route if moved significantly from original start position
  useEffect(() => {
    if (!routeData || !routeStartPosition || !userPosition || !originalCoordsRef.current || originalCoordsRef.current.length === 0) return;

    const distanceKm = calculateDistanceKm(
      userPosition[0],
      userPosition[1],
      routeStartPosition[0],
      routeStartPosition[1],
    );
    const distanceMeters = distanceKm * 1000;

    if (distanceMeters < 30) return;

    const coords = originalCoordsRef.current;
    let nearestIdx = lastTrimmedIndexRef.current;
    let best = Infinity;
    for (let i = lastTrimmedIndexRef.current; i < coords.length; i++) {
      const d =
        calculateDistanceKm(userPosition[0], userPosition[1], coords[i][0], coords[i][1]) * 1000;
      if (d < best) {
        best = d;
        nearestIdx = i;
      }
    }

    if (nearestIdx > lastTrimmedIndexRef.current) {
      lastTrimmedIndexRef.current = nearestIdx;
      const newCoords = coords.slice(nearestIdx);
      setRouteData((prev) => (prev ? { ...prev, coordinates: newCoords } : prev));
    }
    const offRouteThresholdMeters = 150;
    if (best > offRouteThresholdMeters) {
      recalculateRouteFromCurrentPosition();
    }
  }, [userPosition, routeData, routeStartPosition, recalculateRouteFromCurrentPosition]);

  return {
    // state
    routeData,
    routingTo,
    routeStartPosition,
    lastRerouteAt,

    // controls
    routeTo,
    clearRoute,

    // status
    loadingRoute,
    navigationActive: !!routeData,
  } as const;
}
