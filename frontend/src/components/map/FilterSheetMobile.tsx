import React from "react";
import { MapBottomSheet, SheetMode } from "./MapBottomSheet";
import { useFilterContext } from "../../contexts/FilterContext";

interface FilterSheetMobileProps {
  open: boolean;
  mode: SheetMode;
  onClose: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  filteredStationsCount: number;
  poisCount: number;
  onRouteToNearest: () => void;
  loading: boolean;
  uniqueBrands: string[];
  getTimeAgo: (timestamp: number) => string;
}

const FilterSheetMobile: React.FC<FilterSheetMobileProps> = ({
  open,
  mode,
  onClose,
  onExpand,
  onCollapse,
  filteredStationsCount,
  poisCount,
  onRouteToNearest,
  loading,
  uniqueBrands,
  getTimeAgo,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    radiusMeters,
    setRadiusMeters,
    selectedBrand,
    setSelectedBrand,
    maxPrice,
    setMaxPrice,
    autoRefreshEnabled,
    toggleAutoRefresh,
    autoRefreshIntervalMs,
    lastDataRefresh,
    selectedRouteType,
    setSelectedRouteType,
  } = useFilterContext();
  if (!open) return null;

  return (
    <MapBottomSheet
      open={true}
      mode={mode}
      onClose={onClose}
      onExpand={onExpand}
      onCollapse={onCollapse}
      translucent={true}
      header={<div style={{ fontWeight: 700 }}>
        
🔍 Filter
      </div>}
    >
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

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

      <div className="results-summary" style={{ marginBottom: 12 }}>
        <div className="results-summary-header">
          
📊 Results
        </div>
        <div>
          ⛽ {filteredStationsCount} stations
        </div>
        <div>
          📍 {poisCount} POIs
        </div>
      </div>

      <div
        className="auto-refresh-control"
        style={{
          marginTop: 12,
          padding: "10px",
          background: autoRefreshEnabled ? "#e8f5e9" : "#fafafa",
          borderRadius: 8,
          border: `1px solid ${autoRefreshEnabled ? "#4CAF50" : "#ddd"}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: autoRefreshEnabled ? "#2e7d32" : "#666",
            }}
          >
            
🔄 Auto-refresh
          </label>
          <button
            onClick={toggleAutoRefresh}
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
              Updates every {autoRefreshIntervalMs / 1000}s
              <br />
              Last: {getTimeAgo(lastDataRefresh)}
            </>
          ) : (
            "Enable to auto-update prices"
          )}
        </div>
      </div>

      <div className="route-to-nearest">
        <label>
          
🧭 Route To
        </label>
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
        <button onClick={onRouteToNearest} disabled={loading}>
          🚗 Go to Nearest
        </button>
      </div>
    </MapBottomSheet>
  );
};

export default FilterSheetMobile;
