import React from "react";
import { Polyline } from "react-leaflet";
import { RouteData } from "../../api/routingApi";

interface RouteDisplayProps {
  routeData: RouteData | null;
}

const RouteDisplay: React.FC<RouteDisplayProps> = ({ routeData }) => {
  if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
    return null;
  }

  return (
    <>
      {/* Background shadow line */}
      <Polyline
        positions={routeData.coordinates}
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
        positions={routeData.coordinates}
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
        positions={routeData.coordinates}
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
