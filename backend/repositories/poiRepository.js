/**
 * POI Repository
 * Handles all database operations related to Points of Interest
 */

const { pool } = require("../config/database");

/**
 * Ensure POIs table exists
 */
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

/**
 * Get all POIs
 */
async function getAllPois() {
  const query = `
    SELECT 
      p.id, 
      p.name, 
      p.type, 
      ST_X(p.geom) AS lng, 
      ST_Y(p.geom) AS lat,
      p.created_at,
      p.updated_at,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
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
      ) AS images
    FROM pois p
    LEFT JOIN images i ON i.poi_id = p.id
    GROUP BY p.id, p.name, p.type, p.geom, p.created_at, p.updated_at
    ORDER BY p.name
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get nearby POIs
 */
async function getNearbyPois(latitude, longitude, radiusMeters = 3000) {
  const query = `
    SELECT 
      p.id, 
      p.name, 
      p.type, 
      ST_X(p.geom) AS lng, 
      ST_Y(p.geom) AS lat,
      ST_Distance(
        p.geom::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      ) AS distance_meters,
      p.created_at,
      p.updated_at,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
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
      ) AS images
    FROM pois p
    LEFT JOIN images i ON i.poi_id = p.id
    WHERE ST_DWithin(
      p.geom::geography,
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
      $3
    )
    GROUP BY p.id, p.name, p.type, p.geom, p.created_at, p.updated_at
    ORDER BY distance_meters ASC
    LIMIT 50
  `;
  const result = await pool.query(query, [latitude, longitude, radiusMeters]);
  return result.rows;
}

/**
 * Get POI by ID
 */
async function getPoiById(id) {
  const query = `
    SELECT 
      p.id, 
      p.name, 
      p.type, 
      ST_X(p.geom) AS lng, 
      ST_Y(p.geom) AS lat,
      p.created_at,
      p.updated_at,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
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
      ) AS images
    FROM pois p
    LEFT JOIN images i ON i.poi_id = p.id
    WHERE p.id = $1
    GROUP BY p.id, p.name, p.type, p.geom, p.created_at, p.updated_at
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * Add a new POI
 */
async function addPoi(poi) {
  const { name, type, lat, lng } = poi;
  
  const query = `
    INSERT INTO pois (name, type, geom) 
    VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326))
    RETURNING id, name, type, ST_X(geom) AS lng, ST_Y(geom) AS lat, created_at, updated_at
  `;
  
  const result = await pool.query(query, [name, type, lat, lng]);
  return result.rows[0];
}

/**
 * Update a POI
 */
async function updatePoi(id, updates) {
  const { name, type, lat, lng } = updates;
  
  const query = `
    UPDATE pois 
    SET name = $2, 
        type = $3, 
        geom = ST_SetSRID(ST_MakePoint($5, $4), 4326),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, name, type, ST_X(geom) AS lng, ST_Y(geom) AS lat, created_at, updated_at
  `;
  
  const result = await pool.query(query, [id, name, type, lat, lng]);
  return result.rows[0];
}

/**
 * Delete a POI
 */
async function deletePoi(id) {
  const query = `DELETE FROM pois WHERE id = $1 RETURNING id`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

module.exports = {
  ensurePoisTable,
  getAllPois,
  getNearbyPois,
  getPoiById,
  addPoi,
  updatePoi,
  deletePoi
};
