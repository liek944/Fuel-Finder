import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapPanForSheet } from '../../hooks/useMapPanForSheet';
import { SheetMode } from './MapBottomSheet';

/**
 * MapPanController Component
 * 
 * Bridges react-leaflet's useMap() hook with useMapPanForSheet hook.
 * Automatically pans the map when bottom sheet opens/expands to keep marker visible.
 * 
 * Must be placed inside <MapContainer> to access the map instance.
 */

interface MapPanControllerProps {
  markerLatLng: L.LatLng | null;
  sheetMode: SheetMode | null;
  isSheetOpen: boolean;
}

export const MapPanController: React.FC<MapPanControllerProps> = ({
  markerLatLng,
  sheetMode,
  isSheetOpen,
}) => {
  const map = useMap(); // Get the Leaflet map instance

  // Automatically pan map to keep marker visible above bottom sheet
  // Calculates offset based on sheet height: Expanded (70vh) vs Collapsed (96px)
  useMapPanForSheet({
    map,
    markerLatLng,
    sheetMode,
    isOpen: isSheetOpen,
  });

  // This component doesn't render anything
  return null;
};

export default MapPanController;
