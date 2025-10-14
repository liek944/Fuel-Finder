// Simple in-memory rate limiter (per-IP, fixed window)
const rlBuckets = new Map(); // ip -> { count, reset }
function rateLimit(req, res, next) {
  try {
    const key =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const now = Date.now();
    let bucket = rlBuckets.get(key);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 1, reset: now + RATE_LIMIT_WINDOW_MS };
    } else {
      bucket.count += 1;
    }
    rlBuckets.set(key, bucket);

    const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count);
    const retryAfterSec = Math.ceil(Math.max(0, bucket.reset - now) / 1000);

    res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(bucket.reset / 1000)));

    if (bucket.count > RATE_LIMIT_MAX) {
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Too many requests. Try again in ${retryAfterSec}s`,
      });
    }
    next();
  } catch (e) {
    next();
  }
}

// Request deduplication middleware for image uploads
// Prevents duplicate uploads from load balancers/reverse proxies
const crypto = require('crypto');
const pendingRequests = new Map(); // requestHash -> { timestamp, promise }
const DEDUP_WINDOW_MS = 5000; // 5 seconds window for deduplication

function createRequestHash(req) {
  // Create a hash based on: method + path + body content + IP
  const ip = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress || "unknown";
  const bodyStr = JSON.stringify(req.body || {});
  const hashInput = `${req.method}:${req.path}:${bodyStr}:${ip}`;
  return crypto.createHash('md5').update(hashInput).digest('hex');
}

function requestDeduplication(req, res, next) {
  // Only apply to POST/PUT/PATCH requests with body content
  if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !req.body) {
    return next();
  }

  const requestHash = createRequestHash(req);
  const now = Date.now();
  
  // Clean up old entries
  for (const [hash, entry] of pendingRequests.entries()) {
    if (now - entry.timestamp > DEDUP_WINDOW_MS) {
      pendingRequests.delete(hash);
    }
  }

  // Check if this is a duplicate request
  const existing = pendingRequests.get(requestHash);
  if (existing) {
    const timeSinceOriginal = now - existing.timestamp;
    console.log(`⚠️  DUPLICATE REQUEST BLOCKED: ${req.method} ${req.path}`);
    console.log(`   Hash: ${requestHash.substring(0, 12)}...`);
    console.log(`   Time since original: ${timeSinceOriginal}ms`);
    console.log(`   IP: ${req.ip || 'unknown'}`);
    // Return 202 Accepted to indicate the request is being processed
    return res.status(202).json({
      message: "Request already being processed",
      note: "This is a duplicate request that was automatically deduplicated",
      timeSinceOriginal: `${timeSinceOriginal}ms`
    });
  }

  // Mark this request as pending
  pendingRequests.set(requestHash, { timestamp: now });

  // Clean up after response is sent
  const cleanup = () => {
    pendingRequests.delete(requestHash);
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);

  next();
}
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const https = require("https");
const dns = require("dns");
const path = require("path");
// Load environment variables from .env
try {
  require("dotenv").config();
} catch (_) {}
const {
  testConnection,
  ensurePoisTable,
  getNearbyStations,
  getAllStations,
  getStationById,
  deleteStation,
  getStationsByBrand,
  searchStations,
  getDatabaseStats,
  // POIs
  getAllPois,
  getNearbyPois,
  addPoi,
  deletePoi,
  // Price Reporting
  submitPriceReport,
  getPriceReports,
  getLatestVerifiedPrice,
  getAveragePriceFromReports,
  verifyPriceReport,
  getPriceReportStats,
  // Fuel Prices Management
  getStationFuelPrices,
  updateStationFuelPrice,
  deleteStationFuelPrice,
} = require("./database/db");

// Import image service
const {
  getStationImages,
  getPoiImages,
  deleteImage,
  setPrimaryImage,
  uploadBase64Images,
  validateBase64Image,
} = require("./services/imageService");

// Import Supabase storage service
const {
  verifySupabaseConnection,
  getSupabaseImageUrl,
  isSupabaseStorageAvailable,
} = require("./services/supabaseStorage");

const app = express();

// Trust proxy - REQUIRED for AWS EC2 behind reverse proxy/load balancer
// This allows Express to correctly read X-Forwarded-* headers
app.set('trust proxy', true);

const port = process.env.PORT || 3001;
const OSRM_TIMEOUT_MS = parseInt(process.env.OSRM_TIMEOUT_MS || "15000", 10);
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "60000",
  10,
); // 1 minute default
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "10", 10); // 10 requests per window per IP

console.log(
  "🚀 Starting Fuel Finder backend server with PostgreSQL + PostGIS...",
);
console.log(
  `🔑 ADMIN_API_KEY configured: ${ADMIN_API_KEY ? `"${ADMIN_API_KEY}"` : "NOT SET"}`,
);

// Test database connection on startup
(async () => {
  try {
    await testConnection();
    await ensurePoisTable();
    console.log("🎯 Database connection verified successfully");
  } catch (err) {
    console.error(
      "💥 Failed to connect to database. Please ensure PostgreSQL with PostGIS is running.",
    );
    console.error("Database error:", err.message);
    console.error("\n📋 Setup checklist:");
    console.error("  1. Install PostgreSQL with PostGIS extension");
    console.error("  2. Create database: fuel_finder");
    console.error("  3. Run: npm run db:init");
    console.error("  4. Check connection settings in .env file");
    process.exit(1);
  }
})();

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for images
app.use(
  "/api/images/stations",
  express.static(path.join(__dirname, "uploads/images/stations")),
);
app.use(
  "/api/images/pois",
  express.static(path.join(__dirname, "uploads/images/pois")),
);
app.use(
  "/api/images/thumbnails",
  express.static(path.join(__dirname, "uploads/images/thumbnails")),
);

// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);

  // Disable caching for all API responses
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");

  next();
});

// Create a new station (protected by optional API key)
app.post("/api/stations", requestDeduplication, rateLimit, async (req, res) => {
  try {
    // If ADMIN_API_KEY is configured, require matching x-api-key header
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const {
      name,
      brand,
      fuel_price,
      fuel_prices, // Array of {fuel_type, price}
      services,
      address,
      phone,
      operating_hours,
      lat,
      lng,
    } = req.body || {};

    // Basic validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid name",
        message: "'name' must be a non-empty string with at least 2 characters",
      });
    }
    if (!isFinite(parseFloat(lat)) || !isFinite(parseFloat(lng))) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message: "'lat' and 'lng' must be valid numbers",
      });
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) {
      return res.status(400).json({
        error: "Invalid coordinate range",
        message:
          "Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    // Normalize payload
    const payload = {
      name: name.trim(),
      brand: (brand && String(brand).trim()) || "Local",
      fuel_price:
        fuel_price != null && fuel_price !== "" ? Number(fuel_price) : null,
      services: Array.isArray(services)
        ? services
        : typeof services === "string" && services.trim().length
          ? services
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      address: address ? String(address).trim() : null,
      phone: phone ? String(phone).trim() : null,
      operating_hours: operating_hours || null,
      lat: latNum,
      lng: lngNum,
    };

    // Persist
    const { addStation, updateStationFuelPrice } = require("./database/db");
    const created = await addStation(payload);

    // Add fuel prices if provided
    if (fuel_prices && Array.isArray(fuel_prices) && fuel_prices.length > 0) {
      for (const fp of fuel_prices) {
        if (fp.fuel_type && fp.price && parseFloat(fp.price) > 0) {
          try {
            await updateStationFuelPrice(
              created.id,
              fp.fuel_type,
              parseFloat(fp.price),
              'admin'
            );
          } catch (fpErr) {
            console.error(`Failed to add ${fp.fuel_type} price:`, fpErr.message);
          }
        }
      }
    }

    // Reuse transformer to keep response consistent with other endpoints
    const transformed = transformStationData([created])[0];

    console.log(
      `🆕 Station created: ${transformed.name} (${transformed.brand}) @ ${transformed.location.lat},${transformed.location.lng}`,
    );
    res.status(201).json(transformed);
  } catch (err) {
    console.error("❌ Error creating station:", err.message || err);
    res.status(500).json({
      error: "Failed to create station",
      message: err?.message || "Unknown error",
    });
  }
});

// Simple in-memory cache for performance optimization
const cache = new Map();
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS) || 2 * 60 * 1000; // 2 minutes default

function getCacheKey(lat, lng, radius) {
  const kLat = Number(lat).toFixed(3); // ~110m precision
  const kLng = Number(lng).toFixed(3);
  const kRad = Number(radius || 3000);
  return `nearby:${kLat}:${kLng}:${kRad}`;
}

function getRouteCacheKey(startLat, startLng, endLat, endLng) {
  const sLat = Number(startLat).toFixed(5);
  const sLng = Number(startLng).toFixed(5);
  const eLat = Number(endLat).toFixed(5);
  const eLng = Number(endLng).toFixed(5);
  return `route:${sLat}:${sLng}:${eLat}:${eLng}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  // Cleanup old entries periodically
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS) {
        cache.delete(k);
      }
    }
  }
}

// Transform database station data to frontend format
function transformStationData(stations) {
  return stations.map((station) => ({
    id: station.id,
    name: station.name,
    brand: station.brand,
    fuel_price: station.fuel_price,
    fuel_prices: station.fuel_prices || [], // Include fuel_prices array
    services: station.services || [],
    address: station.address,
    phone: station.phone,
    operating_hours: station.operating_hours,
    distance_meters: station.distance_meters
      ? Math.round(parseFloat(station.distance_meters))
      : undefined,
    location: {
      lat: parseFloat(station.lat),
      lng: parseFloat(station.lng),
    },
    images: (station.images || []).map((image) => {
      let imageUrl, thumbnailUrl;

      if (isSupabaseStorageAvailable()) {
        // Use Supabase Storage URLs
        imageUrl = getSupabaseImageUrl(`stations/${image.filename}`);
        thumbnailUrl = getSupabaseImageUrl(
          `thumbnails/thumb_${image.filename}`,
        );
      } else {
        // Fallback to local URLs
        imageUrl = `/api/images/stations/${image.filename}`;
        thumbnailUrl = `/api/images/thumbnails/thumb_${image.filename}`;
      }

      return {
        ...image,
        url: imageUrl,
        thumbnailUrl: thumbnailUrl,
      };
    }),
  }));
}

// ----------- POIs (Custom Markers) -----------

// Get all POIs
app.get("/api/pois", async (req, res) => {
  try {
    const pois = await getAllPois();
    const data = transformPoiData(pois);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching POIs:", err.message);
    res
      .status(500)
      .json({ error: "Failed to fetch POIs", message: err.message });
  }
});

// Get nearby POIs
app.get("/api/pois/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radiusMeters || "3000", 10);

    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message: "lat and lng parameters must be valid numbers",
      });
    }
    if (radius < 100 || radius > 50000) {
      return res.status(400).json({
        error: "Invalid radius",
        message: "radiusMeters must be between 100 and 50000",
      });
    }

    const pois = await getNearbyPois(lat, lng, radius);
    const data = transformPoiData(pois);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching nearby POIs:", err.message);
    res
      .status(500)
      .json({ error: "Failed to fetch nearby POIs", message: err.message });
  }
});

// Debug endpoint to check API key configuration
app.get("/api/admin/debug", (req, res) => {
  const headerKey = req.header("x-api-key");
  res.json({
    adminApiKeyConfigured: !!ADMIN_API_KEY,
    adminApiKeyValue: ADMIN_API_KEY || "NOT SET",
    receivedHeaderKey: headerKey || "NOT PROVIDED",
    keysMatch: headerKey === ADMIN_API_KEY,
  });
});

// Create a new POI (protected by optional API key)
app.post("/api/pois", requestDeduplication, rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      console.log(
        `🔍 POI Creation Debug - Expected: "${ADMIN_API_KEY}", Received: "${headerKey || "NOT PROVIDED"}"`,
      );
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        console.log(
          `❌ API Key mismatch - Expected: "${ADMIN_API_KEY}", Got: "${headerKey}"`,
        );
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
      console.log(`✅ API Key validated successfully`);
    }

    const { name, type, lat, lng } = req.body || {};
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid name",
        message: "'name' must be at least 2 characters",
      });
    }
    const allowed = new Set([
      "gas",
      "convenience",
      "repair",
      "car_wash",
      "motor_shop",
    ]);
    if (!type || typeof type !== "string" || !allowed.has(type)) {
      return res.status(400).json({
        error: "Invalid type",
        message:
          "type must be one of: gas, convenience, repair, car_wash, motor_shop",
      });
    }
    if (!isFinite(parseFloat(lat)) || !isFinite(parseFloat(lng))) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message: "'lat' and 'lng' must be valid numbers",
      });
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) {
      return res.status(400).json({
        error: "Invalid coordinate range",
        message:
          "Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    const created = await addPoi({
      name: name.trim(),
      type,
      lat: latNum,
      lng: lngNum,
    });
    const data = transformPoiData([created])[0];
    console.log(
      `🆕 POI created: ${data.name} (${data.type}) @ ${data.location.lat},${data.location.lng}`,
    );
    res.status(201).json(data);
  } catch (err) {
    console.error("❌ Error creating POI:", err.message || err);
    res.status(500).json({
      error: "Failed to create POI",
      message: err?.message || "Unknown error",
    });
  }
});

// Delete a POI (protected by optional API key)
app.delete("/api/pois/:id", async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }
    const id = parseInt(req.params.id);
    if (!isFinite(id)) {
      return res
        .status(400)
        .json({ error: "Invalid id", message: "id must be a number" });
    }
    const deleted = await deletePoi(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ error: "Not found", message: `No POI with id ${id}` });
    }
    res.json({ success: true, id });
  } catch (err) {
    console.error("❌ Error deleting POI:", err.message || err);
    res.status(500).json({
      error: "Failed to delete POI",
      message: err?.message || "Unknown error",
    });
  }
});

// Transform POI data to frontend format
function transformPoiData(pois) {
  return pois.map((poi) => ({
    id: poi.id,
    name: poi.name,
    type: poi.type,
    distance_meters: poi.distance_meters
      ? Math.round(parseFloat(poi.distance_meters))
      : undefined,
    location: {
      lat: parseFloat(poi.lat),
      lng: parseFloat(poi.lng),
    },
    images: (poi.images || []).map((image) => {
      let imageUrl, thumbnailUrl;

      if (isSupabaseStorageAvailable()) {
        // Use Supabase Storage URLs
        imageUrl = getSupabaseImageUrl(`pois/${image.filename}`);
        thumbnailUrl = getSupabaseImageUrl(
          `thumbnails/thumb_${image.filename}`,
        );
      } else {
        // Fallback to local URLs
        imageUrl = `/api/images/pois/${image.filename}`;
        thumbnailUrl = `/api/images/thumbnails/thumb_${image.filename}`;
      }

      return {
        ...image,
        url: imageUrl,
        thumbnailUrl: thumbnailUrl,
      };
    }),
  }));
}

// API Routes

// Health check endpoint with database and Supabase connectivity test
app.get("/api/health", async (req, res) => {
  try {
    await testConnection();
    const stats = await getDatabaseStats();

    // Check Supabase Storage connection
    const supabaseStatus = await verifySupabaseConnection();

    res.json({
      status: "ok",
      message: "Server and database are running",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        total_stations: stats.total_stations?.[0]?.count || 0,
      },
      storage: {
        type: supabaseStatus.connected ? "supabase" : "local",
        connected: supabaseStatus.connected,
        bucket: supabaseStatus.bucket,
        message: supabaseStatus.message,
      },
    });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(503).json({
      status: "error",
      message: "Database connection failed",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get all fuel stations from PostgreSQL
app.get("/api/stations", async (req, res) => {
  try {
    console.log("📋 Fetching all stations from PostgreSQL database...");

    // Check cache for all stations
    const cacheKey = "all_stations";
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`📦 Serving ${cached.length} stations from cache`);
      return res.json(cached);
    }

    const stations = await getAllStations();
    const transformedStations = transformStationData(stations);

    // Cache the result
    setCached(cacheKey, transformedStations);

    console.log(
      `✅ Retrieved ${transformedStations.length} stations from PostgreSQL`,
    );
    res.set("X-Data-Source", "postgresql");
    res.json(transformedStations);
  } catch (err) {
    console.error("❌ Error fetching all stations:", err.message);
    res.status(500).json({
      error: "Failed to fetch stations",
      message: err.message,
    });
  }
});

// Get nearby stations using PostGIS ST_DWithin spatial query
app.get("/api/stations/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radiusMeters || "3000", 10);

    // Validate input
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message: "lat and lng parameters must be valid numbers",
      });
    }

    if (radius < 100 || radius > 50000) {
      return res.status(400).json({
        error: "Invalid radius",
        message: "radiusMeters must be between 100 and 50000",
      });
    }

    console.log(
      `🔍 PostGIS spatial query: lat=${lat}, lng=${lng}, radius=${radius}m`,
    );

    // Check cache first
    const cacheKey = getCacheKey(lat, lng, radius);
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`📦 Serving ${cached.length} nearby stations from cache`);
      res.set("X-Cache", "HIT");
      return res.json(cached);
    }

    // Query database using PostGIS ST_DWithin
    const stations = await getNearbyStations(lat, lng, radius);
    const transformedStations = transformStationData(stations);

    console.log(
      `✅ PostGIS found ${transformedStations.length} stations within ${radius}m`,
    );

    // Cache the result
    setCached(cacheKey, transformedStations);

    // Add headers to indicate data source
    res.set("X-Data-Source", "postgresql-postgis");
    res.set("X-Cache", "MISS");
    res.json(transformedStations);
  } catch (err) {
    console.error("❌ Error in nearby stations query:", err.message);
    res.status(500).json({
      error: "Failed to fetch nearby stations",
      message: err.message,
    });
  }
});

// Get station by ID
app.get("/api/stations/:id", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);

    if (!isFinite(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    console.log(`🔍 Fetching station with ID: ${stationId}`);

    const station = await getStationById(stationId);

    if (!station) {
      return res.status(404).json({
        error: "Station not found",
        message: `No station found with ID ${stationId}`,
      });
    }

    const transformedStation = transformStationData([station])[0];

    console.log(`✅ Found station: ${station.name}`);
    res.json(transformedStation);
  } catch (err) {
    console.error("❌ Error fetching station by ID:", err.message);
    res.status(500).json({
      error: "Failed to fetch station",
      message: err.message,
    });
  }
});

// Delete a station (protected by optional API key)
app.delete("/api/stations/:id", async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const stationId = parseInt(req.params.id);
    if (!isFinite(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    const deleted = await deleteStation(stationId);
    if (!deleted) {
      return res.status(404).json({
        error: "Not found",
        message: `No station with id ${stationId}`,
      });
    }

    console.log(`🗑️ Station deleted: ${deleted.name} (ID: ${stationId})`);
    res.json({ success: true, id: stationId });
  } catch (err) {
    console.error("❌ Error deleting station:", err.message || err);
    res.status(500).json({
      error: "Failed to delete station",
      message: err?.message || "Unknown error",
    });
  }
});

// Search stations by name, brand, or address
app.get("/api/stations/search", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid search query",
        message: "Search query must be at least 2 characters long",
      });
    }

    console.log(`🔍 Searching stations for: "${query}"`);

    const stations = await searchStations(query.trim());
    const transformedStations = transformStationData(stations);

    console.log(`✅ Search found ${transformedStations.length} stations`);
    res.json(transformedStations);
  } catch (err) {
    console.error("❌ Error in station search:", err.message);
    res.status(500).json({
      error: "Search failed",
      message: err.message,
    });
  }
});

// Get stations by brand
app.get("/api/stations/brand/:brand", async (req, res) => {
  try {
    const brand = req.params.brand;

    console.log(`🔍 Fetching stations for brand: ${brand}`);

    const stations = await getStationsByBrand(brand);
    const transformedStations = transformStationData(stations);

    console.log(`✅ Found ${transformedStations.length} ${brand} stations`);
    res.json(transformedStations);
  } catch (err) {
    console.error("❌ Error fetching stations by brand:", err.message);
    res.status(500).json({
      error: "Failed to fetch stations by brand",
      message: err.message,
    });
  }
});

// Get database statistics (for admin/monitoring)
app.get("/api/stats", async (req, res) => {
  try {
    console.log("📊 Fetching database statistics...");

    const stats = await getDatabaseStats();

    res.json({
      timestamp: new Date().toISOString(),
      cache_size: cache.size,
      database: stats,
    });
  } catch (err) {
    console.error("❌ Error fetching stats:", err.message);
    res.status(500).json({
      error: "Failed to fetch statistics",
      message: err.message,
    });
  }
});

// OSRM routing endpoint
app.get("/api/route", async (req, res) => {
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

    // Call OSRM API (configurable base URL, default to HTTPS)
    const OSRM_BASE_URL =
      process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
    const queryParams = "overview=full&geometries=geojson&alternatives=false";
    const osrmUrl = `${OSRM_BASE_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?${queryParams}`;
    console.log(`➡️  OSRM URL: ${osrmUrl}`);

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

    async function tryGet(url) {
      return axios.get(url, {
        timeout: OSRM_TIMEOUT_MS,
        headers: { "User-Agent": "FuelFinder/1.0" },
        family: 4,
        lookup: ipv4Lookup,
        httpAgent,
        httpsAgent,
      });
    }

    let osrmResponse;
    const isDefaultHttps = OSRM_BASE_URL === "https://router.project-osrm.org";
    const fallbackUrl = osrmUrl.replace("https://", "http://");
    const attempts = [];
    const maxTries = 2; // primary + maybe fallback
    for (let i = 0; i < maxTries; i++) {
      try {
        const targetUrl =
          i === 0 ? osrmUrl : isDefaultHttps ? fallbackUrl : osrmUrl;
        if (i === 1 && isDefaultHttps) {
          console.warn(`↩️  Retrying OSRM via HTTP fallback: ${targetUrl}`);
        }
        osrmResponse = await tryGet(targetUrl);
        break;
      } catch (e) {
        attempts.push(e);
        const isNetworkish =
          e?.code === "ETIMEDOUT" ||
          e?.code === "ECONNRESET" ||
          e?.code === "EAI_AGAIN" ||
          e?.response == null;
        if (i < maxTries - 1 && (isDefaultHttps || isNetworkish)) {
          // small backoff before retry
          await new Promise((r) => setTimeout(r, 800 * (i + 1)));
          continue;
        }
        throw e;
      }
    }

    if (
      !osrmResponse.data ||
      !osrmResponse.data.routes ||
      osrmResponse.data.routes.length === 0
    ) {
      return res.status(404).json({
        error: "No route found",
        message: "OSRM could not find a route between the specified points",
      });
    }

    const route = osrmResponse.data.routes[0];
    const geometry = route.geometry;

    // Extract route information
    const routeData = {
      coordinates: geometry.coordinates.map((coord) => [coord[1], coord[0]]), // Convert [lng, lat] to [lat, lng]
      distance: Math.round(route.distance), // meters
      duration: Math.round(route.duration), // seconds
      distance_km: Math.round((route.distance / 1000) * 10) / 10, // kilometers, rounded to 1 decimal
      duration_minutes: Math.round(route.duration / 60), // minutes
    };

    console.log(
      `✅ Route found: ${routeData.distance_km}km, ${routeData.duration_minutes}min`,
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
      } else if (err?.request) {
        console.error("   • request made, no response received");
      }
      if (err?.stack) console.error("   • stack:\n", err.stack);
    } catch (_) {
      // swallow logging errors
    }

    // Handle specific network errors
    if (
      err?.code === "ENOTFOUND" ||
      err?.code === "ECONNREFUSED" ||
      err?.code === "EAI_AGAIN"
    ) {
      return res.status(503).json({
        error: "Routing service unavailable",
        message: "Unable to connect to OSRM routing service",
      });
    }

    // If OSRM responded with an error status
    if (err?.response && err.response.status) {
      const status = err.response.status;
      const data = err.response.data;
      const detailMsg =
        (typeof data === "string" && data) ||
        (data && (data.message || data.error)) ||
        undefined;
      return res.status(502).json({
        error: "Routing service error",
        message: detailMsg
          ? `OSRM ${status}: ${detailMsg}`
          : `OSRM returned status ${status}`,
      });
    }

    // Fallback
    res.status(500).json({
      error: "Route calculation failed",
      message: err?.message || "Unknown error",
    });
  }
});

// Clear cache endpoint (for development/admin)
app.post("/api/cache/clear", (req, res) => {
  const oldSize = cache.size;
  cache.clear();

  console.log(`🧹 Cache cleared. Removed ${oldSize} entries.`);

  res.json({
    message: "Cache cleared successfully",
    entries_removed: oldSize,
  });
});

// ============================================================================
// IMAGE UPLOAD ENDPOINTS
// ============================================================================

// Upload images for a station (base64)
app.post("/api/stations/:id/images", requestDeduplication, rateLimit, async (req, res) => {
  // Generate unique request ID for tracking
  const requestId = crypto.randomBytes(8).toString('hex');
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n🆔 [${requestId}] ${timestamp} - Image upload request started`);
    
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        console.log(`🆔 [${requestId}] ❌ Unauthorized - Invalid API key`);
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const stationId = parseInt(req.params.id);
    if (!stationId || isNaN(stationId)) {
      console.log(`🆔 [${requestId}] ❌ Invalid station ID`);
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    console.log(`🆔 [${requestId}] Processing upload for station ${stationId}`);

    // Check if station exists
    const station = await getStationById(stationId);
    if (!station) {
      console.log(`🆔 [${requestId}] ❌ Station ${stationId} not found`);
      return res.status(404).json({
        error: "Station not found",
        message: `No station found with ID ${stationId}`,
      });
    }

    console.log(`🆔 [${requestId}] 🔍 Request body:`, JSON.stringify(req.body, null, 2));

    const { images } = req.body;
    console.log(
      "🔍 Images array:",
      images ? `Array of ${images.length} items` : "null/undefined",
    );

    if (!images || !Array.isArray(images) || images.length === 0) {
      console.log("❌ No images provided in request");
      return res.status(400).json({
        error: "No images provided",
        message: "Please provide an array of base64 images",
      });
    }

    if (images.length > 5) {
      return res.status(400).json({
        error: "Too many images",
        message: "Maximum 5 images allowed per upload",
      });
    }

    // Validate all images
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`🔍 Image ${i + 1}:`, {
        hasBase64: !!image.base64,
        base64Length: image.base64 ? image.base64.length : 0,
        filename: image.filename,
        mimeType: image.mimeType,
      });

      if (!image.base64 || !validateBase64Image(image.base64)) {
        console.log(`❌ Image ${i + 1} validation failed`);
        return res.status(400).json({
          error: "Invalid image data",
          message: `Image ${i + 1} contains invalid base64 data`,
        });
      }
    }

    console.log(
      `🆔 [${requestId}] 📸 Uploading ${images.length} images for station ${stationId}`,
    );

    const { results, errors } = await uploadBase64Images(
      images,
      stationId,
      null,
    );

    console.log(`🆔 [${requestId}] ✅ Upload complete: ${results.length} success, ${errors.length} errors`);

    // Clear cache so updated station data with images is served
    cache.clear();
    console.log(`🆔 [${requestId}] 🗑️ Cache cleared after image upload`);

    res.status(201).json({
      message: `Successfully uploaded ${results.length} images`,
      images: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error(`🆔 [${requestId}] ❌ Error uploading station images:`, err);
    res.status(500).json({
      error: "Failed to upload images",
      message: err.message,
    });
  }
});

// Get images for a station
app.get("/api/stations/:id/images", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    const images = await getStationImages(stationId);
    res.json({ images });
  } catch (err) {
    console.error("❌ Error fetching station images:", err);
    res.status(500).json({
      error: "Failed to fetch images",
      message: err.message,
    });
  }
});

// Upload images for a POI (base64)
app.post("/api/pois/:id/images", requestDeduplication, rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({
        error: "Invalid POI ID",
        message: "POI ID must be a valid number",
      });
    }

    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: "No images provided",
        message: "Please provide an array of base64 images",
      });
    }

    if (images.length > 5) {
      return res.status(400).json({
        error: "Too many images",
        message: "Maximum 5 images allowed per upload",
      });
    }

    // Validate all images
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (!image.base64 || !validateBase64Image(image.base64)) {
        return res.status(400).json({
          error: "Invalid image data",
          message: `Image ${i + 1} contains invalid base64 data`,
        });
      }
    }

    console.log(`📸 Uploading ${images.length} images for POI ${poiId}`);

    const { results, errors } = await uploadBase64Images(images, null, poiId);

    res.status(201).json({
      message: `Successfully uploaded ${results.length} images`,
      images: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("❌ Error uploading POI images:", err);
    res.status(500).json({
      error: "Failed to upload images",
      message: err.message,
    });
  }
});

// Get images for a POI
app.get("/api/pois/:id/images", async (req, res) => {
  try {
    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({
        error: "Invalid POI ID",
        message: "POI ID must be a valid number",
      });
    }

    const images = await getPoiImages(poiId);
    res.json({ images });
  } catch (err) {
    console.error("❌ Error fetching POI images:", err);
    res.status(500).json({
      error: "Failed to fetch images",
      message: err.message,
    });
  }
});

// Delete an image
app.delete("/api/images/:id", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const imageId = parseInt(req.params.id);
    if (!imageId || isNaN(imageId)) {
      return res.status(400).json({
        error: "Invalid image ID",
        message: "Image ID must be a valid number",
      });
    }

    const deletedImage = await deleteImage(imageId);
    console.log(`🗑️ Deleted image: ${deletedImage.original_filename}`);

    res.json({
      message: "Image deleted successfully",
      image: deletedImage,
    });
  } catch (err) {
    console.error("❌ Error deleting image:", err);
    if (err.message === "Image not found") {
      return res.status(404).json({
        error: "Image not found",
        message: "No image found with the specified ID",
      });
    }
    res.status(500).json({
      error: "Failed to delete image",
      message: err.message,
    });
  }
});

// Set image as primary
app.patch("/api/images/:id/primary", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const imageId = parseInt(req.params.id);
    if (!imageId || isNaN(imageId)) {
      return res.status(400).json({
        error: "Invalid image ID",
        message: "Image ID must be a valid number",
      });
    }

    const updatedImage = await setPrimaryImage(imageId);
    console.log(`⭐ Set primary image: ${updatedImage.original_filename}`);

    res.json({
      message: "Primary image updated successfully",
      image: updatedImage,
    });
  } catch (err) {
    console.error("❌ Error setting primary image:", err);
    if (err.message === "Image not found") {
      return res.status(404).json({
        error: "Image not found",
        message: "No image found with the specified ID",
      });
    }
    res.status(500).json({
      error: "Failed to set primary image",
      message: err.message,
    });
  }
});

// Debug endpoint to list uploaded image files
app.get("/api/debug/images", async (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");

    const stationsDir = path.join(__dirname, "uploads/images/stations");
    const poisDir = path.join(__dirname, "uploads/images/pois");
    const thumbnailsDir = path.join(__dirname, "uploads/images/thumbnails");

    const result = {
      stations: [],
      pois: [],
      thumbnails: [],
    };

    // Check if directories exist and list files
    if (fs.existsSync(stationsDir)) {
      result.stations = fs.readdirSync(stationsDir);
    }
    if (fs.existsSync(poisDir)) {
      result.pois = fs.readdirSync(poisDir);
    }
    if (fs.existsSync(thumbnailsDir)) {
      result.thumbnails = fs.readdirSync(thumbnailsDir);
    }

    res.json({
      message: "Image files debug info",
      directories: {
        stations: stationsDir,
        pois: poisDir,
        thumbnails: thumbnailsDir,
      },
      files: result,
      totalFiles:
        result.stations.length + result.pois.length + result.thumbnails.length,
    });
  } catch (err) {
    console.error("❌ Error listing image files:", err);
    res.status(500).json({
      error: "Failed to list image files",
      message: err.message,
    });
  }
});

// ============================================================================
// PRICE REPORTING ENDPOINTS
// ============================================================================

// Submit a fuel price report (public endpoint with rate limiting)
app.post("/api/stations/:id/report-price", rateLimit, async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    // Check if station exists
    const station = await getStationById(stationId);
    if (!station) {
      return res.status(404).json({
        error: "Station not found",
        message: `No station found with ID ${stationId}`,
      });
    }

    const { fuel_type = "Regular", price, notes } = req.body;

    // Validate price
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({
        error: "Invalid price",
        message: "Price must be a positive number",
      });
    }

    // Validate price range (reasonable limits for Philippine fuel prices)
    const priceNum = parseFloat(price);
    if (priceNum < 30 || priceNum > 200) {
      return res.status(400).json({
        error: "Invalid price range",
        message: "Price must be between ₱30 and ₱200 per liter",
      });
    }

    // Get reporter IP
    const reporter_ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";

    // Create a simple browser fingerprint (optional)
    const reporter_identifier = req.headers["user-agent"]
      ? Buffer.from(req.headers["user-agent"])
          .toString("base64")
          .substring(0, 100)
      : null;

    // Submit report
    const report = await submitPriceReport({
      station_id: stationId,
      fuel_type,
      price: priceNum,
      reporter_ip,
      reporter_identifier,
      notes: notes ? String(notes).trim() : null,
    });

    console.log(
      `💰 Price report submitted: Station ${stationId}, ₱${priceNum} from ${reporter_ip}`,
    );

    // Clear cache to reflect new reports
    cache.clear();

    res.status(201).json({
      message: "Price report submitted successfully",
      report: {
        id: report.id,
        station_id: report.station_id,
        fuel_type: report.fuel_type,
        price: report.price,
        created_at: report.created_at,
        is_verified: report.is_verified,
      },
    });
  } catch (err) {
    console.error("❌ Error submitting price report:", err);
    res.status(500).json({
      error: "Failed to submit price report",
      message: err.message,
    });
  }
});

// Get price reports for a station (public)
app.get("/api/stations/:id/price-reports", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit || "10");

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        error: "Invalid limit",
        message: "Limit must be between 1 and 50",
      });
    }

    const reports = await getPriceReports(stationId, limit);

    // Also get statistics
    const stats = await getPriceReportStats(stationId);

    res.json({
      station_id: stationId,
      reports: reports.map((r) => ({
        id: r.id,
        fuel_type: r.fuel_type,
        price: parseFloat(r.price),
        is_verified: r.is_verified,
        verified_by: r.verified_by,
        verified_at: r.verified_at,
        notes: r.notes,
        created_at: r.created_at,
      })),
      statistics: {
        total_reports: parseInt(stats.total_reports) || 0,
        verified_reports: parseInt(stats.verified_reports) || 0,
        avg_price: stats.avg_price
          ? parseFloat(stats.avg_price).toFixed(2)
          : null,
        min_price: stats.min_price
          ? parseFloat(stats.min_price).toFixed(2)
          : null,
        max_price: stats.max_price
          ? parseFloat(stats.max_price).toFixed(2)
          : null,
        last_report_date: stats.last_report_date,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching price reports:", err);
    res.status(500).json({
      error: "Failed to fetch price reports",
      message: err.message,
    });
  }
});

// Get average price from recent reports (public)
app.get("/api/stations/:id/average-price", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const days = parseInt(req.query.days || "7");

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    if (days < 1 || days > 90) {
      return res.status(400).json({
        error: "Invalid days range",
        message: "Days must be between 1 and 90",
      });
    }

    const avgData = await getAveragePriceFromReports(stationId, days);

    res.json({
      station_id: stationId,
      days_analyzed: days,
      fuel_types: avgData.map((d) => ({
        fuel_type: d.fuel_type,
        avg_price: parseFloat(d.avg_price).toFixed(2),
        report_count: parseInt(d.report_count),
        min_price: parseFloat(d.min_price).toFixed(2),
        max_price: parseFloat(d.max_price).toFixed(2),
      })),
    });
  } catch (err) {
    console.error("❌ Error calculating average price:", err);
    res.status(500).json({
      error: "Failed to calculate average price",
      message: err.message,
    });
  }
});

// Verify a price report (admin only)
app.patch("/api/price-reports/:id/verify", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const reportId = parseInt(req.params.id);
    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({
        error: "Invalid report ID",
        message: "Report ID must be a valid number",
      });
    }

    const verifiedBy = req.body.verified_by || "admin";

    const result = await verifyPriceReport(reportId, verifiedBy);

    console.log(
      `✅ Price report ${reportId} verified. Station ${result.station.id} price updated to ₱${result.station.fuel_price}`,
    );

    // Clear cache
    cache.clear();

    res.json({
      message: "Price report verified and station price updated",
      report: result.report,
      station: {
        id: result.station.id,
        name: result.station.name,
        fuel_price: parseFloat(result.station.fuel_price),
        price_updated_at: result.station.price_updated_at,
      },
    });
  } catch (err) {
    console.error("❌ Error verifying price report:", err);

    if (err.message === "Price report not found") {
      return res.status(404).json({
        error: "Report not found",
        message: "No price report found with the specified ID",
      });
    }

    res.status(500).json({
      error: "Failed to verify price report",
      message: err.message,
    });
  }
});

// ============================================================================
// ADMIN PRICE REPORT MANAGEMENT ENDPOINTS
// ============================================================================

// Get all pending (unverified) price reports (admin only)
app.get("/api/admin/price-reports/pending", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const limit = parseInt(req.query.limit || "50");
    const offset = parseInt(req.query.offset || "0");

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "Invalid limit",
        message: "Limit must be between 1 and 100",
      });
    }

    // Get pending reports with station details
    const { getAllPendingPriceReports } = require("./database/db");
    const reports = await getAllPendingPriceReports(limit, offset);

    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        station_id: r.station_id,
        station_name: r.station_name,
        station_brand: r.station_brand,
        fuel_type: r.fuel_type,
        price: parseFloat(r.price),
        reporter_ip: r.reporter_ip,
        notes: r.notes,
        created_at: r.created_at,
        is_verified: r.is_verified,
      })),
      pagination: {
        limit,
        offset,
        total:
          reports.length > 0
            ? parseInt(reports[0].total_count || reports.length)
            : 0,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching pending price reports:", err);
    res.status(500).json({
      error: "Failed to fetch pending reports",
      message: err.message,
    });
  }
});

// Get all price reports with filtering (admin only)
app.get("/api/admin/price-reports", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const limit = parseInt(req.query.limit || "50");
    const offset = parseInt(req.query.offset || "0");
    const verified = req.query.verified; // 'true', 'false', or undefined for all
    const stationId = req.query.station_id
      ? parseInt(req.query.station_id)
      : null;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "Invalid limit",
        message: "Limit must be between 1 and 100",
      });
    }

    // Get reports with filtering
    const { getAllPriceReportsAdmin } = require("./database/db");
    const reports = await getAllPriceReportsAdmin({
      limit,
      offset,
      verified:
        verified === "true" ? true : verified === "false" ? false : null,
      stationId,
    });

    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        station_id: r.station_id,
        station_name: r.station_name,
        station_brand: r.station_brand,
        fuel_type: r.fuel_type,
        price: parseFloat(r.price),
        reporter_ip: r.reporter_ip,
        notes: r.notes,
        is_verified: r.is_verified,
        verified_by: r.verified_by,
        verified_at: r.verified_at,
        created_at: r.created_at,
      })),
      pagination: {
        limit,
        offset,
        total:
          reports.length > 0
            ? parseInt(reports[0].total_count || reports.length)
            : 0,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching price reports:", err);
    res.status(500).json({
      error: "Failed to fetch price reports",
      message: err.message,
    });
  }
});

// Delete a price report (admin only)
app.delete("/api/admin/price-reports/:id", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const reportId = parseInt(req.params.id);
    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({
        error: "Invalid report ID",
        message: "Report ID must be a valid number",
      });
    }

    const { deletePriceReport } = require("./database/db");
    const deletedReport = await deletePriceReport(reportId);

    if (!deletedReport) {
      return res.status(404).json({
        error: "Report not found",
        message: "No price report found with the specified ID",
      });
    }

    console.log(`🗑️ Price report ${reportId} deleted by admin`);

    // Clear cache
    cache.clear();

    res.json({
      message: "Price report deleted successfully",
      report: {
        id: deletedReport.id,
        station_id: deletedReport.station_id,
        price: parseFloat(deletedReport.price),
        fuel_type: deletedReport.fuel_type,
      },
    });
  } catch (err) {
    console.error("❌ Error deleting price report:", err);
    res.status(500).json({
      error: "Failed to delete price report",
      message: err.message,
    });
  }
});

// Get price reporting statistics (admin only)
app.get("/api/admin/price-reports/stats", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        });
      }
    }

    const { getPriceReportingStats } = require("./database/db");
    const stats = await getPriceReportingStats();

    res.json({
      total_reports: parseInt(stats.total_reports) || 0,
      verified_reports: parseInt(stats.verified_reports) || 0,
      pending_reports: parseInt(stats.pending_reports) || 0,
      reports_today: parseInt(stats.reports_today) || 0,
      unique_stations_reported: parseInt(stats.unique_stations_reported) || 0,
      avg_price_all: stats.avg_price_all
        ? parseFloat(stats.avg_price_all).toFixed(2)
        : null,
      most_reported_station: stats.most_reported_station || null,
      most_reported_station_count:
        parseInt(stats.most_reported_station_count) || 0,
      last_report_date: stats.last_report_date,
      verification_rate:
        stats.total_reports > 0
          ? ((stats.verified_reports / stats.total_reports) * 100).toFixed(1) +
            "%"
          : "0%",
    });
  } catch (err) {
    console.error("❌ Error fetching price reporting stats:", err);
    res.status(500).json({
      error: "Failed to fetch statistics",
      message: err.message,
    });
  }
});

// ============================================================================
// FUEL PRICES MANAGEMENT ENDPOINTS
// ============================================================================

// Get all fuel prices for a station (public)
app.get("/api/stations/:id/fuel-prices", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);

    if (isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
      });
    }

    const fuelPrices = await getStationFuelPrices(stationId);

    res.json({
      station_id: stationId,
      fuel_prices: fuelPrices,
      count: fuelPrices.length,
    });
  } catch (err) {
    console.error("❌ Error fetching fuel prices:", err);
    res.status(500).json({
      error: "Failed to fetch fuel prices",
      message: err.message,
    });
  }
});

// Update or add a fuel price for a station (admin only)
app.put("/api/stations/:id/fuel-prices/:fuelType", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid API key required for this operation",
        });
      }
    }

    const stationId = parseInt(req.params.id);
    const fuelType = req.params.fuelType;
    const { price, updated_by } = req.body;

    if (isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
      });
    }

    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({
        error: "Invalid price",
        message: "Price must be a positive number",
      });
    }

    // Validate fuel type
    const validFuelTypes = ['Regular', 'Premium', 'Diesel', 'Premium Diesel', 'E85', 'LPG'];
    if (!validFuelTypes.includes(fuelType)) {
      return res.status(400).json({
        error: "Invalid fuel type",
        message: `Fuel type must be one of: ${validFuelTypes.join(', ')}`,
      });
    }

    const updatedPrice = await updateStationFuelPrice(
      stationId,
      fuelType,
      price,
      updated_by || 'admin'
    );

    // Clear cache
    cache.flushAll();

    res.json({
      message: "Fuel price updated successfully",
      fuel_price: updatedPrice,
    });
  } catch (err) {
    console.error("❌ Error updating fuel price:", err);
    res.status(500).json({
      error: "Failed to update fuel price",
      message: err.message,
    });
  }
});

// Delete a fuel price entry (admin only)
app.delete("/api/stations/:id/fuel-prices/:fuelType", rateLimit, async (req, res) => {
  try {
    // Check API key if configured
    if (ADMIN_API_KEY) {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid API key required for this operation",
        });
      }
    }

    const stationId = parseInt(req.params.id);
    const fuelType = req.params.fuelType;

    if (isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
      });
    }

    const deletedPrice = await deleteStationFuelPrice(stationId, fuelType);

    if (!deletedPrice) {
      return res.status(404).json({
        error: "Fuel price not found",
      });
    }

    // Clear cache
    cache.flushAll();

    res.json({
      message: "Fuel price deleted successfully",
      deleted: deletedPrice,
    });
  } catch (err) {
    console.error("❌ Error deleting fuel price:", err);
    res.status(500).json({
      error: "Failed to delete fuel price",
      message: err.message,
    });
  }
});

// 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({
      error: "API endpoint not found",
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    });
  } else {
    next();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Fuel Finder backend running at http://0.0.0.0:${port}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔌 API Endpoints:");
  console.log(
    `   🔹 GET  /api/health                           - Health check + DB stats`,
  );
  console.log(
    `   🔹 GET  /api/stations                         - All stations`,
  );
  console.log(
    `   🔹 POST /api/stations                         - Create station (x-api-key protected if ADMIN_API_KEY set)`,
  );
  console.log(
    `   🔹 DELETE /api/stations/:id                   - Delete station (x-api-key protected if ADMIN_API_KEY set)`,
  );
  console.log(
    `   🔹 GET  /api/pois                             - All POIs (custom markers)`,
  );
  console.log(
    `   🔹 GET  /api/pois/nearby?lat=X&lng=Y          - Nearby POIs (PostGIS)`,
  );
  console.log(
    `   🔹 POST /api/pois                            - Create POI (x-api-key protected)`,
  );
  console.log(
    `   🔹 DELETE /api/pois/:id                      - Delete POI (x-api-key protected)`,
  );
  console.log(
    `   🔹 GET  /api/stations/nearby?lat=X&lng=Y      - PostGIS spatial search`,
  );
  console.log(
    `   🔹 GET  /api/stations/:id                     - Station by ID`,
  );
  console.log(
    `   🔹 GET  /api/stations/search?q=term           - Search stations`,
  );
  console.log(
    `   🔹 GET  /api/stations/brand/:brand            - Stations by brand`,
  );
  console.log(
    `   🔹 GET  /api/stats                            - Database statistics`,
  );
  console.log(
    `   🔹 POST /api/stations/:id/images              - Upload base64 images for station (x-api-key protected)`,
  );
  console.log(
    `   🔹 GET  /api/stations/:id/images              - Get images for station`,
  );
  console.log(
    `   🔹 POST /api/pois/:id/images                  - Upload base64 images for POI (x-api-key protected)`,
  );
  console.log(
    `   🔹 GET  /api/pois/:id/images                  - Get images for POI`,
  );
  console.log(
    `   🔹 DELETE /api/images/:id                     - Delete image (x-api-key protected)`,
  );
  console.log(
    `   🔹 PATCH /api/images/:id/primary              - Set image as primary (x-api-key protected)`,
  );
  console.log(
    `   🔹 GET  /api/images/stations/*                - Static image serving`,
  );
  console.log(
    `   🔹 GET  /api/images/pois/*                    - Static POI image serving`,
  );
  console.log(
    `   🔹 GET  /api/images/thumbnails/*              - Static thumbnail serving`,
  );
  console.log(
    `   🔹 GET  /api/route?start=lat,lng&end=lat,lng  - OSRM routing`,
  );
  console.log(`   🔹 POST /api/cache/clear                      - Clear cache`);
  console.log(
    `   🔹 POST /api/stations/:id/report-price        - Submit fuel price report (public with rate limit)`,
  );
  console.log(
    `   🔹 GET  /api/stations/:id/price-reports       - Get price reports for station`,
  );
  console.log(
    `   🔹 GET  /api/stations/:id/average-price       - Get average price from recent reports`,
  );
  console.log(
    `   🔹 PATCH /api/price-reports/:id/verify        - Verify price report (x-api-key protected)`,
  );
  console.log(
    `   🔹 GET  /api/admin/price-reports/pending      - Get pending price reports (x-api-key protected)`,
  );
  console.log(
    `   🔹 GET  /api/admin/price-reports              - Get all price reports with filtering (x-api-key protected)`,
  );
  console.log(
    `   🔹 DELETE /api/admin/price-reports/:id        - Delete price report (x-api-key protected)`,
  );
  console.log(
    `   🔹 GET  /api/admin/price-reports/stats        - Get price reporting statistics (x-api-key protected)`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🗄️  Database: PostgreSQL + PostGIS");
  console.log("⚡ Cache: In-memory with " + CACHE_TTL_MS / 1000 + "s TTL");
  console.log("🌐 CORS: Enabled for frontend origins");
  console.log("💰 Community Price Reporting: Enabled");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Server ready to accept connections!");
});
