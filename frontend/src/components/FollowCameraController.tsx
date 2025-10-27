import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useFollowCamera } from '../hooks/useFollowCamera';

/**
 * FollowCameraController Component
 * 
 * Bridges react-leaflet's useMap() hook with our custom useFollowCamera hook.
 * This component must be placed inside <MapContainer> to access the map instance.
 * 
 * It manages the camera follow behavior and exposes controls to the parent component.
 */

interface FollowCameraControllerProps {
  userLatLng: L.LatLng | null;
  accuracy: number | null;
  navigationActive: boolean;
  onControlsChange: (controls: {
    effectiveMode: 'off' | 'soft' | 'hard';
    preference: 'off' | 'soft';
    paused: boolean;
    toggleFollowPreference: () => void;
    resumeFollow: () => void;
    pauseFollow: () => void;
  }) => void;
}

export const FollowCameraController: React.FC<FollowCameraControllerProps> = ({
  userLatLng,
  accuracy,
  navigationActive,
  onControlsChange,
}) => {
  const map = useMap(); // Get the Leaflet map instance from react-leaflet

  const followControls = useFollowCamera({
    map,
    userLatLng,
    accuracy,
    navigationActive,
    resumeOnIdleMs: 15000,  // Auto-resume after 15s idle
    marginPx: 80,           // Soft follow padding
    deadZonePx: 140,        // Hard follow dead-zone
    minMoveMeters: 8,       // Jitter threshold
    throttleMs: 600,        // Rate limit
    navYOffsetPx: 120,      // Forward offset during navigation
  });

  // Notify parent component of control changes
  useEffect(() => {
    onControlsChange(followControls);
  }, [
    followControls.effectiveMode,
    followControls.preference,
    followControls.paused,
    onControlsChange,
  ]);

  // This component doesn't render anything
  return null;
};

export default FollowCameraController;
