import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  TileLayer,
  Marker,
  Popup,
  Circle,
  LayersControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import FollowCameraController from "./FollowCameraController";
import MapShell from "./map/MapShell";
import MapOverlays from "./map/MapOverlays";
import SearchControlsDesktop from "./map/SearchControlsDesktop";
import FilterChipMobile from "./map/FilterChipMobile";
import FilterSheetMobile from "./map/FilterSheetMobile";
import CenterToLocationButton from "./map/CenterToLocationButton";
import PopupScaleFix from "./map/PopupScaleFix";
import { stationsApi } from "../api/stationsApi";
import { poisApi } from "../api/poisApi";
import PWAInstallButton from "./PWAInstallButton";
import SettingsButton from "./SettingsButton";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import VisualAlert from "./VisualAlert";
import StationDetail from "./details/StationDetail";
import PoiDetail from "./details/PoiDetail";
import { MapBottomSheet, SheetMode } from "./map/MapBottomSheet";
import MapPanController from "./map/MapPanController";
import { useIsMobile } from "../hooks/useIsMobile";
import { useRoute } from "../hooks/useRoute";
import { useLocationTracking } from "../hooks/useLocationTracking";
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
import { OfflineIndicator } from './OfflineIndicator';
import { OfflineSettings } from './OfflineSettings';
import {
  createUserLocationIcon,
  createFuelStationIcon,
  createPOIIcon,
  calculateDistance,
} from "../utils/mapIcons";

// Create user location icon instance
const DefaultIcon = createUserLocationIcon();


const MainApp: React.FC = () => {
  // Toast notifications
  const { toasts, hideToast, warning, info } = useToast();
  const { user, isAuthenticated, logout } = useAuth();

  // Mobile detection for bottom sheet vs popups
  const isMobile = useIsMobile();

  const [stations, setStations] = useState<Station[]>([]);
  const [pois, setPois] = useState<POI[]>([]);

  // Location tracking via custom hook (must be declared early since position is used by other hooks)
  const {
    position,
    accuracy: locationAccuracy,
    speed: currentSpeed,
    lastUpdate: lastLocationUpdate,
    loading,
  } = useLocationTracking();
  const [speedUnit, setSpeedUnit] = useState<'kmh' | 'mph'>('kmh');



  const {
    radiusMeters,
    setRadiusMeters: _setRadiusMeters,
    debouncedRadiusMeters,
    selectedRouteType,
    setSelectedRouteType: _setSelectedRouteType,
    autoRefreshEnabled,
    toggleAutoRefresh: _toggleAutoRefresh,
    lastDataRefresh: _lastDataRefresh,
    setLastDataRefresh,
    autoRefreshIntervalMs,
    isSearchPanelCollapsed: _isSearchPanelCollapsed,
    setIsSearchPanelCollapsed,
    toggleSearchPanelCollapsed: _toggleSearchPanelCollapsed,
  } = useFilterContext();
  const { filteredStations, uniqueBrands } = useFilterDerived<Station>(stations);
  const { routeData, routingTo, routeTo, clearRoute, loadingRoute, navigationActive, lastRerouteAt, traveledCoordinates, remainingCoordinates } = useRoute(position);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [showOfflineSettings, setShowOfflineSettings] = useState(false);
  const navigate = useNavigate();
  const routerLocation = useLocation();

  // Bottom sheet selection (shared via context)
  const { selectedItem, setSelectedItem, sheetMode, setSheetMode, closeSheet, expandSheet, collapseSheet } = useMapSelection();

  // Handle navigation from NearbyStations page - select and pan to station
  useEffect(() => {
    const state = routerLocation.state as { selectStationId?: number } | null;
    if (state?.selectStationId && stations.length > 0) {
      const station = stations.find((s) => s.id === state.selectStationId);
      if (station) {
        // Select the station and expand the sheet
        setSelectedItem({ type: 'station', data: station });
        setSheetMode('expanded');
        // Clear the state to prevent re-triggering
        navigate(routerLocation.pathname, { replace: true, state: {} });
      }
    }
  }, [routerLocation.state, stations, setSelectedItem, setSheetMode, navigate, routerLocation.pathname]);

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

  // Fetch nearby stations and POIs when position or radius changes
  useEffect(() => {
    if (!position) return;

    let cancelled = false;

    const fetchData = async () => {
      // Fetch stations
      try {
        const stationsData = await stationsApi.nearby(position[0], position[1], debouncedRadiusMeters);
        if (!cancelled) {
          setStations(Array.isArray(stationsData) ? stationsData : []);
        }
      } catch (error: any) {
        if (!cancelled && error.name !== 'AbortError') {
          console.error("Failed to fetch stations:", error);
        }
      }

      // Fetch POIs
      try {
        const poisData = await poisApi.nearby(position[0], position[1], debouncedRadiusMeters);
        if (!cancelled) {
          setPois(Array.isArray(poisData) ? poisData : []);
        }
      } catch (error: any) {
        if (!cancelled && error.name !== 'AbortError') {
          console.warn("Failed to fetch POIs:", error);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [position, debouncedRadiusMeters]);

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

  useEffect(() => {
    if (!lastRerouteAt) return;
    info("Rerouting...");
  }, [lastRerouteAt, info]);

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
          <div className="main-header-auth">
            {isAuthenticated ? (
              <>
                <span className="header-user-email">{user?.email}</span>
                <button
                  className="header-auth-button header-logout"
                  onClick={logout}
                  type="button"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  className="header-auth-button"
                  onClick={() => navigate('/login')}
                  type="button"
                >
                  Sign In
                </button>
                <button
                  className="header-auth-button header-register"
                  onClick={() => navigate('/register')}
                  type="button"
                >
                  Create Account
                </button>
              </>
            )}
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

      {/* Location Accuracy & Speed Indicator */}
      {locationAccuracy !== null && (
        <div className="location-accuracy-indicator">
          <div className="location-accuracy-header">
            <span className="location-accuracy-dot" />
            GPS Status
          </div>
          <div className="location-accuracy-value">
            ±{Math.round(locationAccuracy)}m
          </div>
          <div 
            className="location-speed-display"
            onClick={() => setSpeedUnit(speedUnit === 'kmh' ? 'mph' : 'kmh')}
            style={{ cursor: 'pointer' }}
            title="Click to toggle km/h ↔ mph"
          >
            <span className="speed-icon">🚗</span>
            <span className="speed-value">
              {currentSpeed !== null && currentSpeed > 0.5
                ? speedUnit === 'kmh'
                  ? `${Math.round(currentSpeed * 3.6)} km/h`
                  : `${Math.round(currentSpeed * 2.237)} mph`
                : '--'}
            </span>
            <span className="speed-unit-toggle">
              {speedUnit === 'kmh' ? '↔ mph' : '↔ km/h'}
            </span>
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

        {/* Route polyline with layered styling - shows traveled (gray) and remaining (blue) */}
        <RouteDisplay 
          routeData={routeData} 
          traveledCoordinates={traveledCoordinates}
          remainingCoordinates={remainingCoordinates}
        />

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
            <SettingsButton onOpenOfflineSettings={() => setShowOfflineSettings(true)} />
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
              <button
                className="mobile-menu-link"
                type="button"
                onClick={() => {
                  navigate("/nearby-stations");
                  setIsMenuOpen(false);
                }}
              >
                ⛽ Nearby Stations
              </button>
            </div>
            
            <div className="mobile-menu-section-title">Account</div>
            <div className="mobile-menu-links">
              {isAuthenticated ? (
                <>
                  <div className="mobile-menu-user-info">
                    👤 {user?.display_name || user?.email}
                  </div>
                  <button
                    className="mobile-menu-link"
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="mobile-menu-link"
                    type="button"
                    onClick={() => {
                      navigate('/login');
                      setIsMenuOpen(false);
                    }}
                  >
                    🔑 Sign In
                  </button>
                  <button
                    className="mobile-menu-link"
                    type="button"
                    onClick={() => {
                      navigate('/register');
                      setIsMenuOpen(false);
                    }}
                  >
                    ✨ Create Account
                  </button>
                </>
              )}
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

            <div className="mobile-menu-section-title">Offline</div>
            <div className="mobile-menu-settings">
              <div className="mobile-menu-setting-row">
                <div className="mobile-menu-setting-label">
                  📴 Offline Mode
                </div>
                <button
                  type="button"
                  className="mobile-menu-toggle-button"
                  aria-label="Manage offline mode"
                  style={{ fontSize: '11px', width: 'auto', padding: '0 10px' }}
                  onClick={() => {
                    setShowOfflineSettings(true);
                    setIsMenuOpen(false);
                  }}
                >
                  MANAGE
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
      {/* Offline Settings Panel */}
      <OfflineSettings isOpen={showOfflineSettings} onClose={() => setShowOfflineSettings(false)} />
      
      {/* Offline Indicator - Always visible when offline/cached data is used */}
      <OfflineIndicator />
    </div>
  );
};

export default MainApp;
