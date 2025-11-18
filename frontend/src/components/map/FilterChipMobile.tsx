import React from "react";
import { useFilterContext } from "../../contexts/FilterContext";

interface FilterChipMobileProps {
  filteredStationsCount: number;
  poisCount: number;
  onClick: () => void;
}

const FilterChipMobile: React.FC<FilterChipMobileProps> = ({
  filteredStationsCount,
  poisCount,
  onClick,
}) => {
  const { radiusMeters, selectedBrand, maxPrice } = useFilterContext();
  return (
    <button
      className="filter-chip"
      onClick={onClick}
      title="Filter"
      aria-label="Open filter"
      type="button"
    >
      <div className="filter-chip-title">
        
🔍 Filter
      </div>
      <div className="filter-chip-summary">
        ⛽ {filteredStationsCount} • 📍 {poisCount} • {(radiusMeters / 1000).toFixed(1)}km • {selectedBrand} • ₱{maxPrice}/L
      </div>
    </button>
  );
};

export default FilterChipMobile;
