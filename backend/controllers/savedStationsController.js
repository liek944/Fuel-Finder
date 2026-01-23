/**
 * Saved Stations Controller
 * Handles CRUD operations for user's saved/favorite stations
 */

const pool = require("../config/database");

/**
 * List all saved stations for the authenticated user
 * GET /api/saved-stations
 */
async function listSavedStations(req, res) {
  const userId = req.user.id;

  const result = await pool.query(
    `SELECT 
      ss.id,
      ss.station_id,
      ss.notes,
      ss.created_at,
      s.name,
      s.brand,
      s.address,
      s.latitude,
      s.longitude
    FROM saved_stations ss
    LEFT JOIN stations s ON ss.station_id = s.id
    WHERE ss.user_id = $1
    ORDER BY ss.created_at DESC`,
    [userId]
  );

  res.json({
    success: true,
    savedStations: result.rows.map(row => ({
      id: row.id,
      stationId: row.station_id,
      notes: row.notes,
      savedAt: row.created_at,
      station: row.name ? {
        id: row.station_id,
        name: row.name,
        brand: row.brand,
        address: row.address,
        location: {
          lat: parseFloat(row.latitude),
          lng: parseFloat(row.longitude),
        },
      } : null,
    })),
  });
}

/**
 * Save a station for the authenticated user
 * POST /api/saved-stations/:stationId
 */
async function saveStation(req, res) {
  const userId = req.user.id;
  const stationId = parseInt(req.params.stationId, 10);
  const { notes } = req.body || {};

  if (isNaN(stationId)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid station ID",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO saved_stations (user_id, station_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, station_id) 
       DO UPDATE SET notes = COALESCE(EXCLUDED.notes, saved_stations.notes)
       RETURNING id, created_at`,
      [userId, stationId, notes || null]
    );

    res.status(201).json({
      success: true,
      message: "Station saved",
      savedStation: {
        id: result.rows[0].id,
        stationId,
        savedAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    // Handle foreign key violation if station doesn't exist
    if (error.code === "23503") {
      return res.status(404).json({
        error: "Not Found",
        message: "Station not found",
      });
    }
    throw error;
  }
}

/**
 * Unsave/remove a station from user's saved list
 * DELETE /api/saved-stations/:stationId
 */
async function unsaveStation(req, res) {
  const userId = req.user.id;
  const stationId = parseInt(req.params.stationId, 10);

  if (isNaN(stationId)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid station ID",
    });
  }

  const result = await pool.query(
    `DELETE FROM saved_stations 
     WHERE user_id = $1 AND station_id = $2
     RETURNING id`,
    [userId, stationId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "Not Found",
      message: "Station was not in your saved list",
    });
  }

  res.json({
    success: true,
    message: "Station removed from saved list",
  });
}

/**
 * Check if a station is saved by the authenticated user
 * GET /api/saved-stations/:stationId
 */
async function checkSaved(req, res) {
  const userId = req.user.id;
  const stationId = parseInt(req.params.stationId, 10);

  if (isNaN(stationId)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid station ID",
    });
  }

  const result = await pool.query(
    `SELECT id, notes, created_at FROM saved_stations 
     WHERE user_id = $1 AND station_id = $2`,
    [userId, stationId]
  );

  const isSaved = result.rowCount > 0;

  res.json({
    success: true,
    isSaved,
    ...(isSaved && {
      savedStation: {
        id: result.rows[0].id,
        notes: result.rows[0].notes,
        savedAt: result.rows[0].created_at,
      },
    }),
  });
}

/**
 * Get all saved station IDs for the authenticated user (lightweight)
 * GET /api/saved-stations/ids
 */
async function getSavedIds(req, res) {
  const userId = req.user.id;

  const result = await pool.query(
    `SELECT station_id FROM saved_stations WHERE user_id = $1`,
    [userId]
  );

  res.json({
    success: true,
    stationIds: result.rows.map(row => row.station_id),
  });
}

module.exports = {
  listSavedStations,
  saveStation,
  unsaveStation,
  checkSaved,
  getSavedIds,
};
