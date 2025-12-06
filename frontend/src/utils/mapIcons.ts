import L from "leaflet";

/**
 * Icon cache to avoid redundant canvas operations.
 * Keys are formatted as "fuel-{brand}-{proximity}-{isClosed}" or "poi-{type}".
 */
const iconCache = new Map<string, L.Icon>();

/**
 * Brand color mapping for fuel station icons.
 */
const brandColors: { [key: string]: string } = {
  Shell: "#FFCC00",
  Petron: "#FF0000",
  Caltex: "#0066B2",
  Phoenix: "#FF6600",
  Unioil: "#00AA00",
  Seaoil: "#0066CC",
  Local: "#ff6b6b",
  default: "#ff6b6b",
};

/**
 * POI type to emoji mapping.
 */
const poiIcons: { [key: string]: string } = {
  gas: "⛽",
  convenience: "🏪",
  repair: "🔧",
  car_wash: "🚗",
  motor_shop: "🏍️",
};

/**
 * Create custom user location icon with sharp point (blue pin).
 */
export const createUserLocationIcon = (): L.Icon => {
  const width = 36;
  const height = 50;
  const canvas = document.createElement("canvas");
  canvas.width = width + 10;
  canvas.height = height + 10;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const centerX = (width + 10) / 2;
    const topRadius = width / 2 - 2;
    const circleY = 5 + topRadius;
    const pointY = height + 5;

    // Draw shadow
    ctx.save();
    ctx.translate(3, 3);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw pin shape - circle top with sharp triangle bottom
    ctx.fillStyle = "#2196F3";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();

    // Draw border
    ctx.strokeStyle = "#1565C0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.stroke();

    // Inner white circle
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Inner blue dot
    ctx.fillStyle = "#2196F3";
    ctx.beginPath();
    ctx.arc(centerX, circleY, topRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  return new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 10],
    iconAnchor: [(width + 10) / 2, height + 10],
    popupAnchor: [0, -(height + 10)],
    className: "user-location-marker",
  });
};

/**
 * Create brand-specific fuel station markers with sharp points (with caching).
 * 
 * @param brand - Fuel station brand (Shell, Petron, Caltex, etc.)
 * @param proximity - Optional 0-1 scale for size adjustment (closer = larger)
 * @param isClosed - Whether the station is currently closed
 */
export const createFuelStationIcon = (
  brand: string,
  proximity?: number,
  isClosed: boolean = false
): L.Icon => {
  // Quantize proximity to reduce cache misses (group similar values)
  const proxKey = proximity !== undefined ? Math.round(proximity * 4) / 4 : "none";
  const cacheKey = `fuel-${brand}-${proxKey}-${isClosed}`;

  // Return cached icon if available
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const baseSize = proximity
    ? Math.max(24, Math.min(36, 36 - proximity * 8))
    : 32;
  const width = baseSize;
  const height = baseSize * 1.4;
  const canvas = document.createElement("canvas");
  canvas.width = width + 10;
  canvas.height = height + 15;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const color = isClosed
      ? "#9E9E9E"
      : brandColors[brand] || brandColors.default;
    const centerX = (width + 10) / 2;
    const radius = width / 2 - 2;
    const circleY = 5 + radius;
    const pointY = height + 5;

    // Draw shadow
    ctx.save();
    ctx.translate(2, 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw pin shape with sharp point
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();

    // Draw darker border for better definition
    ctx.strokeStyle = isClosed ? "#616161" : "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.stroke();

    // Inner white circle for icon background
    ctx.fillStyle = isClosed ? "#f5f5f5" : "white";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Draw fuel pump icon smaller and cleaner
    ctx.fillStyle = isClosed ? "#757575" : color;
    ctx.font = `bold ${Math.floor(radius * 0.7)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛽", centerX, circleY);

    // Add "CLOSED" text below for closed stations
    if (isClosed) {
      ctx.fillStyle = "#f44336";
      ctx.font = "bold 8px Arial";
      ctx.fillText("CLOSED", centerX, pointY + 8);
    }
  }

  const icon = new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 15],
    iconAnchor: [(width + 10) / 2, height + 15],
    popupAnchor: [0, -(height + 15)],
  });

  // Cache the icon for future use
  iconCache.set(cacheKey, icon);
  return icon;
};

/**
 * Create POI icon with sharp point (with caching).
 * 
 * @param type - POI type (gas, convenience, repair, car_wash, motor_shop)
 */
export const createPOIIcon = (type: string): L.Icon => {
  const cacheKey = `poi-${type}`;

  // Return cached icon if available
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const baseSize = 28;
  const width = baseSize;
  const height = baseSize * 1.4;
  const canvas = document.createElement("canvas");
  canvas.width = width + 10;
  canvas.height = height + 10;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const centerX = (width + 10) / 2;
    const radius = width / 2 - 2;
    const circleY = 5 + radius;
    const pointY = height + 5;

    // Draw shadow
    ctx.save();
    ctx.translate(2, 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw pin shape with sharp point
    ctx.fillStyle = "#8B5CF6";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.fill();

    // Draw darker border for better definition
    ctx.strokeStyle = "#5B21B6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius, 0, Math.PI, true);
    ctx.lineTo(centerX, pointY);
    ctx.closePath();
    ctx.stroke();

    // Inner white circle for icon background
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX, circleY, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Draw POI icon smaller and cleaner
    const iconEmoji = poiIcons[type] || "📍";
    ctx.font = `${Math.floor(radius * 0.65)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(iconEmoji, centerX, circleY);
  }

  const poiIcon = new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [width + 10, height + 10],
    iconAnchor: [(width + 10) / 2, height + 10],
    popupAnchor: [0, -(height + 10)],
  });

  // Cache the icon for future use
  iconCache.set(cacheKey, poiIcon);
  return poiIcon;
};

/**
 * Clear the icon cache (useful for testing or when changing themes).
 */
export const clearIconCache = (): void => {
  iconCache.clear();
};

/**
 * Distance calculation using Haversine formula.
 * Returns distance in kilometers.
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
