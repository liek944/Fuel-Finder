import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TileLayer,
  Marker,
  Popup,
  Circle,
  LayersControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import FollowCameraController from "./FollowCameraController";
import MapShell from "./map/MapShell";
import MapOverlays from "./map/MapOverlays";
import SearchControlsDesktop from "./map/SearchControlsDesktop";
import FilterChipMobile from "./map/FilterChipMobile";
import FilterSheetMobile from "./map/FilterSheetMobile";
import { stationsApi } from "../api/stationsApi";
import { poisApi } from "../api/poisApi";
// import TripRecorder from './TripRecorder';
// import TripHistoryPanel from './TripHistoryPanel';
// import TripReplayVisualizer from './TripReplayVisualizer';
import PWAInstallButton from "./PWAInstallButton";
import SettingsButton from "./SettingsButton";
// import DonationWidget from "./DonationWidget"; // COMMENTED OUT: PayMongo payment integration disabled
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import VisualAlert from "./VisualAlert";
// import { Trip } from '../utils/indexedDB';
import StationDetail from "./details/StationDetail";
import PoiDetail from "./details/PoiDetail";
import { MapBottomSheet, SheetMode } from "./map/MapBottomSheet";
import MapPanController from "./map/MapPanController";
import { useIsMobile } from "../hooks/useIsMobile";
import { useRoute } from "../hooks/useRoute";
import RouteDisplay from "./map/RouteDisplay";
import "../styles/TripReplayVisualizer.css";
import "../styles/MainApp.css";
import { useUserTracking } from "../hooks/useUserTracking";
import { arrivalNotifications } from "../utils/arrivalNotifications";
import { useSettings } from "../contexts/SettingsContext";
import { useArrivalNotificationsUI } from "../hooks/useArrivalNotificationsUI";
import { useFilterContext } from "../contexts/FilterContext";
import { useFilterDerived } from "../hooks/useFilterDerived";
import { Station, POI } from "../types/station.types";
import { useMapSelection } from "../contexts/MapSelectionContext";

// Canvas-based markers are created dynamically - no static image imports needed

// RouteData is now provided by routingApi and consumed via useRoute

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
  const {
    radiusMeters,
    setRadiusMeters,
    selectedRouteType,
    setSelectedRouteType,
    autoRefreshEnabled,
    toggleAutoRefresh,
    lastDataRefresh,
    setLastDataRefresh,
    autoRefreshIntervalMs,
    isSearchPanelCollapsed,
    setIsSearchPanelCollapsed,
    toggleSearchPanelCollapsed,
  } = useFilterContext();
  const { filteredStations, uniqueBrands } = useFilterDerived<Station>(stations);
  const { routeData, routingTo, routeTo, clearRoute, loadingRoute, navigationActive } = useRoute(position);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  // Bottom sheet selection (shared via context)
  const { selectedItem, setSelectedItem, sheetMode, setSheetMode, closeSheet, expandSheet, collapseSheet } = useMapSelection();

  const handleSheetClose = useCallback(() => {
    closeSheet();
  }, [closeSheet]);

  const handleSheetExpand = useCallback(() => {
    expandSheet();
  }, [expandSheet]);

  const handleSheetCollapse = useCallback(() => {
    collapseSheet();
  }, [collapseSheet]);

  // Filter bottom sheet for mobile (collapsed by default; opens on chip tap)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  const [filterSheetMode, setFilterSheetMode] = useState<SheetMode>('collapsed');

  const openFilterSheet = useCallback(() => {
    setIsFilterSheetOpen(true);
    setFilterSheetMode('expanded');
  }, []);

  const handleFilterSheetClose = useCallback(() => {
    setIsFilterSheetOpen(false);
    setFilterSheetMode('collapsed');
  }, []);

  const handleFilterSheetExpand = useCallback(() => setFilterSheetMode('expanded'), []);
  const handleFilterSheetCollapse = useCallback(() => setFilterSheetMode('collapsed'), []);

  // Convert selectedItem to LatLng for map panning
  const selectedMarkerLatLng = useMemo(() => {
    if (!selectedItem) return null;
    const loc = selectedItem.data.location;
    return new L.LatLng(loc.lat, loc.lng);
  }, [selectedItem]);
  // followMe removed - map only centers when user clicks the center button

  // Ensure filter is collapsed by default on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSearchPanelCollapsed(true);
    }
  }, [isMobile]);

  // Location tracking states
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(
    Date.now(),
  );
  const [, setIsLocationUpdating] = useState<boolean>(false);
  const lastUpdateRef = useRef<number>(0);
  const lastAcceptedPositionRef = useRef<[number, number] | null>(null);
  const lastAccuracyRef = useRef<number | null>(null);
  const UPDATE_THROTTLE = 3000; // 3 seconds minimum between position updates
  const STALE_POSITION_MS = 20000;
  const MAX_ACCURACY_METERS = 50;

  // Arrival notification state
  const { voiceEnabled, notificationsEnabled, keepScreenOn, darkMode, toggleVoice, toggleNotifications, toggleKeepScreenOn, toggleDarkMode } = useSettings();

  // Visual alerts state
  const { alerts: visualAlerts, dismiss: dismissAlert } = useArrivalNotificationsUI();

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
        const newAccuracy = pos.coords.accuracy;

        const previousPosition = lastAcceptedPositionRef.current;
        const previousAccuracy = lastAccuracyRef.current;

        // Smart throttling: only update if enough time passed or moved significantly
        const timeSinceUpdate = now - lastUpdateRef.current;

        if (
          previousPosition &&
          previousAccuracy !== null &&
          newAccuracy > MAX_ACCURACY_METERS &&
          timeSinceUpdate < STALE_POSITION_MS
        ) {
          console.log("📍 Ignoring low-accuracy location update:", {
            lat: newPosition[0].toFixed(6),
            lng: newPosition[1].toFixed(6),
            accuracy: `±${Math.round(newAccuracy)}m`,
          });

          setLoading(false);
          return;
        }

        let shouldUpdate = timeSinceUpdate >= UPDATE_THROTTLE;

        if (previousPosition && timeSinceUpdate < UPDATE_THROTTLE) {
          const distanceKm = calculateDistance(
            previousPosition[0],
            previousPosition[1],
            newPosition[0],
            newPosition[1],
          );
          const distanceMeters = distanceKm * 1000;
          // Update if moved more than 20 meters even within throttle period
          shouldUpdate = distanceMeters > 20;
        }

        if (!previousPosition || shouldUpdate) {
          console.log("📍 Location updated:", {
            lat: newPosition[0].toFixed(6),
            lng: newPosition[1].toFixed(6),
            accuracy: `±${Math.round(newAccuracy)}m`,
          });

          setPosition(newPosition);
          setLocationAccuracy(newAccuracy);
          setLastLocationUpdate(now);
          lastUpdateRef.current = now;
          lastAcceptedPositionRef.current = newPosition;
          lastAccuracyRef.current = newAccuracy;

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
        if (!lastAcceptedPositionRef.current) {
          console.log("📍 Using default location (Oriental Mindoro)");
          const defaultPosition: [number, number] = [12.5966, 121.5258];
          setPosition(defaultPosition);
          lastAcceptedPositionRef.current = defaultPosition;
          lastAccuracyRef.current = null;
          lastUpdateRef.current = Date.now();
          setLastLocationUpdate(Date.now());
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

    let cancelled = false;

    const fetchStations = async () => {
      // No loading indicator for automatic background updates
      try {
        const data = await stationsApi.nearby(position[0], position[1], radiusMeters);
        if (!cancelled) {
          setStations(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        if (!cancelled && error.name !== 'AbortError') {
          console.error("Failed to fetch stations:", error);
        }
      }
    };

    fetchStations();

    return () => {
      cancelled = true;
    };
  }, [position, radiusMeters]);

  // Fetch POIs
  useEffect(() => {
    if (!position) return;

    let cancelled = false;

    const fetchPOIs = async () => {
      try {
        const data = await poisApi.nearby(position[0], position[1], radiusMeters);
        if (!cancelled) {
          setPois(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        if (!cancelled && error.name !== 'AbortError') {
          console.warn("Failed to fetch POIs:", error);
        }
      }
    };

    fetchPOIs();

    return () => {
      cancelled = true;
    };
  }, [position, radiusMeters]);

  // Auto-refresh timer - periodically refetch stations and POIs
  useEffect(() => {
    if (!autoRefreshEnabled || !position) return;

    const refreshData = async () => {
      try {
        const stationsData = await stationsApi.nearby(position[0], position[1], radiusMeters);
        setStations(Array.isArray(stationsData) ? stationsData : []);

        const poisData = await poisApi.nearby(position[0], position[1], radiusMeters);
        setPois(Array.isArray(poisData) ? poisData : []);

        // Update last refresh timestamp
        setLastDataRefresh(Date.now());

        console.log("🔄 Auto-refresh: Data updated");
      } catch (error) {
        console.error("Auto-refresh failed:", error);
      }
    };

    // Set up interval for auto-refresh
    const intervalId = setInterval(refreshData, autoRefreshIntervalMs);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, position, radiusMeters, autoRefreshIntervalMs]);

  // Initialize user activity tracking
  // Start tracking when component mounts
  // Stop tracking when component unmounts
  useUserTracking("main");

  // Settings and visual alert registration handled via context/hooks

  // Dismiss visual alert
  const dismissVisualAlert = useCallback((id: string) => {
    dismissAlert(id);
  }, [dismissAlert]);

  // Settings side-effects are handled in SettingsContext

  // Settings persistence handled in SettingsContext

  // Debug routeData changes
  useEffect(() => {
    console.log("🔄 RouteData state changed:", {
      hasRouteData: !!routeData,
      hasCoordinates: !!routeData?.coordinates,
      coordinatesLength: routeData?.coordinates?.length || 0,
      routeData: routeData,
    });
  }, [routeData]);

  // Filter stations based on search criteria (with useMemo for performance)

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
      routeTo(targetLocation);
      if (isMobile && isFilterSheetOpen) {
        handleFilterSheetClose();
      }
    }
  };

  const handleToggleVoice = (_enabled: boolean) => {
    toggleVoice();
  };

  const handleToggleNotifications = (_enabled: boolean) => {
    toggleNotifications();
  };

  const handleToggleKeepScreenOn = (_enabled: boolean) => {
    toggleKeepScreenOn();
  };

  const handleToggleDarkMode = (_enabled: boolean) => {
    toggleDarkMode();
  };

  // Get unique brands for filter (memoized for performance)

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
      {/* Header / Filter chip */}
      {!isMobile ? (
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
      ) : (
        <FilterChipMobile
          filteredStationsCount={filteredStations.length}
          poisCount={pois.length}
          onClick={openFilterSheet}
        />
      )}

      {isMobile && (
        <button
          className="mobile-menu-button"
          onClick={() => setIsMenuOpen(true)}
          title="Menu"
          aria-label="Open menu"
          type="button"
        >
          ☰
        </button>
      )}

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
      <MapShell
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
          navigationActive={navigationActive}
          onControlsChange={() => { }}
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
        <RouteDisplay routeData={routeData} />

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
                      onGetDirections={() => routeTo(station)}
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
                      onGetDirections={() => routeTo(poi)}
                      onClearRoute={clearRoute}
                    />
                  </Popup>
                )}
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Map Control Buttons - Right Side */}
        <MapOverlays>
          {!isMobile && (
            <SettingsButton />
          )}

          {/* Voice Announcement Toggle Button */}
          {false && (
            <button
              onClick={() => {
                // Toggle voice announcements (demo button)
                toggleVoice();
                if (!voiceEnabled) {
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
          )}

          {/* Center to My Location Button - simple one-click recenter */}
          <CenterToLocationButton position={position} />

          {/* PWA Install Button */}
          <PWAInstallButton />
        </MapOverlays>
      </MapShell>

      {/* Search Controls (desktop only) */}
      {!isMobile && (
        <SearchControlsDesktop
          filteredStationsCount={filteredStations.length}
          poisCount={pois.length}
          getTimeAgo={getTimeAgo}
          onRouteToNearest={routeToNearestPOI}
          loading={loading || loadingRoute}
          uniqueBrands={uniqueBrands}
        />
      )}



      {isMobile && isMenuOpen && (
        <div className="mobile-menu-overlay">
          <div className="mobile-menu-panel">
            <div className="mobile-menu-header">
              <div className="mobile-menu-title">Fuel Finder</div>
              <button
                className="mobile-menu-close"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="mobile-menu-links">
              <button
                className="mobile-menu-link"
                type="button"
                onClick={() => {
                  navigate("/about");
                  setIsMenuOpen(false);
                }}
              >
                ℹ️ About
              </button>
              <button
                className="mobile-menu-link"
                type="button"
                onClick={() => {
                  navigate("/contact");
                  setIsMenuOpen(false);
                }}
              >
                📞 Contact
              </button>
            </div>
            <div className="mobile-menu-section-title">Settings</div>
            <div className="mobile-menu-settings">
              <div className="mobile-menu-setting-row">
                <div className="mobile-menu-setting-label">
                  🔊 Voice announcements
                </div>
                <button
                  type="button"
                  className="mobile-menu-toggle-button"
                  aria-label="Toggle voice announcements"
                  role="switch"
                  aria-checked={voiceEnabled}
                  onClick={() => handleToggleVoice(!voiceEnabled)}
                >
                  {voiceEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="mobile-menu-setting-row">
                <div className="mobile-menu-setting-label">
                  🔔 Visual alerts
                </div>
                <button
                  type="button"
                  className="mobile-menu-toggle-button"
                  aria-label="Toggle visual alerts"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => handleToggleNotifications(!notificationsEnabled)}
                >
                  {notificationsEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="mobile-menu-setting-row">
                <div className="mobile-menu-setting-label">
                  📱 Keep screen on
                </div>
                <button
                  type="button"
                  className="mobile-menu-toggle-button"
                  aria-label="Toggle keep screen on"
                  role="switch"
                  aria-checked={keepScreenOn}
                  onClick={() => handleToggleKeepScreenOn(!keepScreenOn)}
                >
                  {keepScreenOn ? "ON" : "OFF"}
                </button>
              </div>
              <div className="mobile-menu-setting-row">
                <div className="mobile-menu-setting-label">
                  🌙 Dark Mode
                </div>
                <button
                  type="button"
                  className="mobile-menu-toggle-button"
                  aria-label="Toggle dark mode"
                  role="switch"
                  aria-checked={darkMode}
                  onClick={() => handleToggleDarkMode(!darkMode)}
                >
                  {darkMode ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Visual Alerts - In-app arrival notifications */}
      <VisualAlert alerts={visualAlerts} onDismiss={dismissVisualAlert} />

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

      {/* Mobile Filter Bottom Sheet */}
      {isMobile && (
        <FilterSheetMobile
          open={isFilterSheetOpen}
          mode={filterSheetMode}
          onClose={handleFilterSheetClose}
          onExpand={handleFilterSheetExpand}
          onCollapse={handleFilterSheetCollapse}
          filteredStationsCount={filteredStations.length}
          poisCount={pois.length}
          onRouteToNearest={routeToNearestPOI}
          loading={loading || loadingRoute}
          getTimeAgo={getTimeAgo}
          uniqueBrands={uniqueBrands}
        />
      )}


      {/* Mobile Bottom Sheet for Marker Details */}
      {isMobile && selectedItem && (
        <MapBottomSheet
          open={true}
          mode={sheetMode}
          onClose={handleSheetClose}
          onExpand={handleSheetExpand}
          onCollapse={handleSheetCollapse}
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
              onGetDirections={() => routeTo(selectedItem.data as Station)}
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
              onGetDirections={() => routeTo(selectedItem.data as POI)}
              onClearRoute={clearRoute}
            />
          )}
        </MapBottomSheet>
      )}
    </div>
  );
};

export default MainApp;
