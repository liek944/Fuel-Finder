import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Station, POI } from "../types/station.types";
import type { SheetMode } from "../components/map/MapBottomSheet";

export type SelectedItem = { type: "station" | "poi"; data: Station | POI } | null;

interface MapSelectionContextValue {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
  sheetMode: SheetMode;
  setSheetMode: (mode: SheetMode) => void;
  closeSheet: () => void;
  expandSheet: () => void;
  collapseSheet: () => void;
}

const MapSelectionContext = createContext<MapSelectionContextValue | undefined>(undefined);

export const MapSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');

  const closeSheet = useCallback(() => {
    setSelectedItem(null);
    setSheetMode('collapsed');
  }, []);

  const expandSheet = useCallback(() => setSheetMode('expanded'), []);
  const collapseSheet = useCallback(() => setSheetMode('collapsed'), []);

  const value = useMemo<MapSelectionContextValue>(() => ({
    selectedItem,
    setSelectedItem,
    sheetMode,
    setSheetMode,
    closeSheet,
    expandSheet,
    collapseSheet,
  }), [selectedItem, sheetMode, closeSheet, expandSheet, collapseSheet]);

  return (
    <MapSelectionContext.Provider value={value}>{children}</MapSelectionContext.Provider>
  );
};

export function useMapSelection(): MapSelectionContextValue {
  const ctx = useContext(MapSelectionContext);
  if (!ctx) throw new Error("useMapSelection must be used within MapSelectionProvider");
  return ctx;
}
