import React, { useState } from "react";
import { MapBottomSheet, SheetMode } from "./MapBottomSheet";
import { useFilterContext } from "../../contexts/FilterContext";
import "./FilterSheetMobile.css";

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
      header={<div className="filter-sheet-header">🔍 Filter & Search</div>}
    >
      <div className="filter-sheet-content">
        {/* Search bar */}
        <div className="filter-search-bar">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Compact filter row: Radius + Brand side by side */}
        <div className="filter-row-compact">
          <div className="filter-item filter-item--radius">
            <label>📍 {(radiusMeters / 1000).toFixed(1)} km</label>
            <input
              type="range"
              min={500}
              max={15000}
              step={500}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
            />
          </div>
          <div className="filter-item filter-item--brand">
            <label>🏪 Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="All">All</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price filter */}
        <div className="filter-item filter-item--price">
          <label>💰 Max: ₱{maxPrice}/L</label>
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </div>

        {/* Results summary - inline */}
        <div className="filter-results-inline">
          <span>📊 <strong>{filteredStationsCount}</strong> stations</span>
          <span className="filter-results-divider">•</span>
          <span><strong>{poisCount}</strong> POIs</span>
        </div>

        {/* Route to nearest - compact layout */}
        <div className="filter-route-section">
          <div className="filter-route-header">🧭 Quick Route</div>
          <div className="filter-route-controls">
            <select
              value={selectedRouteType}
              onChange={(e) => setSelectedRouteType(e.target.value)}
              className="filter-route-select"
            >
              <option value="gas">⛽ Gas</option>
              <option value="convenience">🏪 Store</option>
              <option value="repair">🔧 Repair</option>
              <option value="car_wash">🚗 Wash</option>
              <option value="motor_shop">🏍️ Motor</option>
            </select>
            <button 
              className="filter-route-btn"
              onClick={onRouteToNearest} 
              disabled={loading}
            >
              {loading ? '...' : '🚗 Go'}
            </button>
          </div>
        </div>
      </div>
    </MapBottomSheet>
  );
};

export default FilterSheetMobile;
