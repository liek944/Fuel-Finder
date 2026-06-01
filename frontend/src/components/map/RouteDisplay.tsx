import React, { useMemo } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import { RouteData } from "../../api/routingApi";

type LatLngTuple = [number, number];

interface RouteDisplayProps {
  routeData: RouteData | null;
  traveledCoordinates?: LatLngTuple[];
  remainingCoordinates?: LatLngTuple[];
}

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

const RouteDisplay: React.FC<RouteDisplayProps> = ({ 
  routeData, 
  traveledCoordinates = [],
  remainingCoordinates 
}) => {
  if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
    return null;
  }

  // Use provided remainingCoordinates or fall back to full route
  const remainingPath = remainingCoordinates && remainingCoordinates.length > 0 
    ? remainingCoordinates 
    : routeData.coordinates;

  const remainingDistanceStr = useMemo(() => {
    if (!remainingPath || remainingPath.length < 2) return null;
    let distance = 0;
    for (let i = 0; i < remainingPath.length - 1; i++) {
      distance += calculateDistanceKm(
        remainingPath[i][0], remainingPath[i][1],
        remainingPath[i+1][0], remainingPath[i+1][1]
      );
    }
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }, [remainingPath]);

  return (
    <>
      {/* TRAVELED PORTION - Gray polyline showing where user has been */}
      {traveledCoordinates.length > 1 && (
        <>
          {/* Traveled: Background shadow line */}
          <Polyline
            positions={traveledCoordinates}
            pathOptions={{
              color: "#000000",
              weight: 9,
              opacity: 0.2,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          {/* Traveled: Main line - Gray */}
          <Polyline
            positions={traveledCoordinates}
            pathOptions={{
              color: "#9E9E9E",
              weight: 6,
              opacity: 0.7,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </>
      )}

      {/* REMAINING PORTION - Blue polyline showing route ahead */}
      {/* Background shadow line */}
      <Polyline
        positions={remainingPath}
        pathOptions={{
          color: "#000000",
          weight: 9,
          opacity: 0.3,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      {/* Main route line */}
      <Polyline
        positions={remainingPath}
        pathOptions={{
          color: "#1976D2",
          weight: 6,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }}
      >
        {remainingDistanceStr && (
          <Tooltip permanent direction="center" className="route-distance-tooltip">
            <div style={{ fontWeight: 'bold', color: '#1976D2' }}>
              {remainingDistanceStr}
            </div>
          </Tooltip>
        )}
      </Polyline>
      {/* Animated dashed overlay */}
      <Polyline
        positions={remainingPath}
        pathOptions={{
          color: "#42A5F5",
          weight: 4,
          opacity: 0.8,
          dashArray: "10, 15",
          lineCap: "round",
          lineJoin: "round",
        }}
        className="animated-route"
      />
    </>
  );
};

export default RouteDisplay;
