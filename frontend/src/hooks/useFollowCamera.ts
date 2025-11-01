import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';

/**
 * Advanced Follow Camera System for Fuel Finder
 * 
 * Modes:
 * - Off: No automatic camera following
 * - Soft: Keeps user marker within viewport with padding (smooth, non-intrusive)
 * - Hard: Centers user marker with forward offset (active during OSRM navigation)
 * 
 * Features:
 * - Auto-pauses on user drag/zoom
 * - Optional auto-resume after idle period
 * - Jitter filtering and accuracy-based gating
 * - Throttled camera updates
 * - Navigation-aware behavior
 */

type FollowPreference = 'off' | 'soft';
type EffectiveMode = 'off' | 'soft' | 'hard';

interface UseFollowCameraOpts {
  map: L.Map | null;
  userLatLng: L.LatLng | null | undefined;
  accuracy?: number | null;                // GPS accuracy from geolocation
  navigationActive: boolean;               // true while OSRM navigation is active
  resumeOnIdleMs?: number | null;          // auto-resume after idle (e.g., 15000ms)
  marginPx?: number;                       // soft-follow inner padding (default 80)
  deadZonePx?: number;                     // hard-follow deadzone (default 140)
  minMoveMeters?: number;                  // ignore moves smaller than this (default 8)
  throttleMs?: number;                     // rate-limit camera moves (default 600)
  navYOffsetPx?: number;                   // keep user lower on screen during nav (default 120)
}

export function useFollowCamera({
  map,
  userLatLng,
  accuracy = null,
  navigationActive,
  resumeOnIdleMs = null,
  marginPx = 80,
  deadZonePx = 140,
  minMoveMeters = 8,
  throttleMs = 600,
  navYOffsetPx = 120,
}: UseFollowCameraOpts) {
  // User-chosen preference (Off/Soft)
  const [preference, setPreference] = useState<FollowPreference>('soft');
  
  // Paused due to user interaction
  const [paused, setPaused] = useState(false);
  const [lastInteractionAt, setLastInteractionAt] = useState<number>(Date.now());
  const lastPanAtRef = useRef(0);

  // Compute current effective mode
  const effectiveMode: EffectiveMode = useMemo(() => {
    if (paused) return 'off';
    return navigationActive ? 'hard' : preference;
  }, [paused, navigationActive, preference]);

  // Map interaction handlers: pause follow on any user pan/zoom
  useEffect(() => {
    if (!map) return;

    const onInteractStart = (e: L.LeafletEvent) => {
      // Ignore events from bottom sheet or other non-map interactions
      // Check if the event originated from an element with bottom sheet classes
      const target = (e.originalEvent as any)?.target;
      if (target && target.closest) {
        const isBottomSheet = target.closest('.map-bottom-sheet');
        const isBottomSheetBackdrop = target.closest('.map-bottom-sheet-backdrop');
        if (isBottomSheet || isBottomSheetBackdrop) {
          console.log('📷 Ignoring bottom sheet interaction');
          return;
        }
      }
      
      setPaused(true);
      setLastInteractionAt(Date.now());
      console.log('📷 Follow camera paused (user interaction)');
    };
    
    const onInteractEnd = () => {
      setLastInteractionAt(Date.now());
    };

    map.on('dragstart zoomstart', onInteractStart);
    map.on('moveend zoomend', onInteractEnd);
    
    return () => {
      map.off('dragstart zoomstart', onInteractStart);
      map.off('moveend zoomend', onInteractEnd);
    };
  }, [map]);

  // Optional auto-resume after idle
  useEffect(() => {
    if (!resumeOnIdleMs) return;
    
    const id = setInterval(() => {
      if (paused && Date.now() - lastInteractionAt >= resumeOnIdleMs) {
        setPaused(false);
        console.log('📷 Follow camera auto-resumed after idle');
      }
    }, 500);
    
    return () => clearInterval(id);
  }, [paused, lastInteractionAt, resumeOnIdleMs]);

  // Camera behavior on location updates
  useEffect(() => {
    if (!map || !userLatLng) return;
    if (effectiveMode === 'off') return;

    // Accuracy gate: ignore low accuracy fixes
    if (accuracy != null && accuracy > 50) {
      console.log(`📷 Ignoring location update (low accuracy: ${accuracy.toFixed(1)}m)`);
      return;
    }

    // Throttle camera updates
    const now = Date.now();
    if (now - lastPanAtRef.current < throttleMs) return;

    // Jitter filter: ignore tiny moves
    const distanceFromCenter = map.distance(map.getCenter(), userLatLng);
    if (distanceFromCenter < minMoveMeters) return;

    if (effectiveMode === 'hard') {
      // Hard follow: recenter only when outside dead-zone, with forward offset
      if (isOutsideDeadZone(map, userLatLng, deadZonePx)) {
        panToWithYOffset(map, userLatLng, navYOffsetPx);
        lastPanAtRef.current = now;
        console.log('📷 Hard follow: recentered with forward offset');
      }
      return;
    }

    // Soft follow: keep user within padded viewport
    const moved = keepInViewWithMargin(map, userLatLng, marginPx);
    if (moved) {
      lastPanAtRef.current = now;
      console.log('📷 Soft follow: kept user in view');
    }
  }, [map, userLatLng, accuracy, effectiveMode, deadZonePx, marginPx, minMoveMeters, throttleMs, navYOffsetPx]);

  // Exposed controls
  function toggleFollowPreference() {
    setPreference((p) => (p === 'soft' ? 'off' : 'soft'));
    setPaused(false); // explicit user action resumes
    console.log(`📷 Follow preference toggled to: ${preference === 'soft' ? 'off' : 'soft'}`);
  }
  
  function resumeFollow() {
    setPaused(false);
    console.log('📷 Follow camera resumed manually');
  }
  
  function pauseFollow() {
    setPaused(true);
    console.log('📷 Follow camera paused manually');
  }

  return {
    effectiveMode,          // 'off' | 'soft' | 'hard'
    preference,             // 'off' | 'soft' (user choice)
    paused,
    toggleFollowPreference,
    resumeFollow,
    pauseFollow,
  };
}

// Helper functions

/**
 * Soft follow: Keep user marker within viewport with padding
 * Returns true if camera was moved
 */
function keepInViewWithMargin(map: L.Map, latlng: L.LatLng, marginPx: number): boolean {
  const size = map.getSize();
  const p = map.latLngToContainerPoint(latlng);
  
  const dx =
    p.x < marginPx ? p.x - marginPx :
    p.x > size.x - marginPx ? p.x - (size.x - marginPx) : 0;
    
  const dy =
    p.y < marginPx ? p.y - marginPx :
    p.y > size.y - marginPx ? p.y - (size.y - marginPx) : 0;

  if (dx || dy) {
    map.panBy([-dx, -dy], { animate: true, duration: 0.5 });
    return true;
  }
  
  return false;
}

/**
 * Check if user marker is outside the dead-zone radius
 */
function isOutsideDeadZone(map: L.Map, latlng: L.LatLng, radiusPx: number): boolean {
  const cp = map.latLngToContainerPoint(map.getCenter());
  const tp = map.latLngToContainerPoint(latlng);
  const dx = tp.x - cp.x;
  const dy = tp.y - cp.y;
  return Math.hypot(dx, dy) > radiusPx;
}

/**
 * Hard follow: Center with forward Y-offset to show more map ahead
 */
function panToWithYOffset(map: L.Map, latlng: L.LatLng, yOffsetPx: number): void {
  const size = map.getSize();
  const currentPoint = map.latLngToContainerPoint(latlng);
  
  // Place user marker lower on screen (more map visible ahead)
  const targetPoint = L.point(size.x / 2, (size.y / 2) + yOffsetPx);
  
  const dx = currentPoint.x - targetPoint.x;
  const dy = currentPoint.y - targetPoint.y;
  
  if (dx || dy) {
    map.panBy([dx, dy], { animate: true, duration: 0.5 });
  }
}
