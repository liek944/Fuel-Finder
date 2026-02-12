import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface FilterContextValue {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  radiusMeters: number;
  setRadiusMeters: (v: number) => void;
  debouncedRadiusMeters: number;
  selectedBrand: string;
  setSelectedBrand: (v: string) => void;
  maxPrice: number;
  setMaxPrice: (v: number) => void;
  selectedRouteType: string;
  setSelectedRouteType: (v: string) => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (v: boolean) => void;
  toggleAutoRefresh: () => void;
  lastDataRefresh: number;
  setLastDataRefresh: (v: number) => void;
  autoRefreshIntervalMs: number;
  isSearchPanelCollapsed: boolean;
  setIsSearchPanelCollapsed: (v: boolean) => void;
  toggleSearchPanelCollapsed: () => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [debouncedRadiusMeters, setDebouncedRadiusMeters] = useState<number>(5000);
  const radiusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce radiusMeters so API fetches only fire after user stops dragging
  useEffect(() => {
    if (radiusTimerRef.current) clearTimeout(radiusTimerRef.current);
    radiusTimerRef.current = setTimeout(() => {
      setDebouncedRadiusMeters(radiusMeters);
    }, 400);
    return () => {
      if (radiusTimerRef.current) clearTimeout(radiusTimerRef.current);
    };
  }, [radiusMeters]);
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [selectedRouteType, setSelectedRouteType] = useState<string>("gas");

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [lastDataRefresh, setLastDataRefresh] = useState<number>(() => Date.now());
  const autoRefreshIntervalMs = 60000;

  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] = useState<boolean>(false);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled((prev) => !prev);
  }, []);

  const toggleSearchPanelCollapsed = useCallback(() => {
    setIsSearchPanelCollapsed((prev) => !prev);
  }, []);

  const value = useMemo<FilterContextValue>(() => ({
    searchQuery,
    setSearchQuery,
    radiusMeters,
    setRadiusMeters,
    debouncedRadiusMeters,
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
  }), [searchQuery, radiusMeters, debouncedRadiusMeters, selectedBrand, maxPrice, selectedRouteType, autoRefreshEnabled, lastDataRefresh, isSearchPanelCollapsed]);

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
};

export function useFilterContext(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilterContext must be used within FilterProvider");
  return ctx;
}
