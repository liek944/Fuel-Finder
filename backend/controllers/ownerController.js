/**
 * Owner Controller
 * Handles business logic for owner-specific operations
 */

const { pool } = require("../config/database");
const { transformStationData } = require("../utils/transformers");
const { checkStationOwnership, logOwnerActivity } = require("../middleware/ownerAuth");

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
 * Get basic owner information (public, no API key required)
 */
async function getOwnerInfo(req, res) {
  const owner = req.ownerData;

  // Return only public information including theme configuration
  res.json({
    name: owner.name,
    domain: owner.domain,
    contact_person: owner.contact_person,
    email: owner.email,
    phone: owner.phone,
    theme_config: owner.theme_config || {},
  });
}

/**
 * Get owner dashboard with statistics
 */
async function getDashboard(req, res) {
  const ownerId = req.ownerData.id;

  console.log(`📊 Fetching dashboard for owner: ${req.ownerData.name}`);

  // Fetch dashboard statistics
  const result = await pool.query(
    `SELECT * FROM owner_dashboard_stats WHERE owner_id = $1`,
    [ownerId]
  );

  if (result.rows.length === 0) {
    // Owner exists but has no data yet
    return res.json({
      owner_name: req.ownerData.name,
      domain: req.ownerData.domain,
      total_stations: 0,
      verified_reports: 0,
      pending_reports: 0,
      total_actions: 0,
      last_activity: null,
    });
  }

  const stats = result.rows[0];

  // Log dashboard access
  await logOwnerActivity(
    ownerId,
    'view_dashboard',
    null,
    req.ip,
    req.get('user-agent')
  );

  res.json(stats);
}

/**
 * Get all stations owned by this owner
 */
async function getOwnerStations(req, res) {
  const ownerId = req.ownerData.id;

  console.log(`🏪 Fetching stations for owner: ${req.ownerData.name}`);

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

  console.log(`✅ Found ${stations.length} stations for ${req.ownerData.name}`);

  res.json(stations);
}

/**
 * Get specific station details (must be owned by this owner)
 */
async function getOwnerStation(req, res) {
  const ownerId = req.ownerData.id;
  const stationId = parseInt(req.params.id);

  if (isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid station ID",
      message: "Station ID must be a valid number",
    });
  }

  // Check ownership
  const hasAccess = await checkStationOwnership(ownerId, stationId);
  if (!hasAccess) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have access to this station",
    });
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
    return res.status(404).json({
      error: "Station not found",
      message: "Station does not exist or you don't have access to it",
    });
  }

  const station = transformStationData(result.rows)[0];

  res.json(station);
}

/**
 * Update station details (must be owned by this owner)
 */
async function updateOwnerStation(req, res) {
  const ownerId = req.ownerData.id;
  const stationId = parseInt(req.params.id);
  const { name, brand, address, phone, operating_hours, services } = req.body;

  if (isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid station ID",
      message: "Station ID must be a valid number",
    });
  }

  // Check ownership
  const hasAccess = await checkStationOwnership(ownerId, stationId);
  if (!hasAccess) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have access to this station",
    });
  }

  console.log(`🔄 Owner ${req.ownerData.name} updating station ${stationId}`);

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
    return res.status(400).json({
      error: "No updates provided",
      message: "Please provide at least one field to update",
    });
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
    return res.status(404).json({
      error: "Station not found",
      message: "Station does not exist or update failed",
    });
  }

  // Log the update
  await logOwnerActivity(
    ownerId,
    'update_station',
    stationId,
    req.ip,
    req.get('user-agent'),
    { updated_fields: updates }
  );

  // Fetch complete station data
  const stationResult = await pool.query(
    `SELECT s.*, ST_X(s.geom) as lng, ST_Y(s.geom) as lat FROM stations s WHERE s.id = $1`,
    [stationId]
  );

  const station = transformStationData(stationResult.rows)[0];

  console.log(`✅ Station ${stationId} updated by ${req.ownerData.name}`);

  res.json(station);
}

/**
 * Update fuel price for a station (owner-verified)
 */
async function updateFuelPrice(req, res) {
  const ownerId = req.ownerData.id;
  const stationId = parseInt(req.params.id);
  const { fuel_type, price } = req.body;

  if (isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid station ID",
      message: "Station ID must be a valid number",
    });
  }

  if (!fuel_type || !price) {
    return res.status(400).json({
      error: "Missing required fields",
      message: "fuel_type and price are required",
    });
  }

  // Validate price
  const priceFloat = parseFloat(price);
  if (isNaN(priceFloat) || priceFloat <= 0) {
    return res.status(400).json({
      error: "Invalid price",
      message: "Price must be a positive number",
    });
  }

  // Check ownership
  const hasAccess = await checkStationOwnership(ownerId, stationId);
  if (!hasAccess) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have access to this station",
    });
  }

  console.log(`💰 Owner ${req.ownerData.name} updating ${fuel_type} price for station ${stationId} to ₱${priceFloat}`);

  // Update or insert fuel price
  await pool.query(
    `INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, price_updated_by, price_updated_at, updated_at)
     VALUES ($1, $2, $3, FALSE, 'owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (station_id, fuel_type) 
     DO UPDATE SET 
       price = EXCLUDED.price,
       is_community = FALSE,
       price_updated_by = 'owner',
       price_updated_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    [stationId, fuel_type, priceFloat]
  );

  // Log the update
  await logOwnerActivity(
    ownerId,
    'update_fuel_price',
    stationId,
    req.ip,
    req.get('user-agent'),
    { fuel_type, price: priceFloat }
  );

  console.log(`✅ Fuel price updated successfully`);

  res.json({
    success: true,
    message: `${fuel_type} price updated to ₱${priceFloat.toFixed(2)}`,
    fuel_type,
    price: priceFloat,
  });
}

/**
 * Delete fuel price for a station (owner-only)
 */
async function deleteFuelPrice(req, res) {
  const ownerId = req.ownerData.id;
  const stationId = parseInt(req.params.id);
  const fuelType = req.params.fuelType;

  if (isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid station ID",
      message: "Station ID must be a valid number",
    });
  }

  if (!fuelType) {
    return res.status(400).json({
      error: "Missing fuel type",
      message: "Fuel type is required",
    });
  }

  // Check ownership
  const hasAccess = await checkStationOwnership(ownerId, stationId);
  if (!hasAccess) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have access to this station",
    });
  }

  console.log(`🗑️ Owner ${req.ownerData.name} deleting ${fuelType} price for station ${stationId}`);

  // Delete fuel price
  const result = await pool.query(
    `DELETE FROM fuel_prices 
     WHERE station_id = $1 AND fuel_type = $2
     RETURNING fuel_type`,
    [stationId, fuelType]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Fuel price not found",
      message: `No ${fuelType} price found for this station`,
    });
  }

  // Log the deletion
  await logOwnerActivity(
    ownerId,
    'delete_fuel_price',
    stationId,
    req.ip,
    req.get('user-agent'),
    { fuel_type: fuelType }
  );

  console.log(`✅ ${fuelType} price deleted successfully`);

  res.json({
    success: true,
    message: `${fuelType} price deleted successfully`,
    fuel_type: fuelType,
  });
}

/**
 * Get pending price reports for owner's stations
 */
async function getPendingPriceReports(req, res) {
  const ownerId = req.ownerData.id;
  const limit = parseInt(req.query.limit) || 50;

  console.log(`📋 Fetching pending price reports for: ${req.ownerData.name}`);

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

  console.log(`✅ Found ${result.rows.length} pending reports`);

  res.json({
    count: result.rows.length,
    reports: result.rows,
  });
}

/**
 * Verify (approve) a price report
 */
async function verifyPriceReport(req, res) {
  const ownerId = req.ownerData.id;
  const reportId = parseInt(req.params.id);
  const { notes } = req.body;

  if (isNaN(reportId)) {
    return res.status(400).json({
      error: "Invalid report ID",
      message: "Report ID must be a valid number",
    });
  }

  // Check if report exists and belongs to owner's station
  const reportCheck = await pool.query(
    `SELECT fpr.*, s.owner_id, s.name as station_name
     FROM fuel_price_reports fpr
     JOIN stations s ON s.id = fpr.station_id
     WHERE fpr.id = $1`,
    [reportId]
  );

  if (reportCheck.rows.length === 0) {
    return res.status(404).json({
      error: "Report not found",
      message: "Price report does not exist",
    });
  }

  const report = reportCheck.rows[0];

  if (report.owner_id !== ownerId) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have access to this price report",
    });
  }

  if (report.is_verified) {
    return res.status(400).json({
      error: "Already verified",
      message: "This price report has already been verified",
    });
  }

  console.log(`✅ Owner ${req.ownerData.name} verifying price report ${reportId}`);

  // Update price report
  await pool.query(
    `UPDATE fuel_price_reports 
     SET is_verified = TRUE,
         verified_by = $1,
         verified_by_owner_id = $2,
         verified_at = CURRENT_TIMESTAMP,
         notes = COALESCE($3, notes)
     WHERE id = $4`,
    [req.ownerData.name, ownerId, notes, reportId]
  );

  // Update station's fuel price
  await pool.query(
    `INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, price_updated_by, price_updated_at, updated_at)
     VALUES ($1, $2, $3, FALSE, 'owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (station_id, fuel_type) 
     DO UPDATE SET 
       price = EXCLUDED.price,
       is_community = FALSE,
       price_updated_by = 'owner',
       price_updated_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    [report.station_id, report.fuel_type, report.price]
  );

  // Log the verification
  await logOwnerActivity(
    ownerId,
    'verify_price',
    report.station_id,
    req.ip,
    req.get('user-agent'),
    { 
      report_id: reportId, 
      fuel_type: report.fuel_type, 
      price: report.price,
      station_name: report.station_name
    }
  );

  res.json({
    success: true,
    message: `Price report verified successfully for ${report.station_name}`,
    report_id: reportId,
    station_id: report.station_id,
    fuel_type: report.fuel_type,
    price: report.price,
  });
}

/**
 * Reject a price report
 */
async function rejectPriceReport(req, res) {
  const ownerId = req.ownerData.id;
  const reportId = parseInt(req.params.id);
  const { reason } = req.body;

  if (isNaN(reportId)) {
    return res.status(400).json({
      error: "Invalid report ID",
      message: "Report ID must be a valid number",
    });
  }

  // Check if report exists and belongs to owner's station
  const reportCheck = await pool.query(
    `SELECT fpr.*, s.owner_id, s.name as station_name
     FROM fuel_price_reports fpr
     JOIN stations s ON s.id = fpr.station_id
     WHERE fpr.id = $1`,
    [reportId]
  );

  if (reportCheck.rows.length === 0) {
    return res.status(404).json({
      error: "Report not found",
      message: "Price report does not exist",
    });
  }

  const report = reportCheck.rows[0];

  if (report.owner_id !== ownerId) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have access to this price report",
    });
  }

  console.log(`❌ Owner ${req.ownerData.name} rejecting price report ${reportId}`);

  // Delete the rejected report (or mark as rejected if you want to keep history)
  await pool.query(
    `DELETE FROM fuel_price_reports WHERE id = $1`,
    [reportId]
  );

  // Log the rejection
  await logOwnerActivity(
    ownerId,
    'reject_price',
    report.station_id,
    req.ip,
    req.get('user-agent'),
    { 
      report_id: reportId, 
      fuel_type: report.fuel_type, 
      price: report.price,
      station_name: report.station_name,
      reason: reason || 'No reason provided'
    }
  );

  res.json({
    success: true,
    message: `Price report rejected for ${report.station_name}`,
    report_id: reportId,
  });
}

/**
 * Get owner's activity history
 */
async function getActivityLogs(req, res) {
  const ownerId = req.ownerData.id;
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

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

  res.json({
    count: result.rows.length,
    logs: result.rows,
  });
}

/**
 * Get advanced analytics for owner's stations
 */
async function getAnalytics(req, res) {
  const ownerId = req.ownerData.id;

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

  res.json({
    stations: stationStats.rows[0],
    price_reports: priceReportStats.rows[0],
    recent_activity: recentActivity.rows,
  });
}

async function getMarketInsights(req, res) {
  const ownerId = req.ownerData.id;
  let days = parseInt(req.query.days, 10);
  if (![7, 15, 30].includes(days)) {
    days = 7;
  }

  let municipality = (req.query.municipality || "").trim();

  if (!municipality) {
    const stationResult = await pool.query(
      `SELECT address FROM stations WHERE owner_id = $1 AND address IS NOT NULL ORDER BY id LIMIT 1`,
      [ownerId]
    );
    if (stationResult.rows.length > 0) {
      const inferred = inferMunicipalityFromAddress(stationResult.rows[0].address);
      if (inferred) {
        municipality = inferred;
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
    ) r ON TRUE
    WHERE ($1 IS NULL OR s.address ILIKE '%' || $1 || '%')
    GROUP BY s.id, s.name, s.brand, s.address, s.owner_id, r.avg_rating, r.reviews_count
    ORDER BY s.name
  `;

  let stationsRows;
  let ratingsAvailable = true;
  try {
    const res = await pool.query(stationsQuery, [municipality || null]);
    stationsRows = res.rows;
  } catch (e) {
    if (
      e && (
        e.code === '42P01' ||
        ((e.message || '').toLowerCase().includes('relation') && (e.message || '').toLowerCase().includes('reviews'))
      )
    ) {
      console.warn('⚠️ Reviews table missing; proceeding without ratings in market insights');
      ratingsAvailable = false;
      const stationsNoReviewsQuery = `
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
          ) AS fuel_prices
        FROM stations s
        LEFT JOIN fuel_prices fp ON fp.station_id = s.id
        WHERE ($1 IS NULL OR s.address ILIKE '%' || $1 || '%')
        GROUP BY s.id, s.name, s.brand, s.address, s.owner_id
        ORDER BY s.name
      `;
      const res2 = await pool.query(stationsNoReviewsQuery, [municipality || null]);
      stationsRows = res2.rows;
    } else {
      throw e;
    }
  }

  const priceReportsQuery = `
    SELECT
      s.id AS station_id,
      s.name,
      s.brand,
      s.owner_id,
      pr.fuel_type,
      AVG(pr.price) AS avg_price
    FROM fuel_price_reports pr
    JOIN stations s ON s.id = pr.station_id
    WHERE pr.is_verified = TRUE
      AND pr.created_at >= NOW() - INTERVAL '${days} days'
      AND ($1 IS NULL OR s.address ILIKE '%' || $1 || '%')
    GROUP BY s.id, s.name, s.brand, s.owner_id, pr.fuel_type
    ORDER BY pr.fuel_type, AVG(pr.price)
  `;

  const priceReportsResult = await pool.query(priceReportsQuery, [municipality || null]);

  const stations = stationsRows.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    is_owner_station: row.owner_id === ownerId,
    municipality: municipality || null,
    fuel_prices: row.fuel_prices || [],
    avg_rating: ratingsAvailable && row.avg_rating !== null ? Number(row.avg_rating) : 0,
    reviews_count: ratingsAvailable ? Number(row.reviews_count || 0) : 0,
  }));

  const priceInsightsMap = {};
  for (const row of priceReportsResult.rows) {
    const fuelType = row.fuel_type;
    if (!priceInsightsMap[fuelType]) {
      priceInsightsMap[fuelType] = [];
    }
    priceInsightsMap[fuelType].push({
      station_id: row.station_id,
      name: row.name,
      brand: row.brand,
      isOwner: row.owner_id === ownerId,
      avg_price: Number(row.avg_price),
    });
  }

  const priceInsights = Object.entries(priceInsightsMap).map(([fuelType, items]) => {
    const typedItems = items;
    const totalStations = typedItems.length;
    typedItems.sort((a, b) => a.avg_price - b.avg_price);
    const cheapest = typedItems[0];
    const mostExpensive = typedItems[typedItems.length - 1];
    const ownerStations = typedItems.filter((i) => i.isOwner);
    let ownerAvgPrice = null;
    let ownerRankByPrice = null;
    if (ownerStations.length > 0) {
      const sumOwner = ownerStations.reduce((sum, i) => sum + i.avg_price, 0);
      ownerAvgPrice = sumOwner / ownerStations.length;
      ownerRankByPrice = ownerStations.reduce((bestRank, i) => {
        const idx = typedItems.findIndex((s) => s.station_id === i.station_id);
        if (idx === -1) {
          return bestRank;
        }
        const rank = idx + 1;
        if (bestRank === null || rank < bestRank) {
          return rank;
        }
        return bestRank;
      }, null);
    }
    const sumMarket = typedItems.reduce((sum, i) => sum + i.avg_price, 0);
    const marketAvgPrice = sumMarket / totalStations;

    return {
      fuel_type: fuelType,
      owner_avg_price: ownerAvgPrice !== null ? ownerAvgPrice.toFixed(2) : null,
      market_avg_price: marketAvgPrice.toFixed(2),
      owner_rank_by_price: ownerRankByPrice,
      total_stations: totalStations,
      cheapest_station: {
        id: cheapest.station_id,
        name: cheapest.name,
        brand: cheapest.brand,
        price: cheapest.avg_price.toFixed(2),
      },
      most_expensive_station: {
        id: mostExpensive.station_id,
        name: mostExpensive.name,
        brand: mostExpensive.brand,
        price: mostExpensive.avg_price.toFixed(2),
      },
    };
  });

  const fuelTypes = Object.keys(priceInsightsMap);

  await logOwnerActivity(
    ownerId,
    "view_market_insights",
    null,
    req.ip,
    req.get("user-agent"),
    { municipality: municipality || null, days }
  );

  res.json({
    municipality: municipality || null,
    days,
    fuelTypes,
    priceInsights,
    stations,
  });
}

module.exports = {
  getOwnerInfo,
  getDashboard,
  getOwnerStations,
  getOwnerStation,
  updateOwnerStation,
  updateFuelPrice,
  deleteFuelPrice,
  getPendingPriceReports,
  verifyPriceReport,
  rejectPriceReport,
  getActivityLogs,
  getAnalytics,
  getMarketInsights,
};
