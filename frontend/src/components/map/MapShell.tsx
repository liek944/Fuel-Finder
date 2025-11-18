import React from "react";
import { MapContainer } from "react-leaflet";

interface MapShellProps {
  center: [number, number];
  zoom: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * MapShell
 *
 * Thin wrapper around react-leaflet MapContainer to centralize
 * base map configuration. All map content is provided via children.
 */
const MapShell: React.FC<MapShellProps> = ({ center, zoom, style, children }) => {
  return (
    <MapContainer center={center} zoom={zoom} style={style}>
      {children}
    </MapContainer>
  );
};

export default MapShell;

