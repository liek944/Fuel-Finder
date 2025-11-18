import { useCallback, useEffect, useState } from "react";
import { routingApi, RouteData } from "../api/routingApi";
import { arrivalNotifications } from "../utils/arrivalNotifications";

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

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRoutingTo(null);
    setRouteStartPosition(null);

    // Clear destination from arrival notifications
    arrivalNotifications.clearDestination();
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

        // Set destination for arrival notifications
        arrivalNotifications.setDestination({
          name: location.name,
          location: location.location,
        });
      } catch (error) {
        console.error("Failed to get route:", error);
      } finally {
        setLoadingRoute(false);
      }
    },
    [userPosition],
  );

  // Auto-clear route if moved significantly from original start position
  useEffect(() => {
    if (!routeData || !routeStartPosition || !userPosition) return;

    const distanceKm = calculateDistanceKm(
      userPosition[0],
      userPosition[1],
      routeStartPosition[0],
      routeStartPosition[1],
    );
    const distanceMeters = distanceKm * 1000;

    if (distanceMeters > 100) {
      console.log(
        `🧭 Auto-clearing route - moved ${Math.round(distanceMeters)}m from original start position`,
      );
      clearRoute();
    }
  }, [userPosition, routeData, routeStartPosition, clearRoute]);

  return {
    // state
    routeData,
    routingTo,
    routeStartPosition,

    // controls
    routeTo,
    clearRoute,

    // status
    loadingRoute,
    navigationActive: !!routeData,
  } as const;
}
