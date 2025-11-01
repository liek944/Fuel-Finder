import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  LayersControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import FollowCameraController from "./FollowCameraController";
import { getApiUrl } from "../utils/api";
// import TripRecorder from './TripRecorder';
// import TripHistoryPanel from './TripHistoryPanel';
// import TripReplayVisualizer from './TripReplayVisualizer';
import PWAInstallButton from "./PWAInstallButton";
// import DonationWidget from "./DonationWidget"; // COMMENTED OUT: PayMongo payment integration disabled
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
// import { Trip } from '../utils/indexedDB';
import StationDetail from "./details/StationDetail";
import PoiDetail from "./details/PoiDetail";
import { MapBottomSheet, SheetMode } from "./map/MapBottomSheet";
import MapPanController from "./map/MapPanController";
import { useIsMobile } from "../hooks/useIsMobile";
import "../styles/TripReplayVisualizer.css";
import "../styles/MainApp.css";
import userTracking from "../utils/userTracking";
import { arrivalNotifications } from "../utils/arrivalNotifications";

// Canvas-based markers are created dynamically - no static image imports needed

// Types
interface FuelPrice {
  fuel_type: string;
  price: number | string; // PostgreSQL NUMERIC returns strings to preserve precision
  price_updated_at?: string;
  price_updated_by?: string;
}

interface Station {
  id: number;
  name: string;
  brand: string;
  fuel_price: number; // Legacy field - kept for backward compatibility
  fuel_prices?: FuelPrice[]; // New field for multiple fuel types
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

// Simple component to center map to user location
const CenterToLocationButton: React.FC<{ position: [number, number] | null }> = ({ position }) => {
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
}

// Component to fix popup scaling on zoom (Desktop only - mobile uses bottom sheet)
// Leaflet bug: popups scale during zoom, causing visual glitches
// This removes scale transforms while preserving position
const PopupScaleFix: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const fixPopupScale = () => {
      // Get all popup wrapper elements
      const popupPane = map.getPane('popupPane');
      if (!popupPane) return;

      const popups = popupPane.querySelectorAll('.leaflet-popup');
      popups.forEach((popup) => {
        if (popup instanceof HTMLElement) {
          // Get the current transform value
          const transform = popup.style.transform;
          
          // If there's a transform with translate but no scale, keep it
          // If there's a scale in the transform, remove it
          if (transform && transform.includes('scale')) {
            // Extract translate values and reapply without scale
            const translateMatch = transform.match(/translate3d\(([^)]+)\)/);
            if (translateMatch) {
              popup.style.transform = `translate3d(${translateMatch[1]})`;
            } else {
              // Fallback: just keep translate if present
              const translate2dMatch = transform.match(/translate\(([^)]+)\)/);
              if (translate2dMatch) {
                popup.style.transform = `translate(${translate2dMatch[1]})`;
              }
            }
          }
        }
      });
    };

    // Fix popups during zoom animation
    map.on('zoom', fixPopupScale);
    map.on('zoomend', fixPopupScale);
    map.on('zoomanim', fixPopupScale);

    // Initial fix
    fixPopupScale();

    return () => {
      map.off('zoom', fixPopupScale);
      map.off('zoomend', fixPopupScale);
      map.off('zoomanim', fixPopupScale);
    };
  }, [map]);

  return null;
};

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

// Icon cache to avoid redundant canvas operations
const iconCache = new Map<string, L.Icon>();

// Function to create brand-specific fuel station markers with sharp points (with caching)
const createFuelStationIcon = (
  brand: string,
  proximity?: number,
  isClosed: boolean = false,
) => {
  // Quantize proximity to reduce cache misses (group similar values)
  const proxKey = proximity !== undefined ? Math.round(proximity * 4) / 4 : 'none';
  const cacheKey = `fuel-${brand}-${proxKey}-${isClosed}`;
  
  // Return cached icon if available
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }
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
  canvas.height = height + 15; // Extra space for CLOSED text
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Use gray for closed stations
    const color = isClosed
      ? "#9E9E9E"
      : brandColors[brand] || brandColors.default;
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
    ctx.strokeStyle = isClosed ? "#616161" : "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.stroke();

    // Inner white circle for icon background
    ctx.fillStyle = isClosed ? "#f5f5f5" : "white";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Draw fuel pump icon smaller and cleaner
    ctx.fillStyle = isClosed ? "#757575" : color;
    ctx.font = `bold ${Math.floor(radius * 0.7)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛽", centerX, circleY);

    // Add "CLOSED" text below for closed stations
    if (isClosed) {
      ctx.fillStyle = "#f44336";
      ctx.font = "bold 8px Arial";
      ctx.fillText("CLOSED", centerX, pointY + 8);
    }
  }

  const icon = new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 15],
    iconAnchor: [(width + 10) / 2, height + 15],
    popupAnchor: [0, -(height + 15)],
  });
  
  // Cache the icon for future use
  iconCache.set(cacheKey, icon);
  return icon;
};

// POI icon creator with sharp points (with caching)
const createPOIIcon = (type: string) => {
  const cacheKey = `poi-${type}`;
  
  // Return cached icon if available
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }
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

    // Draw pin shape with sharp point
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

  const poiIcon = new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 10],
    iconAnchor: [(width + 10) / 2, height + 10],
    popupAnchor: [0, -(height + 10)],
  });
  
  // Cache the icon for future use
  iconCache.set(cacheKey, poiIcon);
  return poiIcon;
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


const MainApp: React.FC = () => {
  // Toast notifications
  const { toasts, hideToast, warning, info } = useToast();
  
  // Mobile detection for bottom sheet vs popups
  const isMobile = useIsMobile();
  
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routingTo, setRoutingTo] = useState<Station | POI | null>(null);
  const [routeStartPosition, setRouteStartPosition] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Bottom sheet state for mobile marker details
  const [selectedItem, setSelectedItem] = useState<{ type: 'station' | 'poi'; data: Station | POI } | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');
  
  // Convert selectedItem to LatLng for map panning
  const selectedMarkerLatLng = useMemo(() => {
    if (!selectedItem) return null;
    const loc = selectedItem.data.location;
    return new L.LatLng(loc.lat, loc.lng);
  }, [selectedItem]);
  // followMe removed - map only centers when user clicks the center button
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] =
    useState<boolean>(false);
  const [selectedRouteType, setSelectedRouteType] = useState<string>("gas");

  // Trip replay states
  // const [showTripHistory, setShowTripHistory] = useState<boolean>(false);
  // const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Donation widget state
  // const [showDonations, setShowDonations] = useState<boolean>(false); // COMMENTED OUT: PayMongo payment integration disabled

  // Auto-refresh states
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true); // Auto-refresh enabled by default
  const [lastDataRefresh, setLastDataRefresh] = useState<number>(Date.now());
  const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds

  // Location tracking states
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(
    Date.now(),
  );
  const [, setIsLocationUpdating] = useState<boolean>(false);
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_THROTTLE = 3000; // 3 seconds minimum between position updates

  // Arrival notification state (voice only)
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  // Convert position to L.LatLng for follow camera
  const userLatLng = position ? L.latLng(position[0], position[1]) : null;

  // Helper function to format time ago
  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Continuous location tracking with watchPosition
  useEffect(() => {
    let watchId: number | null = null;

    setLoading(true);
    console.log("🌍 Starting continuous location tracking...");

    // Start watching position with high accuracy
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const newPosition: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];

        // Smart throttling: only update if enough time passed or moved significantly
        const timeSinceUpdate = now - lastUpdateRef.current;
        let shouldUpdate = timeSinceUpdate >= UPDATE_THROTTLE;

        if (position && timeSinceUpdate < UPDATE_THROTTLE) {
          const distanceKm = calculateDistance(
            position[0],
            position[1],
            newPosition[0],
            newPosition[1],
          );
          const distanceMeters = distanceKm * 1000;
          // Update if moved more than 20 meters even within throttle period
          shouldUpdate = distanceMeters > 20;
        }

        if (!position || shouldUpdate) {
          console.log("📍 Location updated:", {
            lat: newPosition[0].toFixed(6),
            lng: newPosition[1].toFixed(6),
            accuracy: `±${Math.round(pos.coords.accuracy)}m`,
          });

          setPosition(newPosition);
          setLocationAccuracy(pos.coords.accuracy);
          setLastLocationUpdate(now);
          lastUpdateRef.current = now;

          // Update arrival notifications with new position
          arrivalNotifications.updatePosition(newPosition[0], newPosition[1]);

          // Visual feedback
          setIsLocationUpdating(true);
          setTimeout(() => setIsLocationUpdating(false), 600);
        }

        setLoading(false);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);

        // Only set default location if we don't have a position yet
        if (!position) {
          console.log("📍 Using default location (Oriental Mindoro)");
          setPosition([12.5966, 121.5258]);
        }

        setLoading(false);
      },
      {
        enableHighAccuracy: true, // Use GPS for better accuracy
        maximumAge: 10000, // Accept cached position up to 10s old
        timeout: 15000, // 15 second timeout
      },
    );

    // Cleanup: stop watching position when component unmounts
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log("🛑 Stopped location tracking");
      }
    };
  }, []); // Only run once on mount, but sets up continuous watching

  // Fetch nearby stations
  useEffect(() => {
    if (!position) return;

    const abortController = new AbortController();

    const fetchStations = async () => {
      // No loading indicator for automatic background updates
      try {
        const url = getApiUrl(
          `/api/stations/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
        );
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStations(Array.isArray(data) ? data : []);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Failed to fetch stations:", error);
        }
      }
    };

    fetchStations();
    
    return () => {
      abortController.abort();
    };
  }, [position, radiusMeters]);

  // Fetch POIs
  useEffect(() => {
    if (!position) return;

    const abortController = new AbortController();

    const fetchPOIs = async () => {
      try {
        const url = getApiUrl(
          `/api/pois/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
        );
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPois(Array.isArray(data) ? data : []);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.warn("Failed to fetch POIs:", error);
        }
      }
    };

    fetchPOIs();
    
    return () => {
      abortController.abort();
    };
  }, [position, radiusMeters]);

  // Auto-refresh timer - periodically refetch stations and POIs
  useEffect(() => {
    if (!autoRefreshEnabled || !position) return;

    const refreshData = async () => {
      try {
        // Fetch stations
        const stationsUrl = getApiUrl(
          `/api/stations/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
        );
        const stationsResponse = await fetch(stationsUrl);
        const stationsData = await stationsResponse.json();
        setStations(Array.isArray(stationsData) ? stationsData : []);

        // Fetch POIs
        const poisUrl = getApiUrl(
          `/api/pois/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
        );
        const poisResponse = await fetch(poisUrl);
        const poisData = await poisResponse.json();
        setPois(Array.isArray(poisData) ? poisData : []);

        // Update last refresh timestamp
        setLastDataRefresh(Date.now());
        
        console.log("🔄 Auto-refresh: Data updated");
      } catch (error) {
        console.error("Auto-refresh failed:", error);
      }
    };

    // Set up interval for auto-refresh
    const intervalId = setInterval(refreshData, AUTO_REFRESH_INTERVAL);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, position, radiusMeters, AUTO_REFRESH_INTERVAL]);

  // Initialize user activity tracking
  useEffect(() => {
    // Start tracking when component mounts
    userTracking.startTracking("main");

    // Stop tracking when component unmounts
    return () => {
      userTracking.stopTracking();
    };
  }, []);

  // Sync voice settings when changed
  useEffect(() => {
    arrivalNotifications.setVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // Debug routeData changes
  useEffect(() => {
    console.log("🔄 RouteData state changed:", {
      hasRouteData: !!routeData,
      hasCoordinates: !!routeData?.coordinates,
      coordinatesLength: routeData?.coordinates?.length || 0,
      routeData: routeData,
    });
  }, [routeData]);

  // Auto-clear route if moved significantly from original start position
  useEffect(() => {
    if (!routeData || !routeStartPosition || !position) return;

    const distanceKm = calculateDistance(
      position[0],
      position[1],
      routeStartPosition[0],
      routeStartPosition[1],
    );
    const distanceMeters = distanceKm * 1000;

    // Clear route if moved more than 100 meters from where route started
    if (distanceMeters > 100) {
      console.log(
        `🧭 Auto-clearing route - moved ${Math.round(distanceMeters)}m from original start position`,
      );
      clearRoute();
    }
  }, [position, routeData, routeStartPosition]);

  // Filter stations based on search criteria (with useMemo for performance)
  const filteredStations = useMemo(() => stations.filter((station) => {
    const matchesBrand =
      selectedBrand === "All" || station.brand === selectedBrand;

    // Check if any fuel type matches the price filter
    // NOTE: PostgreSQL NUMERIC returns strings - coerce to number for comparison
    const matchesPrice =
      station.fuel_prices && station.fuel_prices.length > 0
        ? station.fuel_prices.some((fp) => Number(fp.price) <= maxPrice)
        : Number(station.fuel_price) <= maxPrice; // Fallback to legacy price

    const matchesSearch =
      searchQuery === "" ||
      (station.name &&
        station.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (station.brand &&
        station.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (station.address &&
        station.address.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesBrand && matchesPrice && matchesSearch;
  }), [stations, selectedBrand, maxPrice, searchQuery]);

  // Get route to station or POI
  const getRoute = async (location: Station | POI) => {
    if (!position) return;

    setRoutingTo(location);
    setLoading(true);
    setRouteStartPosition(position); // Store the starting position

    try {
      const url = getApiUrl(
        `/api/route?start=${position[0]},${position[1]}&end=${location.location.lat},${location.location.lng}`,
      );
      console.log("🗺️ Fetching route from:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Route API error: ${response.status}`);
      }
      const data = await response.json();
      console.log("📍 Route data received:", data);
      console.log("📍 Coordinates count:", data?.coordinates?.length || 0);
      console.log("📍 Sample coordinates:", data?.coordinates?.slice(0, 3));
      setRouteData(data || null);

      // Set destination for arrival notifications
      arrivalNotifications.setDestination({
        name: location.name,
        location: location.location,
      });
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
    setRouteStartPosition(null);
    
    // Clear destination from arrival notifications
    arrivalNotifications.clearDestination();
  };

  // Check if a location is currently open based on operating hours
  const isLocationOpen = (operatingHours: any): boolean => {
    if (!operatingHours || !operatingHours.open || !operatingHours.close) {
      return true; // Assume open if no hours specified
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    return (
      currentTime >= operatingHours.open && currentTime <= operatingHours.close
    );
  };

  // Route to nearest POI of selected type
  const routeToNearestPOI = () => {
    if (!position) return;

    let locations: (Station | POI)[] = [];

    // Get locations based on selected type
    if (selectedRouteType === "gas") {
      locations = filteredStations;
    } else {
      locations = pois.filter((poi) => poi.type === selectedRouteType);
    }

    if (locations.length === 0) {
      info(
        `No ${selectedRouteType === "gas" ? "gas stations" : selectedRouteType.replace("_", " ")} found in the area.`
      );
      return;
    }

    // Sort by distance and check open status
    const sortedLocations = [...locations]
      .map((loc) => ({
        location: loc,
        distance: calculateDistance(
          position[0],
          position[1],
          loc.location.lat,
          loc.location.lng,
        ),
        isOpen: isLocationOpen(loc.operating_hours),
      }))
      .sort((a, b) => a.distance - b.distance);

    // Find the first open location and count skipped closed ones
    let targetLocation = null;
    let targetIndex = -1;
    let skippedClosed: Array<{ name: string; distance: number }> = [];

    for (let i = 0; i < sortedLocations.length; i++) {
      const item = sortedLocations[i];
      if (item.isOpen) {
        targetLocation = item.location;
        targetIndex = i;
        break;
      } else {
        skippedClosed.push({
          name: item.location.name,
          distance: item.distance,
        });
      }
    }

    // Provide detailed feedback about the routing decision
    if (!targetLocation && sortedLocations.length > 0) {
      targetLocation = sortedLocations[0].location;
      warning(
        `⚠️ All ${sortedLocations.length} nearby locations appear to be closed.\n\nRouting to: ${targetLocation.name} (${sortedLocations[0].distance.toFixed(1)}km)`
      );
    } else if (targetLocation && skippedClosed.length > 0) {
      const skippedNames = skippedClosed
        .slice(0, 2)
        .map((s) => `${s.name} (${s.distance.toFixed(1)}km)`)
        .join(", ");
      const moreText =
        skippedClosed.length > 2 ? ` and ${skippedClosed.length - 2} more` : "";
      info(
        `ℹ️ Skipping ${skippedClosed.length} closed location${skippedClosed.length > 1 ? "s" : ""}:\n${skippedNames}${moreText}\n\nRouting to: ${targetLocation.name} (${sortedLocations[targetIndex].distance.toFixed(1)}km)`
      );
    }

    if (targetLocation) {
      getRoute(targetLocation);
    }
  };

  // Get unique brands for filter (memoized for performance)
  const uniqueBrands = useMemo(() => 
    Array.from(new Set(stations.map((station) => station.brand))).sort(),
    [stations]
  );

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

  // const isMobile = typeof window !== "undefined" && window.innerWidth <= 600;

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Header */}
      <div className="main-header">
        <div className="main-header-content">
          <img
            src="/logo.jpeg"
            alt="Fuel Finder Logo"
            className="main-header-logo"
          />
          <h1 className="main-header-title">Fuel Finder</h1>
        </div>
      </div>

      {/* Location Accuracy Indicator */}
      {locationAccuracy !== null && (
        <div className="location-accuracy-indicator">
          <div className="location-accuracy-header">
            <span className="location-accuracy-dot" />
            GPS Accuracy
          </div>
          <div className="location-accuracy-value">
            ±{Math.round(locationAccuracy)}m
          </div>
          <div className="location-accuracy-timestamp">
            Updated {getTimeAgo(lastLocationUpdate)}
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={position}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Layer Control for switching between Street and Satellite views */}
        <LayersControl position="bottomleft">
          <LayersControl.BaseLayer checked name="Street">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              crossOrigin="anonymous"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Follow Camera Controller - runs invisibly in background */}
        <FollowCameraController
          userLatLng={userLatLng}
          accuracy={locationAccuracy}
          navigationActive={!!routeData}
          onControlsChange={() => {}} // No UI controls needed
        />
        
        {/* Map Pan Controller - pans map when bottom sheet opens/expands */}
        <MapPanController
          markerLatLng={selectedMarkerLatLng}
          sheetMode={selectedItem ? sheetMode : null}
          isSheetOpen={isMobile && !!selectedItem}
        />
        
        {/* Fix popup scaling during zoom (desktop only - mobile uses bottom sheet) */}
        <PopupScaleFix />

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
          <Popup autoPan={false}>
            <div>
              <b>📍 Your Location</b>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                Current position
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </div>
              {locationAccuracy && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    color: "#666",
                    fontWeight: 600,
                  }}
                >
                  Accuracy: ±{Math.round(locationAccuracy)}m
                </div>
              )}
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

          const isOpen = isLocationOpen(station.operating_hours);
          const isSelected = selectedItem?.type === 'station' && selectedItem?.data.id === station.id;

          return (
            <React.Fragment key={`station-${station.id}`}>
              {/* Highlight circle for selected marker */}
              {isSelected && (
                <Circle
                  center={[station.location.lat, station.location.lng]}
                  radius={50}
                  pathOptions={{
                    color: '#2196F3',
                    fillColor: '#2196F3',
                    fillOpacity: 0.15,
                    weight: 3,
                    opacity: 0.8,
                  }}
                  className="selected-marker-highlight"
                />
              )}
              <Marker
                position={[station.location.lat, station.location.lng]}
                icon={createFuelStationIcon(station.brand, proximity, !isOpen)}
                eventHandlers={isMobile ? {
                  click: () => {
                    setSelectedItem({ type: 'station', data: station });
                    setSheetMode('expanded');
                  },
                } : undefined}
              >
                {!isMobile && (
                  <Popup autoPan={false}>
                    <StationDetail
                      station={station}
                      distance={distance}
                      isOpen={isOpen}
                      isRoutingTo={routingTo?.id === station.id}
                      routeData={routeData}
                      onGetDirections={() => getRoute(station)}
                      onClearRoute={clearRoute}
                    />
                  </Popup>
                )}
              </Marker>
            </React.Fragment>
          );
        })}

        {/* POI markers */}
        {pois.map((poi) => {
          const isSelected = selectedItem?.type === 'poi' && selectedItem?.data.id === poi.id;
          
          return (
            <React.Fragment key={`poi-${poi.id}`}>
              {/* Highlight circle for selected marker */}
              {isSelected && (
                <Circle
                  center={[poi.location.lat, poi.location.lng]}
                  radius={50}
                  pathOptions={{
                    color: '#2196F3',
                    fillColor: '#2196F3',
                    fillOpacity: 0.15,
                    weight: 3,
                    opacity: 0.8,
                  }}
                  className="selected-marker-highlight"
                />
              )}
              <Marker
                position={[poi.location.lat, poi.location.lng]}
                icon={createPOIIcon(poi.type)}
                eventHandlers={isMobile ? {
                  click: () => {
                    setSelectedItem({ type: 'poi', data: poi });
                    setSheetMode('expanded');
                  },
                } : undefined}
              >
                {!isMobile && (
                  <Popup autoPan={false}>
                    <PoiDetail
                      poi={poi}
                      distance={calculateDistance(
                        position[0],
                        position[1],
                        poi.location.lat,
                        poi.location.lng,
                      )}
                      isRoutingTo={routingTo?.id === poi.id}
                      routeData={routeData}
                      onGetDirections={() => getRoute(poi)}
                      onClearRoute={clearRoute}
                    />
                  </Popup>
                )}
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Trip Replay Visualizer - MUST be inside MapContainer - Commented out */}
        {/*
        {selectedTrip && (
          <TripReplayVisualizer
            trip={selectedTrip}
            animationConfig={{
              speed: 2,
              interpolate: true,
              interpolationSteps: 10,
            }}
            autoFollow={true}
            showControls={true}
            showRoute={true}
            showTraveledPath={true}
            onStateChange={(state) => {
              console.log('Replay state:', state);
              if (state === 'completed') {
                console.log('Replay completed!');
              }
            }}
          />
        )}
        */}
        
        {/* Center to My Location Button - simple one-click recenter */}
        <CenterToLocationButton position={position} />
      </MapContainer>

      {/* Search Controls */}
      <div className="search-controls">
        <div className="search-controls-header">
          <h3>🔍 Filter</h3>
          <button
            onClick={() => setIsSearchPanelCollapsed(!isSearchPanelCollapsed)}
            title={isSearchPanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isSearchPanelCollapsed ? "⬇️" : "⬆️"}
          </button>
        </div>

        {!isSearchPanelCollapsed && (
          <>
            {/* Search bar */}
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Search radius */}
            <div className="search-radius">
              <label>Radius: {(radiusMeters / 1000).toFixed(1)} km</label>
              <input
                type="range"
                min={500}
                max={15000}
                step={500}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
              />
            </div>

            {/* Brand filter */}
            <div className="brand-filter">
              <label>Brand</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
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
            <div className="price-filter">
              <label>Max: ₱{maxPrice}/L</label>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
              />
            </div>

            {/* Results summary */}
            <div className="results-summary">
              <div className="results-summary-header">📊 Results</div>
              <div>⛽ {filteredStations.length} stations</div>
              <div>📍 {pois.length} POIs</div>
            </div>

            {/* Auto-refresh toggle */}
            <div className="auto-refresh-control" style={{
              marginTop: 12,
              padding: "10px",
              background: autoRefreshEnabled ? "#e8f5e9" : "#fafafa",
              borderRadius: 8,
              border: `1px solid ${autoRefreshEnabled ? "#4CAF50" : "#ddd"}`,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}>
                <label style={{ 
                  fontSize: 12, 
                  fontWeight: 600,
                  color: autoRefreshEnabled ? "#2e7d32" : "#666",
                }}>
                  🔄 Auto-refresh
                </label>
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  style={{
                    background: autoRefreshEnabled ? "#4CAF50" : "#9e9e9e",
                    color: "white",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {autoRefreshEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#666" }}>
                {autoRefreshEnabled ? (
                  <>
                    Updates every {AUTO_REFRESH_INTERVAL / 1000}s
                    <br />
                    Last: {getTimeAgo(lastDataRefresh)}
                  </>
                ) : (
                  "Enable to auto-update prices"
                )}
              </div>
            </div>

            {/* Route to Nearest POI Section */}
            <div className="route-to-nearest">
              <label>🧭 Route To</label>
              <select
                value={selectedRouteType}
                onChange={(e) => setSelectedRouteType(e.target.value)}
              >
                <option value="gas">⛽ Gas Station</option>
                <option value="convenience">🏪 Convenience Store</option>
                <option value="repair">🔧 Repair Shop</option>
                <option value="car_wash">🚗 Car Wash</option>
                <option value="motor_shop">🏍️ Motor Shop</option>
              </select>
              <button onClick={routeToNearestPOI} disabled={loading}>
                🚗 Go to Nearest
              </button>
            </div>
          </>
        )}

        {/* Collapsed view summary */}
        {isSearchPanelCollapsed && (
          <div className="collapsed-summary">
            <div>⛽ {filteredStations.length} stations</div>
            <div>📍 {pois.length} POIs</div>
            <div>
              {(radiusMeters / 1000).toFixed(1)}km • {selectedBrand} • ₱
              {maxPrice}/L
            </div>
          </div>
        )}
      </div>

      {/* Trip Recorder Component - Commented out */}
      {/*
      <TripRecorder
        onTripComplete={(trip: Trip) => {
          console.log('Trip completed:', trip);
          alert(`Trip "${trip.name}" saved with ${trip.coordinates.length} points!`);
        }}
        onRecordingStateChange={(isRecording: boolean) => {
          console.log('Recording state changed:', isRecording);
        }}
      />
      */}

      {/* Trip History Panel - Commented out */}
      {/*
      {showTripHistory && (
        <TripHistoryPanel
          onSelectTrip={(trip: Trip) => {
            setSelectedTrip(trip);
            setShowTripHistory(false);
          }}
          onClose={() => setShowTripHistory(false)}
        />
      )}
      */}

      {/* Close Replay Button - Commented out */}
      {/*
      {selectedTrip && (
        <button
          onClick={() => setSelectedTrip(null)}
          style={{
            position: 'fixed',
            top: window.innerWidth <= 480 ? 140 : 80, // Lower on mobile to avoid overlap
            right: 20,
            zIndex: 1300,
            background: '#ff5252',
            color: 'white',
            border: 'none',
            padding: window.innerWidth <= 480 ? '8px 16px' : '10px 20px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: window.innerWidth <= 480 ? '12px' : '14px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(255, 82, 82, 0.3)',
          }}
        >
          ✕ Close Replay
        </button>
      )}
      */}

      {/* Map Control Buttons - Right Side */}
      <div
        style={{
          position: "fixed",
          top: window.innerWidth <= 768 ? "20px" : "50%",
          right: window.innerWidth <= 768 ? "16px" : "20px",
          transform: window.innerWidth <= 768 ? "none" : "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: window.innerWidth <= 768 ? "16px" : "12px",
          zIndex: 1000,
        }}
      >

        {/* Voice Announcement Toggle Button */}
        <button
          onClick={() => {
            const newState = !voiceEnabled;
            setVoiceEnabled(newState);
            
            if (newState) {
              // Test voice when enabling
              console.log('🔊 Enabling voice announcements...');
              arrivalNotifications.testVoice("Voice announcements enabled");
            } else {
              console.log('🔇 Voice: OFF');
            }
          }}
          style={{
            width: window.innerWidth <= 768 ? "48px" : "50px",
            height: window.innerWidth <= 768 ? "48px" : "50px",
            borderRadius: "50%",
            background: voiceEnabled ? "#FF9800" : "#757575",
            color: "white",
            border: window.innerWidth <= 768 ? "2px solid white" : "3px solid white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            cursor: "pointer",
            fontSize: window.innerWidth <= 768 ? "18px" : "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          title={voiceEnabled ? "Voice Announcements: ON" : "Voice Announcements: OFF"}
          aria-label={voiceEnabled ? "Disable voice announcements" : "Enable voice announcements"}
          role="switch"
          aria-checked={voiceEnabled}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {voiceEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      {/* PWA Install Button */}
      <PWAInstallButton />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Floating Donation Button - COMMENTED OUT: PayMongo payment integration disabled */}
      {/*
      <button
        onClick={() => setShowDonations(true)}
        className="donation-button"
      >
        💝 Support Community
      </button>
      */}

      {/* Donation Widget - COMMENTED OUT: PayMongo payment integration disabled */}
      {/*
      {showDonations && (
        <DonationWidget onClose={() => setShowDonations(false)} />
      )}
      */}

      {/* Mobile Bottom Sheet for Marker Details */}
      {isMobile && selectedItem && (
        <MapBottomSheet
          open={true}
          mode={sheetMode}
          onClose={() => {
            setSelectedItem(null);
            setSheetMode('collapsed');
          }}
          onExpand={() => setSheetMode('expanded')}
          onCollapse={() => setSheetMode('collapsed')}
        >
          {selectedItem.type === 'station' ? (
            <StationDetail
              station={selectedItem.data as Station}
              distance={calculateDistance(
                position![0],
                position![1],
                selectedItem.data.location.lat,
                selectedItem.data.location.lng,
              )}
              isOpen={isLocationOpen((selectedItem.data as Station).operating_hours)}
              isRoutingTo={routingTo?.id === selectedItem.data.id}
              routeData={routeData}
              onGetDirections={() => getRoute(selectedItem.data)}
              onClearRoute={clearRoute}
            />
          ) : (
            <PoiDetail
              poi={selectedItem.data as POI}
              distance={calculateDistance(
                position![0],
                position![1],
                selectedItem.data.location.lat,
                selectedItem.data.location.lng,
              )}
              isRoutingTo={routingTo?.id === selectedItem.data.id}
              routeData={routeData}
              onGetDirections={() => getRoute(selectedItem.data)}
              onClearRoute={clearRoute}
            />
          )}
        </MapBottomSheet>
      )}
    </div>
  );
};

export default MainApp;
