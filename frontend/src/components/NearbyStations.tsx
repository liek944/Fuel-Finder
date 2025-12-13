import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { stationsApi } from "../api/stationsApi";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { calculateDistance } from "../utils/mapIcons";
import { Station } from "../types/station.types";
import "./styles/NearbyStations.css";

type SortOption = "nearest_open" | "nearest" | "lowest_price";

interface EnrichedStation {
  station: Station;
  distance: number;
  isOpen: boolean;
  lowestPrice: number;
}

const NearbyStations: React.FC = () => {
  const navigate = useNavigate();
  const { position, loading: locationLoading } = useLocationTracking();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("nearest_open");

  // Fetch stations when position is available
  useEffect(() => {
    if (!position) return;

    const fetchStations = async () => {
      setLoading(true);
      try {
        const data = await stationsApi.nearby(position[0], position[1], 10000); // 10km radius
        setStations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
        setStations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, [position]);

  // Check if a station is currently open
  const isStationOpen = (operatingHours: any): boolean => {
    if (!operatingHours || !operatingHours.open || !operatingHours.close) {
      return true; // Assume open if no hours specified
    }
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return currentTime >= operatingHours.open && currentTime <= operatingHours.close;
  };

  // Get the lowest fuel price for a station
  const getLowestPrice = (station: Station): number => {
    if (station.fuel_prices && station.fuel_prices.length > 0) {
      const prices = station.fuel_prices
        .map((fp) => (typeof fp.price === "string" ? parseFloat(fp.price) : fp.price))
        .filter((p) => !isNaN(p) && p > 0);
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
    // Fallback to legacy fuel_price
    return typeof station.fuel_price === "number" ? station.fuel_price : 0;
  };

  // Sort and enrich stations
  const sortedStations = useMemo((): EnrichedStation[] => {
    if (!position) return [];

    const enriched: EnrichedStation[] = stations.map((station) => ({
      station,
      distance: calculateDistance(
        position[0],
        position[1],
        station.location.lat,
        station.location.lng
      ),
      isOpen: isStationOpen(station.operating_hours),
      lowestPrice: getLowestPrice(station),
    }));

    // Sort based on selected option
    switch (sortBy) {
      case "nearest_open":
        return enriched.sort((a, b) => {
          // Open stations first
          if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
          // Then by distance
          return a.distance - b.distance;
        });
      case "nearest":
        return enriched.sort((a, b) => a.distance - b.distance);
      case "lowest_price":
        return enriched.sort((a, b) => {
          // Stations with price first
          if (a.lowestPrice === 0 && b.lowestPrice === 0) return a.distance - b.distance;
          if (a.lowestPrice === 0) return 1;
          if (b.lowestPrice === 0) return -1;
          return a.lowestPrice - b.lowestPrice;
        });
      default:
        return enriched;
    }
  }, [stations, position, sortBy]);

  // Handle station selection - navigate back to map with station ID
  const handleStationClick = (stationId: number) => {
    navigate("/", { state: { selectStationId: stationId } });
  };

  // Format fuel prices for display
  const formatFuelPrices = (station: Station): React.ReactNode => {
    if (station.fuel_prices && station.fuel_prices.length > 0) {
      return station.fuel_prices.map((fp, idx) => (
        <span key={idx} className="fuel-price-tag">
          {fp.fuel_type}: ₱{typeof fp.price === "string" ? parseFloat(fp.price).toFixed(2) : fp.price.toFixed(2)}
        </span>
      ));
    }
    if (station.fuel_price && station.fuel_price > 0) {
      return <span className="fuel-price-tag">₱{station.fuel_price.toFixed(2)}</span>;
    }
    return <span className="fuel-price-tag no-price">No price info</span>;
  };

  // Show loading state
  if (locationLoading || (loading && stations.length === 0)) {
    return (
      <div className="nearby-stations-page">
        <header className="nearby-stations-header">
          <button
            className="back-button"
            onClick={() => navigate("/")}
            aria-label="Go back"
          >
            ← Back
          </button>
          <h1>Nearby Stations</h1>
        </header>
        <div className="loading-state">
          <p>{locationLoading ? "Finding your location..." : "Loading stations..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nearby-stations-page">
      {/* Header */}
      <header className="nearby-stations-header">
        <button
          className="back-button"
          onClick={() => navigate("/")}
          aria-label="Go back"
        >
          ← Back
        </button>
        <h1>Nearby Stations</h1>
      </header>

      {/* Sort Controls */}
      <div className="sort-controls">
        <label htmlFor="sort-select">Sort by:</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="nearest_open">Nearest Open</option>
          <option value="nearest">Nearest</option>
          <option value="lowest_price">Lowest Price</option>
        </select>
      </div>

      {/* Station List */}
      <div className="stations-list">
        {sortedStations.length === 0 ? (
          <div className="empty-state">
            <p>No stations found nearby.</p>
            <p className="empty-hint">Try expanding your search radius on the map.</p>
          </div>
        ) : (
          sortedStations.map(({ station, distance, isOpen }) => (
            <button
              key={station.id}
              className="station-card"
              onClick={() => handleStationClick(station.id)}
              type="button"
            >
              <div className="station-card-header">
                <div className="station-info">
                  <h3 className="station-name">{station.name}</h3>
                  <p className="station-brand">{station.brand}</p>
                </div>
                <span className={`status-badge ${isOpen ? "open" : "closed"}`}>
                  {isOpen ? "Open" : "Closed"}
                </span>
              </div>

              <div className="station-card-body">
                <div className="station-distance">
                  📍 {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} away
                </div>
                <div className="station-prices">{formatFuelPrices(station)}</div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="nearby-stations-footer">
        <p>{sortedStations.length} station{sortedStations.length !== 1 ? "s" : ""} found</p>
      </footer>
    </div>
  );
};

export default NearbyStations;
