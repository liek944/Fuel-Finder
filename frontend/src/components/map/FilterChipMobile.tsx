import React from "react";

interface FilterChipMobileProps {
  filteredStationsCount: number;
  poisCount: number;
  radiusMeters: number;
  selectedBrand: string;
  maxPrice: number;
  onClick: () => void;
}

const FilterChipMobile: React.FC<FilterChipMobileProps> = ({
  filteredStationsCount,
  poisCount,
  radiusMeters,
  selectedBrand,
  maxPrice,
  onClick,
}) => {
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
        ⛽ {filteredStationsCount} • 📍 {poisCount} •
        {" "}
        {(radiusMeters / 1000).toFixed(1)}km • {selectedBrand} • ₱{maxPrice}/L
      </div>
    </button>
  );
};

export default FilterChipMobile;
