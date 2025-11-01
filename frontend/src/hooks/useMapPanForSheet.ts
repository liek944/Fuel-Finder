import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface UseMapPanForSheetParams {
  map: L.Map | null;
  markerLatLng: L.LatLng | null;
  sheetMode: 'collapsed' | 'expanded' | null;
  isOpen: boolean;
}

/**
 * Hook to pan the map when bottom sheet opens/expands to keep marker visible
 * 
 * Behavior:
 * - When sheet opens in collapsed mode (~96px): Pan so marker is in upper portion
 * - When sheet expands to full (~70vh): Pan further if needed
 * - When sheet closes: Do nothing (preserve user control)
 * 
 * @param map - Leaflet map instance
 * @param markerLatLng - Coordinates of selected marker
 * @param sheetMode - Current sheet mode ('collapsed' | 'expanded' | null)
 * @param isOpen - Whether sheet is currently open
 */
export function useMapPanForSheet({
  map,
  markerLatLng,
  sheetMode,
  isOpen
}: UseMapPanForSheetParams) {
  // Track previous state to detect changes
  const prevStateRef = useRef({ isOpen: false, sheetMode: null as 'collapsed' | 'expanded' | null });

  useEffect(() => {
    // Early exit if map or marker not available
    if (!map || !markerLatLng || !isOpen || !sheetMode) {
      prevStateRef.current = { isOpen, sheetMode };
      return;
    }

    const prevState = prevStateRef.current;

    // Determine if we need to pan
    const shouldPan = 
      (!prevState.isOpen && isOpen) || // Sheet just opened
      (prevState.sheetMode === 'collapsed' && sheetMode === 'expanded'); // Sheet expanded

    if (!shouldPan) {
      prevStateRef.current = { isOpen, sheetMode };
      return;
    }

    // Calculate sheet height based on mode
    const viewportHeight = window.innerHeight;
    const sheetHeight = sheetMode === 'collapsed' 
      ? 180 // Collapsed height in pixels (updated to show more content)
      : viewportHeight * 0.8; // 80vh for expanded

    // Get marker position in pixel coordinates
    const markerPoint = map.latLngToContainerPoint(markerLatLng);
    
    // Calculate desired marker position (upper third of visible area above sheet)
    const visibleHeight = viewportHeight - sheetHeight;
    const desiredMarkerY = visibleHeight * 0.33; // Position marker in upper third

    // Calculate pan offset needed
    const panOffsetY = markerPoint.y - desiredMarkerY;

    // Only pan if offset is significant (> 20px) to avoid jitter
    if (Math.abs(panOffsetY) > 20) {
      // Pan the map smoothly
      map.panBy([0, panOffsetY], {
        animate: true,
        duration: 0.3,
        easeLinearity: 0.25
      });
    }

    // Update previous state
    prevStateRef.current = { isOpen, sheetMode };
  }, [map, markerLatLng, sheetMode, isOpen]);
}
