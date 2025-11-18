import React from "react";

interface MapOverlaysProps {
  children?: React.ReactNode;
}

/**
 * MapOverlays
 *
 * Wrapper for map overlay controls (settings, etc.) positioned
 * on the right side of the viewport. Mirrors the previous inline
 * styles used in MainApp for the fixed control column.
 */
const MapOverlays: React.FC<MapOverlaysProps> = ({ children }) => {
  const isNarrow =
    typeof window !== "undefined" && window.innerWidth <= 768;

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: isNarrow ? "20px" : "50%",
    right: isNarrow ? "16px" : "20px",
    transform: isNarrow ? "none" : "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: isNarrow ? "16px" : "12px",
    zIndex: 1000,
  };

  return <div style={containerStyle}>{children}</div>;
};

export default MapOverlays;

