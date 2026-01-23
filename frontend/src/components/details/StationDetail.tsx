import React from "react";
import ReviewWidget from "../ReviewWidget";
import ImageSlideshow from "../common/ImageSlideshow";
import SaveButton from "../common/SaveButton";

interface FuelPrice {
  fuel_type: string;
  price: number | string;
  price_updated_at?: string;
  price_updated_by?: string;
}

interface Station {
  id: number;
  name: string;
  brand: string;
  fuel_price: number;
  fuel_prices?: FuelPrice[];
  services: string[];
  address: string;
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

interface StationDetailProps {
  station: Station;
  distance: number;
  isOpen: boolean;
  isRoutingTo: boolean;
  routeData: RouteData | null;
  onGetDirections: () => void;
  onClearRoute: () => void;
}

const StationDetail: React.FC<StationDetailProps> = React.memo(({
  station,
  distance,
  isOpen,
  isRoutingTo,
  routeData,
  onGetDirections,
  onClearRoute,
}) => {
  return (
    <div style={{ minWidth: 250 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <b style={{ fontSize: 16 }}>⛽ {station.name}</b>
        <SaveButton stationId={station.id} size="small" />
        {isRoutingTo && (
          <span
            style={{
              background: "#4CAF50",
              color: "white",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            ROUTING
          </span>
        )}
        {!isOpen && (
          <span
            style={{
              background: "#f44336",
              color: "white",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            CLOSED
          </span>
        )}
      </div>

      <div style={{ marginBottom: 4 }}>
        <strong>Brand:</strong> {station.brand}
      </div>

      {/* Display fuel prices */}
      <div style={{ marginBottom: 4 }}>
        <strong>Fuel Prices:</strong>
        {station.fuel_prices && station.fuel_prices.length > 0 ? (
          <div style={{ marginLeft: 8, marginTop: 4 }}>
            {station.fuel_prices.map((fp) => (
              <div
                key={fp.fuel_type}
                style={{ fontSize: 12, marginBottom: 2 }}
              >
                <span style={{ fontWeight: 500 }}>
                  {fp.fuel_type}:
                </span>{" "}
                {(() => {
                  const numericPrice = Number(fp.price);
                  const hasPrice = Number.isFinite(numericPrice) && numericPrice > 0;
                  if (!hasPrice) {
                    return <span>Unknown</span>;
                  }
                  return (
                    <>
                      ₱{numericPrice.toFixed(2)}/L
                      {fp.price_updated_by === "owner" && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#2563eb",
                            marginLeft: 4,
                            fontWeight: 500,
                          }}
                        >
                          (verified by owner)
                        </span>
                      )}
                      {fp.price_updated_by === "community" && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#666",
                            marginLeft: 4,
                          }}
                        >
                          (community)
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          (() => {
            const numericPrice = Number(station.fuel_price);
            const hasPrice = Number.isFinite(numericPrice) && numericPrice > 0;
            return <span> {hasPrice ? `₱${numericPrice.toFixed(2)}/L` : "Unknown"}</span>;
          })()
        )}
      </div>

      <div style={{ marginBottom: 4 }}>
        <strong>Distance:</strong> {distance.toFixed(2)} km
      </div>

      {station.services.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <strong>Services:</strong> {station.services.join(", ")}
        </div>
      )}

      {station.address && (
        <div style={{ marginBottom: 4 }}>
          <strong>Address:</strong> {station.address}
        </div>
      )}

      {station.phone && (
        <div style={{ marginBottom: 8 }}>
          <strong>Phone:</strong>{" "}
          <a
            href={`tel:${station.phone}`}
            style={{
              color: "#2196F3",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {station.phone}
          </a>
        </div>
      )}

      {station.operating_hours && (
        <div
          style={{ marginBottom: 8, fontSize: 12, color: "#666" }}
        >
          <strong>🕐 Hours:</strong> {station.operating_hours.open}{" "}
          - {station.operating_hours.close}
        </div>
      )}

      {/* Station Images */}
      {station.images && station.images.length > 0 && (
        <ImageSlideshow images={station.images} />
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
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
        {station.phone && (
          <a
            href={`tel:${station.phone}`}
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


      {/* Reviews Widget */}
      <ReviewWidget
        targetType="station"
        targetId={station.id}
        targetName={station.name}
      />
    </div>
  );
});

StationDetail.displayName = 'StationDetail';

export default StationDetail;
