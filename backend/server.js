const express = require("express");
const cors = require("cors");
const {
  testConnection,
  getNearbyStations,
  getAllStations,
  getStationById,
  getStationsByBrand,
  searchStations,
  getDatabaseStats,
} = require("./database/db");

const app = express();
const port = process.env.PORT || 3001;

console.log(
  "🚀 Starting Fuel Finder backend server with PostgreSQL + PostGIS...",
);

// Test database connection on startup
(async () => {
  try {
    await testConnection();
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

// Simple in-memory cache for performance optimization
const cache = new Map();
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS) || 2 * 60 * 1000; // 2 minutes default

function getCacheKey(lat, lng, radius) {
  const kLat = Number(lat).toFixed(3); // ~110m precision
  const kLng = Number(lng).toFixed(3);
  const kRad = Number(radius || 3000);
  return `nearby:${kLat}:${kLng}:${kRad}`;
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
  }));
}

// API Routes

// Health check endpoint with database connectivity test
app.get("/api/health", async (req, res) => {
  try {
    await testConnection();
    const stats = await getDatabaseStats();

    res.json({
      status: "ok",
      message: "Server and database are running",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        total_stations: stats.total_stations?.[0]?.count || 0,
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
app.listen(port, () => {
  console.log(`✅ Fuel Finder backend running at http://localhost:${port}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔌 API Endpoints:");
  console.log(
    `   🔹 GET  /api/health                           - Health check + DB stats`,
  );
  console.log(
    `   🔹 GET  /api/stations                         - All stations`,
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
  console.log(`   🔹 POST /api/cache/clear                      - Clear cache`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🗄️  Database: PostgreSQL + PostGIS");
  console.log("⚡ Cache: In-memory with " + CACHE_TTL_MS / 1000 + "s TTL");
  console.log("🌐 CORS: Enabled for frontend origins");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Server ready to accept connections!");
});
