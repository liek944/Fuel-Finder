import { useFilterContext } from "../contexts/FilterContext";
import { useFilterDerived } from "./useFilterDerived";

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
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    toggleAutoRefresh,
    lastDataRefresh,
    setLastDataRefresh,
    autoRefreshIntervalMs,
    isSearchPanelCollapsed,
    setIsSearchPanelCollapsed,
    toggleSearchPanelCollapsed,
  } = useFilterContext();

  const { filteredStations, uniqueBrands } = useFilterDerived(stations);

  return {
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
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    toggleAutoRefresh,
    lastDataRefresh,
    setLastDataRefresh,
    autoRefreshIntervalMs,
    isSearchPanelCollapsed,
    setIsSearchPanelCollapsed,
    toggleSearchPanelCollapsed,
    filteredStations,
    uniqueBrands,
  } as const;
}
