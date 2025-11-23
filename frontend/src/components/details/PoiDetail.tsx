import React from "react";
import ReviewWidget from "../ReviewWidget";
import ImageSlideshow from "../common/ImageSlideshow";

interface POI {
  id: number;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  operating_hours?: {
    open: string;
    close: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  images?: Array<{
    id: number;
    filename: string;
    original_filename: string;
    url: string;
    thumbnailUrl: string;
    alt_text?: string;
  }>;
}

interface RouteData {
  distance: number;
  duration: number;
}

interface PoiDetailProps {
  poi: POI;
  distance: number;
  isRoutingTo: boolean;
  routeData: RouteData | null;
  onGetDirections: () => void;
  onClearRoute: () => void;
}

const formatPoiType = (type: string) => {
  const formatted = type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return formatted === "Convenience" ? "Convenience Store" : formatted;
};

const PoiDetail: React.FC<PoiDetailProps> = React.memo(({
  poi,
  distance,
  isRoutingTo,
  routeData,
  onGetDirections,
  onClearRoute,
}) => {
  return (
    <div>
      <b>{poi.name}</b>
      <div style={{ marginTop: 4, color: "#666" }}>
        {formatPoiType(poi.type)}
      </div>

      {poi.address && (
        <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
          📍 {poi.address}
        </div>
      )}

      {poi.phone && (
        <div style={{ marginTop: 4, fontSize: 12 }}>
          📞{" "}
          <a
            href={`tel:${poi.phone}`}
            style={{
              color: "#2196F3",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {poi.phone}
          </a>
        </div>
      )}

      {poi.operating_hours && (
        <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
          🕐 {poi.operating_hours.open} - {poi.operating_hours.close}
        </div>
      )}

      {/* POI Images */}
      {poi.images && poi.images.length > 0 && (
        <ImageSlideshow images={poi.images} />
      )}

      <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
        Distance: {distance.toFixed(2)} km
      </div>

      {/* Reviews Widget */}
      <ReviewWidget
        targetType="poi"
        targetId={poi.id}
        targetName={poi.name}
      />

      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isRoutingTo ? (
          <button
            onClick={onClearRoute}
            style={{
              background: "#f44336",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            ❌ Clear Route
          </button>
        ) : (
          <button
            onClick={onGetDirections}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            🗺️ Get Directions
          </button>
        )}
        {poi.phone && (
          <a
            href={`tel:${poi.phone}`}
            style={{
              background: "#2196F3",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            📞 Call
          </a>
        )}
      </div>

      {routeData && isRoutingTo && (
        <div
          style={{
            marginTop: 8,
            padding: "8px",
            background: "#e8f5e8",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <div>
            <strong>Distance:</strong>{" "}
            {(routeData.distance / 1000).toFixed(1)} km
          </div>
          <div>
            <strong>Duration:</strong>{" "}
            {Math.round(routeData.duration / 60)} min
          </div>
        </div>
      )}
    </div>
  );
});

PoiDetail.displayName = 'PoiDetail';

export default PoiDetail;
