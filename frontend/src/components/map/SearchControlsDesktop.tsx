import React from "react";

interface SearchControlsDesktopProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  radiusMeters: number;
  onRadiusChange: (value: number) => void;
  selectedBrand: string;
  onSelectedBrandChange: (value: string) => void;
  maxPrice: number;
  onMaxPriceChange: (value: number) => void;
  filteredStationsCount: number;
  poisCount: number;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  autoRefreshIntervalMs: number;
  lastDataRefresh: number;
  getTimeAgo: (timestamp: number) => string;
  selectedRouteType: string;
  onSelectedRouteTypeChange: (value: string) => void;
  onRouteToNearest: () => void;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  uniqueBrands: string[];
}

const SearchControlsDesktop: React.FC<SearchControlsDesktopProps> = ({
  searchQuery,
  onSearchQueryChange,
  radiusMeters,
  onRadiusChange,
  selectedBrand,
  onSelectedBrandChange,
  maxPrice,
  onMaxPriceChange,
  filteredStationsCount,
  poisCount,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  autoRefreshIntervalMs,
  lastDataRefresh,
  getTimeAgo,
  selectedRouteType,
  onSelectedRouteTypeChange,
  onRouteToNearest,
  loading,
  isCollapsed,
  onToggleCollapsed,
  uniqueBrands,
}) => {
  return (
    <div className="search-controls">
      <div className="search-controls-header">
        <h3>
          
🔍 Filter
        </h3>
        <button
          onClick={onToggleCollapsed}
          title={isCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {isCollapsed ? "⬇️" : "⬆️"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Search bar */}
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
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
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            />
          </div>

          {/* Brand filter */}
          <div className="brand-filter">
            <label>Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => onSelectedBrandChange(e.target.value)}
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
              onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            />
          </div>

          {/* Results summary */}
          <div className="results-summary">
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

          {/* Auto-refresh toggle */}
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
                onClick={onToggleAutoRefresh}
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

          {/* Route to Nearest POI Section */}
          <div className="route-to-nearest">
            <label>
              
🧭 Route To
            </label>
            <select
              value={selectedRouteType}
              onChange={(e) => onSelectedRouteTypeChange(e.target.value)}
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
        </>
      )}

      {/* Collapsed view summary */}
      {isCollapsed && (
        <div className="collapsed-summary">
          <div>
            ⛽ {filteredStationsCount} stations
          </div>
          <div>
            📍 {poisCount} POIs
          </div>
          <div>
            {(radiusMeters / 1000).toFixed(1)}km • {selectedBrand} • ₱
            {maxPrice}/L
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchControlsDesktop;
