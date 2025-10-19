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
                (
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', i.id,
                            'filename', i.filename,
                            'original_filename', i.original_filename,
                            'display_order', i.display_order,
                            'is_primary', i.is_primary,
                            'alt_text', i.alt_text
                        ) ORDER BY i.display_order, i.id
                    )
                    FROM images i
                    WHERE i.station_id = s.id
                ),
                '[]'::json
            ) as images,
            COALESCE(
                (
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'fuel_type', fp.fuel_type,
                            'price', fp.price,
                            'price_updated_at', fp.price_updated_at,
                            'price_updated_by', fp.price_updated_by
                        ) ORDER BY fp.fuel_type
                    )
                    FROM fuel_prices fp
                    WHERE fp.station_id = s.id
                ),
                '[]'::json
            ) as fuel_prices
        FROM stations s
        WHERE ST_DWithin(s.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
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
        p.address,
        p.phone,
        p.operating_hours,
        ST_X(p.geom) as lng,
        ST_Y(p.geom) as lat,
        COALESCE(
            (
                SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', i.id,
                        'filename', i.filename,
                        'original_filename', i.original_filename,
                        'display_order', i.display_order,
                        'is_primary', i.is_primary,
                        'alt_text', i.alt_text
                    ) ORDER BY i.display_order, i.id
                )
                FROM images i
                WHERE i.poi_id = p.id
            ),
            '[]'::json
        ) as images
    FROM pois p
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
        p.address,
        p.phone,
        p.operating_hours,
        ST_X(p.geom) as lng,
        ST_Y(p.geom) as lat,
        ST_Distance(p.geom, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) AS distance_meters,
        COALESCE(
            (
                SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', i.id,
                        'filename', i.filename,
                        'original_filename', i.original_filename,
                        'display_order', i.display_order,
                        'is_primary', i.is_primary,
                        'alt_text', i.alt_text
                    ) ORDER BY i.display_order, i.id
                )
                FROM images i
                WHERE i.poi_id = p.id
            ),
            '[]'::json
        ) as images
    FROM pois p
    WHERE ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, $3)
    ORDER BY distance_meters ASC;
  `;
  const result = await pool.query(query, [latitude, longitude, radiusMeters]);
  return result.rows;
}

async function addPoi({ name, type, lat, lng, address, phone, operating_hours }) {
  const query = `
    INSERT INTO pois (name, type, address, phone, operating_hours, geom)
    VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326))
    RETURNING id, name, type, address, phone, operating_hours, ST_X(geom) as lng, ST_Y(geom) as lat`;
  const result = await pool.query(query, [name, type, address, phone, operating_hours, lat, lng]);
  return result.rows[0];
}

async function updatePoi(poiId, poiData) {
  const {
    name,
    type,
    address,
    phone,
    operating_hours,
    lat,
    lng,
  } = poiData;

  const query = `
        UPDATE pois
        SET name = COALESCE($2, name),
            type = COALESCE($3, type),
            address = COALESCE($4, address),
            phone = COALESCE($5, phone),
            operating_hours = COALESCE($6, operating_hours),
            geom = CASE
                WHEN $7 IS NOT NULL AND $8 IS NOT NULL
                THEN ST_SetSRID(ST_MakePoint($8, $7), 4326)
                ELSE geom
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, type, address, phone, operating_hours,
                  ST_X(geom) as lng, ST_Y(geom) as lat, updated_at;
    `;

  const result = await pool.query(query, [
    poiId,
    name,
    type,
    address,
    phone,
    operating_hours,
    lat,
    lng,
  ]);

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
                (
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', i.id,
                            'filename', i.filename,
                            'original_filename', i.original_filename,
                            'display_order', i.display_order,
                            'is_primary', i.is_primary,
                            'alt_text', i.alt_text
                        ) ORDER BY i.display_order, i.id
                    )
                    FROM images i
                    WHERE i.station_id = s.id
                ),
                '[]'::json
            ) as images,
            COALESCE(
                (
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'fuel_type', fp.fuel_type,
                            'price', fp.price,
                            'price_updated_at', fp.price_updated_at,
                            'price_updated_by', fp.price_updated_by
                        ) ORDER BY fp.fuel_type
                    )
                    FROM fuel_prices fp
                    WHERE fp.station_id = s.id
                ),
                '[]'::json
            ) as fuel_prices
        FROM stations s
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
                WHEN $9::text IS NOT NULL AND $10::text IS NOT NULL
                THEN ST_SetSRID(ST_MakePoint($10::float, $9::float), 4326)
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

// ==========================================
// DONATION FUNCTIONS
// ==========================================

/**
 * Create a new donation record
 */
async function createDonation(donationData) {
  const query = `
    INSERT INTO donations (
      amount, currency, donor_name, donor_email, donor_identifier,
      payment_intent_id, payment_method, status, cause, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    donationData.amount,
    donationData.currency || 'PHP',
    donationData.donor_name || 'Anonymous',
    donationData.donor_email,
    donationData.donor_identifier,
    donationData.payment_intent_id,
    donationData.payment_method,
    donationData.status || 'pending',
    donationData.cause || 'general',
    donationData.notes
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update donation status (e.g., when payment succeeds or fails)
 */
async function updateDonationStatus(paymentIntentId, status, paymentMethod = null) {
  const query = `
    UPDATE donations
    SET status = $1::VARCHAR(50),
        payment_method = COALESCE($2::VARCHAR(50), payment_method),
        paid_at = CASE WHEN $1::VARCHAR(50) = 'succeeded' THEN CURRENT_TIMESTAMP ELSE paid_at END
    WHERE payment_intent_id = $3::VARCHAR(255)
    RETURNING *
  `;

  const result = await pool.query(query, [status, paymentMethod, paymentIntentId]);
  return result.rows[0];
}

/**
 * Get donation by payment intent ID
 */
async function getDonationByPaymentIntent(paymentIntentId) {
  const query = `
    SELECT * FROM donations
    WHERE payment_intent_id = $1
  `;

  const result = await pool.query(query, [paymentIntentId]);
  return result.rows[0];
}

/**
 * Get overall donation statistics
 */
async function getDonationStats() {
  const query = `
    SELECT * FROM donation_statistics
  `;

  const result = await pool.query(query);
  return result.rows[0] || {
    total_donations: 0,
    total_amount: 0,
    donations_this_month: 0,
    amount_this_month: 0,
    donations_this_week: 0,
    amount_this_week: 0,
    average_donation: 0,
    unique_donors: 0
  };
}

/**
 * Get recent successful donations (for public display - anonymized)
 */
async function getRecentDonations(limit = 10) {
  const query = `
    SELECT 
      id,
      amount,
      COALESCE(donor_name, 'Anonymous') as donor_name,
      cause,
      LEFT(notes, 100) as notes,
      created_at
    FROM donations
    WHERE status = 'succeeded'
    ORDER BY created_at DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
}

/**
 * Get donation statistics by cause
 */
async function getDonationStatsByCause() {
  const query = `
    SELECT 
      di.cause,
      di.beneficiary_name,
      di.total_amount,
      di.impact_metrics,
      di.beneficiary_verified,
      COUNT(d.id) as donation_count,
      MAX(d.created_at) as latest_donation
    FROM donation_impacts di
    LEFT JOIN donations d ON d.cause = di.cause AND d.status = 'succeeded'
    GROUP BY di.cause, di.beneficiary_name, di.total_amount, di.impact_metrics, di.beneficiary_verified
    ORDER BY di.total_amount DESC
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get donation leaderboard (top donors)
 */
async function getDonationLeaderboard(limit = 10) {
  const result = await pool.query('SELECT * FROM get_donation_leaderboard($1)', [limit]);
  return result.rows;
}

/**
 * Get all donations for admin (includes full details)
 */
async function getAllDonationsAdmin(filters = {}) {
  let query = `
    SELECT 
      d.*,
      di.beneficiary_name
    FROM donations d
    LEFT JOIN donation_impacts di ON di.cause = d.cause
    WHERE 1=1
  `;

  const values = [];
  let paramCount = 0;

  // Filter by status
  if (filters.status) {
    paramCount++;
    query += ` AND d.status = $${paramCount}`;
    values.push(filters.status);
  }

  // Filter by cause
  if (filters.cause) {
    paramCount++;
    query += ` AND d.cause = $${paramCount}`;
    values.push(filters.cause);
  }

  // Filter by date range
  if (filters.start_date) {
    paramCount++;
    query += ` AND d.created_at >= $${paramCount}`;
    values.push(filters.start_date);
  }

  if (filters.end_date) {
    paramCount++;
    query += ` AND d.created_at <= $${paramCount}`;
    values.push(filters.end_date);
  }

  query += ` ORDER BY d.created_at DESC`;

  // Limit
  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Update donation impact metrics (manual adjustment if needed)
 */
async function updateDonationImpact(cause, metrics) {
  const query = `
    UPDATE donation_impacts
    SET impact_metrics = $1,
        last_updated = CURRENT_TIMESTAMP
    WHERE cause = $2
    RETURNING *
  `;

  const result = await pool.query(query, [JSON.stringify(metrics), cause]);
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
  updatePoi,
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
  closePool,
};
