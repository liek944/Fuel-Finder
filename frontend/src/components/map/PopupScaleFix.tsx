import React, { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Component to fix popup scaling on zoom (Desktop only - mobile uses bottom sheet).
 * 
 * Leaflet bug: popups scale during zoom, causing visual glitches.
 * This removes scale transforms while preserving position.
 * 
 * This component renders nothing visible but runs effects to fix the popup issue.
 */
const PopupScaleFix: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const fixPopupScale = () => {
      const popupPane = map.getPane("popupPane");
      if (!popupPane) return;

      const popups = popupPane.querySelectorAll(".leaflet-popup");
      popups.forEach((popup) => {
        if (popup instanceof HTMLElement) {
          const transform = popup.style.transform;

          // If there's a scale in the transform, remove it
          if (transform && transform.includes("scale")) {
            const translateMatch = transform.match(/translate3d\(([^)]+)\)/);
            if (translateMatch) {
              popup.style.transform = `translate3d(${translateMatch[1]})`;
            } else {
              const translate2dMatch = transform.match(/translate\(([^)]+)\)/);
              if (translate2dMatch) {
                popup.style.transform = `translate(${translate2dMatch[1]})`;
              }
            }
          }
        }
      });
    };

    // Fix popups during zoom animation
    map.on("zoom", fixPopupScale);
    map.on("zoomend", fixPopupScale);
    map.on("zoomanim", fixPopupScale);

    // Initial fix
    fixPopupScale();

    return () => {
      map.off("zoom", fixPopupScale);
      map.off("zoomend", fixPopupScale);
      map.off("zoomanim", fixPopupScale);
    };
  }, [map]);

  return null;
};

export default PopupScaleFix;
