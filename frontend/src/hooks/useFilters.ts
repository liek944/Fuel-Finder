import { useState, useMemo, useCallback } from "react";

/**
 * useFilters
 *
 * Owns all search/filter-related state for the main map:
 * - search query
 * - radius
 * - brand
 * - max price
 * - auto-refresh toggle + last refresh timestamp
 * - desktop search panel collapsed state
 * - derived filteredStations and uniqueBrands
 *
 * Designed to be used by MainApp as the single source of truth
 * for filters, and to drive both desktop and mobile filter UIs.
 */

interface FilterableStationBase {
  brand: string;
  fuel_price: number;
  fuel_prices?: Array<{ price: number | string }>;
  name?: string;
  address?: string;
}

export function useFilters<TStation extends FilterableStationBase>(
  stations: TStation[],
) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(100);

  // Auto-refresh state (enabled by default, same as original behavior)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [lastDataRefresh, setLastDataRefresh] = useState<number>(() => Date.now());
  const autoRefreshIntervalMs = 60000; // 60 seconds

  // Desktop search panel collapsed state
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] = useState<boolean>(false);

  // Filter stations based on search criteria (with useMemo for performance)
  const filteredStations = useMemo(
    () =>
      stations.filter((station) => {
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
      }),
    [stations, selectedBrand, maxPrice, searchQuery],
  );

  // Unique brands for dropdowns (memoized for performance)
  const uniqueBrands = useMemo(
    () => Array.from(new Set(stations.map((station) => station.brand))).sort(),
    [stations],
  );

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled((prev) => !prev);
  }, []);

  const toggleSearchPanelCollapsed = useCallback(() => {
    setIsSearchPanelCollapsed((prev) => !prev);
  }, []);

  return {
    // Core filter state
    searchQuery,
    setSearchQuery,
    radiusMeters,
    setRadiusMeters,
    selectedBrand,
    setSelectedBrand,
    maxPrice,
    setMaxPrice,

    // Auto-refresh controls
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    toggleAutoRefresh,
    lastDataRefresh,
    setLastDataRefresh,
    autoRefreshIntervalMs,

    // Desktop panel UI state
    isSearchPanelCollapsed,
    setIsSearchPanelCollapsed,
    toggleSearchPanelCollapsed,

    // Derived data
    filteredStations,
    uniqueBrands,
  } as const;
}
