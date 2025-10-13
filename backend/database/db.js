// Load environment variables (optional in production)
try {
  require("dotenv").config();
} catch (_) {}

const { Pool } = require("pg");

// Database configuration
const useSSL = process.env.DB_SSL === "true" || process.env.DB_SSL === "1";

const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "fuel_finder",
  password: process.env.DB_PASSWORD || "password",
  port: Number(process.env.DB_PORT || 5432),
  // Connection pool settings (configurable via env)
  max: Number(process.env.DB_MAX_CONNECTIONS || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 2000),
  // SSL for managed providers like Supabase
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");

    // Test PostGIS extension and try to enable if missing
    try {
      const result = await client.query("SELECT PostGIS_Version()");
      console.log("✅ PostGIS version:", result.rows[0].postgis_version);
    } catch (e) {
      console.warn(
        "⚠️  PostGIS not available. Attempting to enable extension (CREATE EXTENSION postgis)...",
      );
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
        const verify = await client.query("SELECT PostGIS_Version()");
        console.log("✅ PostGIS enabled. Version:", verify.rows[0].postgis_version);
      } catch (enableErr) {
        console.error(
          "❌ Unable to enable PostGIS automatically. Please enable PostGIS on the database:",
          enableErr.message,
        );
        console.error(
          "   • Connect to your database and run: CREATE EXTENSION IF NOT EXISTS postgis;",
        );
        throw enableErr;
      }
    }

    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err;
  }
}

// Ensure POIs table exists
async function ensurePoisTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pois (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('gas','convenience','repair')),
        geom geometry(Point, 4326) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }
}

// Get nearby stations using PostGIS ST_DWithin
async function getNearbyStations(latitude, longitude, radiusMeters = 3000) {
  const query = `
        SELECT
            s.id,
            s.name,
            s.brand,
            s.fuel_price,
            s.services,
            s.address,
            s.phone,
            s.operating_hours,
            ST_X(s.geom) as lng,
            ST_Y(s.geom) as lat,
            ST_Distance(s.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance_meters,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', i.id,
                        'filename', i.filename,
                        'original_filename', i.original_filename,
                        'display_order', i.display_order,
                        'is_primary', i.is_primary,
                        'alt_text', i.alt_text
                    ) ORDER BY i.display_order, i.id
                ) FILTER (WHERE i.id IS NOT NULL),
                '[]'::json
            ) as images,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'fuel_type', fp.fuel_type,
                        'price', fp.price,
                        'price_updated_at', fp.price_updated_at,
                        'price_updated_by', fp.price_updated_by
                    ) ORDER BY fp.fuel_type
                ) FILTER (WHERE fp.id IS NOT NULL),
                '[]'::json
            ) as fuel_prices
        FROM stations s
        LEFT JOIN images i ON s.id = i.station_id
        LEFT JOIN fuel_prices fp ON s.id = fp.station_id
        WHERE ST_DWithin(s.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
        GROUP BY s.id, s.name, s.brand, s.fuel_price, s.services, s.address, s.phone, s.operating_hours, s.geom
        ORDER BY distance_meters ASC;
    `;

  const result = await pool.query(query, [latitude, longitude, radiusMeters]);
  return result.rows;
}

// ----- POIs (custom markers) -----

async function getAllPois() {
  const query = `
    SELECT
        p.id,
        p.name,
        p.type,
        ST_X(p.geom) as lng,
        ST_Y(p.geom) as lat,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', i.id,
                    'filename', i.filename,
                    'original_filename', i.original_filename,
                    'display_order', i.display_order,
                    'is_primary', i.is_primary,
                    'alt_text', i.alt_text
                ) ORDER BY i.display_order, i.id
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'::json
        ) as images
    FROM pois p
    LEFT JOIN images i ON p.id = i.poi_id
    GROUP BY p.id, p.name, p.type, p.geom
    ORDER BY p.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

async function getNearbyPois(latitude, longitude, radiusMeters = 3000) {
  const query = `
    SELECT
        p.id,
        p.name,
        p.type,
        ST_X(p.geom) as lng,
        ST_Y(p.geom) as lat,
        ST_Distance(p.geom, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) AS distance_meters,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', i.id,
                    'filename', i.filename,
                    'original_filename', i.original_filename,
                    'display_order', i.display_order,
                    'is_primary', i.is_primary,
                    'alt_text', i.alt_text
                ) ORDER BY i.display_order, i.id
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'::json
        ) as images
    FROM pois p
    LEFT JOIN images i ON p.id = i.poi_id
    WHERE ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, $3)
    GROUP BY p.id, p.name, p.type, p.geom
    ORDER BY distance_meters ASC;
  `;
  const result = await pool.query(query, [latitude, longitude, radiusMeters]);
  return result.rows;
}

async function addPoi({ name, type, lat, lng }) {
  const query = `
    INSERT INTO pois (name, type, geom)
    VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326))
    RETURNING id, name, type, ST_X(geom) as lng, ST_Y(geom) as lat;
  `;
  const result = await pool.query(query, [name, type, lat, lng]);
  return result.rows[0];
}

async function deletePoi(id) {
  const query = `DELETE FROM pois WHERE id = $1 RETURNING id`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

// Get all stations
async function getAllStations() {
  const query = `
        SELECT
            s.id,
            s.name,
            s.brand,
            s.fuel_price,
            s.services,
            s.address,
            s.phone,
            s.operating_hours,
            ST_X(s.geom) as lng,
            ST_Y(s.geom) as lat,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', i.id,
                        'filename', i.filename,
                        'original_filename', i.original_filename,
                        'display_order', i.display_order,
                        'is_primary', i.is_primary,
                        'alt_text', i.alt_text
                    ) ORDER BY i.display_order, i.id
                ) FILTER (WHERE i.id IS NOT NULL),
                '[]'::json
            ) as images,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'fuel_type', fp.fuel_type,
                        'price', fp.price,
                        'price_updated_at', fp.price_updated_at,
                        'price_updated_by', fp.price_updated_by
                    ) ORDER BY fp.fuel_type
                ) FILTER (WHERE fp.id IS NOT NULL),
                '[]'::json
            ) as fuel_prices
        FROM stations s
        LEFT JOIN images i ON s.id = i.station_id
        LEFT JOIN fuel_prices fp ON s.id = fp.station_id
        GROUP BY s.id, s.name, s.brand, s.fuel_price, s.services, s.address, s.phone, s.operating_hours, s.geom
        ORDER BY s.name ASC;
    `;

  const result = await pool.query(query);
  return result.rows;
}

// Get station by ID
async function getStationById(stationId) {
  const query = `
        SELECT
            id,
            name,
            brand,
            fuel_price,
            services,
            address,
            phone,
            operating_hours,
            ST_X(geom) as lng,
            ST_Y(geom) as lat,
            created_at,
            updated_at
        FROM stations
        WHERE id = $1;
    `;

  const result = await pool.query(query, [stationId]);
  return result.rows[0];
}

// Add new station
async function addStation(stationData) {
  const {
    name,
    brand,
    fuel_price,
    services,
    address,
    phone,
    operating_hours,
    lat,
    lng,
  } = stationData;

  const query = `
        INSERT INTO stations (name, brand, fuel_price, services, address, phone, operating_hours, geom)
        VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($9, $8), 4326))
        RETURNING id, name, brand, fuel_price, services, address, phone, operating_hours,
                  ST_X(geom) as lng, ST_Y(geom) as lat;
    `;

  const result = await pool.query(query, [
    name,
    brand,
    fuel_price,
    services,
    address,
    phone,
    operating_hours,
    lat,
    lng,
  ]);

  return result.rows[0];
}

// Update station
async function updateStation(stationId, stationData) {
  const {
    name,
    brand,
    fuel_price,
    services,
    address,
    phone,
    operating_hours,
    lat,
    lng,
  } = stationData;

  const query = `
        UPDATE stations
        SET name = COALESCE($2, name),
            brand = COALESCE($3, brand),
            fuel_price = COALESCE($4, fuel_price),
            services = COALESCE($5, services),
            address = COALESCE($6, address),
            phone = COALESCE($7, phone),
            operating_hours = COALESCE($8, operating_hours),
            geom = CASE
                WHEN $9 IS NOT NULL AND $10 IS NOT NULL
                THEN ST_SetSRID(ST_MakePoint($10, $9), 4326)
                ELSE geom
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, brand, fuel_price, services, address, phone, operating_hours,
                  ST_X(geom) as lng, ST_Y(geom) as lat, updated_at;
    `;

  const result = await pool.query(query, [
    stationId,
    name,
    brand,
    fuel_price,
    services,
    address,
    phone,
    operating_hours,
    lat,
    lng,
  ]);

  return result.rows[0];
}

// Delete station
async function deleteStation(stationId) {
  const query = "DELETE FROM stations WHERE id = $1 RETURNING *";
  const result = await pool.query(query, [stationId]);
  return result.rows[0];
}

// Get stations by brand
async function getStationsByBrand(brand) {
  const query = `
        SELECT
            id,
            name,
            brand,
            fuel_price,
            services,
            address,
            phone,
            operating_hours,
            ST_X(geom) as lng,
            ST_Y(geom) as lat
        FROM stations
        WHERE brand ILIKE $1
        ORDER BY name ASC;
    `;

  const result = await pool.query(query, [brand]);
  return result.rows;
}

// Search stations by name or brand
async function searchStations(searchTerm) {
  const query = `
        SELECT
            id,
            name,
            brand,
            fuel_price,
            services,
            address,
            phone,
            operating_hours,
            ST_X(geom) as lng,
            ST_Y(geom) as lat
        FROM stations
        WHERE name ILIKE $1 OR brand ILIKE $1 OR address ILIKE $1
        ORDER BY name ASC;
    `;

  const result = await pool.query(query, [`%${searchTerm}%`]);
  return result.rows;
}

// Get database statistics
async function getDatabaseStats() {
  const queries = [
    { name: "total_stations", query: "SELECT COUNT(*) as count FROM stations" },
    {
      name: "stations_by_brand",
      query:
        "SELECT brand, COUNT(*) as count FROM stations GROUP BY brand ORDER BY count DESC",
    },
    {
      name: "avg_fuel_price",
      query:
        "SELECT AVG(fuel_price) as avg_price FROM stations WHERE fuel_price IS NOT NULL",
    },
    {
      name: "price_range",
      query:
        "SELECT MIN(fuel_price) as min_price, MAX(fuel_price) as max_price FROM stations WHERE fuel_price IS NOT NULL",
    },
  ];

  const stats = {};

  for (const { name, query } of queries) {
    try {
      const result = await pool.query(query);
      stats[name] = result.rows;
    } catch (err) {
      console.error(`Error executing ${name} query:`, err);
      stats[name] = null;
    }
  }

  return stats;
}

// ============================================================================
// PRICE REPORTING FUNCTIONS
// ============================================================================

// Submit a new price report
async function submitPriceReport(reportData) {
  const {
    station_id,
    fuel_type = "Regular",
    price,
    reporter_ip,
    reporter_identifier,
    notes,
  } = reportData;

  const query = `
    INSERT INTO fuel_price_reports 
      (station_id, fuel_type, price, reporter_ip, reporter_identifier, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING 
      id, station_id, fuel_type, price, reporter_ip, 
      is_verified, notes, created_at;
  `;

  const result = await pool.query(query, [
    station_id,
    fuel_type,
    price,
    reporter_ip,
    reporter_identifier,
    notes,
  ]);

  return result.rows[0];
}

// Get recent price reports for a station
async function getPriceReports(stationId, limit = 10) {
  const query = `
    SELECT 
      id, station_id, fuel_type, price, 
      is_verified, verified_by, verified_at,
      notes, created_at
    FROM fuel_price_reports
    WHERE station_id = $1
    ORDER BY created_at DESC
    LIMIT $2;
  `;

  const result = await pool.query(query, [stationId, limit]);
  return result.rows;
}

// Get latest verified price report for a station
async function getLatestVerifiedPrice(stationId) {
  const query = `
    SELECT 
      id, station_id, fuel_type, price, 
      verified_by, verified_at, created_at
    FROM fuel_price_reports
    WHERE station_id = $1 AND is_verified = true
    ORDER BY verified_at DESC
    LIMIT 1;
  `;

  const result = await pool.query(query, [stationId]);
  return result.rows[0] || null;
}

// Get average price from recent reports (last 7 days)
async function getAveragePriceFromReports(stationId, days = 7) {
  const query = `
    SELECT 
      fuel_type,
      AVG(price) as avg_price,
      COUNT(*) as report_count,
      MIN(price) as min_price,
      MAX(price) as max_price
    FROM fuel_price_reports
    WHERE station_id = $1 
      AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY fuel_type;
  `;

  const result = await pool.query(query, [stationId]);
  return result.rows;
}

// Verify a price report and update station price (admin only)
async function verifyPriceReport(reportId, verifiedBy) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Mark report as verified
    const verifyQuery = `
      UPDATE fuel_price_reports
      SET is_verified = true,
          verified_by = $2,
          verified_at = NOW()
      WHERE id = $1
      RETURNING station_id, price, fuel_type;
    `;

    const verifyResult = await client.query(verifyQuery, [reportId, verifiedBy]);

    if (verifyResult.rows.length === 0) {
      throw new Error("Price report not found");
    }

    const { station_id, price, fuel_type } = verifyResult.rows[0];

    // Update or insert the fuel price for this specific fuel type
    const updateFuelPriceQuery = `
      INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_at, price_updated_by)
      VALUES ($1, $2, $3, NOW(), 'community')
      ON CONFLICT (station_id, fuel_type) 
      DO UPDATE SET 
        price = $3,
        price_updated_at = NOW(),
        price_updated_by = 'community'
      RETURNING station_id, fuel_type, price, price_updated_at;
    `;

    const fuelPriceResult = await client.query(updateFuelPriceQuery, [
      station_id,
      fuel_type,
      price,
    ]);

    // Also update the legacy fuel_price column in stations table for backward compatibility
    // Set it to the cheapest available fuel price
    const updateStationQuery = `
      UPDATE stations
      SET fuel_price = (
        SELECT MIN(price) FROM fuel_prices WHERE station_id = $1
      ),
      price_updated_at = NOW(),
      price_updated_by = 'community'
      WHERE id = $1
      RETURNING id, name, fuel_price, price_updated_at;
    `;

    const stationResult = await client.query(updateStationQuery, [station_id]);

    await client.query("COMMIT");

    return {
      report: verifyResult.rows[0],
      fuel_price: fuelPriceResult.rows[0],
      station: stationResult.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Delete old unverified reports (cleanup function)
async function cleanupOldReports(daysOld = 30) {
  const query = `
    DELETE FROM fuel_price_reports
    WHERE is_verified = false 
      AND created_at < NOW() - INTERVAL '${daysOld} days'
    RETURNING id;
  `;

  const result = await pool.query(query);
  return result.rows.length;
}

// Get price report statistics for a station
async function getPriceReportStats(stationId) {
  const query = `
    SELECT 
      COUNT(*) as total_reports,
      COUNT(CASE WHEN is_verified THEN 1 END) as verified_reports,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      MAX(created_at) as last_report_date
    FROM fuel_price_reports
    WHERE station_id = $1
      AND created_at >= NOW() - INTERVAL '30 days';
  `;

  const result = await pool.query(query, [stationId]);
  return result.rows[0];
}

// ============================================================================
// ADMIN PRICE REPORT MANAGEMENT FUNCTIONS
// ============================================================================

// Get all pending (unverified) price reports with station details
async function getAllPendingPriceReports(limit = 50, offset = 0) {
  const query = `
    SELECT 
      fpr.*,
      s.name as station_name,
      s.brand as station_brand,
      COUNT(*) OVER() as total_count
    FROM fuel_price_reports fpr
    JOIN stations s ON fpr.station_id = s.id
    WHERE fpr.is_verified = false
    ORDER BY fpr.created_at DESC
    LIMIT $1 OFFSET $2;
  `;

  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

// Get all price reports with filtering options
async function getAllPriceReportsAdmin(options = {}) {
  const { limit = 50, offset = 0, verified = null, stationId = null } = options;
  
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  // Add filtering conditions
  if (verified !== null) {
    whereConditions.push(`fpr.is_verified = $${paramIndex}`);
    queryParams.push(verified);
    paramIndex++;
  }

  if (stationId) {
    whereConditions.push(`fpr.station_id = $${paramIndex}`);
    queryParams.push(stationId);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      fpr.*,
      s.name as station_name,
      s.brand as station_brand,
      COUNT(*) OVER() as total_count
    FROM fuel_price_reports fpr
    JOIN stations s ON fpr.station_id = s.id
    ${whereClause}
    ORDER BY fpr.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  queryParams.push(limit, offset);
  const result = await pool.query(query, queryParams);
  return result.rows;
}

// Delete a price report
async function deletePriceReport(reportId) {
  const query = `
    DELETE FROM fuel_price_reports
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [reportId]);
  return result.rows[0];
}

// ============================================================================
// FUEL PRICES MANAGEMENT FUNCTIONS
// ============================================================================

// Get all fuel prices for a station
async function getStationFuelPrices(stationId) {
  const query = `
    SELECT 
      id,
      station_id,
      fuel_type,
      price,
      price_updated_at,
      price_updated_by,
      created_at
    FROM fuel_prices
    WHERE station_id = $1
    ORDER BY fuel_type;
  `;

  const result = await pool.query(query, [stationId]);
  return result.rows;
}

// Update or add a fuel price for a station
async function updateStationFuelPrice(stationId, fuelType, price, updatedBy = 'admin') {
  const query = `
    INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_at, price_updated_by)
    VALUES ($1, $2, $3, NOW(), $4)
    ON CONFLICT (station_id, fuel_type) 
    DO UPDATE SET 
      price = $3,
      price_updated_at = NOW(),
      price_updated_by = $4
    RETURNING *;
  `;

  const result = await pool.query(query, [stationId, fuelType, price, updatedBy]);
  
  // Update the legacy fuel_price column in stations table
  await pool.query(`
    UPDATE stations
    SET fuel_price = (SELECT MIN(price) FROM fuel_prices WHERE station_id = $1),
        price_updated_at = NOW(),
        price_updated_by = $2
    WHERE id = $1
  `, [stationId, updatedBy]);
  
  return result.rows[0];
}

// Delete a fuel price entry
async function deleteStationFuelPrice(stationId, fuelType) {
  const query = `
    DELETE FROM fuel_prices
    WHERE station_id = $1 AND fuel_type = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [stationId, fuelType]);
  
  // Update the legacy fuel_price column
  await pool.query(`
    UPDATE stations
    SET fuel_price = (SELECT MIN(price) FROM fuel_prices WHERE station_id = $1)
    WHERE id = $1
  `, [stationId]);
  
  return result.rows[0];
}

// Get comprehensive price reporting statistics
async function getPriceReportingStats() {
  const query = `
    WITH report_stats AS (
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN is_verified THEN 1 END) as verified_reports,
        COUNT(CASE WHEN NOT is_verified THEN 1 END) as pending_reports,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as reports_today,
        COUNT(DISTINCT station_id) as unique_stations_reported,
        AVG(price) as avg_price_all,
        MAX(created_at) as last_report_date
      FROM fuel_price_reports
    ),
    most_reported AS (
      SELECT 
        s.name as station_name,
        COUNT(*) as report_count
      FROM fuel_price_reports fpr
      JOIN stations s ON fpr.station_id = s.id
      GROUP BY fpr.station_id, s.name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
    SELECT 
      rs.*,
      mr.station_name as most_reported_station,
      mr.report_count as most_reported_station_count
    FROM report_stats rs
    LEFT JOIN most_reported mr ON true;
  `;

  const result = await pool.query(query);
  return result.rows[0];
}

// Graceful shutdown
async function closePool() {
  try {
    await pool.end();
    console.log("✅ Database pool closed successfully");
  } catch (err) {
    console.error("❌ Error closing database pool:", err);
  }
}

// Handle process termination
process.on("SIGINT", closePool);
process.on("SIGTERM", closePool);

module.exports = {
  pool,
  testConnection,
  ensurePoisTable,
  getNearbyStations,
  getAllStations,
  getStationById,
  addStation,
  updateStation,
  deleteStation,
  getStationsByBrand,
  searchStations,
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
  cleanupOldReports,
  getPriceReportStats,
  // Admin Price Report Management
  getAllPendingPriceReports,
  getAllPriceReportsAdmin,
  deletePriceReport,
  getPriceReportingStats,
  getDatabaseStats,
  // Fuel Prices Management
  getStationFuelPrices,
  updateStationFuelPrice,
  deleteStationFuelPrice,
  closePool,
};
