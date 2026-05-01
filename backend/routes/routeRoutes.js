/**
 * OSRM Routing Routes
 * Handles route calculation using OSRM
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");
const dns = require("dns");
const http = require("http");
const https = require("https");

// Simple in-memory cache for routes
const routeCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OSRM_TIMEOUT_MS = 15000; // 15 second timeout

/**
 * Generate cache key for route
 */
function getRouteCacheKey(startLat, startLng, endLat, endLng) {
  // Round to 4 decimal places (~11m precision) for cache hits
  const roundCoord = (n) => Math.round(n * 10000) / 10000;
  return `${roundCoord(startLat)},${roundCoord(startLng)}->${roundCoord(endLat)},${roundCoord(endLng)}`;
}

/**
 * Get cached route if available and not expired
 */
function getCached(key) {
  const cached = routeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    routeCache.delete(key);
    return null;
  }
  return cached.data;
}

/**
 * Set route in cache
 */
function setCached(key, data) {
  routeCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * GET /api/route
 * Calculate route between two points using OSRM
 */
router.get("/", async (req, res) => {
  try {
    const { start, end } = req.query;

    // Validate input parameters
    if (!start || !end) {
      return res.status(400).json({
        error: "Missing parameters",
        message:
          "Both start and end coordinates are required (format: lat,lng)",
      });
    }

    // Parse coordinates
    const startCoords = start
      .split(",")
      .map((coord) => parseFloat(coord.trim()));
    const endCoords = end.split(",").map((coord) => parseFloat(coord.trim()));

    // Validate coordinate format
    if (
      startCoords.length !== 2 ||
      endCoords.length !== 2 ||
      startCoords.some(isNaN) ||
      endCoords.some(isNaN)
    ) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message: "Coordinates must be in format: lat,lng",
      });
    }

    const [startLat, startLng] = startCoords;
    const [endLat, endLng] = endCoords;

    // Validate coordinate ranges
    if (
      Math.abs(startLat) > 90 ||
      Math.abs(endLat) > 90 ||
      Math.abs(startLng) > 180 ||
      Math.abs(endLng) > 180
    ) {
      return res.status(400).json({
        error: "Invalid coordinate range",
        message:
          "Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    console.log(
      `🗺️ OSRM routing request: ${startLat},${startLng} -> ${endLat},${endLng}`,
    );

    // Serve from cache if available
    const routeCacheKey = getRouteCacheKey(startLat, startLng, endLat, endLng);
    const cachedRoute = getCached(routeCacheKey);
    if (cachedRoute) {
      console.log("📦 Serving route from cache");
      return res.json(cachedRoute);
    }

    // OSRM servers: primary (self-hosted EC2), fallback (Valhalla at openstreetmap.de)
    const OSRM_PRIMARY_URL = process.env.OSRM_BASE_URL || "http://54.242.12.213:5000";
    const queryParams = "overview=full&geometries=geojson&alternatives=false";

    function buildOsrmUrl(baseUrl) {
      return `${baseUrl}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?${queryParams}`;
    }

    /**
     * Decode Google-style encoded polyline (precision 6, used by Valhalla)
     * Returns array of [lat, lng] pairs
     */
    function decodePolyline(encoded, precision = 6) {
      const factor = Math.pow(10, precision);
      const coords = [];
      let index = 0, lat = 0, lng = 0;

      while (index < encoded.length) {
        let shift = 0, result = 0, byte;
        do {
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0; result = 0;
        do {
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        coords.push([lat / factor, lng / factor]);
      }
      return coords;
    }

    // Prefer IPv4 for DNS resolution (workaround for some networks)
    try {
      if (typeof dns.setDefaultResultOrder === "function") {
        dns.setDefaultResultOrder("ipv4first");
      }
    } catch (_) {}

    const ipv4Lookup = (hostname, options, cb) =>
      dns.lookup(hostname, { family: 4 }, cb);
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true });

    async function tryGet(url, timeoutMs) {
      return axios.get(url, {
        timeout: timeoutMs,
        headers: { "User-Agent": "FuelFinder/1.0" },
        family: 4,
        lookup: ipv4Lookup,
        httpAgent,
        httpsAgent,
      });
    }

    let routeData;
    let usedFallback = false;

    // Try primary EC2 OSRM instance first
    const primaryUrl = buildOsrmUrl(OSRM_PRIMARY_URL);
    console.log(`🔄 Calling primary OSRM: ${primaryUrl}`);
    try {
      const osrmResponse = await tryGet(primaryUrl, OSRM_TIMEOUT_MS);
      console.log(`✅ Primary OSRM request succeeded`);

      if (!osrmResponse.data?.routes?.length) {
        return res.status(404).json({
          error: "No route found",
          message: "OSRM could not find a route between the specified points",
        });
      }

      const route = osrmResponse.data.routes[0];
      const geometry = route.geometry;

      routeData = {
        coordinates: geometry.coordinates.map((coord) => [coord[1], coord[0]]),
        distance: Math.round(route.distance),
        duration: Math.round(route.duration),
        distance_km: Math.round((route.distance / 1000) * 10) / 10,
        duration_minutes: Math.round(route.duration / 60),
      };
    } catch (primaryErr) {
      // Primary failed — try Valhalla (openstreetmap.de) as fallback
      console.warn(`⚠️ Primary OSRM failed: ${primaryErr?.message || primaryErr}`);

      const valhallaUrl = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify({
        locations: [
          { lat: startLat, lon: startLng },
          { lat: endLat, lon: endLng },
        ],
        costing: "auto",
        directions_options: { units: "km" },
      }))}`;

      console.log(`🔄 Trying Valhalla fallback...`);
      try {
        const valhallaResponse = await tryGet(valhallaUrl, OSRM_TIMEOUT_MS);
        usedFallback = true;
        console.log(`✅ Valhalla fallback succeeded`);

        const trip = valhallaResponse.data?.trip;
        if (!trip?.legs?.length) {
          return res.status(404).json({
            error: "No route found",
            message: "Valhalla could not find a route between the specified points",
          });
        }

        // Decode the encoded polyline shape from Valhalla
        const coordinates = decodePolyline(trip.legs[0].shape);
        const distanceKm = trip.summary?.length || 0;
        const durationSec = trip.summary?.time || 0;

        routeData = {
          coordinates,
          distance: Math.round(distanceKm * 1000),
          duration: Math.round(durationSec),
          distance_km: Math.round(distanceKm * 10) / 10,
          duration_minutes: Math.round(durationSec / 60),
        };
      } catch (fallbackErr) {
        console.error(`❌ Valhalla fallback also failed: ${fallbackErr?.message || fallbackErr}`);
        throw primaryErr;
      }
    }

    console.log(
      `✅ Route found${usedFallback ? ' (via Valhalla fallback)' : ''}: ${routeData.distance_km}km, ${routeData.duration_minutes}min, ${routeData.coordinates.length} points`,
    );

    // cache route
    setCached(routeCacheKey, routeData);
    res.json(routeData);
  } catch (err) {
    // Detailed error logging for diagnosis
    try {
      console.error("❌ Error in OSRM routing:", err?.message || err);
      if (err?.code) console.error("   • code:", err.code);
      if (err?.response) {
        console.error("   • response.status:", err.response.status);
        console.error("   • response.data:", JSON.stringify(err.response.data));
      }
    } catch (_) {}

    res.status(500).json({
      error: "Routing service error",
      message: err?.message || "Failed to calculate route",
      code: err?.code,
    });
  }
});

module.exports = router;
