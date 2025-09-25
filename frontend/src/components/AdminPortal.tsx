import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  apiGet,
  apiPost,
  apiDelete,
  apiPostFormData,
  getImageUrl,
} from "../utils/api";

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
}

interface POI {
  id: number;
  name: string;
  type: string;
  location: {
    lat: number;
    lng: number;
  };
  distance_meters?: number;
}

interface CustomMarker {
  id: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
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

// Click handler component for adding stations
function AddStationClickCatcher({
  enabled,
  onSelect,
}: {
  enabled: boolean;
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: enabled
      ? (e) => {
          onSelect(e.latlng.lat, e.latlng.lng);
        }
      : undefined,
  });
  return null;
}

const AdminPortal: React.FC = () => {
  // Admin state management
  const [adminApiKey, setAdminApiKey] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [adminValidated, setAdminValidated] = useState<boolean>(false);
  const [adminValidating, setAdminValidating] = useState<boolean>(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);

  // Form states
  const [addingMode, setAddingMode] = useState<boolean>(false);
  const [pendingLatLng, setPendingLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formBrand, setFormBrand] = useState<string>("Local");
  const [formPrice, setFormPrice] = useState<string>("60.00");
  const [formAddress, setFormAddress] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Custom marker states
  const [newMarkerName, setNewMarkerName] = useState<string>("");
  const [newMarkerType, setNewMarkerType] = useState<string>("convenience");
  const [newMarkerLat, setNewMarkerLat] = useState<string>("");
  const [newMarkerLng, setNewMarkerLng] = useState<string>("");

  // Manual coordinate input states
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");
  const [coordinateSource, setCoordinateSource] = useState<"map" | "manual">(
    "map",
  );

  const [position, setPosition] = useState<[number, number] | null>(null);

  // Image upload states
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);

  // Load admin API key from localStorage and validate it
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("admin_api_key") || "";
      if (savedKey) {
        setAdminApiKey(savedKey);
        setApiKey(savedKey);
        // Validate the saved key
        validateAdminKey(savedKey).then((isValid) => {
          if (isValid) {
            setAdminValidated(true);
          } else {
            // Remove invalid key from localStorage
            localStorage.removeItem("admin_api_key");
            setAdminApiKey("");
            setApiKey("");
          }
        });
      }

      const savedMarkers = localStorage.getItem("custom_markers");
      if (savedMarkers) {
        setCustomMarkers(JSON.parse(savedMarkers));
      }
    } catch (_) {}
  }, []);

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn("Geolocation failed:", err);
        // Default to Oriental Mindoro center
        setPosition([12.5966, 121.5258]);
      },
    );
  }, []);

  // Fetch data
  const fetchData = async () => {
    try {
      // Fetch stations
      const stationsRes = await apiGet("/api/stations");
      const stationsData = await stationsRes.json();
      setStations(stationsData);

      // Fetch POIs
      try {
        const poisRes = await apiGet("/api/pois");
        const poisData = await poisRes.json();
        setPois(poisData);
      } catch (e) {
        console.warn("POIs fetch failed:", e);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Persist custom markers
  useEffect(() => {
    try {
      localStorage.setItem("custom_markers", JSON.stringify(customMarkers));
    } catch (_) {}
  }, [customMarkers]);

  const isAdminEnabled = adminValidated;

  const validateAdminKey = async (keyToTest: string) => {
    if (!keyToTest.trim()) {
      alert("Please enter an API key");
      return false;
    }

    setAdminValidating(true);
    try {
      const response = await apiGet("/api/admin/debug", keyToTest.trim());

      if (response.ok) {
        const data = await response.json();
        if (data.keysMatch) {
          return true;
        } else {
          alert(`Invalid API key. Expected: ${data.adminApiKeyValue}`);
          return false;
        }
      } else {
        alert("Failed to validate API key");
        return false;
      }
    } catch (error) {
      console.error("Error validating API key:", error);
      alert("Error connecting to server");
      return false;
    } finally {
      setAdminValidating(false);
    }
  };

  const handleAdminEnable = async () => {
    const isValid = await validateAdminKey(adminApiKey);
    if (isValid) {
      try {
        localStorage.setItem("admin_api_key", adminApiKey.trim());
        setApiKey(adminApiKey.trim());
        setAdminValidated(true);
      } catch (_) {}
    }
  };

  const handleAdminDisable = () => {
    try {
      localStorage.removeItem("admin_api_key");
    } catch (_) {}
    setAdminApiKey("");
    setApiKey("");
    setAdminValidated(false);
    setAddingMode(false);
    setPendingLatLng(null);
  };

  const addCustomMarker = async () => {
    const lat = parseFloat(newMarkerLat);
    const lng = parseFloat(newMarkerLng);
    if (
      !isFinite(lat) ||
      !isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      alert("Please provide valid coordinates");
      return;
    }
    const name = newMarkerName || newMarkerType;

    if (isAdminEnabled) {
      try {
        const res = await apiPost(
          "/api/pois",
          {
            name,
            type: newMarkerType,
            lat,
            lng,
          },
          adminApiKey.trim(),
        );

        if (res.ok) {
          fetchData(); // Refresh data
          setNewMarkerName("");
          setNewMarkerLat("");
          setNewMarkerLng("");
          alert("POI added successfully!");
        } else {
          const errorData = await res.json();
          alert("Failed to add POI: " + (errorData.message || "Unknown error"));
        }
      } catch (err) {
        console.error("Error adding POI:", err);
        alert("Error adding POI");
      }
    } else {
      // Add locally
      const newMarker: CustomMarker = {
        id: Date.now(),
        name,
        type: newMarkerType,
        lat,
        lng,
      };
      setCustomMarkers([...customMarkers, newMarker]);
      setNewMarkerName("");
      setNewMarkerLat("");
      setNewMarkerLng("");
      alert("Custom marker added locally!");
    }
  };

  const removeCustomMarker = (id: number) => {
    setCustomMarkers(customMarkers.filter((m) => m.id !== id));
  };

  const setManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    // Validate latitude
    if (!manualLat.trim()) {
      alert("Please enter a latitude value.");
      return;
    }
    if (!isFinite(lat)) {
      alert("Please enter a valid latitude number.");
      return;
    }
    if (Math.abs(lat) > 90) {
      alert("Latitude must be between -90 and 90 degrees.");
      return;
    }

    // Validate longitude
    if (!manualLng.trim()) {
      alert("Please enter a longitude value.");
      return;
    }
    if (!isFinite(lng)) {
      alert("Please enter a valid longitude number.");
      return;
    }
    if (Math.abs(lng) > 180) {
      alert("Longitude must be between -180 and 180 degrees.");
      return;
    }

    setPendingLatLng({ lat, lng });
    setManualLat("");
    setManualLng("");
    setCoordinateSource("manual");
  };

  const toggleService = (service: string) => {
    setFormServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  const submitStationForm = async () => {
    if (!pendingLatLng || !formName) return;

    setFormSubmitting(true);
    setFormMsg(null);

    try {
      // First create the station
      const res = await apiPost(
        "/api/stations",
        {
          name: formName,
          brand: formBrand,
          fuel_price: parseFloat(formPrice),
          services: formServices,
          address: formAddress,
          phone: formPhone,
          lat: pendingLatLng.lat,
          lng: pendingLatLng.lng,
        },
        apiKey,
      );

      if (res.ok) {
        const newStation = await res.json();
        let imageUploadSuccess = true;

        // Upload images if any are selected
        if (selectedImages.length > 0) {
          setUploadingImages(true);

          try {
            const formData = new FormData();
            selectedImages.forEach((file) => {
              formData.append("images", file);
            });

            const imageRes = await apiPostFormData(
              `/api/stations/${newStation.id}/images`,
              formData,
              apiKey,
            );

            if (!imageRes.ok) {
              console.error("Image upload failed:", await imageRes.text());
              imageUploadSuccess = false;
            }
          } catch (imageErr) {
            console.error("Error uploading images:", imageErr);
            imageUploadSuccess = false;
          } finally {
            setUploadingImages(false);
          }
        }

        const successMessage = imageUploadSuccess
          ? `Station added successfully${selectedImages.length > 0 ? ` with ${selectedImages.length} image(s)` : ""}!`
          : "Station added successfully, but image upload failed.";

        setFormMsg({ type: "success", text: successMessage });
        fetchData(); // Refresh stations

        // Reset form
        setFormName("");
        setFormBrand("Local");
        setFormPrice("60.00");
        setFormAddress("");
        setFormPhone("");
        setFormServices([]);
        setPendingLatLng(null);
        setAddingMode(false);
        setManualLat("");
        setManualLng("");
        setCoordinateSource("map");

        // Reset image states
        imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        setSelectedImages([]);
        setImagePreviewUrls([]);
        setUploadingImages(false);
      } else {
        const errorData = await res.json();
        setFormMsg({
          type: "error",
          text: errorData.message || "Failed to add station",
        });
      }
    } catch (err) {
      console.error("Error adding station:", err);
      setFormMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setFormSubmitting(false);
    }
  };

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
        Loading admin portal...
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Navigation */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
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
        <a
          href="/"
          style={{
            textDecoration: "none",
            background: "#2196F3",
            color: "white",
            padding: "8px 16px",
            borderRadius: 4,
            fontSize: "14px",
            fontWeight: 600,
            transition: "background 0.2s",
            cursor: "pointer",
          }}
        >
          ← Back to Map
        </a>
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            color: "#333",
            flex: 1,
          }}
        >
          🛠️ Admin Portal
        </h1>
        <div
          style={{
            fontSize: "14px",
            color: isAdminEnabled ? "#4CAF50" : "#f44336",
            fontWeight: 600,
          }}
        >
          {isAdminEnabled ? "✅ Admin Enabled" : "❌ Admin Disabled"}
        </div>
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
        />

        <AddStationClickCatcher
          enabled={addingMode && isAdminEnabled}
          onSelect={(lat, lng) => {
            setPendingLatLng({ lat, lng });
            setCoordinateSource("map");
          }}
        />

        {/* User location */}
        <Marker position={position} icon={DefaultIcon}>
          <Popup>
            <div>
              <b>📍 Your Location</b>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                Admin Portal Base
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Pending marker for new station */}
        {pendingLatLng && isAdminEnabled && (
          <Marker
            position={[pendingLatLng.lat, pendingLatLng.lng]}
            icon={createFuelStationIcon(formBrand || "Local", 0)}
          >
            <Popup>
              <div>
                <b>🚧 New Station Location</b>
                <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                  Click "Add Station" to save this location
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                  {pendingLatLng.lat.toFixed(6)}, {pendingLatLng.lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Existing stations */}
        {stations.map((station) => (
          <Marker
            key={`station-${station.id}`}
            position={[station.location.lat, station.location.lng]}
            icon={createFuelStationIcon(station.brand)}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <b>⛽ {station.name}</b>
                <div style={{ marginTop: 4 }}>
                  <strong>Brand:</strong> {station.brand}
                </div>
                <div>
                  <strong>Price:</strong> ₱{station.fuel_price}/L
                </div>
                <div>
                  <strong>Services:</strong> {station.services.join(", ")}
                </div>
                {station.address && (
                  <div>
                    <strong>Address:</strong> {station.address}
                  </div>
                )}
                {station.phone && (
                  <div>
                    <strong>Phone:</strong> {station.phone}
                  </div>
                )}

                {isAdminEnabled && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <button
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
                      onClick={async () => {
                        if (window.confirm(`Delete "${station.name}"?`)) {
                          try {
                            const res = await apiDelete(
                              `/api/stations/${station.id}`,
                              adminApiKey.trim(),
                            );
                            if (res.ok) {
                              fetchData();
                              alert("Station deleted successfully!");
                            } else {
                              alert("Failed to delete station");
                            }
                          } catch (err) {
                            console.error("Delete failed:", err);
                            alert("Error deleting station");
                          }
                        }
                      }}
                    >
                      🗑️ Delete Station
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* POIs */}
        {pois.map((poi) => (
          <Marker
            key={`poi-${poi.id}`}
            position={[poi.location.lat, poi.location.lng]}
            icon={createPOIIcon(poi.type)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <b>{poi.name}</b>
                <div style={{ marginTop: 4, color: "#666" }}>
                  Type: {poi.type}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                  {poi.location.lat.toFixed(6)}, {poi.location.lng.toFixed(6)}
                </div>

                {isAdminEnabled && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <button
                      style={{
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                      onClick={async () => {
                        if (window.confirm(`Delete "${poi.name}"?`)) {
                          try {
                            const res = await fetch(
                              `http://localhost:3001/api/pois/${poi.id}`,
                              {
                                method: "DELETE",
                                headers: adminApiKey.trim()
                                  ? { "x-api-key": adminApiKey.trim() }
                                  : {},
                              },
                            );
                            if (res.ok) {
                              fetchData();
                              alert("POI deleted successfully!");
                            } else {
                              alert("Failed to delete POI");
                            }
                          } catch (err) {
                            console.error("Delete failed:", err);
                            alert("Error deleting POI");
                          }
                        }
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Custom markers */}
        {customMarkers.map((marker) => (
          <Marker
            key={`custom-${marker.id}`}
            position={[marker.lat, marker.lng]}
            icon={createPOIIcon(marker.type)}
          >
            <Popup>
              <div>
                <b>{marker.name}</b>
                <div style={{ marginTop: 4, color: "#666" }}>
                  Type: {marker.type}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                  Local marker
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    style={{
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                    onClick={() => {
                      if (window.confirm(`Remove "${marker.name}"?`)) {
                        removeCustomMarker(marker.id);
                      }
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Admin Controls Panel */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 20,
          background: "rgba(255,255,255,0.95)",
          padding: "15px",
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          zIndex: 1100,
          width: 320,
          maxHeight: "calc(100vh - 100px)",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            margin: "0 0 15px 0",
            color: "#333",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🛠️ Admin Controls
        </h3>

        {/* API Key Section */}
        <div
          style={{
            marginBottom: 20,
            padding: "12px",
            background: "#f5f5f5",
            borderRadius: 6,
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#555",
            }}
          >
            🔑 Admin API Key
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="password"
              placeholder="Enter admin API key"
              value={adminApiKey}
              onChange={(e) => setAdminApiKey(e.target.value)}
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: "14px",
              }}
            />
            {!isAdminEnabled ? (
              <button
                onClick={handleAdminEnable}
                disabled={!adminApiKey.trim() || adminValidating}
                style={{
                  padding: "8px 12px",
                  background:
                    !adminApiKey.trim() || adminValidating ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor:
                    !adminApiKey.trim() || adminValidating
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                {adminValidating ? "Validating..." : "Enable"}
              </button>
            ) : (
              <button
                onClick={handleAdminDisable}
                style={{
                  padding: "8px 12px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                Disable
              </button>
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
            {adminValidating
              ? "🔄 Validating API key..."
              : isAdminEnabled
                ? "✅ Admin features are now active"
                : "❌ Enter API key to enable admin features"}
          </div>
        </div>

        {isAdminEnabled && (
          <>
            {/* Station Management */}
            <div
              style={{
                marginBottom: 20,
                padding: "12px",
                background: "#e3f2fd",
                borderRadius: 6,
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px 0",
                  color: "#1976d2",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ⛽ Station Management
              </h4>
              <button
                onClick={() => {
                  setAddingMode(!addingMode);
                  setPendingLatLng(null);
                  setFormMsg(null);
                  setManualLat("");
                  setManualLng("");
                  setCoordinateSource("map");
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: addingMode ? "#f44336" : "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                {addingMode ? "❌ Cancel Adding Station" : "➕ Add New Station"}
              </button>
              {addingMode && (
                <>
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px",
                      background: "rgba(255,193,7,0.1)",
                      borderRadius: 4,
                      border: "1px solid #ffc107",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: 12,
                        color: "#f57c00",
                        fontWeight: 600,
                      }}
                    >
                      👆 Click on the map to place a new station OR enter
                      coordinates manually:
                    </p>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: 11,
                        color: "#999",
                      }}
                    >
                      💡 Tip: Right-click on Google Maps and select coordinates
                      to copy them
                    </p>
                    <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          step="0.000001"
                          min="-90"
                          max="90"
                          placeholder="Latitude (e.g., 12.596600)"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          step="0.000001"
                          min="-180"
                          max="180"
                          placeholder="Longitude (e.g., 121.525800)"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <button
                        onClick={setManualCoordinates}
                        disabled={!manualLat.trim() || !manualLng.trim()}
                        style={{
                          padding: "8px 12px",
                          background:
                            !manualLat.trim() || !manualLng.trim()
                              ? "#ccc"
                              : "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor:
                            !manualLat.trim() || !manualLng.trim()
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "12px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        📍 Set
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* POI Management */}
            <div
              style={{
                marginBottom: 20,
                padding: "12px",
                background: "#fff3e0",
                borderRadius: 6,
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px 0",
                  color: "#f57c00",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📍 POI Management
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  placeholder="POI Name"
                  value={newMarkerName}
                  onChange={(e) => setNewMarkerName(e.target.value)}
                  style={{
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: "14px",
                  }}
                />
                <select
                  value={newMarkerType}
                  onChange={(e) => setNewMarkerType(e.target.value)}
                  style={{
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: "14px",
                  }}
                >
                  <option value="gas">⛽ Gas Station</option>
                  <option value="convenience">🏪 Convenience Store</option>
                  <option value="repair">🔧 Repair Shop</option>
                </select>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    placeholder="Latitude"
                    value={newMarkerLat}
                    onChange={(e) => setNewMarkerLat(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: "14px",
                    }}
                  />
                  <input
                    placeholder="Longitude"
                    value={newMarkerLng}
                    onChange={(e) => setNewMarkerLng(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: "14px",
                    }}
                  />
                </div>
                <button
                  onClick={addCustomMarker}
                  disabled={!newMarkerLat || !newMarkerLng}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background:
                      !newMarkerLat || !newMarkerLng ? "#ccc" : "#FF9800",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor:
                      !newMarkerLat || !newMarkerLng
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  ➕ Add POI
                </button>
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "12px",
                borderRadius: 6,
              }}
            >
              <h4
                style={{
                  margin: "0 0 8px 0",
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📊 Database Stats
              </h4>
              <div style={{ fontSize: 14, color: "#666" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span>⛽ Stations:</span>
                  <span style={{ fontWeight: 600 }}>{stations.length}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span>📍 POIs:</span>
                  <span style={{ fontWeight: 600 }}>{pois.length}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>🏪 Local markers:</span>
                  <span style={{ fontWeight: 600 }}>
                    {customMarkers.length}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {!isAdminEnabled && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#666",
              fontStyle: "italic",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "10px" }}>🔒</div>
            <div>Enter admin API key to access management features</div>
          </div>
        )}
      </div>

      {/* Station Form Overlay */}
      {isAdminEnabled && addingMode && pendingLatLng && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: 8,
              width: "90%",
              maxWidth: "500px",
              maxHeight: "90%",
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⛽ Add New Station
            </h3>

            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Station Name *
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "14px",
                }}
                placeholder="e.g. Shell Roxas"
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Brand
              </label>
              <select
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "14px",
                }}
              >
                <option value="Local">Local</option>
                <option value="Shell">Shell</option>
                <option value="Petron">Petron</option>
                <option value="Caltex">Caltex</option>
                <option value="Phoenix">Phoenix</option>
                <option value="Unioil">Unioil</option>
                <option value="Seaoil">Seaoil</option>
              </select>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Fuel Price (₱/L)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Address
              </label>
              <input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "14px",
                }}
                placeholder="e.g. National Highway, Roxas, Oriental Mindoro"
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Phone (Optional)
              </label>
              <input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: "14px",
                }}
                placeholder="e.g. 09123456789"
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                Services (Check all that apply)
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  "WiFi",
                  "Car Wash",
                  "ATM",
                  "Convenience Store",
                  "Restroom",
                  "Tire Service",
                ].map((service) => (
                  <label
                    key={service}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "14px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formServices.includes(service)}
                      onChange={() => toggleService(service)}
                    />
                    {service}
                  </label>
                ))}
              </div>
            </div>

            <div
              style={{
                marginBottom: 15,
                padding: "10px",
                background: "#f8f9fa",
                borderRadius: 4,
                border: "1px solid #e9ecef",
              }}
            >
              <label
                style={{
                  marginBottom: 5,
                  fontWeight: 600,
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📍 Location
                <span
                  style={{
                    fontSize: "12px",
                    color:
                      coordinateSource === "manual" ? "#4CAF50" : "#2196F3",
                    backgroundColor:
                      coordinateSource === "manual" ? "#e8f5e8" : "#e3f2fd",
                    padding: "2px 6px",
                    borderRadius: 3,
                    fontWeight: 500,
                  }}
                >
                  {coordinateSource === "manual" ? "⌨️ Manual" : "🖱️ Map Click"}
                </span>
              </label>
              <div
                style={{
                  fontSize: "14px",
                  color: "#666",
                  fontFamily: "monospace",
                }}
              >
                {pendingLatLng.lat.toFixed(6)}, {pendingLatLng.lng.toFixed(6)}
              </div>
            </div>

            {formMsg && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: 4,
                  marginBottom: 15,
                  background: formMsg.type === "error" ? "#ffebee" : "#e8f5e8",
                  color: formMsg.type === "error" ? "#c62828" : "#2e7d32",
                  border: `1px solid ${formMsg.type === "error" ? "#ffcdd2" : "#c8e6c9"}`,
                  fontSize: "14px",
                }}
              >
                {formMsg.type === "error" ? "❌" : "✅"} {formMsg.text}
              </div>
            )}

            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setPendingLatLng(null);
                  setAddingMode(false);
                  setFormMsg(null);
                  // Reset form
                  setFormName("");
                  setFormBrand("Local");
                  setFormPrice("60.00");
                  setFormAddress("");
                  setFormPhone("");
                  setFormServices([]);
                  setManualLat("");
                  setManualLng("");
                  setCoordinateSource("map");
                }}
                style={{
                  padding: "10px 20px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                ❌ Cancel
              </button>
              <button
                onClick={submitStationForm}
                disabled={formSubmitting || !formName.trim()}
                style={{
                  padding: "10px 20px",
                  background:
                    formSubmitting || !formName.trim() ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor:
                    formSubmitting || !formName.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {formSubmitting ? "⏳ Adding..." : "✅ Add Station"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
