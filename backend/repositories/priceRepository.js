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
    INSERT INTO price_reports (
      station_id, 
      fuel_type, 
      price, 
      reporter_name, 
      reporter_contact, 
      photo_url, 
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
    reporter_name,
    reporter_contact,
    photo_url
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
    FROM price_reports pr
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
    SELECT price, created_at, reporter_name
    FROM price_reports
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
    FROM price_reports
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
  const query = `
    UPDATE price_reports
    SET 
      is_verified = true,
      verified_by = $2,
      verified_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await pool.query(query, [reportId, verifiedBy]);
  return result.rows[0];
}

/**
 * Delete a price report
 */
async function deletePriceReport(reportId) {
  const query = `
    DELETE FROM price_reports
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
  const query = `
    SELECT
      COUNT(*) AS total_reports,
      COUNT(DISTINCT station_id) AS stations_with_reports,
      COUNT(DISTINCT reporter_name) AS unique_reporters,
      COUNT(CASE WHEN is_verified = true THEN 1 END) AS verified_reports,
      COUNT(CASE WHEN is_verified = false THEN 1 END) AS pending_reports,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS reports_last_24h,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS reports_last_7d,
      ROUND(AVG(price)::numeric, 2) AS average_price,
      MIN(price) AS lowest_price,
      MAX(price) AS highest_price
    FROM price_reports
  `;
  
  const result = await pool.query(query);
  return result.rows[0];
}

/**
 * Get price trends for charting
 */
async function getPriceReportTrends(days = 7) {
  const query = `
    SELECT 
      DATE(created_at) as date,
      fuel_type,
      ROUND(AVG(price)::numeric, 2) as average_price,
      COUNT(*) as report_count
    FROM price_reports
    WHERE created_at >= NOW() - INTERVAL '${days} days'
      AND is_verified = true
    GROUP BY DATE(created_at), fuel_type
    ORDER BY date DESC, fuel_type
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get all pending price reports (unverified)
 */
async function getPendingPriceReports(limit = 100) {
  const query = `
    SELECT 
      pr.*,
      s.name AS station_name,
      s.brand AS station_brand,
      s.address AS station_address
    FROM price_reports pr
    LEFT JOIN stations s ON pr.station_id = s.id
    WHERE pr.is_verified = false
    ORDER BY pr.created_at DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limit]);
  return result.rows;
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
  getStationFuelPrices,
  updateStationFuelPrice,
  deleteStationFuelPrice
};
