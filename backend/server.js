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
  getPriceReportTrends,
  getAllPendingPriceReports,
  getAllPriceReportsAdmin,
  deletePriceReport,
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

// Import payment service for donations
const paymentService = require("./services/paymentService");

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
    const radius = parseInt(req.query.radiusMeters || req.query.radius) || 3000;

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
// OWNER ACCESS CONTROL ROUTES
// ============================================================================

// Helper function to extract subdomain from hostname
function extractSubdomain(hostname) {
  if (!hostname) return null;
  const host = hostname.split(':')[0];
  const parts = host.split('.');
  
  if (parts.length <= 1 || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }
  
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain === 'www' || subdomain === 'api' || subdomain === 'admin') {
      return null;
    }
    return subdomain;
  }
  
  return null;
}

// Middleware to detect owner from subdomain
async function detectOwnerMiddleware(req, res, next) {
  try {
    const subdomain = extractSubdomain(req.hostname);
    
    if (!subdomain) {
      req.owner = null;
      req.ownerData = null;
      return next();
    }
    
    const result = await pool.query(
      `SELECT id, name, domain, email, contact_person, phone, is_active, created_at 
       FROM owners 
       WHERE domain = $1 AND is_active = TRUE`,
      [subdomain]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Owner not found",
        message: `Subdomain '${subdomain}' is not registered.`,
        subdomain: subdomain
      });
    }
    
    const owner = result.rows[0];
    req.owner = owner.domain;
    req.ownerData = owner;
    
    console.log(`👤 Owner request: ${owner.name} (${owner.domain})`);
    next();
  } catch (error) {
    console.error("❌ Owner detection error:", error);
    next(error);
  }
}

// Middleware to verify owner API key
async function verifyOwnerApiKey(req, res, next) {
  try {
    if (!req.ownerData) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Owner authentication required."
      });
    }
    
    const providedApiKey = req.header("x-api-key");
    
    if (!providedApiKey) {
      await logOwnerActivity(req.ownerData.id, 'auth_attempt', null, req.ip, req.get('user-agent'), {reason: 'missing_api_key'}, false, 'API key not provided');
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key required in x-api-key header."
      });
    }
    
    const result = await pool.query(
      "SELECT api_key, is_active FROM owners WHERE id = $1",
      [req.ownerData.id]
    );
    
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Owner account not found or inactive."
      });
    }
    
    if (providedApiKey !== result.rows[0].api_key) {
      await logOwnerActivity(req.ownerData.id, 'auth_attempt', null, req.ip, req.get('user-agent'), {reason: 'invalid_api_key'}, false, 'Invalid API key');
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid API key."
      });
    }
    
    await logOwnerActivity(req.ownerData.id, 'auth_success', null, req.ip, req.get('user-agent'), {endpoint: req.path, method: req.method}, true);
    next();
  } catch (error) {
    console.error("❌ API key verification error:", error);
    next(error);
  }
}

// Helper to log owner activity
async function logOwnerActivity(ownerId, actionType, stationId = null, requestIp = null, userAgent = null, details = null, success = true, errorMessage = null) {
  try {
    await pool.query(
      `INSERT INTO owner_activity_logs 
       (owner_id, action_type, station_id, request_ip, user_agent, details, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ownerId, actionType, stationId, requestIp, userAgent, details ? JSON.stringify(details) : null, success, errorMessage]
    );
  } catch (error) {
    console.error("❌ Failed to log owner activity:", error);
  }
}

// GET /api/owner/info - Public owner information (no API key required)
app.get("/api/owner/info", detectOwnerMiddleware, async (req, res) => {
  try {
    if (!req.ownerData) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Owner access required through subdomain"
      });
    }
    
    res.json({
      name: req.ownerData.name,
      domain: req.ownerData.domain,
      contact_person: req.ownerData.contact_person,
      email: req.ownerData.email,
      phone: req.ownerData.phone
    });
  } catch (err) {
    console.error("Error fetching owner info:", err);
    res.status(500).json({ error: "Failed to fetch owner info" });
  }
});

// GET /api/owner/dashboard - Dashboard statistics (requires API key)
app.get("/api/owner/dashboard", detectOwnerMiddleware, verifyOwnerApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM owner_dashboard_stats WHERE owner_id = $1`,
      [req.ownerData.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        owner_name: req.ownerData.name,
        domain: req.ownerData.domain,
        total_stations: 0,
        verified_reports: 0,
        pending_reports: 0,
        total_actions: 0,
        last_activity: null
      });
    }
    
    await logOwnerActivity(req.ownerData.id, 'view_dashboard', null, req.ip, req.get('user-agent'));
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching owner dashboard:", err);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// GET /api/owner/stations - List owner's stations (requires API key)
app.get("/api/owner/stations", detectOwnerMiddleware, verifyOwnerApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.*,
        ST_X(s.geom) as lng,
        ST_Y(s.geom) as lat,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', img.id,
              'url', img.image_url,
              'uploaded_at', img.uploaded_at
            )
          ) FILTER (WHERE img.id IS NOT NULL),
          '[]'::json
        ) as images
      FROM stations s
      LEFT JOIN images img ON img.entity_id = s.id AND img.entity_type = 'station'
      WHERE s.owner_id = $1
      GROUP BY s.id
      ORDER BY s.name`,
      [req.ownerData.id]
    );
    
    const stations = transformStationData(result.rows);
    res.json(stations);
  } catch (err) {
    console.error("Error fetching owner stations:", err);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

// GET /api/owner/price-reports/pending - Get pending price reports (requires API key)
app.get("/api/owner/price-reports/pending", detectOwnerMiddleware, verifyOwnerApiKey, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await pool.query(
      `SELECT 
        fpr.*,
        s.name as station_name,
        s.brand as station_brand
      FROM fuel_price_reports fpr
      JOIN stations s ON s.id = fpr.station_id
      WHERE s.owner_id = $1 AND fpr.is_verified = FALSE
      ORDER BY fpr.created_at DESC
      LIMIT $2`,
      [req.ownerData.id, limit]
    );
    
    res.json({
      count: result.rows.length,
      reports: result.rows
    });
  } catch (err) {
    console.error("Error fetching pending reports:", err);
    res.status(500).json({ error: "Failed to fetch pending reports" });
  }
});

// POST /api/owner/price-reports/:id/verify - Verify price report (requires API key)
app.post("/api/owner/price-reports/:id/verify", detectOwnerMiddleware, verifyOwnerApiKey, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { notes } = req.body;
    
    const reportCheck = await pool.query(
      `SELECT fpr.*, s.owner_id, s.name as station_name
       FROM fuel_price_reports fpr
       JOIN stations s ON s.id = fpr.station_id
       WHERE fpr.id = $1`,
      [reportId]
    );
    
    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    const report = reportCheck.rows[0];
    
    if (report.owner_id !== req.ownerData.id) {
      return res.status(403).json({ error: "Forbidden", message: "You do not have access to this report" });
    }
    
    await pool.query(
      `UPDATE fuel_price_reports 
       SET is_verified = TRUE, verified_by = $1, verified_by_owner_id = $2, verified_at = CURRENT_TIMESTAMP, notes = COALESCE($3, notes)
       WHERE id = $4`,
      [req.ownerData.name, req.ownerData.id, notes, reportId]
    );
    
    await pool.query(
      `INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, updated_at)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (station_id, fuel_type) DO UPDATE SET price = EXCLUDED.price, is_community = TRUE, updated_at = CURRENT_TIMESTAMP`,
      [report.station_id, report.fuel_type, report.price]
    );
    
    await logOwnerActivity(req.ownerData.id, 'verify_price', report.station_id, req.ip, req.get('user-agent'), {report_id: reportId, fuel_type: report.fuel_type, price: report.price});
    
    res.json({
      success: true,
      message: `Price report verified for ${report.station_name}`,
      report_id: reportId
    });
  } catch (err) {
    console.error("Error verifying price report:", err);
    res.status(500).json({ error: "Failed to verify price report" });
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
    const radius = parseInt(req.query.radiusMeters || req.query.radius) || 3000;

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

    const days = parseInt(req.query.days || "30", 10);
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({
        error: "Invalid days parameter",
        message: "Days must be a number between 1 and 365",
      });
    }

    const trends = await getPriceReportTrends(days);
    res.json(trends);
  } catch (err) {
    console.error("Error fetching price trends:", err);
    res.status(500).json({ error: "Failed to fetch trends", message: err.message });
  }
});

// Get unique stations for price reports filtering (admin only)
app.get("/api/admin/price-reports/stations", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized - Invalid API key" });
      }
    }

    // Query to get distinct stations that have price reports
    const query = `
      SELECT DISTINCT s.id, s.name, s.brand
      FROM stations s
      INNER JOIN fuel_price_reports r ON s.id = r.station_id
      ORDER BY s.name ASC
    `;

    const result = await pool.query(query);

    res.json({
      stations: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        brand: row.brand,
        displayName: `${row.name} (${row.brand})`,
      })),
    });
  } catch (error) {
    console.error("Error fetching stations for price reports:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get all pending (unverified) price reports (admin only)
app.get("/api/admin/price-reports/pending", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing API key" });
      }
    }

    const limit = parseInt(req.query.limit || "50");
    const offset = parseInt(req.query.offset || "0");

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: "Invalid limit", message: "Limit must be between 1 and 100" });
    }

    const reports = await getAllPendingPriceReports(limit, offset);

    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        station_id: r.station_id,
        station_name: r.station_name,
        station_brand: r.station_brand,
        fuel_type: r.fuel_type,
        price: parseFloat(r.price),
        reporter: r.reporter_identifier || r.reporter_ip,
        notes: r.notes,
        created_at: r.created_at,
        is_verified: r.is_verified,
      })),
      pagination: {
        limit,
        offset,
        total: reports.length > 0 ? parseInt(reports[0].total_count || reports.length) : 0,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching pending price reports:", err);
    res.status(500).json({ error: "Failed to fetch pending reports", message: err.message });
  }
});

// Get all price reports with filtering (admin only)
app.get("/api/admin/price-reports", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing API key" });
      }
    }

    const limit = parseInt(req.query.limit || "50");
    const offset = parseInt(req.query.offset || "0");
    const verified = req.query.verified; // 'true', 'false', or undefined for all
    const stationId = req.query.station_id ? parseInt(req.query.station_id) : null;
    const stationName = req.query.station_name || null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: "Invalid limit", message: "Limit must be between 1 and 100" });
    }

    const reports = await getAllPriceReportsAdmin({
      limit,
      offset,
      verified: verified === "true" ? true : verified === "false" ? false : null,
      stationId,
      stationName,
      startDate,
      endDate,
    });

    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        station_id: r.station_id,
        station_name: r.station_name,
        station_brand: r.station_brand,
        fuel_type: r.fuel_type,
        price: parseFloat(r.price),
        reporter: r.reporter_identifier || r.reporter_ip,
        notes: r.notes,
        is_verified: r.is_verified,
        verified_by: r.verified_by,
        verified_at: r.verified_at,
        created_at: r.created_at,
        total_count: r.total_count,
      })),
      pagination: {
        limit,
        offset,
        total: reports.length > 0 ? reports[0].total_count : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching all price reports:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete a price report (admin only)
app.delete("/api/admin/price-reports/:id", rateLimit, async (req, res) => {
  try {
    if (ADMIN_API_KEY) {
      const headerKey = req.header("x-api-key");
      if (!headerKey || headerKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing API key" });
      }
    }

    const reportId = parseInt(req.params.id);
    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({ error: "Invalid report ID", message: "Report ID must be a valid number" });
    }

    const deletedReport = await deletePriceReport(reportId);

    if (!deletedReport) {
      return res.status(404).json({ error: "Report not found", message: "No price report found with the specified ID" });
    }

    console.log(`🗑️ Price report ${reportId} deleted by admin`);

    // Clear cache if it exists
    if (typeof cache !== 'undefined' && cache.clear) {
      cache.clear();
    }

    res.json({
      message: "Price report deleted successfully",
      report: {
        id: deletedReport.id,
        fuel_type: deletedReport.fuel_type,
        price: deletedReport.price,
      },
    });
  } catch (error) {
    console.error("Error deleting price report:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
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

// ============================================================================
// DONATION ENDPOINTS
// ============================================================================

// Create donation and generate payment link
app.post("/api/donations/create", rateLimit, async (req, res) => {
  try {
    const { amount, donor_name, donor_email, cause, notes } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || amount < 10 || amount > 10000) {
      return res.status(400).json({
        error: "Invalid amount",
        message: "Amount must be between ₱10 and ₱10,000",
      });
    }

    // Validate cause
    const validCauses = ["ambulance", "public_transport", "emergency", "general"];
    const selectedCause = cause || "general";
    if (!validCauses.includes(selectedCause)) {
      return res.status(400).json({
        error: "Invalid cause",
        message: `Cause must be one of: ${validCauses.join(", ")}`,
      });
    }

    // Check if PayMongo is configured
    if (!paymentService.isConfigured()) {
      return res.status(503).json({
        error: "Payment system not configured",
        message: "Donation feature is temporarily unavailable. Please contact support.",
      });
    }

    // Create payment link with PayMongo
    const paymentLink = await paymentService.createPaymentLink(
      amount,
      `Fuel Finder Donation - ${selectedCause.replace("_", " ").toUpperCase()}`,
      {
        remarks: notes || `Donation for ${selectedCause}`,
        donor_name: donor_name || "Anonymous",
        cause: selectedCause,
      }
    );

    // Save donation to database
    const donorIdentifier = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress || "unknown";

    const donation = await createDonation({
      amount,
      donor_name: donor_name || "Anonymous",
      donor_email,
      donor_identifier: donorIdentifier,
      payment_intent_id: paymentLink.id,
      status: "pending",
      cause: selectedCause,
      notes,
    });

    console.log(`💝 Donation created: ₱${amount} for ${selectedCause} (ID: ${donation.id})`);

    res.json({
      success: true,
      donation_id: donation.id,
      payment_url: paymentLink.attributes.checkout_url,
      reference_number: paymentLink.attributes.reference_number,
      expires_at: paymentLink.attributes.archived_at,
    });
  } catch (error) {
    console.error("❌ Create donation error:", error);
    res.status(500).json({ error: "Failed to create donation", message: error.message });
  }
});

// Get donation statistics (public)
app.get("/api/donations/stats", async (req, res) => {
  try {
    const stats = await getDonationStats();
    res.json(stats);
  } catch (error) {
    console.error("❌ Get donation stats error:", error);
    res.status(500).json({ error: "Failed to get donation statistics", message: error.message });
  }
});

// Get recent donations (public, anonymized)
app.get("/api/donations/recent", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const donations = await getRecentDonations(limit);
    res.json(donations);
  } catch (error) {
    console.error("❌ Get recent donations error:", error);
    res.status(500).json({ error: "Failed to get recent donations", message: error.message });
  }
});

// Get donation statistics by cause (public)
app.get("/api/donations/stats/by-cause", async (req, res) => {
  try {
    const stats = await getDonationStatsByCause();
    res.json(stats);
  } catch (error) {
    console.error("❌ Get donation stats by cause error:", error);
    res.status(500).json({ error: "Failed to get donation statistics by cause", message: error.message });
  }
});

// Get donation leaderboard (public)
app.get("/api/donations/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const leaderboard = await getDonationLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error("❌ Get donation leaderboard error:", error);
    res.status(500).json({ error: "Failed to get donation leaderboard", message: error.message });
  }
});

// PayMongo webhook endpoint
app.post("/api/webhooks/paymongo", express.json(), async (req, res) => {
  try {
    const signature = req.headers["paymongo-signature"];

    console.log("📬 Webhook received from PayMongo");
    console.log("   - Signature present:", !!signature);
    console.log("   - Event type:", req.body?.data?.attributes?.type);

    // Parse the event (body is already JSON parsed by express.json())
    const event = req.body;

    if (!event || !event.data) {
      console.error("❌ Invalid webhook payload structure");
      return res.status(400).json({ error: "Invalid payload" });
    }

    const parsedEvent = paymentService.parseWebhookEvent(event);
    console.log(`📬 Webhook received: ${parsedEvent.type}`);

    // Handle link.payment.paid event (for payment links)
    if (parsedEvent.type === "link.payment.paid") {
      const paymentIntentId = parsedEvent.id;
      const paymentMethod = parsedEvent.attributes.type || "unknown";

      const updated = await updateDonationStatus(paymentIntentId, "succeeded", paymentMethod);

      if (updated) {
        console.log(`✅ Donation payment succeeded: ${paymentIntentId} (₱${updated.amount})`);
      } else {
        console.warn(`⚠️  Payment succeeded but donation not found: ${paymentIntentId}`);
      }
    }

    // Handle payment.paid event (for payment intents)
    if (parsedEvent.type === "payment.paid") {
      const paymentIntentId = parsedEvent.attributes.source?.id || parsedEvent.id;
      const paymentMethod = parsedEvent.attributes.source?.type || "unknown";

      const updated = await updateDonationStatus(paymentIntentId, "succeeded", paymentMethod);

      if (updated) {
        console.log(`✅ Donation payment succeeded: ${paymentIntentId} (₱${updated.amount})`);
      }
    }

    // Handle payment.failed event
    if (parsedEvent.type === "payment.failed" || parsedEvent.type === "link.payment.failed") {
      const paymentIntentId = parsedEvent.id;
      const updated = await updateDonationStatus(paymentIntentId, "failed");

      if (updated) {
        console.log(`❌ Donation payment failed: ${paymentIntentId}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Admin: Get all donations with filters (protected)
app.get("/api/admin/donations", async (req, res) => {
  try {
    // Check API key
    if (ADMIN_API_KEY && req.headers["x-api-key"] !== ADMIN_API_KEY) {
      return res.status(401).json({ error: "Unauthorized - Invalid API key" });
    }

    const filters = {
      status: req.query.status,
      cause: req.query.cause,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
    };

    const donations = await getAllDonationsAdmin(filters);
    res.json(donations);
  } catch (error) {
    console.error("❌ Get all donations error:", error);
    res.status(500).json({ error: "Failed to get donations", message: error.message });
  }
});

// Admin: Update donation impact metrics (protected)
app.patch("/api/admin/donations/impact/:cause", async (req, res) => {
  try {
    // Check API key
    if (ADMIN_API_KEY && req.headers["x-api-key"] !== ADMIN_API_KEY) {
      return res.status(401).json({ error: "Unauthorized - Invalid API key" });
    }

    const cause = req.params.cause;
    const metrics = req.body.metrics;

    if (!metrics) {
      return res.status(400).json({ error: "Metrics object required" });
    }

    const updated = await updateDonationImpact(cause, metrics);

    if (!updated) {
      return res.status(404).json({ error: "Cause not found" });
    }

    console.log(`📊 Impact metrics updated for ${cause}`);
    res.json(updated);
  } catch (error) {
    console.error("❌ Update donation impact error:", error);
    res.status(500).json({ error: "Failed to update donation impact", message: error.message });
  }
});

// Admin: Manually update donation status (for testing without webhooks)
app.patch("/api/admin/donations/:id/status", async (req, res) => {
  try {
    // Check API key
    if (ADMIN_API_KEY && req.headers["x-api-key"] !== ADMIN_API_KEY) {
      return res.status(401).json({ error: "Unauthorized - Invalid API key" });
    }

    const donationId = parseInt(req.params.id);
    const { status, payment_method } = req.body;

    if (!status || !["pending", "succeeded", "failed", "refunded"].includes(status)) {
      return res.status(400).json({
        error: "Valid status required (pending, succeeded, failed, refunded)",
      });
    }

    // Get donation first
    const checkQuery = "SELECT * FROM donations WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [donationId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Donation not found" });
    }

    const donation = checkResult.rows[0];

    // Update using the payment_intent_id (for trigger to work)
    const updated = await updateDonationStatus(
      donation.payment_intent_id,
      status,
      payment_method || donation.payment_method || "manual"
    );

    if (!updated) {
      return res.status(404).json({ error: "Failed to update donation" });
    }

    console.log(`💰 Donation ${donationId} status updated to ${status} by admin`);
    res.json({
      success: true,
      donation: updated,
      message: `Donation status updated to ${status}`,
    });
  } catch (error) {
    console.error("❌ Update donation status error:", error);
    res.status(500).json({ error: "Failed to update donation status", message: error.message });
  }
});

// ============================================================================
// USER ACTIVITY TRACKING
// ============================================================================

// Heartbeat endpoint for tracking active users (public, no auth required)
app.post("/api/user/heartbeat", async (req, res) => {
  try {
    const { sessionId, location, page, feature } = req.body;

    // Extract user agent
    const userAgent = req.headers["user-agent"];

    // Record activity
    const result = userActivityTracker.recordActivity({
      sessionId,
      location,
      userAgent,
      page,
      feature,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Activity recorded",
      activeUsers: userActivityTracker.getActiveUserCount(),
    });
  } catch (error) {
    console.error("❌ Heartbeat error:", error);
    res.status(500).json({ error: "Failed to record activity", message: error.message });
  }
});

// Get active user statistics (admin only)
app.get("/api/admin/users/stats", async (req, res) => {
  try {
    // Check API key
    if (ADMIN_API_KEY && req.headers["x-api-key"] !== ADMIN_API_KEY) {
      return res.status(401).json({ error: "Unauthorized - Invalid API key" });
    }

    const stats = userActivityTracker.getStatistics();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ User stats error:", error);
    res.status(500).json({ error: "Failed to get user statistics", message: error.message });
  }
});

// Get active users list (admin only)
app.get("/api/admin/users/active", async (req, res) => {
  try {
    // Check API key
    if (ADMIN_API_KEY && req.headers["x-api-key"] !== ADMIN_API_KEY) {
      return res.status(401).json({ error: "Unauthorized - Invalid API key" });
    }

    const activeUsers = userActivityTracker.getActiveUsers();

    res.json({
      success: true,
      count: activeUsers.length,
      users: activeUsers,
    });
  } catch (error) {
    console.error("❌ Active users error:", error);
    res.status(500).json({ error: "Failed to get active users", message: error.message });
  }
});

// Get active user count (lightweight, public)
app.get("/api/users/count", async (req, res) => {
  try {
    const count = userActivityTracker.getActiveUserCount();

    res.json({
      success: true,
      activeUsers: count,
    });
  } catch (error) {
    console.error("❌ User count error:", error);
    res.status(500).json({ error: "Failed to get user count", message: error.message });
  }
});

// ============================================================================
// DEBUG ENDPOINTS
// ============================================================================

// Debug endpoint to list uploaded image files
app.get("/api/debug/images", async (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const uploadsDir = path.join(__dirname, "uploads");

    if (!fs.existsSync(uploadsDir)) {
      return res.json({
        message: "Uploads directory does not exist",
        path: uploadsDir,
        images: [],
      });
    }

    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
    });

    const imageDetails = imageFiles.map(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    });

    res.json({
      uploadsDir,
      totalImages: imageDetails.length,
      images: imageDetails,
    });
  } catch (error) {
    console.error("❌ Debug images error:", error);
    res.status(500).json({ error: "Failed to list images", message: error.message });
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
