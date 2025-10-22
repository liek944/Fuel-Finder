/**
 * Fuel Finder Backend Server
 * Modular version with all routes included
 */

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const https = require("https");
const dns = require("dns");
const path = require("path");
const crypto = require("crypto");

// Import modular components (environment.js handles .env loading)
const config = require("./config/environment");
const { pool, testConnection } = require("./config/database");

// Import database functions
const {
  ensurePoisTable,
  getNearbyStations,
  getAllStations,
  getStationById,
  addStation,
  updateStation,
  deleteStation,
  getStationsByBrand,
  searchStations,
  getDatabaseStats,
  // POIs
  getAllPois,
  getNearbyPois,
  addPoi,
  updatePoi,
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
  // Donations
  createDonation,
  updateDonationStatus,
  getDonationByPaymentIntent,
  getDonationStats,
  getRecentDonations,
  getDonationStatsByCause,
  getDonationLeaderboard,
  getAllDonationsAdmin,
  updateDonationImpact,
  getPriceReportTrends,
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

// Import user activity tracker
const userActivityTracker = require("./services/userActivityTracker");

// Import modular middleware
const rateLimit = require("./middleware/rateLimiter");
const requestDeduplication = require("./middleware/deduplication");
const { transformStationData, transformPoiData } = require("./utils/transformers");

const app = express();

// Trust proxy - REQUIRED for AWS EC2 behind reverse proxy/load balancer
app.set("trust proxy", true);

const port = config.port;
const OSRM_TIMEOUT_MS = config.osrm.timeoutMs;
const ADMIN_API_KEY = config.adminApiKey;

console.log("🚀 Starting Fuel Finder backend server with PostgreSQL + PostGIS...");
console.log(`🔑 ADMIN_API_KEY configured: ${ADMIN_API_KEY ? `"${ADMIN_API_KEY}"` : "NOT SET"}`);

// Test database connection on startup
(async () => {
  try {
    await testConnection();
    await ensurePoisTable();
    console.log("✅ Database initialization complete");

    // Test Supabase connection if configured
    if (config.supabase.url && config.supabase.anonKey) {
      const supabaseResult = await verifySupabaseConnection();
      console.log(`🪣 Supabase storage: ${supabaseResult.connected ? "✅ Connected" : "❌ Not available"}`);
      if (!supabaseResult.connected && supabaseResult.error) {
        console.log(`   Error: ${supabaseResult.error}`);
      }
    } else {
      console.log("🪣 Supabase storage: Not configured");
    }
  } catch (err) {
    console.error("❌ Startup checks failed:", err.message);
  }
})();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for images
app.use("/api/images/stations", express.static(path.join(__dirname, "uploads/images/stations")));
app.use("/api/images/pois", express.static(path.join(__dirname, "uploads/images/pois")));
app.use("/api/images/thumbnails", express.static(path.join(__dirname, "uploads/images/thumbnails")));

// Transform station/POI data helper
function getImageUrl(filename, type = "stations") {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
  return `${baseUrl}/api/images/${type}/${filename}`;
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  next();
});

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await testConnection();
    const stats = await getDatabaseStats();
    
    let supabaseStatus = "Not configured";
    let supabaseError = null;
    
    try {
      const supabaseResult = await verifySupabaseConnection();
      supabaseStatus = supabaseResult.connected ? "Connected" : "Failed";
      if (!supabaseResult.connected) {
        supabaseError = supabaseResult.error;
      }
    } catch (err) {
      supabaseStatus = "Error";
      supabaseError = err.message;
    }

    res.json({
      status: "healthy",
      database: "connected",
      supabase: supabaseStatus,
      supabaseError,
      stats: {
        stations: parseInt(stats.total_stations),
        brands: parseInt(stats.unique_brands),
        pois: parseInt(stats.total_pois),
        images: parseInt(stats.total_images),
        priceReports: parseInt(stats.total_price_reports),
        totalImageSize: stats.total_image_size_bytes
          ? `${(parseInt(stats.total_image_size_bytes) / (1024 * 1024)).toFixed(2)} MB`
          : "0 MB",
        databaseSize: stats.database_size,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      error: err.message,
    });
  }
});

// Get all stations
app.get("/api/stations", async (req, res) => {
  try {
    console.log("📋 Fetching all stations from PostgreSQL database...");
    const stations = await getAllStations();
    const data = transformStationData(stations);
    console.log(`✅ Found ${data.length} stations`);
    res.json(data);
  } catch (err) {
    console.error("Error fetching stations:", err);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

// Get nearby stations
app.get("/api/stations/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius) || 3000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    console.log(`🔍 Finding stations near [${lat}, ${lng}] within ${radius}m...`);
    const stations = await getNearbyStations(lat, lng, radius);
    const data = transformStationData(stations);
    console.log(`✅ Found ${data.length} nearby stations`);
    res.json(data);
  } catch (err) {
    console.error("Error fetching nearby stations:", err);
    res.status(500).json({ error: "Failed to fetch nearby stations" });
  }
});

// Get station by ID
app.get("/api/stations/:id", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({ error: "Invalid station ID" });
    }

    const station = await getStationById(stationId);
    if (!station) {
      return res.status(404).json({ error: "Station not found" });
    }

    const data = transformStationData([station])[0];
    res.json(data);
  } catch (err) {
    console.error("Error fetching station:", err);
    res.status(500).json({ error: "Failed to fetch station" });
  }
});

// Create station
app.post("/api/stations", requestDeduplication, rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const { name, brand, fuel_price, services, address, phone, operating_hours, location } = req.body;

    if (!name || !brand || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newStation = await addStation({
      name,
      brand,
      fuel_price: fuel_price || 0,
      services: services || [],
      address: address || "",
      phone: phone || null,
      operating_hours: operating_hours || null,
      lat: location.lat,
      lng: location.lng,
    });

    const data = transformStationData([newStation])[0];
    res.status(201).json(data);
  } catch (err) {
    console.error("Error creating station:", err);
    res.status(500).json({ error: "Failed to create station" });
  }
});

// Update station
app.put("/api/stations/:id", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const stationId = parseInt(req.params.id);
    const { name, brand, fuel_price, services, address, phone, operating_hours, location } = req.body;

    const existing = await getStationById(stationId);
    if (!existing) {
      return res.status(404).json({ error: "Station not found" });
    }

    const updated = await updateStation(stationId, {
      name: name || existing.name,
      brand: brand !== undefined ? brand : existing.brand,
      fuel_price: fuel_price !== undefined ? fuel_price : existing.fuel_price,
      services: services !== undefined ? services : existing.services,
      address: address !== undefined ? address : existing.address,
      phone: phone !== undefined ? phone : existing.phone,
      operating_hours: operating_hours !== undefined ? operating_hours : existing.operating_hours,
      lat: location?.lat || existing.lat,
      lng: location?.lng || existing.lng,
    });

    const data = transformStationData([updated])[0];
    res.json(data);
  } catch (err) {
    console.error("Error updating station:", err);
    res.status(500).json({ error: "Failed to update station" });
  }
});

// Delete station
app.delete("/api/stations/:id", async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const stationId = parseInt(req.params.id);
    const existing = await getStationById(stationId);
    if (!existing) {
      return res.status(404).json({ error: "Station not found" });
    }

    await deleteStation(stationId);
    res.json({ success: true, message: "Station deleted successfully" });
  } catch (err) {
    console.error("Error deleting station:", err);
    res.status(500).json({ error: "Failed to delete station" });
  }
});

// Search stations
app.get("/api/stations/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: "Search query too short" });
    }

    const stations = await searchStations(query);
    const data = transformStationData(stations);
    res.json(data);
  } catch (err) {
    console.error("Error searching stations:", err);
    res.status(500).json({ error: "Failed to search stations" });
  }
});

// Get stations by brand
app.get("/api/stations/brand/:brand", async (req, res) => {
  try {
    const brand = req.params.brand;
    const stations = await getStationsByBrand(brand);
    const data = transformStationData(stations);
    res.json(data);
  } catch (err) {
    console.error("Error fetching stations by brand:", err);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

// Get stats
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json({
      stations: parseInt(stats.total_stations),
      brands: parseInt(stats.unique_brands),
      pois: parseInt(stats.total_pois),
      images: parseInt(stats.total_images),
      priceReports: parseInt(stats.total_price_reports),
      totalImageSize: stats.total_image_size_bytes
        ? `${(parseInt(stats.total_image_size_bytes) / (1024 * 1024)).toFixed(2)} MB`
        : "0 MB",
      databaseSize: stats.database_size,
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ============================================================================
// POI ROUTES
// ============================================================================

// Get all POIs
app.get("/api/pois", async (req, res) => {
  try {
    const pois = await getAllPois();
    const data = transformPoiData(pois);
    res.json(data);
  } catch (err) {
    console.error("Error fetching POIs:", err);
    res.status(500).json({ error: "Failed to fetch POIs" });
  }
});

// Get nearby POIs
app.get("/api/pois/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius) || 3000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const pois = await getNearbyPois(lat, lng, radius);
    const data = transformPoiData(pois);
    res.json(data);
  } catch (err) {
    console.error("Error fetching nearby POIs:", err);
    res.status(500).json({ error: "Failed to fetch nearby POIs" });
  }
});

// Create POI
app.post("/api/pois", requestDeduplication, rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const { name, type, location } = req.body;
    if (!name || !type || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newPoi = await addPoi({ name, type, lat: location.lat, lng: location.lng });
    const data = transformPoiData([newPoi])[0];
    res.status(201).json(data);
  } catch (err) {
    console.error("Error creating POI:", err);
    res.status(500).json({ error: "Failed to create POI" });
  }
});

// Update POI
app.put("/api/pois/:id", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const poiId = parseInt(req.params.id);
    const { name, type, location } = req.body;

    const updated = await updatePoi(poiId, {
      name,
      type,
      lat: location?.lat,
      lng: location?.lng,
    });

    const data = transformPoiData([updated])[0];
    res.json(data);
  } catch (err) {
    console.error("Error updating POI:", err);
    res.status(500).json({ error: "Failed to update POI" });
  }
});

// Delete POI
app.delete("/api/pois/:id", async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const poiId = parseInt(req.params.id);
    await deletePoi(poiId);
    res.json({ success: true, message: "POI deleted successfully" });
  } catch (err) {
    console.error("Error deleting POI:", err);
    res.status(500).json({ error: "Failed to delete POI" });
  }
});

// Admin debug endpoint
app.get("/api/admin/debug", (req, res) => {
  const headerKey = req.header("x-api-key");
  res.json({
    adminApiKeyConfigured: !!ADMIN_API_KEY,
    headerKeyProvided: !!headerKey,
    keyMatch: headerKey === ADMIN_API_KEY,
    configuredKey: ADMIN_API_KEY ? `"${ADMIN_API_KEY}"` : "NOT SET",
  });
});

// ============================================================================
// OSRM ROUTING
// ============================================================================

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

app.get("/api/route", async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: "start and end coordinates required" });
    }

    const cacheKey = `${start}_${end}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log("✅ Returning cached route");
      return res.json(cached.data);
    }

    const osrmUrl = `${config.osrm.url}/route/v1/driving/${start};${end}`;
    console.log(`🗺️  Requesting route from OSRM: ${osrmUrl}`);

    const osrmResponse = await axios.get(osrmUrl, {
      params: {
        overview: "full",
        geometries: "geojson",
        steps: "true",
        alternatives: "false",
      },
      timeout: OSRM_TIMEOUT_MS,
      httpAgent: new http.Agent({ keepAlive: false }),
      httpsAgent: new https.Agent({ keepAlive: false }),
    });

    if (osrmResponse.data.code !== "Ok" || !osrmResponse.data.routes || osrmResponse.data.routes.length === 0) {
      return res.status(404).json({ error: "No route found" });
    }

    const route = osrmResponse.data.routes[0];
    const result = {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      legs: route.legs,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`✅ Route found: ${(result.distance / 1000).toFixed(2)} km, ${(result.duration / 60).toFixed(1)} min`);
    res.json(result);
  } catch (err) {
    console.error("OSRM routing error:", err.message);
    res.status(500).json({ error: "Routing service unavailable" });
  }
});

app.post("/api/cache/clear", (req, res) => {
  const oldSize = cache.size;
  cache.clear();
  res.json({ message: "Cache cleared", previousSize: oldSize });
});

// ============================================================================
// IMAGE UPLOAD AND MANAGEMENT ROUTES
// ============================================================================

// Upload images for a station (base64)
app.post("/api/stations/:id/images", requestDeduplication, rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const stationId = parseInt(req.params.id);
    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({ error: "Invalid station ID" });
    }

    const station = await getStationById(stationId);
    if (!station) {
      return res.status(404).json({ error: "Station not found" });
    }

    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    if (images.length > 5) {
      return res.status(400).json({ error: "Too many images" });
    }

    for (let i = 0; i < images.length; i++) {
      if (!images[i].base64 || !validateBase64Image(images[i].base64)) {
        return res.status(400).json({ error: `Image ${i + 1} contains invalid base64 data` });
      }
    }

    const { results, errors } = await uploadBase64Images(images, stationId, null);
    cache.clear();

    res.status(201).json({
      message: `Successfully uploaded ${results.length} images`,
      images: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Error uploading station images:", err);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// Get images for a station
app.get("/api/stations/:id/images", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({ error: "Invalid station ID" });
    }

    const images = await getStationImages(stationId);
    res.json({ images });
  } catch (err) {
    console.error("Error fetching station images:", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Upload images for a POI (base64)
app.post("/api/pois/:id/images", requestDeduplication, rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({ error: "Invalid POI ID" });
    }

    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    if (images.length > 5) {
      return res.status(400).json({ error: "Too many images" });
    }

    const { results, errors } = await uploadBase64Images(images, null, poiId);
    cache.clear();

    res.status(201).json({
      message: `Successfully uploaded ${results.length} images`,
      images: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Error uploading POI images:", err);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// Get images for a POI
app.get("/api/pois/:id/images", async (req, res) => {
  try {
    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({ error: "Invalid POI ID" });
    }

    const images = await getPoiImages(poiId);
    res.json({ images });
  } catch (err) {
    console.error("Error fetching POI images:", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Delete an image
app.delete("/api/images/:id", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const imageId = parseInt(req.params.id);
    if (!imageId || isNaN(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }

    const deletedImage = await deleteImage(imageId);
    if (!deletedImage) {
      return res.status(404).json({ error: "Image not found" });
    }

    cache.clear();
    res.json({ success: true, message: "Image deleted successfully", deletedImage });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Set image as primary
app.patch("/api/images/:id/primary", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const imageId = parseInt(req.params.id);
    if (!imageId || isNaN(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }

    const updatedImage = await setPrimaryImage(imageId);
    if (!updatedImage) {
      return res.status(404).json({ error: "Image not found" });
    }

    cache.clear();
    res.json({ success: true, message: "Image set as primary", image: updatedImage });
  } catch (err) {
    console.error("Error setting primary image:", err);
    res.status(500).json({ error: "Failed to set primary image" });
  }
});

// ============================================================================
// PRICE REPORTING ROUTES
// ============================================================================

// Submit a fuel price report
app.post("/api/stations/:id/report-price", rateLimit, async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({ error: "Invalid station ID" });
    }

    const { fuel_type, price, reporter_name, reporter_contact, photo_url } = req.body;

    if (!fuel_type || !price || !reporter_name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: "Invalid price value" });
    }

    const report = await submitPriceReport({
      station_id: stationId,
      fuel_type,
      price: priceNum,
      reporter_name,
      reporter_contact: reporter_contact || null,
      photo_url: photo_url || null,
    });

    res.status(201).json({
      success: true,
      message: "Price report submitted successfully",
      report,
    });
  } catch (err) {
    console.error("Error submitting price report:", err);
    res.status(500).json({ error: "Failed to submit price report" });
  }
});

// Get price reports for a station
app.get("/api/stations/:id/price-reports", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit || "10");

    const reports = await getPriceReports(stationId, limit);
    res.json({ reports });
  } catch (err) {
    console.error("Error fetching price reports:", err);
    res.status(500).json({ error: "Failed to fetch price reports" });
  }
});

// Get average price from recent reports
app.get("/api/stations/:id/average-price", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const days = parseInt(req.query.days || "7");
    const fuelType = req.query.fuel_type || "Regular";

    const avgData = await getAveragePriceFromReports(stationId, fuelType, days);
    res.json(avgData);
  } catch (err) {
    console.error("Error fetching average price:", err);
    res.status(500).json({ error: "Failed to fetch average price" });
  }
});

// Verify a price report (admin only)
app.patch("/api/price-reports/:id/verify", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const reportId = parseInt(req.params.id);
    const { verified_by } = req.body;

    const verified = await verifyPriceReport(reportId, verified_by || "admin");
    res.json({ success: true, report: verified });
  } catch (err) {
    console.error("Error verifying price report:", err);
    res.status(500).json({ error: "Failed to verify price report" });
  }
});

// Get price report stats (admin only)
app.get("/api/admin/price-reports/stats", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const stats = await getPriceReportStats();
    res.json(stats);
  } catch (err) {
    console.error("Error fetching price report stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Get price report trends (admin only)
app.get("/api/admin/price-reports/trends", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const days = parseInt(req.query.days || "7");
    const trends = await getPriceReportTrends(days);
    res.json({ trends });
  } catch (err) {
    console.error("Error fetching price trends:", err);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// ============================================================================
// FUEL PRICE MANAGEMENT ROUTES
// ============================================================================

// Get station fuel prices
app.get("/api/stations/:id/fuel-prices", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const prices = await getStationFuelPrices(stationId);
    res.json({ fuel_prices: prices });
  } catch (err) {
    console.error("Error fetching fuel prices:", err);
    res.status(500).json({ error: "Failed to fetch fuel prices" });
  }
});

// Update station fuel price (admin only)
app.put("/api/stations/:id/fuel-prices/:fuel_type", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const stationId = parseInt(req.params.id);
    const fuelType = req.params.fuel_type;
    const { price, updated_by } = req.body;

    if (!price || isNaN(parseFloat(price))) {
      return res.status(400).json({ error: "Invalid price value" });
    }

    const updated = await updateStationFuelPrice(stationId, fuelType, parseFloat(price), updated_by || "admin");
    cache.clear();
    res.json({ success: true, fuel_price: updated });
  } catch (err) {
    console.error("Error updating fuel price:", err);
    res.status(500).json({ error: "Failed to update fuel price" });
  }
});

// Delete station fuel price (admin only)
app.delete("/api/stations/:id/fuel-prices/:fuel_type", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const stationId = parseInt(req.params.id);
    const fuelType = req.params.fuel_type;

    await deleteStationFuelPrice(stationId, fuelType);
    cache.clear();
    res.json({ success: true, message: "Fuel price deleted successfully" });
  } catch (err) {
    console.error("Error deleting fuel price:", err);
    res.status(500).json({ error: "Failed to delete fuel price" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 API base URL: http://localhost:${port}/api`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  
  if (ADMIN_API_KEY) {
    console.log("🔐 Admin endpoints protected with API key");
  } else {
    console.log("⚠️  WARNING: No API key configured - admin endpoints are unprotected!");
  }
});

module.exports = app;
