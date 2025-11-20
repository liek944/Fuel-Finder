/**
 * Owner Service
 * Handles business logic for owner-specific operations
 */

const { pool } = require("../config/database");
const { transformStationData } = require("../utils/transformers");
const { checkStationOwnership, logOwnerActivity } = require("../middleware/ownerAuth");
const logger = require("../utils/logger");

function inferMunicipalityFromAddress(address) {
  if (!address || typeof address !== "string") {
    return null;
  }
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return parts[0];
  }
  return parts[1];
}

/**
 * Get basic owner information
 */
async function getOwnerInfo(ownerData) {
  // Return only public information including theme configuration
  return {
    name: ownerData.name,
    domain: ownerData.domain,
    contact_person: ownerData.contact_person,
    email: ownerData.email,
    phone: ownerData.phone,
    theme_config: ownerData.theme_config || {},
  };
}

/**
 * Get owner dashboard with statistics
 */
async function getDashboard(ownerData, ip, userAgent) {
  const ownerId = ownerData.id;

  logger.info(`Fetching dashboard for owner: ${ownerData.name}`);

  // Fetch dashboard statistics
  const result = await pool.query(
    `SELECT * FROM owner_dashboard_stats WHERE owner_id = $1`,
    [ownerId]
  );

  let stats;
  if (result.rows.length === 0) {
    // Owner exists but has no data yet
    stats = {
      owner_name: ownerData.name,
      domain: ownerData.domain,
      total_stations: 0,
      verified_reports: 0,
      pending_reports: 0,
      total_actions: 0,
      last_activity: null,
    };
  } else {
    stats = result.rows[0];
  }

  // Log dashboard access
  await logOwnerActivity(
    ownerId,
    'view_dashboard',
    null,
    ip,
    userAgent
  );

  return stats;
}

/**
 * Get all stations owned by this owner
 */
async function getOwnerStations(ownerData) {
  const ownerId = ownerData.id;

  logger.info(`Fetching stations for owner: ${ownerData.name}`);

  const result = await pool.query(
    `SELECT 
      s.*,
      ST_X(s.geom) as lng,
      ST_Y(s.geom) as lat,
      COALESCE(s.theme_config, '{}'::jsonb) as theme_config,
      COALESCE(
        json_agg(
          jsonb_build_object(
            'id', img.id,
            'filename', img.filename,
            'display_order', img.display_order,
            'is_primary', img.is_primary
          )
        ) FILTER (WHERE img.id IS NOT NULL),
        '[]'::json
      ) as images,
      COALESCE(
        json_agg(
          jsonb_build_object(
            'id', fp.id,
            'fuel_type', fp.fuel_type,
            'price', fp.price,
            'is_community', fp.is_community,
            'updated_at', fp.updated_at
          )
        ) FILTER (WHERE fp.id IS NOT NULL),
        '[]'::json
      ) as fuel_prices
    FROM stations s
    LEFT JOIN images img ON img.station_id = s.id
    LEFT JOIN fuel_prices fp ON fp.station_id = s.id
    WHERE s.owner_id = $1
    GROUP BY s.id
    ORDER BY s.name`,
    [ownerId]
  );

  const stations = transformStationData(result.rows);

  logger.info(`Found ${stations.length} stations for ${ownerData.name}`);

  return stations;
}

/**
 * Get specific station details (must be owned by this owner)
 */
async function getOwnerStation(ownerId, stationId) {
  // Check ownership
  const hasAccess = await checkStationOwnership(ownerId, stationId);
  if (!hasAccess) {
    return null; // Or throw error
  }

  const result = await pool.query(
    `SELECT 
      s.*,
      ST_X(s.geom) as lng,
      ST_Y(s.geom) as lat,
      COALESCE(
        json_agg(
          jsonb_build_object(
            'id', img.id,
            'filename', img.filename,
            'display_order', img.display_order,
            'is_primary', img.is_primary
          )
        ) FILTER (WHERE img.id IS NOT NULL),
        '[]'::json
      ) as images,
      COALESCE(
        json_agg(
          jsonb_build_object(
            'id', fp.id,
            'fuel_type', fp.fuel_type,
            'price', fp.price,
            'is_community', fp.is_community,
            'updated_at', fp.updated_at
          )
        ) FILTER (WHERE fp.id IS NOT NULL),
        '[]'::json
      ) as fuel_prices
    FROM stations s
    LEFT JOIN images img ON img.station_id = s.id
    LEFT JOIN fuel_prices fp ON fp.station_id = s.id
    WHERE s.id = $1 AND s.owner_id = $2
    GROUP BY s.id`,
    [stationId, ownerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformStationData(result.rows)[0];
}

/**
 * Update station details (must be owned by this owner)
 */
async function updateOwnerStation(ownerData, stationId, updateData, ip, userAgent) {
  const ownerId = ownerData.id;
  const { name, brand, address, phone, operating_hours, services } = updateData;

  // Check ownership
  const hasAccess = await checkStationOwnership(ownerId, stationId);
  if (!hasAccess) {
    throw new Error("Forbidden: You do not have access to this station");
  }

  logger.info(`Owner ${ownerData.name} updating station ${stationId}`);

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (brand !== undefined) {
    updates.push(`brand = $${paramIndex++}`);
    values.push(brand);
  }
  if (address !== undefined) {
    updates.push(`address = $${paramIndex++}`);
    values.push(address);
  }
  if (phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(phone);
  }
  if (operating_hours !== undefined) {
    updates.push(`operating_hours = $${paramIndex++}`);
    values.push(JSON.stringify(operating_hours));
  }
  if (services !== undefined) {
    updates.push(`services = $${paramIndex++}`);
    values.push(services);
  }

  if (updates.length === 0) {
    throw new Error("No updates provided");
  }

  // Add station ID and owner ID to values
  values.push(stationId, ownerId);

  const query = `
    UPDATE stations 
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex++} AND owner_id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  // Log the update
  await logOwnerActivity(
    ownerId,
    'update_station',
    stationId,
    ip,
    userAgent,
    { updated_fields: updates }
  );

  // Fetch complete station data
  const stationResult = await pool.query(
    `SELECT s.*, ST_X(s.geom) as lng, ST_Y(s.geom) as lat FROM stations s WHERE s.id = $1`,
    [stationId]
  );

  const station = transformStationData(stationResult.rows)[0];

  logger.info(`Station ${stationId} updated by ${ownerData.name}`);

  return station;
}

/**
 * Get pending price reports for owner's stations
 */
async function getPendingPriceReports(ownerData, limit = 50) {
  const ownerId = ownerData.id;

  logger.info(`Fetching pending price reports for: ${ownerData.name}`);

  const result = await pool.query(
    `SELECT 
      fpr.*,
      s.name as station_name,
      s.brand as station_brand,
      ST_X(s.geom) as station_lng,
      ST_Y(s.geom) as station_lat
    FROM fuel_price_reports fpr
    JOIN stations s ON s.id = fpr.station_id
    WHERE s.owner_id = $1 
      AND fpr.is_verified = FALSE
    ORDER BY fpr.created_at DESC
    LIMIT $2`,
    [ownerId, limit]
  );

  logger.info(`Found ${result.rows.length} pending reports`);

  return {
    count: result.rows.length,
    reports: result.rows,
  };
}

/**
 * Get owner's activity history
 */
async function getActivityLogs(ownerId, limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT 
      oal.*,
      s.name as station_name,
      s.brand as station_brand
    FROM owner_activity_logs oal
    LEFT JOIN stations s ON s.id = oal.station_id
    WHERE oal.owner_id = $1
    ORDER BY oal.created_at DESC
    LIMIT $2 OFFSET $3`,
    [ownerId, limit, offset]
  );

  return {
    count: result.rows.length,
    logs: result.rows,
  };
}

/**
 * Get advanced analytics for owner's stations
 */
async function getAnalytics(ownerId) {
  // Get various analytics metrics
  const [
    stationStats,
    priceReportStats,
    recentActivity
  ] = await Promise.all([
    // Station statistics
    pool.query(
      `SELECT 
        COUNT(*) as total_stations,
        COUNT(DISTINCT brand) as total_brands,
        AVG(array_length(services, 1)) as avg_services
      FROM stations 
      WHERE owner_id = $1`,
      [ownerId]
    ),

    // Price report statistics
    pool.query(
      `SELECT 
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE is_verified = TRUE) as verified_count,
        COUNT(*) FILTER (WHERE is_verified = FALSE) as pending_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as reports_last_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as reports_last_month
      FROM fuel_price_reports fpr
      JOIN stations s ON s.id = fpr.station_id
      WHERE s.owner_id = $1`,
      [ownerId]
    ),

    // Recent activity summary
    pool.query(
      `SELECT 
        action_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM owner_activity_logs
      WHERE owner_id = $1 
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY action_type
      ORDER BY count DESC`,
      [ownerId]
    )
  ]);

  return {
    stations: stationStats.rows[0],
    price_reports: priceReportStats.rows[0],
    recent_activity: recentActivity.rows,
  };
}

/**
 * Get market insights
 */
async function getMarketInsights(ownerId, days = 7, municipality = "") {
  if (![7, 15, 30].includes(days)) {
    days = 7;
  }

  let targetMunicipality = municipality.trim();

  if (!targetMunicipality) {
    const stationResult = await pool.query(
      `SELECT address FROM stations WHERE owner_id = $1 AND address IS NOT NULL ORDER BY id LIMIT 1`,
      [ownerId]
    );
    if (stationResult.rows.length > 0) {
      const inferred = inferMunicipalityFromAddress(stationResult.rows[0].address);
      if (inferred) {
        targetMunicipality = inferred;
      }
    }
  }

  const stationsQuery = `
    SELECT
      s.id,
      s.name,
      s.brand,
      s.address,
      s.owner_id,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
            'fuel_type', fp.fuel_type,
            'price', fp.price
          )
        ) FILTER (WHERE fp.id IS NOT NULL),
        '[]'::JSON
      ) AS fuel_prices,
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(r.reviews_count, 0) AS reviews_count
    FROM stations s
    LEFT JOIN fuel_prices fp ON fp.station_id = s.id
    LEFT JOIN LATERAL (
      SELECT
        AVG(rv.rating)::numeric(10,2) AS avg_rating,
        COUNT(*) AS reviews_count
      FROM reviews rv
      WHERE rv.target_type = 'station'
        AND rv.target_id = s.id
        AND rv.status = 'published'
        AND rv.created_at >= NOW() - INTERVAL '${days} days'
    ) r ON true
    WHERE s.address ILIKE $1
    GROUP BY s.id, s.name, s.brand, s.address, s.owner_id, r.avg_rating, r.reviews_count
  `;

  const result = await pool.query(stationsQuery, [`%${targetMunicipality}%`]);

  return {
    municipality: targetMunicipality,
    days,
    competitors: result.rows
  };
}

module.exports = {
  getOwnerInfo,
  getDashboard,
  getOwnerStations,
  getOwnerStation,
  updateOwnerStation,
  getPendingPriceReports,
  getActivityLogs,
  getAnalytics,
  getMarketInsights
};
