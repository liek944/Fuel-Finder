import React from "react";
import { useMap } from "react-leaflet";

interface CenterToLocationButtonProps {
  position: [number, number] | null;
}

/**
 * Simple component to center map to user location.
 * Displays a blue circular button with a location pin emoji.
 */
const CenterToLocationButton: React.FC<CenterToLocationButtonProps> = ({ position }) => {
  const map = useMap();

  return (
    <button
      onClick={() => {
        if (position) {
          map.flyTo(position, map.getZoom(), {
            duration: 0.5,
          });
          console.log("📍 Manually centered to user location");
        }
      }}
      className="center-location-button"
      style={{
        position: "fixed",
        top: "50%",
        right: "20px",
        transform: "translateY(-50%)",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        background: "#2196F3",
        color: "white",
        border: "3px solid white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        cursor: "pointer",
        fontSize: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        zIndex: 1000,
      }}
      title="Center to my location"
      aria-label="Center map to my location"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
        e.currentTarget.style.background = "#1976D2";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(-50%) scale(1)";
        e.currentTarget.style.background = "#2196F3";
      }}
    >
      📍
    </button>
  );
};

export default CenterToLocationButton;
