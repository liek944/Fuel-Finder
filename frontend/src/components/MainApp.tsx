import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getImageUrl, getApiUrl } from "../utils/api";

// Fix Leaflet's default icon issues
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Types
interface Station {
  id: number;
  name: string;
  brand: string;
  fuel_price: number;
  services: string[];
  address: string;
  phone?: string;
  operating_hours?: any;
  location: {
    lat: number;
    lng: number;
  };
  distance_meters?: number;
  images?: Array<{
    id: number;
    filename: string;
    original_filename: string;
    url: string;
    thumbnailUrl: string;
    alt_text?: string;
  }>;
}

interface POI {
  id: number;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  operating_hours?: any;
  location: {
    lat: number;
    lng: number;
  };
  distance_meters?: number;
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
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

// Create default icon
const DefaultIcon = new L.Icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [40, 60],
  iconAnchor: [20, 60],
  popupAnchor: [1, -34],
  shadowSize: [60, 60],
  className: "user-location-marker",
  zIndexOffset: 10000,
});

// Function to create brand-specific fuel station markers
const createFuelStationIcon = (brand: string, proximity?: number) => {
  const brandColors: { [key: string]: string } = {
    Shell: "#FFCC00",
    Petron: "#FF0000",
    Caltex: "#0066B2",
    Phoenix: "#FF6600",
    Unioil: "#00AA00",
    Seaoil: "#0066CC",
    Local: "#ff6b6b",
    default: "#ff6b6b",
  };

  const size = proximity ? Math.max(28, Math.min(44, 44 - proximity * 10)) : 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 20;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const color = brandColors[brand] || brandColors.default;

    // Draw pin shadow
    ctx.beginPath();
    ctx.arc(size / 2 + 4, size / 2 + 4, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fill();

    // Draw pin body
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw pin outline
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw fuel pump icon
    ctx.fillStyle = "#333";
    ctx.font = `${Math.floor(size * 0.4)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("⛽", size / 2, size / 2 + size * 0.1);
  }

  return new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [size, size + 20],
    iconAnchor: [size / 2, size + 20],
    popupAnchor: [0, -(size + 20)],
  });
};

// POI icon creator
const createPOIIcon = (type: string) => {
  const iconMap: { [key: string]: string } = {
    gas: "⛽",
    convenience: "🏪",
    repair: "🔧",
    car_wash: "🚗",
    motor_shop: "🏍️",
  };

  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 12;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Draw pin body
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#FF9800";
    ctx.fill();

    // Draw outline
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw icon
    ctx.font = `${Math.floor(size * 0.5)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#333";
    ctx.fillText(iconMap[type] || "📍", size / 2, size / 2 + size * 0.15);
  }

  return new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 12],
    popupAnchor: [0, -(size + 12)],
  });
};

// Distance calculation function
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// ImageSlideshow component
interface ImageSlideshowProps {
  images: Array<{
    id: number;
    filename: string;
    original_filename: string;
    url: string;
    thumbnailUrl: string;
    alt_text?: string;
  }>;
  entityId: string;
}

const ImageSlideshow: React.FC<ImageSlideshowProps> = ({
  images,
  entityId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div style={{ marginTop: 12, marginBottom: 8 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 200,
          backgroundColor: "#f5f5f5",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #ddd",
        }}
      >
        <img
          src={getImageUrl(currentImage.url)}
          alt={currentImage.alt_text || currentImage.original_filename}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getImageUrl(currentImage.thumbnailUrl);
          }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ←
            </button>

            <button
              onClick={nextImage}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              →
            </button>

            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 4,
              }}
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "none",
                    background:
                      index === currentIndex
                        ? "white"
                        : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#666",
            marginTop: 4,
          }}
        >
          {currentIndex + 1} of {images.length}
        </div>
      )}
    </div>
  );
};

const MainApp: React.FC = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routingTo, setRoutingTo] = useState<Station | POI | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] =
    useState<boolean>(false);
  const [selectedRouteType, setSelectedRouteType] = useState<string>("gas");

  // Get user location
  useEffect(() => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLoading(false);
      },
      (err) => {
        console.warn("Geolocation failed:", err);
        // Default to Oriental Mindoro center
        setPosition([12.5966, 121.5258]);
        setLoading(false);
      },
    );
  }, []);

  // Fetch nearby stations
  useEffect(() => {
    if (!position) return;

    const fetchStations = async () => {
      setLoading(true);
      try {
        const url = getApiUrl(
          `/api/stations/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
        );
        const response = await fetch(url);
        const data = await response.json();
        setStations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, [position, radiusMeters]);

  // Fetch POIs
  useEffect(() => {
    if (!position) return;

    const fetchPOIs = async () => {
      try {
        const url = getApiUrl(
          `/api/pois/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
        );
        const response = await fetch(url);
        const data = await response.json();
        setPois(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn("Failed to fetch POIs:", error);
      }
    };

    fetchPOIs();
  }, [position, radiusMeters]);

  // Filter stations based on search criteria
  const filteredStations = stations.filter((station) => {
    const matchesBrand =
      selectedBrand === "All" || station.brand === selectedBrand;
    const matchesPrice = station.fuel_price <= maxPrice;
    const matchesSearch =
      searchQuery === "" ||
      (station.name &&
        station.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (station.brand &&
        station.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (station.address &&
        station.address.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesBrand && matchesPrice && matchesSearch;
  });

  // Get route to station or POI
  const getRoute = async (location: Station | POI) => {
    if (!position) return;

    setRoutingTo(location);
    setLoading(true);

    try {
      const url = getApiUrl(
        `/api/route?start=${position[0]},${position[1]}&end=${location.location.lat},${location.location.lng}`,
      );
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Route API error: ${response.status}`);
      }
      const data = await response.json();
      setRouteData(data || null);
    } catch (error) {
      console.error("Failed to get route:", error);
    } finally {
      setLoading(false);
    }
  };

  // Clear route
  const clearRoute = () => {
    setRouteData(null);
    setRoutingTo(null);
  };

  // Check if a location is currently open based on operating hours
  const isLocationOpen = (operatingHours: any): boolean => {
    if (!operatingHours || !operatingHours.open || !operatingHours.close) {
      return true; // Assume open if no hours specified
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= operatingHours.open && currentTime <= operatingHours.close;
  };

  // Route to nearest POI of selected type
  const routeToNearestPOI = () => {
    if (!position) return;

    let locations: (Station | POI)[] = [];

    // Get locations based on selected type
    if (selectedRouteType === "gas") {
      locations = filteredStations;
    } else {
      locations = pois.filter(poi => poi.type === selectedRouteType);
    }

    if (locations.length === 0) {
      alert(`No ${selectedRouteType === "gas" ? "gas stations" : selectedRouteType.replace("_", " ")} found in the area.`);
      return;
    }

    // Sort by distance and filter by open status
    const sortedLocations = [...locations]
      .map(loc => ({
        location: loc,
        distance: calculateDistance(
          position[0],
          position[1],
          loc.location.lat,
          loc.location.lng,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    // Find the first open location
    let targetLocation = null;
    for (const item of sortedLocations) {
      const loc = item.location;
      if (isLocationOpen(loc.operating_hours)) {
        targetLocation = loc;
        break;
      }
    }

    // If no open location found, use the nearest one anyway
    if (!targetLocation && sortedLocations.length > 0) {
      targetLocation = sortedLocations[0].location;
      alert("The nearest location appears to be closed, but routing anyway.");
    }

    if (targetLocation) {
      getRoute(targetLocation);
    }
  };

  // Get unique brands for filter
  const uniqueBrands = Array.from(
    new Set(stations.map((station) => station.brand)),
  ).sort();

  if (!position) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          color: "#666",
        }}
      >
        {loading ? "Finding your location..." : "Loading map..."}
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 70,
          right: 10,
          zIndex: 1000,
          display: "flex",
          gap: 10,
          alignItems: "center",
          background: "rgba(255,255,255,0.95)",
          padding: "10px 15px",
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            color: "#333",
            flex: 1,
          }}
        >
          ⛽ Fuel Finder
        </h1>
      </div>

      {/* Map */}
      <MapContainer
        center={position}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          crossOrigin="anonymous"
        />

        {/* Search radius circle */}
        <Circle
          center={position}
          radius={radiusMeters}
          pathOptions={{
            color: "#1E88E5",
            weight: 2,
            fillColor: "#42A5F5",
            fillOpacity: 0.15,
          }}
        />

        {/* User location */}
        <Marker position={position} icon={DefaultIcon}>
          <Popup>
            <div>
              <b>📍 Your Location</b>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                Current position
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Route polyline with layered styling */}
        {routeData &&
          routeData.coordinates &&
          routeData.coordinates.length > 0 && (
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
          )}

        {/* Station markers */}
        {filteredStations.map((station) => {
          const distance = calculateDistance(
            position[0],
            position[1],
            station.location.lat,
            station.location.lng,
          );
          const proximity = Math.min(1, distance / 5); // 0-1 scale based on 5km max

          return (
            <Marker
              key={`station-${station.id}`}
              position={[station.location.lat, station.location.lng]}
              icon={createFuelStationIcon(station.brand, proximity)}
            >
              <Popup>
                <div style={{ minWidth: 250 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <b style={{ fontSize: 16 }}>⛽ {station.name}</b>
                    {routingTo?.id === station.id && (
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
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    <strong>Brand:</strong> {station.brand}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Price:</strong> ₱{station.fuel_price}/L
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
                      <strong>Phone:</strong> {station.phone}
                    </div>
                  )}

                  {/* Station Images */}
                  {station.images && station.images.length > 0 && (
                    <ImageSlideshow
                      images={station.images}
                      entityId={`station-${station.id}`}
                    />
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {routingTo?.id === station.id ? (
                      <button
                        onClick={clearRoute}
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
                        onClick={() => getRoute(station)}
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
                  </div>

                  {routeData && routingTo?.id === station.id && (
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
              </Popup>
            </Marker>
          );
        })}

        {/* POI markers */}
        {pois.map((poi) => (
          <Marker
            key={`poi-${poi.id}`}
            position={[poi.location.lat, poi.location.lng]}
            icon={createPOIIcon(poi.type)}
          >
            <Popup>
              <div>
                <b>{poi.name}</b>
                <div style={{ marginTop: 4, color: "#666" }}>
                  Type: {poi.type.replace("_", " ")}
                </div>
                {poi.address && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                    📍 {poi.address}
                  </div>
                )}
                {poi.phone && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                    📞 {poi.phone}
                  </div>
                )}
                {poi.operating_hours && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                    🕐 {poi.operating_hours.open} - {poi.operating_hours.close}
                  </div>
                )}
                <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                  Distance:{" "}
                  {calculateDistance(
                    position[0],
                    position[1],
                    poi.location.lat,
                    poi.location.lng,
                  ).toFixed(2)}{" "}
                  km
                </div>

                <div style={{ marginTop: 8 }}>
                  {routingTo?.id === poi.id ? (
                    <button
                      onClick={clearRoute}
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
                      onClick={() => getRoute(poi)}
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
                </div>

                {routeData && routingTo?.id === poi.id && (
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
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Search Controls */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 10,
          background: "rgba(255,255,255,0.95)",
          padding: "10px",
          borderRadius: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          zIndex: 1100,
          width: isSearchPanelCollapsed ? 150 : 240,
          maxHeight: "calc(100vh - 100px)",
          overflowY: "auto",
          fontSize: "13px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0, color: "#333", fontSize: "14px" }}>🔍 Filter</h3>
          <button
            onClick={() => setIsSearchPanelCollapsed(!isSearchPanelCollapsed)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isSearchPanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isSearchPanelCollapsed ? "⬇️" : "⬆️"}
          </button>
        </div>

        {!isSearchPanelCollapsed && (
          <>
            {/* Search bar */}
            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "12px",
                }}
              />
            </div>

            {/* Search radius */}
            <div style={{ marginBottom: 10 }}>
              <label
                style={{ display: "block", marginBottom: 3, fontWeight: 600, fontSize: "12px" }}
              >
                Radius: {(radiusMeters / 1000).toFixed(1)} km
              </label>
              <input
                type="range"
                min={500}
                max={15000}
                step={500}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Brand filter */}
            <div style={{ marginBottom: 10 }}>
              <label
                style={{ display: "block", marginBottom: 3, fontWeight: 600, fontSize: "12px" }}
              >
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "12px",
                }}
              >
                <option value="All">All Brands</option>
                {uniqueBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Price filter */}
            <div style={{ marginBottom: 10 }}>
              <label
                style={{ display: "block", marginBottom: 3, fontWeight: 600, fontSize: "12px" }}
              >
                Max: ₱{maxPrice}/L
              </label>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Results summary */}
            <div
              style={{
                background: "#f5f5f5",
                padding: "8px",
                borderRadius: 4,
                fontSize: 11,
                color: "#666",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2, fontSize: "12px" }}>📊 Results</div>
              <div>⛽ {filteredStations.length} stations</div>
              <div>📍 {pois.length} POIs</div>
              {loading && <div style={{ color: "#2196F3" }}>⏳ Loading...</div>}
            </div>

            {/* Route to Nearest POI Section */}
            <div style={{ marginTop: 10 }}>
              <label
                style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "12px" }}
              >
                🧭 Route To
              </label>
              <select
                value={selectedRouteType}
                onChange={(e) => setSelectedRouteType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "12px",
                  marginBottom: 8,
                }}
              >
                <option value="gas">⛽ Gas Station</option>
                <option value="convenience">🏪 Convenience Store</option>
                <option value="repair">🔧 Repair Shop</option>
                <option value="car_wash">🚗 Car Wash</option>
                <option value="motor_shop">🏍️ Motor Shop</option>
              </select>
              <button
                onClick={routeToNearestPOI}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = "#45a049";
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = "#4CAF50";
                  }
                }}
              >
                🚗 Go to Nearest
              </button>
            </div>
          </>
        )}

        {/* Collapsed view summary */}
        {isSearchPanelCollapsed && (
          <div
            style={{
              fontSize: 12,
              color: "#666",
              textAlign: "center",
            }}
          >
            <div>⛽ {filteredStations.length} stations</div>
            <div>📍 {pois.length} POIs</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>
              {(radiusMeters / 1000).toFixed(1)}km • {selectedBrand} • ₱
              {maxPrice}/L
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default MainApp;
