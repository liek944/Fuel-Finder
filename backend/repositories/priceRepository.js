/**
 * Price Repository
 * Handles all database operations related to fuel prices and price reports
 */

const { pool } = require("../config/database");

/**
 * Submit a fuel price report
 */
async function submitPriceReport(report) {
  const { station_id, fuel_type, price, reporter_name, reporter_contact, photo_url } = report;
  
  const query = `
    INSERT INTO fuel_price_reports (
      station_id, 
      fuel_type, 
      price, 
      reporter_ip, 
      reporter_identifier, 
      notes, 
      is_verified, 
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    station_id,
    fuel_type,
    price,
    reporter_contact || null, // Using reporter_contact as IP
    reporter_name || 'Anonymous', // Using reporter_name as identifier
    photo_url || null // Using photo_url as notes
  ]);
  
  return result.rows[0];
}

/**
 * Get price reports for a station
 */
async function getPriceReports(stationId, limit = 10, verified = null) {
  let query = `
    SELECT 
      pr.*,
      s.name AS station_name
    FROM fuel_price_reports pr
    LEFT JOIN stations s ON pr.station_id = s.id
    WHERE pr.station_id = $1
  `;
  
  const params = [stationId];
  
  if (verified !== null) {
    query += ` AND pr.is_verified = $${params.length + 1}`;
    params.push(verified);
  }
  
  query += ` ORDER BY pr.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get latest verified price for a station
 */
async function getLatestVerifiedPrice(stationId, fuelType) {
  const query = `
    SELECT price, created_at, reporter_identifier as reporter_name
    FROM fuel_price_reports
    WHERE station_id = $1
      AND fuel_type = $2
      AND is_verified = true
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  const result = await pool.query(query, [stationId, fuelType]);
  return result.rows[0];
}

/**
 * Get average price from recent reports
 */
async function getAveragePriceFromReports(stationId, fuelType, days = 7) {
  const query = `
    SELECT 
      ROUND(AVG(price)::numeric, 2) AS average_price,
      COUNT(*) AS report_count,
      MIN(price) AS min_price,
      MAX(price) AS max_price
    FROM fuel_price_reports
    WHERE station_id = $1
      AND fuel_type = $2
      AND created_at >= NOW() - INTERVAL '${days} days'
      AND is_verified = true
  `;
  
  const result = await pool.query(query, [stationId, fuelType]);
  return result.rows[0];
}

/**
 * Verify a price report
 */
async function verifyPriceReport(reportId, verifiedBy) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Mark the report as verified
    const reportQuery = `
      UPDATE fuel_price_reports
      SET 
        is_verified = true,
        verified_by = $2,
        verified_at = NOW()
      WHERE id = $1
      RETURNING station_id, fuel_type, price
    `;
    
    const reportResult = await client.query(reportQuery, [reportId, verifiedBy]);
    
    if (reportResult.rows.length === 0) {
      throw new Error('Price report not found');
    }
    
    const report = reportResult.rows[0];
    
    // Step 2: Update the fuel_prices table with the verified price
    const priceQuery = `
      INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, price_updated_by, price_updated_at, updated_at)
      VALUES ($1, $2, $3, TRUE, 'community', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (station_id, fuel_type)
      DO UPDATE SET
        price = EXCLUDED.price,
        is_community = TRUE,
        price_updated_by = 'community',
        price_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await client.query(priceQuery, [report.station_id, report.fuel_type, report.price]);
    
    await client.query('COMMIT');
    
    return report;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a price report
 */
async function deletePriceReport(reportId) {
  const query = `
    DELETE FROM fuel_price_reports
    WHERE id = $1
    RETURNING id
  `;
  
  const result = await pool.query(query, [reportId]);
  return result.rows[0];
}

/**
 * Get price report statistics
 */
async function getPriceReportStats() {
  // Get basic stats
  const statsQuery = `
    SELECT
      COUNT(*) AS total_reports,
      COUNT(DISTINCT station_id) AS unique_stations_reported,
      COUNT(CASE WHEN is_verified = true THEN 1 END) AS verified_reports,
      COUNT(CASE WHEN is_verified = false THEN 1 END) AS pending_reports,
      COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) AS reports_today,
      ROUND(AVG(price)::numeric, 2) AS avg_price_all,
      MAX(created_at) AS last_report_date
    FROM fuel_price_reports
  `;
  
  // Get most reported station
  const mostReportedQuery = `
    SELECT 
      s.name AS most_reported_station,
      COUNT(*) AS most_reported_station_count
    FROM fuel_price_reports pr
    LEFT JOIN stations s ON pr.station_id = s.id
    GROUP BY s.name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `;
  
  const statsResult = await pool.query(statsQuery);
  const mostReportedResult = await pool.query(mostReportedQuery);
  
  const stats = statsResult.rows[0];
  const mostReported = mostReportedResult.rows[0];
  
  // Calculate verification rate
  const total = parseInt(stats.total_reports) || 0;
  const verified = parseInt(stats.verified_reports) || 0;
  const verificationRate = total > 0 ? ((verified / total) * 100).toFixed(1) + '%' : '0%';
  
  return {
    total_reports: parseInt(stats.total_reports) || 0,
    verified_reports: parseInt(stats.verified_reports) || 0,
    pending_reports: parseInt(stats.pending_reports) || 0,
    reports_today: parseInt(stats.reports_today) || 0,
    unique_stations_reported: parseInt(stats.unique_stations_reported) || 0,
    avg_price_all: stats.avg_price_all,
    most_reported_station: mostReported?.most_reported_station || null,
    most_reported_station_count: parseInt(mostReported?.most_reported_station_count) || 0,
    last_report_date: stats.last_report_date,
    verification_rate: verificationRate
  };
}

/**
 * Get price trends for charting
 */
async function getPriceReportTrends(days = 7) {
  const query = `
    SELECT 
      DATE(created_at) as report_date,
      fuel_type,
      ROUND(AVG(price)::numeric, 2) as average_price,
      COUNT(*) as report_count
    FROM fuel_price_reports
    WHERE created_at >= NOW() - INTERVAL '${days} days'
      AND is_verified = true
    GROUP BY DATE(created_at), fuel_type
    ORDER BY report_date DESC, fuel_type
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get all pending price reports (unverified)
 */
async function getPendingPriceReports(limit = 100, offset = 0) {
  const countQuery = `
    SELECT COUNT(*) as total
    FROM fuel_price_reports pr
    WHERE pr.is_verified = false
  `;
  
  const countResult = await pool.query(countQuery);
  const total = parseInt(countResult.rows[0].total);
  
  const query = `
    SELECT 
      pr.*,
      s.name AS station_name,
      s.brand AS station_brand,
      s.address AS station_address
    FROM fuel_price_reports pr
    LEFT JOIN stations s ON pr.station_id = s.id
    WHERE pr.is_verified = false
    ORDER BY pr.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await pool.query(query, [limit, offset]);
  return {
    reports: result.rows,
    total: total
  };
}

/**
 * Get all price reports with optional filters
 */
async function getAllPriceReports(filters = {}) {
  const { limit = 100, offset = 0, verified, stationName, startDate, endDate } = filters;
  
  // Build WHERE clause
  const whereClauses = [];
  const params = [];
  let paramCount = 0;
  
  if (verified !== undefined) {
    paramCount++;
    whereClauses.push(`pr.is_verified = $${paramCount}`);
    params.push(verified === 'true' || verified === true);
  }
  
  if (stationName) {
    paramCount++;
    whereClauses.push(`s.name ILIKE $${paramCount}`);
    params.push(`%${stationName}%`);
  }
  
  if (startDate) {
    paramCount++;
    whereClauses.push(`pr.created_at >= $${paramCount}`);
    params.push(startDate);
  }
  
  if (endDate) {
    paramCount++;
    whereClauses.push(`pr.created_at <= $${paramCount}`);
    params.push(endDate);
  }
  
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // Count total matching records
  const countQuery = `
    SELECT COUNT(*) as total
    FROM fuel_price_reports pr
    LEFT JOIN stations s ON pr.station_id = s.id
    ${whereClause}
  `;
  
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);
  
  // Get paginated results
  const query = `
    SELECT 
      pr.*,
      s.name AS station_name,
      s.brand AS station_brand,
      s.address AS station_address
    FROM fuel_price_reports pr
    LEFT JOIN stations s ON pr.station_id = s.id
    ${whereClause}
    ORDER BY pr.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;
  
  params.push(limit, offset);
  const result = await pool.query(query, params);
  
  return {
    reports: result.rows,
    total: total
  };
}

/**
 * Get station fuel prices
 */
async function getStationFuelPrices(stationId) {
  const query = `
    SELECT 
      fp.fuel_type,
      fp.price,
      fp.price_updated_at,
      fp.price_updated_by
    FROM fuel_prices fp
    WHERE fp.station_id = $1
    ORDER BY fp.fuel_type
  `;
  
  const result = await pool.query(query, [stationId]);
  return result.rows;
}

/**
 * Update station fuel price
 */
async function updateStationFuelPrice(stationId, fuelType, price, updatedBy = "admin") {
  const query = `
    INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_by, price_updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (station_id, fuel_type) 
    DO UPDATE SET 
      price = $3,
      price_updated_by = $4,
      price_updated_at = NOW()
    RETURNING *
  `;
  
  const result = await pool.query(query, [stationId, fuelType, price, updatedBy]);
  return result.rows[0];
}

/**
 * Delete station fuel price
 */
async function deleteStationFuelPrice(stationId, fuelType) {
  const query = `
    DELETE FROM fuel_prices
    WHERE station_id = $1 AND fuel_type = $2
    RETURNING fuel_type
  `;
  
  const result = await pool.query(query, [stationId, fuelType]);
  return result.rows[0];
}

module.exports = {
  submitPriceReport,
  getPriceReports,
  getLatestVerifiedPrice,
  getAveragePriceFromReports,
  verifyPriceReport,
  deletePriceReport,
  getPriceReportStats,
  getPriceReportTrends,
  getPendingPriceReports,
  getAllPriceReports,
  getStationFuelPrices,
  updateStationFuelPrice,
  deleteStationFuelPrice
};
