// Load environment variables
require("dotenv").config();

const { Pool } = require("pg");

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "fuel_finder",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
  // Connection pool settings
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
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

    // Test PostGIS extension
    const result = await client.query("SELECT PostGIS_Version()");
    console.log("✅ PostGIS version:", result.rows[0].postgis_version);

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
            ) as images
        FROM stations s
        LEFT JOIN images i ON s.id = i.station_id
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
    SELECT id, name, type, ST_X(geom) as lng, ST_Y(geom) as lat
    FROM pois
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

async function getNearbyPois(latitude, longitude, radiusMeters = 3000) {
  const query = `
    SELECT id, name, type, ST_X(geom) as lng, ST_Y(geom) as lat,
      ST_Distance(geom, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) AS distance_meters
    FROM pois
    WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, $3)
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
            ) as images
        FROM stations s
        LEFT JOIN images i ON s.id = i.station_id
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
  getDatabaseStats,
  closePool,
};
