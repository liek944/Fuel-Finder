/**
 * AddStationClickCatcher Component
 * Handles map click events when adding new stations
 */

import { useMapEvents } from "react-leaflet";

interface AddStationClickCatcherProps {
  enabled: boolean;
  onSelect: (lat: number, lng: number) => void;
}

function AddStationClickCatcher({
  enabled,
  onSelect,
}: AddStationClickCatcherProps) {
  useMapEvents({
    click: enabled
      ? (e) => {
          onSelect(e.latlng.lat, e.latlng.lng);
        }
      : undefined,
  });
  return null;
}

export default AddStationClickCatcher;
