import React, { useState, useEffect, useRef } from "react";
// react-leaflet components are now used inside AdminStationMap
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPostBase64Images,
} from "../utils/api";
import { PriceReportsManagement } from "./PriceReportsManagement";
import { ReviewsManagement } from "./ReviewsManagement";
import UserAnalytics from "./UserAnalytics";
// Moved map internals into AdminStationMap
import AdminStationMap from "./admin/stations/AdminStationMap";
import type { Station, POI, CustomMarker } from "../types/station.types";
import "../styles/AdminPortal.css";

// Canvas-based markers are created dynamically - no static image imports needed

// Types are imported from ../types/station.types

// Create custom user location icon with sharp point
const createUserLocationIcon = () => {
  const width = 36;
  const height = 50;
  const canvas = document.createElement("canvas");
  canvas.width = width + 10;
  canvas.height = height + 10;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const centerX = (width + 10) / 2;
    const topRadius = width / 2 - 2;
    const circleY = 5 + topRadius;
    const pointY = height + 5;

    // Draw shadow
    ctx.save();
    ctx.translate(3, 3);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw pin shape - circle top with sharp triangle bottom
    ctx.fillStyle = "#2196F3";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();

    // Draw border
    ctx.strokeStyle = "#1565C0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.stroke();

    // Inner white circle
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Inner blue dot
    ctx.fillStyle = "#2196F3";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  return new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 10],
    iconAnchor: [(width + 10) / 2, height + 10],
    popupAnchor: [0, -(height + 10)],
    className: "user-location-marker",
    zIndexOffset: 10000,
  });
};

const DefaultIcon = createUserLocationIcon();

// Function to create brand-specific fuel station markers with sharp points
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

  const baseSize = proximity
    ? Math.max(24, Math.min(36, 36 - proximity * 8))
    : 32;
  const width = baseSize;
  const height = baseSize * 1.4; // Pin height ratio
  const canvas = document.createElement("canvas");
  canvas.width = width + 10;
  canvas.height = height + 10;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const color = brandColors[brand] || brandColors.default;
    const centerX = (width + 10) / 2;
    const radius = width / 2 - 2;
    const circleY = 5 + radius;
    const pointY = height + 5;

    // Draw shadow
    ctx.save();
    ctx.translate(2, 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    // Sharp triangular point
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw pin shape with sharp point
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    // Create sharp triangular point
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();

    // Draw darker border for better definition
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.stroke();

    // Inner white circle for icon background
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Draw fuel pump icon smaller and cleaner
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(radius * 0.7)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛽", centerX, circleY);
  }

  return new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 10],
    iconAnchor: [(width + 10) / 2, height + 10],
    popupAnchor: [0, -(height + 10)],
  });
};

// POI icon creator with sharp points
const createPOIIcon = (type: string) => {
  const iconMap: { [key: string]: string } = {
    gas: "⛽",
    convenience: "🏪",
    repair: "🔧",
    car_wash: "🚗",
    motor_shop: "🏍️",
  };

  const baseSize = 28;
  const width = baseSize;
  const height = baseSize * 1.4; // Pin height ratio
  const canvas = document.createElement("canvas");
  canvas.width = width + 10;
  canvas.height = height + 10;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const centerX = (width + 10) / 2;
    const radius = width / 2 - 2;
    const circleY = 5 + radius;
    const pointY = height + 5;

    // Draw shadow
    ctx.save();
    ctx.translate(2, 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    // Sharp triangular point
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw pin shape with sharp point - using purple for POIs
    ctx.fillStyle = "#8B5CF6";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    // Create sharp triangular point
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();

    // Draw darker border for better definition
    ctx.strokeStyle = "#5B21B6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.stroke();

    // Inner white circle for icon background
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Draw POI icon smaller and cleaner
    const icon = iconMap[type] || "📍";
    ctx.font = `${Math.floor(radius * 0.65)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, centerX, circleY);
  }

  return new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 10],
    iconAnchor: [(width + 10) / 2, height + 10],
    popupAnchor: [0, -(height + 10)],
  });
};
const AdminPortal: React.FC = () => {
  // Admin state management
  const [adminApiKey, setAdminApiKey] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [adminValidated, setAdminValidated] = useState<boolean>(false);
  const [adminValidating, setAdminValidating] = useState<boolean>(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);

  // Admin view management
  const [currentAdminView, setCurrentAdminView] = useState<
    "map" | "price-reports" | "user-analytics" | "reviews"
  >("map");

  // Form states - unified for all POI types
  const [addingMode, setAddingMode] = useState<boolean>(false);
  const [pendingLatLng, setPendingLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formType, setFormType] = useState<string>("gas");
  const [formBrand, setFormBrand] = useState<string>("Local");
  const [formPrice, setFormPrice] = useState<string>("60.00"); // Legacy field
  // Dynamic fuel types for gas stations
  const [formFuelPrices, setFormFuelPrices] = useState<
    Array<{ fuel_type: string; price: string }>
  >([
    { fuel_type: "Regular", price: "58.00" },
    { fuel_type: "Diesel", price: "55.00" },
    { fuel_type: "Premium", price: "62.00" },
  ]);
  const [formAddress, setFormAddress] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formOpenTime, setFormOpenTime] = useState<string>("08:00");
  const [formCloseTime, setFormCloseTime] = useState<string>("20:00");
  const [open24Hours, setOpen24Hours] = useState<boolean>(false);
  const [unknownTime, setUnknownTime] = useState<boolean>(false);
  // Preserve previous times when toggling 24h mode
  const prevOpenTimeRef = useRef<string>("08:00");
  const prevCloseTimeRef = useRef<string>("20:00");
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Manual coordinate input states
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");
  const [manualCoords, setManualCoords] = useState<string>(""); // Single field for coordinates
  const [coordinateSource, setCoordinateSource] = useState<"map" | "manual">(
    "map",
  );

  const [position, setPosition] = useState<[number, number] | null>(null);

  // Image upload states
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);

  // Edit mode states
  const [editingStationId, setEditingStationId] = useState<number | null>(null);
  const [editingPoiId, setEditingPoiId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  // Preserve previous times when toggling 24h mode in edit forms
  const editPrevOpenRef = useRef<string>("08:00");
  const editPrevCloseRef = useRef<string>("20:00");

  // Image upload states for existing stations
  const [stationImageUploads, setStationImageUploads] = useState<{
    [key: string]: File[];
  }>({});
  const [stationImageUploadUrls, setStationImageUploadUrls] = useState<{
    [key: string]: string[];
  }>({});
  const [uploadingStationImages, setUploadingStationImages] = useState<{
    [key: string]: boolean;
  }>({});

  // Synchronous upload lock to prevent race conditions from async state updates
  const uploadLocksRef = useRef<Set<string>>(new Set());

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
        console.log("🔍 API Key validation response:", data);
        
        // Backend returns "keyMatch" (singular), not "keysMatch" (plural)
        if (data.keyMatch) {
          return true;
        } else {
          alert(`Invalid API key. Please check your key and try again.`);
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

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxImages = 5;

    if (files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images at once.`);
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        alert(
          `Invalid file type: ${file.name}. Please use JPG, PNG, or WebP images.`,
        );
        continue;
      }
      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setSelectedImages(validFiles);

    // Create preview URLs
    const previewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(previewUrls);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newUrls = imagePreviewUrls.filter((_, i) => i !== index);

    // Clean up URL object
    URL.revokeObjectURL(imagePreviewUrls[index]);

    setSelectedImages(newImages);
    setImagePreviewUrls(newUrls);
  };

  // Handle image selection for existing stations
  const handleStationImageSelect = async (
    stationId: number,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    const maxImages = 5;
    if (files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images at once.`);
      return;
    }

    const fileArray = Array.from(files);
    const urls: string[] = [];

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      if (!file.type.startsWith("image/")) {
        alert(`File ${file.name} is not an image.`);
        continue;
      }

      urls.push(URL.createObjectURL(file));
    }

    const stationKey = stationId.toString();
    setStationImageUploads((prev) => ({
      ...prev,
      [stationKey]: fileArray,
    }));

    // Clean up old URLs if they exist
    if (stationImageUploadUrls[stationKey]) {
      stationImageUploadUrls[stationKey].forEach((url) =>
        URL.revokeObjectURL(url),
      );
    }

    setStationImageUploadUrls((prev) => ({
      ...prev,
      [stationKey]: urls,
    }));
  };

  // Upload images for existing station
  const uploadStationImages = async (stationId: number) => {
    // Generate unique upload ID for tracking
    const uploadId = crypto.randomUUID
      ? crypto.randomUUID().substring(0, 8)
      : Date.now().toString(36);
    const stationKey = stationId.toString();
    const images = stationImageUploads[stationKey];

    console.log(
      `🆔 [${uploadId}] Upload function called for station ${stationId}`,
    );

    if (!images || images.length === 0) {
      alert("Please select images to upload first.");
      return;
    }

    // CRITICAL: Check synchronous lock first (prevents race conditions)
    if (uploadLocksRef.current.has(stationKey)) {
      console.warn(
        `⚠️ [${uploadId}] Upload already in progress for station ${stationId} - BLOCKED by sync lock`,
      );
      console.warn(`   Current locks:`, Array.from(uploadLocksRef.current));
      return;
    }

    // CRITICAL: Check async state second (UI consistency)
    if (uploadingStationImages[stationKey]) {
      console.warn(
        `⚠️ [${uploadId}] Upload already in progress for station ${stationId} - BLOCKED by state check`,
      );
      return;
    }

    // Set BOTH locks immediately
    uploadLocksRef.current.add(stationKey);
    console.log(
      `🚀 [${uploadId}] Starting upload for station ${stationId} with ${images.length} images`,
    );
    console.log(`   Lock set:`, Array.from(uploadLocksRef.current));
    setUploadingStationImages((prev) => ({
      ...prev,
      [stationKey]: true,
    }));

    try {
      console.log(`📡 [${uploadId}] Making API call to upload images`);
      const imageRes = await apiPostBase64Images(
        `/api/stations/${stationId}/images`,
        images,
        adminApiKey.trim(),
      );
      console.log(
        `📥 [${uploadId}] API call completed with status:`,
        imageRes.status,
      );

      if (imageRes.ok) {
        console.log(`✅ [${uploadId}] Upload successful`);
        alert(`Successfully uploaded ${images.length} image(s)!`);

        // Clear the images for this station
        setStationImageUploads((prev) => {
          const updated = { ...prev };
          delete updated[stationKey];
          return updated;
        });

        // Clean up URLs
        if (stationImageUploadUrls[stationKey]) {
          stationImageUploadUrls[stationKey].forEach((url) =>
            URL.revokeObjectURL(url),
          );
        }
        setStationImageUploadUrls((prev) => {
          const updated = { ...prev };
          delete updated[stationKey];
          return updated;
        });

        // Refresh data to show new images
        fetchData();
      } else {
        console.error(
          `❌ [${uploadId}] Upload failed with status:`,
          imageRes.status,
        );
        const errorData = await imageRes
          .json()
          .catch(() => ({ error: "Upload failed" }));
        alert(
          `Image upload failed: ${errorData.message || errorData.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error(`❌ [${uploadId}] Error uploading images:`, error);
      alert("Error uploading images. Please try again.");
    } finally {
      // Clear BOTH locks
      uploadLocksRef.current.delete(stationKey);
      setUploadingStationImages((prev) => ({
        ...prev,
        [stationKey]: false,
      }));
      console.log(
        `✅ [${uploadId}] Upload complete for station ${stationId} - locks released`,
      );
      console.log(`   Remaining locks:`, Array.from(uploadLocksRef.current));
    }
  };

  const clearStationImageUploads = (stationId: number) => {
    const stationKey = stationId.toString();
    // Clean up URLs
    if (stationImageUploadUrls[stationKey]) {
      stationImageUploadUrls[stationKey].forEach((url) =>
        URL.revokeObjectURL(url),
      );
    }
    setStationImageUploads((prev) => {
      const updated = { ...prev };
      delete updated[stationKey];
      return updated;
    });
    setStationImageUploadUrls((prev) => {
      const updated = { ...prev };
      delete updated[stationKey];
      return updated;
    });
  };

  const onDeleteStation = async (station: Station) => {
    if (window.confirm(`Delete "${station.name}"?`)) {
      try {
        const res = await apiDelete(`/api/stations/${station.id}`, adminApiKey.trim());
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
  };

  const onDeletePoi = async (poi: POI) => {
    if (window.confirm(`Delete "${poi.name}"?`)) {
      try {
        const res = await apiDelete(`/api/pois/${poi.id}`, adminApiKey.trim());
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
  };

  const removeCustomMarker = (id: number) => {
    setCustomMarkers(customMarkers.filter((m) => m.id !== id));
  };

  const setManualCoordinates = () => {
    let lat: number;
    let lng: number;

    // Check if using single coordinate field
    if (manualCoords.trim()) {
      // Parse single coordinate input (e.g., "12.5966, 121.5258" or "12.5966,121.5258")
      const coords = manualCoords.trim().replace(/\s+/g, "").split(",");

      if (coords.length !== 2) {
        alert(
          "Please enter coordinates in format: latitude, longitude (e.g., 12.5966, 121.5258)",
        );
        return;
      }

      lat = parseFloat(coords[0]);
      lng = parseFloat(coords[1]);
    } else if (manualLat.trim() && manualLng.trim()) {
      // Fallback to separate fields if they're filled
      lat = parseFloat(manualLat);
      lng = parseFloat(manualLng);
    } else {
      alert(
        "Please enter coordinates either in the single field or both latitude and longitude fields.",
      );
      return;
    }

    console.log("[AdminPortal] Manual Set -> lat:", lat, "lng:", lng);

    // Validate latitude
    if (!isFinite(lat)) {
      alert("Please enter a valid latitude number.");
      return;
    }
    if (Math.abs(lat) > 90) {
      alert("Latitude must be between -90 and 90 degrees.");
      return;
    }

    // Validate longitude
    if (!isFinite(lng)) {
      alert("Please enter a valid longitude number.");
      return;
    }
    if (Math.abs(lng) > 180) {
      alert("Longitude must be between -180 and 180 degrees.");
      return;
    }

    // SMART VALIDATION: Detect swapped coordinates for Philippines region
    // Philippines bounds: Lat: 4.5°N to 21.3°N, Lng: 116.9°E to 126.6°E
    const isValidPhilippinesLat = lat >= 4 && lat <= 22;
    const isValidPhilippinesLng = lng >= 116 && lng <= 127;

    if (!isValidPhilippinesLat && !isValidPhilippinesLng) {
      const confirmOutside = window.confirm(
        `⚠️ WARNING: These coordinates (${lat.toFixed(6)}, ${lng.toFixed(6)}) are outside the Philippines region.\n\n` +
          `Expected ranges:\n` +
          `• Latitude: 4° to 22°N (you entered: ${lat.toFixed(2)}°)\n` +
          `• Longitude: 116° to 127°E (you entered: ${lng.toFixed(2)}°)\n\n` +
          `Do you want to continue anyway?`,
      );
      if (!confirmOutside) return;
    } else if (!isValidPhilippinesLat && isValidPhilippinesLng) {
      // Latitude is out of range but longitude is valid - likely swapped!
      const shouldSwap = window.confirm(
        `⚠️ COORDINATE SWAP DETECTED!\n\n` +
          `Your latitude (${lat.toFixed(6)}) looks like a longitude value.\n` +
          `Your longitude (${lng.toFixed(6)}) looks like a latitude value.\n\n` +
          `Did you accidentally swap them?\n\n` +
          `Click OK to auto-swap to: ${lng.toFixed(6)}, ${lat.toFixed(6)}\n` +
          `Click Cancel to keep original values`,
      );
      if (shouldSwap) {
        [lat, lng] = [lng, lat];
        console.log("[AdminPortal] Auto-swapped coordinates to:", lat, lng);
      }
    } else if (isValidPhilippinesLat && !isValidPhilippinesLng) {
      // Longitude is out of range but latitude is valid - likely swapped!
      const shouldSwap = window.confirm(
        `⚠️ COORDINATE SWAP DETECTED!\n\n` +
          `Your longitude (${lng.toFixed(6)}) looks like a latitude value.\n` +
          `Your latitude (${lat.toFixed(6)}) looks like a longitude value.\n\n` +
          `Did you accidentally swap them?\n\n` +
          `Click OK to auto-swap to: ${lng.toFixed(6)}, ${lat.toFixed(6)}\n` +
          `Click Cancel to keep original values`,
      );
      if (shouldSwap) {
        [lat, lng] = [lng, lat];
        console.log("[AdminPortal] Auto-swapped coordinates to:", lat, lng);
      }
    }

    setPendingLatLng({ lat, lng });
    setManualLat("");
    setManualLng("");
    setManualCoords("");
    setCoordinateSource("manual");
  };

  const toggleService = (service: string) => {
    setFormServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  const startEditStation = (station: Station) => {
    setEditingStationId(station.id);
    setEditFormData({
      name: station.name,
      brand: station.brand,
      fuel_price: station.fuel_price,
      services: station.services,
      address: station.address || "",
      phone: station.phone || "",
      operating_hours: station.operating_hours,
      unknownTime: !station.operating_hours,
      lat: station.location.lat,
      lng: station.location.lng,
      fuel_prices: (station.fuel_prices || []).map((fp) => ({
        fuel_type: fp.fuel_type,
        price: String(fp.price),
      })),
      _originalFuelTypes: Array.from(
        new Set((station.fuel_prices || []).map((fp) => fp.fuel_type)),
      ),
    });
  };

  const startEditPoi = (poi: POI) => {
    setEditingPoiId(poi.id);
    setEditFormData({
      name: poi.name,
      type: poi.type,
      address: (poi as any).address || "",
      phone: (poi as any).phone || "",
      operating_hours: (poi as any).operating_hours,
      unknownTime: !(poi as any).operating_hours,
    });
  };

  const cancelEdit = () => {
    setEditingStationId(null);
    setEditingPoiId(null);
    setEditFormData({});
  };

  const submitEditStation = async (stationId: number) => {
    setEditSubmitting(true);
    try {
      // Split general fields vs fuel prices
      const { fuel_prices, _originalFuelTypes, unknownTime, ...general } =
        editFormData || {};

      if (unknownTime) {
        general.operating_hours = null;
      }

      // 1) Update general station fields
      const res = await apiPut(
        `/api/stations/${stationId}`,
        general,
        adminApiKey.trim(),
      );
      if (!res.ok) {
        const errorData = await res.json();
        alert(
          `Failed to update station: ${errorData.message || "Unknown error"}`,
        );
        setEditSubmitting(false);
        return;
      }

      // 2) Sync fuel prices
      const newList: Array<{ fuel_type: string; price: string }> = (
        fuel_prices || []
      ).filter((fp: any) => String(fp.fuel_type || "").trim().length > 0);
      const newMap = new Map<string, number>();
      newList.forEach((fp) =>
        newMap.set(fp.fuel_type.trim(), parseFloat(fp.price)),
      );
      const originalSet = new Set<string>(
        (_originalFuelTypes || []) as string[],
      );

      // Upsert non-zero prices
      for (const entry of Array.from(newMap.entries())) {
        const [ft, price] = entry;
        if (price > 0) {
          const path = `/api/stations/${stationId}/fuel-prices/${encodeURIComponent(ft)}`;
          const putRes = await apiPut(
            path,
            { price, updated_by: "admin" },
            adminApiKey.trim(),
          );
          if (!putRes.ok) {
            const e = await putRes.json().catch(() => ({}));
            console.warn("Fuel price upsert failed", ft, e);
          }
        }
      }

      // Delete removed types or zero-priced
      const newTypes = new Set<string>(
        Array.from(newMap.keys()).filter((ft) => newMap.get(ft)! > 0),
      );
      for (const ft of originalSet) {
        if (!newTypes.has(ft)) {
          const delPath = `/api/stations/${stationId}/fuel-prices/${encodeURIComponent(ft)}`;
          try {
            await apiDelete(delPath, adminApiKey.trim());
          } catch (e) {
            console.warn("Fuel price delete failed", ft, e);
          }
        }
      }

      alert("Station updated successfully!");
      setEditingStationId(null);
      setEditFormData({});
      fetchData();
    } catch (err) {
      console.error("Error updating station:", err);
      alert("Network error. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const submitEditPoi = async (poiId: number) => {
    setEditSubmitting(true);
    try {
      const { unknownTime, ...rest } = editFormData;
      if (unknownTime) {
        rest.operating_hours = null;
      }
      const res = await apiPut(`/api/pois/${poiId}`, rest, adminApiKey.trim());

      if (res.ok) {
        alert("POI updated successfully!");
        setEditingPoiId(null);
        setEditFormData({});
        fetchData(); // Refresh data
      } else {
        const errorData = await res.json();
        alert(`Failed to update POI: ${errorData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error updating POI:", err);
      alert("Network error. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const submitStationForm = async () => {
    if (!pendingLatLng || !formName) return;

    setFormSubmitting(true);
    setFormMsg(null);

    try {
      // Determine if this is a gas station or other POI
      const isGasStation = formType === "gas";
      const endpoint = isGasStation ? "/api/stations" : "/api/pois";

      // Prepare the payload based on POI type
      const payload: any = {
        name: formName,
        location: {
          lat: pendingLatLng.lat,
          lng: pendingLatLng.lng,
        },
      };

      if (isGasStation) {
        payload.brand = formBrand;
        payload.fuel_price = parseFloat(formPrice); // Legacy field for backward compatibility
        payload.services = formServices; // Add services array
        // Add fuel prices array with only non-zero prices
        payload.fuel_prices = formFuelPrices
          .filter((fp) => fp.fuel_type.trim() && parseFloat(fp.price) > 0)
          .map((fp) => ({
            fuel_type: fp.fuel_type.trim(),
            price: parseFloat(fp.price),
          }));
        // Add operating hours if not unknown and both are set
        if (!unknownTime && formOpenTime && formCloseTime) {
          payload.operating_hours = {
            open: formOpenTime,
            close: formCloseTime,
          };
        }
      } else {
        payload.type = formType;
        payload.address = formAddress;
        payload.phone = formPhone;
        // Add operating hours if both are set
        if (formOpenTime && formCloseTime) {
          payload.operating_hours = {
            open: formOpenTime,
            close: formCloseTime,
          };
        }
      }

      // Create the station or POI
      console.log(
        "[AdminPortal] Submitting new",
        isGasStation ? "station" : "poi",
        "with coords:",
        payload.lat,
        payload.lng,
      );
      const res = await apiPost(endpoint, payload, apiKey);

      if (res.ok) {
        const newEntity = await res.json();
        console.log(
          "[AdminPortal] Server created entity at:",
          newEntity?.location?.lat,
          newEntity?.location?.lng,
        );
        let imageUploadSuccess = true;

        // Upload images if any are selected
        if (selectedImages.length > 0 && !uploadingImages) {
          setUploadingImages(true);

          try {
            const imageEndpoint = isGasStation
              ? `/api/stations/${newEntity.id}/images`
              : `/api/pois/${newEntity.id}/images`;

            const imageRes = await apiPostBase64Images(
              imageEndpoint,
              selectedImages,
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

        const entityType = isGasStation ? "Station" : "POI";
        const successMessage = imageUploadSuccess
          ? `${entityType} added successfully${selectedImages.length > 0 ? ` with ${selectedImages.length} image(s)` : ""}!`
          : `${entityType} added successfully, but image upload failed.`;

        setFormMsg({ type: "success", text: successMessage });
        fetchData(); // Refresh data

        // Reset form
        setFormName("");
        setFormType("gas");
        setFormBrand("Local");
        setFormPrice("60.00");
        setFormFuelPrices([
          { fuel_type: "Regular", price: "58.00" },
          { fuel_type: "Diesel", price: "55.00" },
          { fuel_type: "Premium", price: "62.00" },
        ]);
        setFormAddress("");
        setFormPhone("");
        setFormServices([]);
        setFormOpenTime("08:00");
        setFormCloseTime("20:00");
        setFormFuelPrices([
          { fuel_type: "Regular", price: "58.00" },
          { fuel_type: "Diesel", price: "55.00" },
          { fuel_type: "Premium", price: "62.00" },
        ]);
        setManualLat("");
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
          text:
            errorData.message ||
            `Failed to add ${formType === "gas" ? "station" : "POI"}`,
        });
      }
    } catch (err) {
      console.error("Error adding POI:", err);
      setFormMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!position) {
    return <div className="loading-container">Loading admin portal...</div>;
  }

  return (
    <div className="admin-portal">
      {/* Navigation */}
      <div className="admin-portal-navigation">
        <a href="/" className="back-to-map-button">
          ← Back to Map
        </a>
        <div className="admin-portal-header">
          <img
            src="/logo.jpeg"
            alt="Fuel Finder Logo"
            className="admin-portal-logo"
          />
          <h1 className="admin-portal-title">Admin Portal</h1>
        </div>

        {/* View Switcher */}
        {isAdminEnabled && (
          <div className="view-switcher">
            <button
              onClick={() => setCurrentAdminView("map")}
              className={`view-switcher-button ${currentAdminView === "map" ? "active" : ""}`}
            >
              🗺️ Map View
            </button>
            <button
              onClick={() => setCurrentAdminView("price-reports")}
              className={`view-switcher-button ${currentAdminView === "price-reports" ? "active" : ""}`}
            >
              💰 Price Reports
            </button>
            <button
              onClick={() => setCurrentAdminView("user-analytics")}
              className={`view-switcher-button ${currentAdminView === "user-analytics" ? "active" : ""}`}
            >
              👥 User Analytics
            </button>
            <button
              onClick={() => setCurrentAdminView("reviews")}
              className={`view-switcher-button ${currentAdminView === "reviews" ? "active" : ""}`}
            >
              📝 Reviews
            </button>
          </div>
        )}
        <div
          className={`admin-status ${isAdminEnabled ? "enabled" : "disabled"}`}
        >
          {isAdminEnabled ? "✅ Admin Enabled" : "❌ Admin Disabled"}
        </div>
      </div>

      {/* Conditional Content Based on Current View */}
      {currentAdminView === "price-reports" ? (
        <div className="admin-content">
          <div className="admin-content-offset" />
          <PriceReportsManagement adminApiKey={adminApiKey} />
        </div>
      ) : currentAdminView === "user-analytics" ? (
        <div className="user-analytics-container">
          <UserAnalytics />
        </div>
      ) : currentAdminView === "reviews" ? (
        <div className="admin-content">
          <div className="admin-content-offset" />
          <ReviewsManagement adminApiKey={adminApiKey} />
        </div>
      ) : (
        <AdminStationMap
          position={position}
          isAdminEnabled={isAdminEnabled}
          addingMode={addingMode}
          pendingLatLng={pendingLatLng}
          formType={formType}
          formBrand={formBrand}
          onSelectAddLocation={(lat, lng) => {
            setPendingLatLng({ lat, lng });
            setCoordinateSource("map");
          }}
          DefaultIcon={DefaultIcon}
          createFuelStationIcon={createFuelStationIcon}
          createPOIIcon={createPOIIcon}
          stations={stations}
          editingStationId={editingStationId}
          editFormData={editFormData}
          setEditFormData={setEditFormData}
          editSubmitting={editSubmitting}
          startEditStation={startEditStation}
          cancelEdit={cancelEdit}
          submitEditStation={(id) => submitEditStation(id)}
          onDeleteStation={onDeleteStation}
          stationImageUploadUrls={stationImageUploadUrls}
          stationImageUploads={stationImageUploads}
          uploadingStationImages={uploadingStationImages}
          handleStationImageSelect={handleStationImageSelect}
          uploadStationImages={uploadStationImages}
          clearStationImageUploads={clearStationImageUploads}
          editPrevOpenRef={editPrevOpenRef}
          editPrevCloseRef={editPrevCloseRef}
          pois={pois}
          editingPoiId={editingPoiId}
          startEditPoi={startEditPoi}
          submitEditPoi={(id) => submitEditPoi(id)}
          onDeletePoi={onDeletePoi}
          customMarkers={customMarkers}
          removeCustomMarker={removeCustomMarker}
        />
      )}

      {/* Admin Controls Panel - Only show in map view */}
      {currentAdminView === "map" && (
        <div className="admin-controls-panel">
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
                      !adminApiKey.trim() || adminValidating
                        ? "#ccc"
                        : "#4CAF50",
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
            <div
              style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}
            >
              {adminValidating
                ? "🔄 Validating API key..."
                : isAdminEnabled
                  ? "✅ Admin features are now active"
                  : "❌ Enter API key to enable admin features"}
            </div>
          </div>

          {isAdminEnabled && (
            <>
              {/* Unified POI Management */}
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px",
                  background: "#e8f5e9",
                  borderRadius: 6,
                }}
              >
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    color: "#2e7d32",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  📍 POI Management
                </h4>
                <button
                  onClick={() => {
                    setAddingMode(!addingMode);
                    setPendingLatLng(null);
                    setFormMsg(null);
                    setManualLat("");
                    setManualLng("");
                    setManualCoords("");
                    setCoordinateSource("map");
                    setFormName("");
                    setFormType("gas");
                    setFormBrand("Local");
                    setFormPrice("60.00");
                    setFormAddress("");
                    setFormPhone("");
                    setFormServices([]);
                    setFormFuelPrices([
                      { fuel_type: "Regular", price: "58.00" },
                      { fuel_type: "Diesel", price: "55.00" },
                      { fuel_type: "Premium", price: "62.00" },
                    ]);
                    setFormOpenTime("08:00");
                    setFormCloseTime("20:00");
                    setOpen24Hours(false);
                    // Reset image states
                    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
                    setSelectedImages([]);
                    setImagePreviewUrls([]);
                    setUploadingImages(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: addingMode ? "#f44336" : "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  {addingMode ? "❌ Cancel" : "➕ Add New POI"}
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
                          color: "#2e7d32",
                          fontWeight: 600,
                        }}
                      >
                        👆 Click on the map to place a new POI OR enter
                        coordinates manually:
                      </p>
                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: 11,
                          color: "#999",
                        }}
                      >
                        💡 Tip: Right-click on Google Maps → Copy coordinates
                      </p>
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: 10,
                          color: "#e65100",
                          fontWeight: 600,
                          background: "#fff3e0",
                          padding: "4px 6px",
                          borderRadius: 3,
                        }}
                      >
                        ⚠️ Google Maps format: Lat, Lng (e.g., 12.5966,
                        121.5258)
                      </p>

                      {/* Single coordinate input field */}
                      <div style={{ marginBottom: 12 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "#333",
                            marginBottom: 4,
                            fontWeight: 600,
                          }}
                        >
                          📍 Paste Coordinates (recommended)
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="12.596600, 121.525800"
                            value={manualCoords}
                            onChange={(e) => setManualCoords(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "10px",
                              border: "2px solid #4CAF50",
                              borderRadius: 4,
                              fontSize: "13px",
                              fontFamily: "monospace",
                              background: "#f0f9ff",
                            }}
                          />
                          <button
                            onClick={setManualCoordinates}
                            disabled={
                              !manualCoords.trim() &&
                              (!manualLat.trim() || !manualLng.trim())
                            }
                            style={{
                              padding: "10px 16px",
                              background:
                                !manualCoords.trim() &&
                                (!manualLat.trim() || !manualLng.trim())
                                  ? "#ccc"
                                  : "#4CAF50",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor:
                                !manualCoords.trim() &&
                                (!manualLat.trim() || !manualLng.trim())
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "13px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            📍 Set
                          </button>
                        </div>
                      </div>

                      {/* Separator */}
                      <div
                        style={{
                          textAlign: "center",
                          margin: "12px 0 8px 0",
                          fontSize: 10,
                          color: "#999",
                          fontStyle: "italic",
                        }}
                      >
                        — OR enter separately —
                      </div>

                      {/* Separate coordinate inputs (legacy) */}
                      <div
                        style={{ display: "flex", gap: 8, alignItems: "end" }}
                      >
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: "#666",
                              marginBottom: 2,
                              fontWeight: 600,
                            }}
                          >
                            Latitude (4° to 22°)
                          </label>
                          <input
                            type="number"
                            step="0.000001"
                            min="-90"
                            max="90"
                            placeholder="12.596600"
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
                          <label
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: "#666",
                              marginBottom: 2,
                              fontWeight: 600,
                            }}
                          >
                            Longitude (116° to 127°)
                          </label>
                          <input
                            type="number"
                            step="0.000001"
                            min="-180"
                            max="180"
                            placeholder="121.525800"
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
                      </div>
                    </div>
                  </>
                )}
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
      )}

      {/* POI Form Overlay */}
      {isAdminEnabled && addingMode && pendingLatLng && (
        <div className="poi-form-overlay">
          <div className="poi-form-container">
            <h3
              style={{
                margin: "0 0 20px 0",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              📍 Add New POI
            </h3>

            {/* POI Type Selector with Icons */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 10,
                  fontWeight: 600,
                  color: "#555",
                  fontSize: "14px",
                }}
              >
                POI Type *
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {[
                  {
                    type: "gas",
                    icon: "⛽",
                    label: "Gas Station",
                    color: "#2196F3",
                  },
                  {
                    type: "convenience",
                    icon: "🏪",
                    label: "Store",
                    color: "#FF9800",
                  },
                  {
                    type: "repair",
                    icon: "🔧",
                    label: "Repair",
                    color: "#9C27B0",
                  },
                  {
                    type: "car_wash",
                    icon: "🚗",
                    label: "Car Wash",
                    color: "#00BCD4",
                  },
                  {
                    type: "motor_shop",
                    icon: "🏍️",
                    label: "Motor Shop",
                    color: "#F44336",
                  },
                ].map((poiType) => (
                  <button
                    key={poiType.type}
                    onClick={() => {
                      setFormType(poiType.type);
                      if (poiType.type !== "gas") {
                        setFormBrand("");
                        setFormPrice("");
                      } else {
                        setFormBrand("Local");
                        setFormPrice("60.00");
                      }
                    }}
                    style={{
                      padding: "15px 10px",
                      background:
                        formType === poiType.type ? poiType.color : "#f5f5f5",
                      color: formType === poiType.type ? "white" : "#666",
                      border:
                        formType === poiType.type
                          ? `2px solid ${poiType.color}`
                          : "2px solid #ddd",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{poiType.icon}</span>
                    <span>{poiType.label}</span>
                  </button>
                ))}
              </div>
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
                Name *
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
                placeholder={
                  formType === "gas"
                    ? "e.g. Shell Roxas"
                    : "e.g. 7-Eleven Roxas"
                }
              />
            </div>

            {/* Show these fields only for gas stations */}
            {formType === "gas" && (
              <>
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
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#555",
                    }}
                  >
                    ⛽ Fuel Types & Prices (₱/L)
                  </label>

                  {/* Dynamic rows for fuel types */}
                  {formFuelPrices.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr auto",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Fuel name (e.g., Regular)"
                        value={item.fuel_type}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormFuelPrices((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, fuel_type: v } : p,
                            ),
                          );
                        }}
                        style={{
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: 4,
                          fontSize: "14px",
                        }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.price}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormFuelPrices((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, price: v } : p,
                            ),
                          );
                        }}
                        style={{
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: 4,
                          fontSize: "14px",
                        }}
                      />
                      <button
                        onClick={() =>
                          setFormFuelPrices((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        style={{
                          padding: "8px 10px",
                          background: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                        title="Remove fuel type"
                      >
                        ✖
                      </button>
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() =>
                        setFormFuelPrices((prev) => [
                          ...prev,
                          { fuel_type: "", price: "0" },
                        ])
                      }
                      style={{
                        padding: "8px 12px",
                        background: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      + Add Fuel Type
                    </button>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        alignSelf: "center",
                      }}
                    >
                      Tip: Set price to 0 or remove the row if not available
                    </div>
                  </div>
                </div>
              </>
            )}

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

            {/* Operating Hours */}
            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                🕐 Operating Hours (Optional)
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    Open Time
                  </label>
                  <input
                    type="time"
                    step="60"
                    value={formOpenTime}
                    onChange={(e) => setFormOpenTime(e.target.value)}
                    disabled={open24Hours || unknownTime}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: "14px",
                      backgroundColor:
                        open24Hours || unknownTime ? "#f5f5f5" : undefined,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    Close Time
                  </label>
                  <input
                    type="time"
                    step="60"
                    value={formCloseTime}
                    onChange={(e) => setFormCloseTime(e.target.value)}
                    disabled={open24Hours || unknownTime}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: "14px",
                      backgroundColor:
                        open24Hours || unknownTime ? "#f5f5f5" : undefined,
                    }}
                  />
                </div>
              </div>

              {/* 24 Hours Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <input
                  id="open24h-toggle"
                  type="checkbox"
                  checked={open24Hours}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setOpen24Hours(checked);
                    if (checked) {
                      // Save previous values and set to 24h
                      prevOpenTimeRef.current = formOpenTime;
                      prevCloseTimeRef.current = formCloseTime;
                      setFormOpenTime("00:00");
                      setFormCloseTime("23:59");
                    }
                  }}
                  disabled={unknownTime}
                />
                <label
                  htmlFor="open24h-toggle"
                  style={{ fontSize: "13px", color: "#555" }}
                >
                  Open 24 hours
                </label>

                <input
                  id="unknown-time-toggle"
                  type="checkbox"
                  checked={unknownTime}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUnknownTime(checked);
                    if (checked) {
                      setOpen24Hours(false);
                    }
                  }}
                  style={{ marginLeft: "16px" }}
                />
                <label
                  htmlFor="unknown-time-toggle"
                  style={{ fontSize: "13px", color: "#555" }}
                >
                  Unknown time
                </label>
              </div>
            </div>

            {/* Show services only for gas stations */}
            {formType === "gas" && (
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
            )}

            {/* Image Upload Section */}
            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                📷 Images (Optional)
              </label>
              <div
                style={{
                  padding: "12px",
                  border: "2px dashed #ddd",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelection}
                  style={{
                    padding: "6px",
                    fontSize: "14px",
                    width: "100%",
                    marginBottom: "8px",
                  }}
                />
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  Max 5 images, 10MB each (JPG, PNG, WebP)
                </p>

                {/* Image Previews */}
                {imagePreviewUrls.length > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(100px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} style={{ position: "relative" }}>
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: 4,
                            border: "1px solid #ddd",
                          }}
                        />
                        <button
                          onClick={() => removeImage(index)}
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            background: "#f44336",
                            color: "white",
                            border: "none",
                            borderRadius: "50%",
                            width: "24px",
                            height: "24px",
                            fontSize: "16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                {pendingLatLng.lat.toFixed(8)}, {pendingLatLng.lng.toFixed(8)}
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
                  setFormType("gas");
                  setFormBrand("Local");
                  setFormPrice("60.00");
                  setFormAddress("");
                  setFormPhone("");
                  setFormServices([]);
                  setFormOpenTime("08:00");
                  setFormCloseTime("20:00");
                  setOpen24Hours(false);
                  setUnknownTime(false);
                  setManualLat("");
                  setManualLng("");
                  setCoordinateSource("map");
                  // Reset image states
                  imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
                  setSelectedImages([]);
                  setImagePreviewUrls([]);
                  setUploadingImages(false);
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
                disabled={formSubmitting || uploadingImages || !formName.trim()}
                style={{
                  padding: "10px 20px",
                  background:
                    formSubmitting || uploadingImages || !formName.trim()
                      ? "#ccc"
                      : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor:
                    formSubmitting || uploadingImages || !formName.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {formSubmitting
                  ? "⏳ Adding POI..."
                  : uploadingImages
                    ? "📷 Uploading Images..."
                    : "✅ Add POI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
