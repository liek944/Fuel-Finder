import React from "react";
import { useFilterContext } from "../../contexts/FilterContext";

interface SearchControlsDesktopProps {
  filteredStationsCount: number;
  poisCount: number;
  onRouteToNearest: () => void;
  loading: boolean;
  uniqueBrands: string[];
}

const SearchControlsDesktop: React.FC<SearchControlsDesktopProps> = ({
  filteredStationsCount,
  poisCount,
  onRouteToNearest,
  loading,
  uniqueBrands,
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
    selectedRouteType,
    setSelectedRouteType,
    isSearchPanelCollapsed,
    toggleSearchPanelCollapsed,
  } = useFilterContext();
  return (
    <div className="search-controls">
      <div className="search-controls-header">
        <h3>
          
🔍 Filter
        </h3>
        <button
          onClick={toggleSearchPanelCollapsed}
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



          {/* Route to Nearest POI Section */}
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
        </>
      )}

      {/* Collapsed view summary */}
      {isSearchPanelCollapsed && (
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
