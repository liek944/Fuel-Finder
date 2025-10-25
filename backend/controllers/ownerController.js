/**
 * Owner Controller
 * Handles business logic for owner-specific operations
 */

const { pool } = require("../config/database");
const { transformStationData } = require("../utils/transformers");
const { checkStationOwnership, logOwnerActivity } = require("../middleware/ownerAuth");

/**
 * Get basic owner information (public, no API key required)
 */
async function getOwnerInfo(req, res) {
  const owner = req.ownerData;

  // Return only public information
  res.json({
    name: owner.name,
    domain: owner.domain,
    contact_person: owner.contact_person,
    email: owner.email,
    phone: owner.phone,
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
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
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
          DISTINCT jsonb_build_object(
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
          DISTINCT jsonb_build_object(
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
          DISTINCT jsonb_build_object(
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
    `INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, updated_at)
     VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (station_id, fuel_type) 
     DO UPDATE SET 
       price = EXCLUDED.price,
       is_community = TRUE,
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

module.exports = {
  getOwnerInfo,
  getDashboard,
  getOwnerStations,
  getOwnerStation,
  updateOwnerStation,
  getPendingPriceReports,
  verifyPriceReport,
  rejectPriceReport,
  getActivityLogs,
  getAnalytics,
};
