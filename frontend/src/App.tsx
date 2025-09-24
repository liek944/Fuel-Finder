import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default icon issues
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import { Icon } from "leaflet";

// Create a default icon that can be used with the Marker component
const DefaultIcon = new Icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [40, 60], // Much larger icon
  iconAnchor: [20, 60],
  popupAnchor: [1, -34],
  shadowSize: [60, 60],
  className: "user-location-marker",
  zIndexOffset: 10000, // Extremely high z-index to ensure visibility
});

// Function to create brand-specific fuel station markers
const createFuelStationIcon = (brand: string, proximity?: number) => {
  // Define brand-specific colors
  const brandColors: { [key: string]: string } = {
    Shell: "#FFCC00", // Yellow
    Petron: "#FF0000", // Red
    Caltex: "#0066B2", // Blue
    default: "#ff6b6b", // Pink (default)
  };

  // Calculate size based on proximity (closer = bigger)
  // Keep sizes moderate to avoid overlap: 28px - 44px
  const size = proximity ? Math.max(28, Math.min(44, 44 - proximity * 10)) : 36;

  // Create a canvas to draw our custom fuel station pin
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 20; // Extra height for the pin's "tail"
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Draw pin with brand color
    const color = brandColors[brand] || brandColors.default;

    // Draw pin shadow (larger offset for more visibility)
    ctx.beginPath();
    ctx.arc(size / 2 + 4, size / 2 + 4, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fill();

    // Draw pin body - brighter colors and thicker stroke
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    // Make colors more vibrant
    ctx.fillStyle =
      color === "#FFCC00"
        ? "#FFE500"
        : color === "#FF0000"
          ? "#FF2200"
          : color === "#0066B2"
            ? "#0088FF"
            : "#FF6B6B";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "white";
    ctx.stroke();

    // Draw the pin's "tail"
    ctx.beginPath();
    ctx.moveTo(size / 2 - 6, size - 2);
    ctx.lineTo(size / 2, size + 15);
    ctx.lineTo(size / 2 + 6, size - 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();

    // Draw fuel pump icon or text - much larger and with outline
    ctx.font = `bold ${size / 1.8}px Arial`;
    // Text with outline for better visibility
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeText("⛽", size / 2, size / 2);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛽", size / 2, size / 2);
  }

  // Convert canvas to data URL
  const iconUrl = canvas.toDataURL();

  // Align iconSize to the actual canvas height and anchor to the tip of the tail
  return new Icon({
    iconUrl: iconUrl,
    iconSize: [size, size + 20],
    iconAnchor: [size / 2, size + 15], // Bottom center (tip) of the pin
    popupAnchor: [0, -(size + 15)],
    className: "custom-fuel-station-marker",
    zIndexOffset: 99999, // Ensure visibility above map elements
  });
};

// Function to create custom POI icons (gas, convenience, repair)
const createPOIIcon = (type: "gas" | "convenience" | "repair") => {
  const typeConfig: Record<string, { color: string; glyph: string }> = {
    gas: { color: "#FF9800", glyph: "⛽" },
    convenience: { color: "#4CAF50", glyph: "🏪" },
    repair: { color: "#9C27B0", glyph: "🛠️" },
  };

  const cfg = typeConfig[type] || typeConfig.gas;
  const size = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 18;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // shadow
    ctx.beginPath();
    ctx.arc(size / 2 + 3, size / 2 + 3, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "white";
    ctx.stroke();

    // tail
    ctx.beginPath();
    ctx.moveTo(size / 2 - 5, size - 3);
    ctx.lineTo(size / 2, size + 12);
    ctx.lineTo(size / 2 + 5, size - 3);
    ctx.fillStyle = cfg.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();

    // glyph
    ctx.font = `bold ${size / 2}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeText(cfg.glyph, size / 2, size / 2);
    ctx.fillStyle = "white";
    ctx.fillText(cfg.glyph, size / 2, size / 2);
  }
  const iconUrl = canvas.toDataURL();
  return new Icon({
    iconUrl,
    iconSize: [size, size + 18],
    iconAnchor: [size / 2, size + 12],
    popupAnchor: [0, -(size + 12)],
    className: "custom-poi-marker",
    zIndexOffset: 99999,
  });
};

// Set the default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

interface Station {
  id: number;
  name: string;
  brand: string;
  fuel_price?: number;
  services?: string[];
  address?: string;
  phone?: string;
  operating_hours?: any;
  distance_meters?: number;
  location: {
    lat: number;
    lng: number;
  };
}

interface CustomMarker {
  id: string;
  name: string;
  type: "gas" | "convenience" | "repair";
  lat: number;
  lng: number;
}

// Backend-persisted POI
interface Poi {
  id: number;
  name: string;
  type: "gas" | "convenience" | "repair";
  location: { lat: number; lng: number };
  distance_meters?: number;
}

function App() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [fetchKey, setFetchKey] = useState<number>(Date.now());
  // Search/display radius in meters (controls backend query and which markers appear)
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  // Routing state
  const [selectedStationForRoute, setSelectedStationForRoute] = useState<Station | null>(null);
  const [routeData, setRouteData] = useState<{
    coordinates: [number, number][];
    distance: number;
    duration: number;
    distance_km: number;
    duration_minutes: number;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Add-station flow state
  const [addingMode, setAddingMode] = useState<boolean>(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formBrand, setFormBrand] = useState<string>("Local");
  const [formFuelPrice, setFormFuelPrice] = useState<string>("");
  const [formServices, setFormServices] = useState<string>("");
  const [formAddress, setFormAddress] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formHours, setFormHours] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [adminApiKey, setAdminApiKey] = useState<string>("");
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Custom markers state (local-only, stored in localStorage)
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);
  const [newMarkerName, setNewMarkerName] = useState<string>("");
  const [newMarkerType, setNewMarkerType] = useState<CustomMarker["type"]>("convenience");
  const [newMarkerLat, setNewMarkerLat] = useState<string>("");
  const [newMarkerLng, setNewMarkerLng] = useState<string>("");

  // Backend POIs
  const [pois, setPois] = useState<Poi[]>([]);



  useEffect(() => {
    let watchId: number | null = null;

    const onSuccess = (pos: GeolocationPosition) => {
      const userPosition = [pos.coords.latitude, pos.coords.longitude];
      setPosition(userPosition as [number, number]);
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };

    const onError = (err: GeolocationPositionError) => {
      console.log(err);
      // Default to a location in Roxas, Oriental Mindoro if geolocation fails
      setPosition([12.583, 121.5056]);
      setUserCoords({ lat: 12.583, lng: 121.5056 });
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(onSuccess, onError);

    // Watch for position changes
    try {
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      });
    } catch (e) {
      console.warn("watchPosition not available", e);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Load admin API key and custom markers from localStorage on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("admin_api_key") || "";
      if (savedKey) {
        setAdminApiKey(savedKey);
        setApiKey(savedKey);
      }
      const savedMarkers = localStorage.getItem("custom_markers_v1");
      if (savedMarkers) {
        const arr = JSON.parse(savedMarkers);
        if (Array.isArray(arr)) setCustomMarkers(arr);
      }
    } catch (_) {}
  }, []);

  // Persist custom markers when changed
  useEffect(() => {
    try {
      localStorage.setItem("custom_markers_v1", JSON.stringify(customMarkers));
    } catch (_) {}
  }, [customMarkers]);

  // Fetch POIs from backend (nearby if we know position, else all)
  useEffect(() => {
    const fetchPois = async () => {
      try {
        let url = "http://localhost:3001/api/pois";
        if (position) {
          url = `http://localhost:3001/api/pois/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}&_=${fetchKey}`;
        }
        const res = await fetch(url, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        if (!res.ok) throw new Error(`POIs HTTP ${res.status}`);
        const data: Poi[] = await res.json();
        setPois(data);
      } catch (e) {
        // Keep silent; local custom markers will still render
        console.warn("POIs fetch failed:", e);
      }
    };
    fetchPois();
  }, [position, fetchKey, radiusMeters]);

  useEffect(() => {
    if (!position) return;
    console.log("Fetching nearby stations from backend (Overpass)...");
    setLoading(true);

    const controller = new AbortController();
    const url = `http://localhost:3001/api/stations/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}&_=${fetchKey}`;

    fetch(url, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      signal: controller.signal,
    })
      .then((res) => {
        console.log("API response status:", res.status);
        if (!res.ok) {
          throw new Error("Network response was not ok: " + res.status);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Nearby stations data received:", data);
        setStations(data);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name === "AbortError") return; // ignore aborted
        console.error("Error fetching stations:", error);
        setError(error.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [position, fetchKey, radiusMeters]);
  console.log("Rendering with:", { position, stations, loading, error });

  // Add custom CSS for marker animation
  useEffect(() => {
    // Add a style tag for animations and z-index fixes
    const style = document.createElement("style");
    style.textContent = `
      .custom-fuel-station-marker {
        transition: transform 0.3s ease;
        z-index: 99999 !important;
        /* Keep the pointer anchored while scaling */
        transform-origin: 50% 100%;
      }
      /* Pop-in animation when a marker first appears (e.g., as you get near) */
      @keyframes popIn {
        0% { transform: scale(0.01); opacity: 0; }
        60% { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .marker-loaded { animation: popIn 240ms ease-out; }
      .custom-fuel-station-marker:hover {
        transform: scale(1.05);
        z-index: 999999 !important;
        filter: drop-shadow(0px 10px 20px rgba(0,0,0,0.9)) !important;
      }
      .user-location-marker {
        z-index: 8000 !important;
      }
      .leaflet-marker-icon {
        transition: transform 0.3s;
        pointer-events: auto !important;
        /* Ensure all marker scaling keeps the tip fixed at the coordinate */
        transform-origin: 50% 100%;
      }
      /* Override ALL leaflet z-indexes to ensure our markers are on top */
      .leaflet-pane {
        z-index: 400 !important;
      }
      .leaflet-tile-pane {
        z-index: 200 !important;
      }
      .leaflet-shadow-pane {
        z-index: 500 !important;
      }
      .leaflet-marker-pane {
        z-index: 90000 !important;
      }
      .leaflet-tooltip-pane {
        z-index: 95000 !important;
      }
      .leaflet-popup-pane {
        z-index: 99000 !important;
      }
      /* Force our markers above everything */
      .leaflet-marker-icon {
        z-index: 99999 !important;
      }
      /* Style for the legend */
      .map-legend {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.9);
        padding: 10px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        font-family: Arial, sans-serif;
      }
      .legend-item {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
      }
      .legend-color {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        margin-right: 8px;
        border: 1px solid white;
      }
      .legend-label {
        font-size: 12px;
      }
      .legend-title {
        font-weight: bold;
        margin-bottom: 5px;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fit map to route bounds when a new route is loaded
  useEffect(() => {
    const m = mapRef.current;
    if (m && routeData && routeData.coordinates && routeData.coordinates.length > 1) {
      const bounds = L.latLngBounds(routeData.coordinates);
      m.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [routeData]);

  // Function to fetch route from OSRM
  const fetchRoute = async (station: Station) => {
    if (!userCoords) {
      setRouteError("User location not available");
      return;
    }

    setRouteLoading(true);
    setRouteError(null);
    setSelectedStationForRoute(station);

    try {
      const startCoords = `${userCoords.lat},${userCoords.lng}`;
      const endCoords = `${station.location.lat},${station.location.lng}`;

      console.log(`🗺️ Fetching route: ${startCoords} -> ${endCoords}`);

      const response = await fetch(
        `http://localhost:3001/api/route?start=${startCoords}&end=${endCoords}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errorData = await response.json();
            message = errorData.message || errorData.error || message;
          } else {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              message = `${message} - ${text.substring(0, 200)}`;
            }
          }
        } catch (e) {
          // Ignore parse failures and use default message
        }
        throw new Error(message);
      }

      const routeData = await response.json();
      setRouteData(routeData);
      console.log(`✅ Route loaded: ${routeData.distance_km}km, ${routeData.duration_minutes}min`);
    } catch (error) {
      console.error("❌ Error fetching route:", error);
      setRouteError(error instanceof Error ? error.message : "Failed to fetch route");
    } finally {
      setRouteLoading(false);
    }
  };

  const isAdminEnabled = !!adminApiKey.trim();

  const handleAdminEnable = () => {
    try {
      localStorage.setItem("admin_api_key", adminApiKey.trim());
      setApiKey(adminApiKey.trim());
    } catch (_) {}
  };

  const handleAdminDisable = () => {
    try {
      localStorage.removeItem("admin_api_key");
    } catch (_) {}
    setAdminApiKey("");
    setApiKey("");
    setAddingMode(false);
    setPendingLatLng(null);
  };

  // Add a custom marker: if admin enabled, persist to backend; else save locally
  const addCustomMarker = async () => {
    const lat = parseFloat(newMarkerLat);
    const lng = parseFloat(newMarkerLng);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      alert("Please provide valid coordinates");
      return;
    }
    const name = newMarkerName || newMarkerType;
    if (isAdminEnabled) {
      try {
        const res = await fetch("http://localhost:3001/api/pois", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminApiKey.trim() ? { "x-api-key": adminApiKey.trim() } : {}),
          },
          body: JSON.stringify({ name, type: newMarkerType, lat, lng }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || `HTTP ${res.status}`);
        }
        const created: Poi = await res.json();
        setPois((prev) => [created, ...prev]);
        setNewMarkerName("");
        setNewMarkerLat("");
        setNewMarkerLng("");
        return;
      } catch (e: any) {
        alert(`Failed to save POI to server: ${e?.message || e}`);
      }
    }
    // Fallback to local-only
    const m: CustomMarker = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      type: newMarkerType,
      lat,
      lng,
    };
    setCustomMarkers((prev) => [m, ...prev]);
    setNewMarkerName("");
    setNewMarkerLat("");
    setNewMarkerLng("");
  };

  const removeCustomMarker = (id: string) => {
    setCustomMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const removePoi = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:3001/api/pois/${id}`, {
        method: "DELETE",
        headers: {
          ...(adminApiKey.trim() ? { "x-api-key": adminApiKey.trim() } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setPois((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(`Failed to delete POI: ${e?.message || e}`);
    }
  };

  // Function to clear route
  const clearRoute = () => {
    setSelectedStationForRoute(null);
    setRouteData(null);
    setRouteError(null);
  };

  // Component to capture map clicks when adding mode is enabled
  const AddStationClickCatcher: React.FC<{ enabled: boolean; onSelect: (lat: number, lng: number) => void }> = ({ enabled, onSelect }) => {
    useMapEvents({
      click(e) {
        if (enabled) {
          onSelect(e.latlng.lat, e.latlng.lng);
        }
      },
    });
    return null;
  };

  const resetAddForm = () => {
    setFormName("");
    setFormBrand("Local");
    setFormFuelPrice("");
    setFormServices("");
    setFormAddress("");
    setFormPhone("");
    setFormHours("");
    setApiKey("");
    setFormMsg(null);
  };

  const cancelAdding = () => {
    setAddingMode(false);
    setPendingLatLng(null);
    resetAddForm();
  };

  const handleSubmitAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLatLng || !isFinite((pendingLatLng as any).lat) || !isFinite((pendingLatLng as any).lng)) {
      setFormMsg({ type: "error", text: "Please provide valid latitude and longitude" });
      return;
    }
    setFormSubmitting(true);
    setFormMsg(null);
    try {
      const payload: any = {
        name: formName,
        brand: formBrand,
        fuel_price: formFuelPrice ? Number(formFuelPrice) : null,
        services: formServices,
        address: formAddress,
        phone: formPhone,
        operating_hours: formHours,
        lat: pendingLatLng.lat,
        lng: pendingLatLng.lng,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey.trim()) headers["x-api-key"] = apiKey.trim();

      const res = await fetch("http://localhost:3001/api/stations", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      const created: Station = await res.json();

      // Add to current list and refresh nearby fetch to keep consistent with backend
      setStations((prev) => [created, ...prev]);
      setFetchKey(Date.now());

      setFormMsg({ type: "success", text: "Station created successfully" });
      // Exit add mode after short delay
      setTimeout(() => {
        cancelAdding();
      }, 800);
    } catch (err: any) {
      setFormMsg({ type: "error", text: err?.message || "Failed to create station" });
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!position) {
    return (
      <div className="loading-container">
        <p>Getting your location...</p>
      </div>
    );
  }

  if (error) {
    console.error("Rendering error state:", error);
    return (
      <div className="error-message">
        <p>Error: {error}</p>
        <button
          onClick={() => {
            setFetchKey(Date.now());
            setError(null);
          }}
          style={{ marginTop: "10px", padding: "5px 10px" }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Define brand colors for the legend
  const brandColors: { [key: string]: string } = {
    Shell: "#FFCC00", // Yellow
    Petron: "#FF0000", // Red
    Caltex: "#0066B2", // Blue
    Local: "#8B4513", // Brown for independent stations
    User: "#1E88E5", // Blue for user location
  };

  // Only show stations within this radius to create the "pop when near" effect
  const NEARBY_RADIUS_M = radiusMeters; // user-controlled

  return (
    <div className="App">
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
        zoomControl={true}
        attributionControl={true}
        preferCanvas={true}
        ref={mapRef}
      >
        {/* Add Station Mode: capture map clicks */}
        <AddStationClickCatcher
          enabled={addingMode && isAdminEnabled}
          onSelect={(lat, lng) => {
            setPendingLatLng({ lat, lng });
          }}
        />
        {/* Radius control overlay */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 20,
            background: "rgba(255,255,255,0.95)",
            padding: "10px 12px",
            borderRadius: 8,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 1000,
            width: 260,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Search radius</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range"
              min={500}
              max={15000}
              step={500}
              value={radiusMeters}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRadiusMeters(v);
                setFetchKey(Date.now()); // trigger refresh immediately
              }}
              style={{ flex: 1 }}
            />
            <div style={{ width: 64, textAlign: "right", fontWeight: 600 }}>
              {(radiusMeters / 1000).toFixed(1)} km
            </div>
          </div>
        </div>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* Visualize the current search/display radius */}
        {position && (
          <Circle
            center={userCoords ? [userCoords.lat, userCoords.lng] : position}
            radius={radiusMeters}
            pathOptions={{
              color: "#1E88E5",
              weight: 2,
              fillColor: "#42A5F5",
              fillOpacity: 0.15,
            }}
          />
        )}
        <Marker position={position} icon={DefaultIcon}>
          <Popup>
            <b>Your Location</b>
            <div style={{ marginTop: "5px", fontSize: "12px", color: "#666" }}>
              Current position
            </div>
          </Popup>
        </Marker>

        {/* Pending marker for new station location */}
        {pendingLatLng && isAdminEnabled && (
          <Marker
            position={[pendingLatLng.lat, pendingLatLng.lng]}
            icon={createFuelStationIcon(formBrand || "Local", 0)}
          >
            <Popup>
              <b>New Station Location</b>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                {pendingLatLng.lat.toFixed(6)}, {pendingLatLng.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
        {/* Draw route polyline when available */}
        {routeData && routeData.coordinates && routeData.coordinates.length > 0 && (
          <Polyline
            positions={routeData.coordinates}
            pathOptions={{ color: "#2E7D32", weight: 5, opacity: 0.85 }}
          />
        )}
        {(userCoords
          ? stations.filter(
              (station) =>
                calculateDistance(
                  userCoords.lat,
                  userCoords.lng,
                  station.location.lat,
                  station.location.lng,
                ) *
                  1000 <=
                NEARBY_RADIUS_M,
            )
          : stations
        ).map((station) => {
          // Calculate proximity (0-1 value where 0 is close, 1 is far)
          let proximity = 1; // Default to furthest
          if (userCoords) {
            const distance = calculateDistance(
              userCoords.lat,
              userCoords.lng,
              station.location.lat,
              station.location.lng,
            );
            // Convert distance to a 0-1 scale (0 = closest, 1 = furthest)
            // Assuming max distance of interest is 5km to make ALL stations very prominent
            proximity = Math.min(1, distance / 5);
          }

          // Only log in development
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `Station ${station.id}: ${station.name} (${station.brand}) - proximity: ${proximity.toFixed(2)}`,
            );
          }
          return (
            <Marker
              key={station.id}
              position={[station.location.lat, station.location.lng]}
              icon={createFuelStationIcon(station.brand, proximity)}
              eventHandlers={{
                add: (e) => {
                  // Add staggered animation delay based on station id
                  setTimeout(
                    () => {
                      if (e.target && e.target._icon) {
                        e.target._icon.classList.add("marker-loaded");
                        e.target._icon.style.animationDelay = `${station.id * 150}ms`;
                        // Force higher z-index to ensure visibility
                        e.target._icon.style.zIndex = "99999";
                        // Add glowing effect
                        e.target._icon.style.filter =
                          "drop-shadow(0 0 10px " +
                          (station.brand === "Shell"
                            ? "#FFE500"
                            : station.brand === "Petron"
                              ? "#FF2200"
                              : station.brand === "Caltex"
                                ? "#0088FF"
                                : "#FF6B6B") +
                          ")";
                      }
                    },
                    100 + station.id * 150,
                  );
                },
              }}
            >
              <Popup>
                <b>{station.name}</b>
                <br />
                <span
                  style={{
                    fontWeight: "bold",
                    color:
                      station.brand === "Shell"
                        ? "#FFCC00"
                        : station.brand === "Petron"
                          ? "#FF0000"
                          : station.brand === "Caltex"
                            ? "#0066B2"
                            : "#666",
                  }}
                >
                  {station.brand}
                </span>

                {/* Fuel Price */}
                {station.fuel_price &&
                  !isNaN(Number(station.fuel_price)) &&
                  Number(station.fuel_price) > 0 && (
                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      ⛽ ₱{Number(station.fuel_price).toFixed(2)}/L
                    </div>
                  )}

                {/* Address */}
                {station.address && (
                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    📍 {station.address}
                  </div>
                )}

                {/* Phone */}
                {station.phone && (
                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    📞 {station.phone}
                  </div>
                )}

                {/* Services */}
                {station.services && station.services.length > 0 && (
                  <div style={{ marginTop: "5px", fontSize: "11px" }}>
                    <strong>Services:</strong> {station.services.join(", ")}
                  </div>
                )}

                {/* Distance from database or calculated */}
                {station.distance_meters ? (
                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    📏 {(station.distance_meters / 1000).toFixed(2)} km away
                  </div>
                ) : (
                  userCoords && (
                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                    >
                      📏{" "}
                      {calculateDistance(
                        userCoords.lat,
                        userCoords.lng,
                        station.location.lat,
                        station.location.lng,
                      ).toFixed(2)}{" "}
                      km away
                    </div>
                  )
                )}

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  Click for details
                </div>

                {/* Route button */}
                <div style={{ marginTop: "8px", display: "flex", gap: 8 }}>
                  <button
                    onClick={() => fetchRoute(station)}
                    disabled={routeLoading && selectedStationForRoute?.id === station.id}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "#1E88E5",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {routeLoading && selectedStationForRoute?.id === station.id
                      ? "Routing..."
                      : "Route from my location"}
                  </button>
                  {routeData && selectedStationForRoute?.id === station.id && (
                    <button
                      onClick={clearRoute}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: "white",
                        color: "#333",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render backend POIs */}
        {pois.map((m) => (
          <Marker key={`poi_${m.id}`} position={[m.location.lat, m.location.lng]} icon={createPOIIcon(m.type)}>
            <Popup>
              <b>{m.name}</b>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>{m.type}</div>
              {typeof m.distance_meters === "number" && (
                <div style={{ marginTop: 4, fontSize: 12 }}>📏 {(m.distance_meters / 1000).toFixed(2)} km</div>
              )}
              <div style={{ marginTop: 4, fontSize: 12 }}>
                {m.location.lat.toFixed(6)}, {m.location.lng.toFixed(6)}
              </div>
              {isAdminEnabled && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => removePoi(m.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      background: "white",
                      color: "#333",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Render custom markers */}
        {customMarkers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={createPOIIcon(m.type)}>
            <Popup>
              <b>{m.name}</b>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>{m.type}</div>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                {m.lat.toFixed(6)}, {m.lng.toFixed(6)}
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => removeCustomMarker(m.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "white",
                    color: "#333",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Remove
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {loading && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              zIndex: 1000,
            }}
          >
            Loading stations...
          </div>
        )}
      </MapContainer>

      {/* Admin Controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 20,
          background: "rgba(255,255,255,0.95)",
          padding: "10px 12px",
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          zIndex: 1100,
          width: 260,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Admin</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Enter API key"
            value={adminApiKey}
            onChange={(e) => setAdminApiKey(e.target.value)}
            style={{ flex: 1 }}
          />
          {!isAdminEnabled ? (
            <button
              onClick={handleAdminEnable}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: "#1E88E5",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Enable
            </button>
          ) : (
            <button
              onClick={handleAdminDisable}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "white",
                color: "#333",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Disable
            </button>
          )}
        </div>
      </div>

      {/* Add Station Controls (visible only when admin enabled) */}
      {isAdminEnabled && (
        <div
          style={{
            position: "absolute",
            top: 92,
            left: 20,
            background: "rgba(255,255,255,0.95)",
            padding: "10px 12px",
            borderRadius: 8,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 1100,
            width: 260,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Add station</div>
          {!addingMode ? (
            <button
              onClick={() => {
                setAddingMode(true);
                setFormMsg(null);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: "#2E7D32",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
                width: "100%",
              }}
            >
              Click map or enter coordinates
            </button>
          ) : (
            <button
              onClick={cancelAdding}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "white",
                color: "#333",
                cursor: "pointer",
                fontWeight: 600,
                width: "100%",
              }}
            >
              Cancel add mode
            </button>
          )}
          {addingMode && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
              {pendingLatLng
                ? "Location selected. You can tweak coordinates in the form."
                : "Click the map to select a point or open the form and enter coordinates."}
            </div>
          )}
        </div>
      )}

      {/* Add Station Form Overlay */}
      {isAdminEnabled && addingMode && (
        <div
          style={{
            position: "absolute",
            top: 200,
            right: 20,
            background: "rgba(255,255,255,0.97)",
            padding: 12,
            borderRadius: 8,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 1200,
            width: 320,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Create station</div>
          <form onSubmit={handleSubmitAddStation}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#555" }}>Lat</label>
                <input
                  value={pendingLatLng ? String(pendingLatLng.lat) : ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setPendingLatLng((p) => ({ lat: v, lng: p?.lng ?? 0 }));
                    else setPendingLatLng((p) => (p ? { ...p, lat: NaN as any } : { lat: NaN as any, lng: 0 }));
                  }}
                  placeholder="e.g. 14.5995"
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#555" }}>Lng</label>
                <input
                  value={pendingLatLng ? String(pendingLatLng.lng) : ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setPendingLatLng((p) => ({ lat: p?.lat ?? 0, lng: v }));
                    else setPendingLatLng((p) => (p ? { ...p, lng: NaN as any } : { lat: 0, lng: NaN as any }));
                  }}
                  placeholder="e.g. 120.9842"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Name</label>
              <input required value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Brand</label>
              <select value={formBrand} onChange={(e) => setFormBrand(e.target.value)} style={{ width: "100%" }}>
                <option>Local</option>
                <option>Shell</option>
                <option>Petron</option>
                <option>Caltex</option>
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Fuel price (₱/L)</label>
              <input type="number" step="0.01" value={formFuelPrice} onChange={(e) => setFormFuelPrice(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Services (comma separated)</label>
              <input value={formServices} onChange={(e) => setFormServices(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Address</label>
              <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Phone</label>
              <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Operating hours</label>
              <input value={formHours} onChange={(e) => setFormHours(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#555" }}>API key (optional)</label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ width: "100%" }} placeholder="Required if server enforces it" />
            </div>

            {formMsg && (
              <div
                style={{
                  marginTop: 8,
                  color: formMsg.type === "error" ? "#e53935" : "#2E7D32",
                  fontWeight: 600,
                }}
              >
                {formMsg.text}
              </div>
            )}

            <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={cancelAdding}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  background: "white",
                  color: "#333",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting || !formName.trim()}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "#1E88E5",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                  opacity: formSubmitting ? 0.7 : 1,
                }}
              >
                {formSubmitting ? "Saving..." : "Save station"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Markers Panel */}
      <div
        style={{
          position: "absolute",
          top: isAdminEnabled ? 360 : 92,
          left: 20,
          background: "rgba(255,255,255,0.95)",
          padding: "10px 12px",
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          zIndex: 1100,
          width: 260,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Custom markers</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input placeholder="Name" value={newMarkerName} onChange={(e) => setNewMarkerName(e.target.value)} />
          <div style={{ display: "flex", gap: 6 }}>
            <select value={newMarkerType} onChange={(e) => setNewMarkerType(e.target.value as any)} style={{ flex: 1 }}>
              <option value="convenience">Convenience store</option>
              <option value="repair">Vulcanizing/Repair</option>
              <option value="gas">Gas</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="Lat" value={newMarkerLat} onChange={(e) => setNewMarkerLat(e.target.value)} style={{ flex: 1 }} />
            <input placeholder="Lng" value={newMarkerLng} onChange={(e) => setNewMarkerLng(e.target.value)} style={{ flex: 1 }} />
          </div>
          <button
            onClick={addCustomMarker}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              background: "#6A1B9A",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Add marker
          </button>
        </div>
        {customMarkers.length > 0 && (
          <div style={{ marginTop: 8, maxHeight: 120, overflow: "auto" }}>
            {customMarkers.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #eee" }}>
                <div>
                  <b>{m.name}</b> <span style={{ color: "#666" }}>({m.type})</span>
                  <div style={{ color: "#777" }}>{m.lat.toFixed(4)}, {m.lng.toFixed(4)}</div>
                </div>
                <button onClick={() => removeCustomMarker(m.id)} style={{ border: "none", background: "transparent", color: "#e53935", cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Route summary overlay */}
      {(routeLoading || routeData || routeError) && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            background: "rgba(255,255,255,0.97)",
            padding: "12px 14px",
            borderRadius: 8,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 1000,
            minWidth: 240,
            border: routeError ? "1px solid #e53935" : undefined,
          }}
        >
          {routeLoading && (
            <div style={{ fontWeight: 700 }}>Calculating route...</div>
          )}
          {routeError && (
            <div style={{ color: "#e53935", fontWeight: 600 }}>
              Error: {routeError}
            </div>
          )}
          {routeData && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Route summary</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                Distance: <strong>{routeData.distance_km.toFixed(1)} km</strong>
              </div>
              <div style={{ fontSize: 14, marginBottom: 10 }}>
                Duration: <strong>{routeData.duration_minutes} min</strong>
              </div>
              <button
                onClick={clearRoute}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  background: "white",
                  color: "#333",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Clear route
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend for the map */}
      <div className="map-legend">
        <div className="legend-title">Fuel Station Brands</div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: brandColors.User }}
          ></div>
          <div className="legend-label">Your Location</div>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: brandColors.Shell }}
          ></div>
          <div className="legend-label">Shell</div>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: brandColors.Petron }}
          ></div>
          <div className="legend-label">Petron</div>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: brandColors.Caltex }}
          ></div>
          <div className="legend-label">Caltex</div>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: brandColors.Local }}
          ></div>
          <div className="legend-label">Local</div>
        </div>
      </div>
    </div>
  );
}

export default App;
