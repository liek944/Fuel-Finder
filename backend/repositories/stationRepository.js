/**
 * Station Repository
 * Handles all database operations related to fuel stations
 */

const { pool } = require("../config/database");

/**
 * Get nearby stations using PostGIS ST_DWithin
 */
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
      ST_X(s.geom) AS lng,
      ST_Y(s.geom) AS lat,
      ST_Distance(
        s.geom::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      ) AS distance_meters,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', i.id,
            'filename', i.filename,
            'original_filename', i.original_filename,
            'file_size', i.file_size,
            'mime_type', i.mime_type,
            'width', i.width,
            'height', i.height,
            'display_order', i.display_order,
            'alt_text', i.alt_text,
            'is_primary', i.is_primary,
            'created_at', i.created_at,
            'updated_at', i.updated_at
          ) ORDER BY i.display_order, i.id
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::JSON
      ) AS images,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'fuel_type', fp.fuel_type,
            'price', fp.price,
            'price_updated_at', fp.price_updated_at,
            'price_updated_by', fp.price_updated_by
          )
        ) FILTER (WHERE fp.fuel_type IS NOT NULL),
        '[]'::JSON
      ) AS fuel_prices
    FROM stations s
    LEFT JOIN images i ON i.station_id = s.id
    LEFT JOIN fuel_prices fp ON fp.station_id = s.id
    WHERE ST_DWithin(
      s.geom::geography,
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
      $3
    )
    GROUP BY s.id, s.name, s.brand, s.fuel_price, s.services, s.address, s.phone, s.operating_hours, s.geom
    ORDER BY distance_meters ASC
    LIMIT 50
  `;

  const result = await pool.query(query, [latitude, longitude, radiusMeters]);
  return result.rows;
}

/**
 * Get all stations
 */
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
      ST_X(s.geom) AS lng,
      ST_Y(s.geom) AS lat,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', i.id,
            'filename', i.filename,
            'original_filename', i.original_filename,
            'file_size', i.file_size,
            'mime_type', i.mime_type,
            'width', i.width,
            'height', i.height,
            'display_order', i.display_order,
            'alt_text', i.alt_text,
            'is_primary', i.is_primary,
            'created_at', i.created_at,
            'updated_at', i.updated_at
          ) ORDER BY i.display_order, i.id
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::JSON
      ) AS images,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'fuel_type', fp.fuel_type,
            'price', fp.price,
            'price_updated_at', fp.price_updated_at,
            'price_updated_by', fp.price_updated_by
          )
        ) FILTER (WHERE fp.fuel_type IS NOT NULL),
        '[]'::JSON
      ) AS fuel_prices
    FROM stations s
    LEFT JOIN images i ON i.station_id = s.id
    LEFT JOIN fuel_prices fp ON fp.station_id = s.id
    GROUP BY s.id, s.name, s.brand, s.fuel_price, s.services, s.address, s.phone, s.operating_hours, s.geom
    ORDER BY s.name
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get station by ID
 */
async function getStationById(id) {
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
      ST_X(s.geom) AS lng,
      ST_Y(s.geom) AS lat,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', i.id,
            'filename', i.filename,
            'original_filename', i.original_filename,
            'file_size', i.file_size,
            'mime_type', i.mime_type,
            'width', i.width,
            'height', i.height,
            'display_order', i.display_order,
            'alt_text', i.alt_text,
            'is_primary', i.is_primary,
            'created_at', i.created_at,
            'updated_at', i.updated_at
          ) ORDER BY i.display_order, i.id
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::JSON
      ) AS images,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'fuel_type', fp.fuel_type,
            'price', fp.price,
            'price_updated_at', fp.price_updated_at,
            'price_updated_by', fp.price_updated_by
          )
        ) FILTER (WHERE fp.fuel_type IS NOT NULL),
        '[]'::JSON
      ) AS fuel_prices
    FROM stations s
    LEFT JOIN images i ON i.station_id = s.id
    LEFT JOIN fuel_prices fp ON fp.station_id = s.id
    WHERE s.id = $1
    GROUP BY s.id, s.name, s.brand, s.fuel_price, s.services, s.address, s.phone, s.operating_hours, s.geom
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * Add a new station
 */
async function addStation(station) {
  const { name, brand, fuel_price, services, address, phone, operating_hours, lat, lng } = station;
  
  const query = `
    INSERT INTO stations (name, brand, fuel_price, services, address, phone, operating_hours, geom)
    VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($9, $8), 4326))
    RETURNING id, name, brand, fuel_price, services, address, phone, operating_hours, 
              ST_X(geom) AS lng, ST_Y(geom) AS lat
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
    lng
  ]);
  
  return result.rows[0];
}

/**
 * Update a station
 */
async function updateStation(id, updates) {
  const { name, brand, fuel_price, services, address, phone, operating_hours, lat, lng } = updates;
  
  const query = `
    UPDATE stations
    SET name = $2,
        brand = $3,
        fuel_price = $4,
        services = $5,
        address = $6,
        phone = $7,
        operating_hours = $8,
        geom = ST_SetSRID(ST_MakePoint($10, $9), 4326)
    WHERE id = $1
    RETURNING id, name, brand, fuel_price, services, address, phone, operating_hours, 
              ST_X(geom) AS lng, ST_Y(geom) AS lat
  `;

  const result = await pool.query(query, [
    id,
    name,
    brand,
    fuel_price,
    services,
    address,
    phone,
    operating_hours,
    lat,
    lng
  ]);
  
  return result.rows[0];
}

/**
 * Delete a station
 */
async function deleteStation(id) {
  const query = `DELETE FROM stations WHERE id = $1 RETURNING id`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * Search stations by name, brand, or address
 */
async function searchStations(searchQuery) {
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
      ST_X(s.geom) AS lng,
      ST_Y(s.geom) AS lat
    FROM stations s
    WHERE 
      s.name ILIKE $1 OR
      s.brand ILIKE $1 OR
      s.address ILIKE $1
    ORDER BY s.name
    LIMIT 50
  `;

  const result = await pool.query(query, [`%${searchQuery}%`]);
  return result.rows;
}

/**
 * Get stations by brand
 */
async function getStationsByBrand(brand) {
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
      ST_X(s.geom) AS lng,
      ST_Y(s.geom) AS lat
    FROM stations s
    WHERE s.brand = $1
    ORDER BY s.name
  `;

  const result = await pool.query(query, [brand]);
  return result.rows;
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM stations) AS total_stations,
      (SELECT COUNT(DISTINCT brand) FROM stations) AS unique_brands,
      (SELECT COUNT(*) FROM pois) AS total_pois,
      (SELECT COUNT(*) FROM images) AS total_images,
      (SELECT COUNT(*) FROM price_reports) AS total_price_reports,
      (SELECT SUM(file_size) FROM images) AS total_image_size_bytes,
      (SELECT pg_size_pretty(pg_database_size(current_database()))) AS database_size
  `;
  
  const result = await pool.query(query);
  return result.rows[0];
}

module.exports = {
  getNearbyStations,
  getAllStations,
  getStationById,
  addStation,
  updateStation,
  deleteStation,
  searchStations,
  getStationsByBrand,
  getDatabaseStats
};
