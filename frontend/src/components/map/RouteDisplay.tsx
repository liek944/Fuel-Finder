import React from "react";
import { Polyline } from "react-leaflet";
import { RouteData } from "../../api/routingApi";

type LatLngTuple = [number, number];

interface RouteDisplayProps {
  routeData: RouteData | null;
  traveledCoordinates?: LatLngTuple[];
  remainingCoordinates?: LatLngTuple[];
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
      />
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
