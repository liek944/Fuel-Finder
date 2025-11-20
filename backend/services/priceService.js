/**
 * Price Service
 * Handles business logic for price-related operations
 */

const priceRepository = require("../repositories/priceRepository");
const stationRepository = require("../repositories/stationRepository");
const { transformPriceReportData } = require("../utils/transformers");
const logger = require("../utils/logger");
const { pool } = require("../config/database");

/**
 * Submit a fuel price report
 */
async function submitPriceReport(stationId, reportData, reporterIp) {
  const { fuel_type = "Regular", price, notes } = reportData;

  // Check if station exists
  const station = await stationRepository.getStationById(stationId);
  if (!station) {
    return null;
  }

  logger.info(`Submitting price report for station ${stationId}: ₱${price} (${fuel_type})`);

  // Submit report with anonymous reporter if not provided
  const report = await priceRepository.submitPriceReport({
    station_id: stationId,
    fuel_type,
    price,
    reporter_name: "Anonymous",
    reporter_contact: reporterIp,
    photo_url: notes || null,
  });

  logger.info(`Price report submitted (ID: ${report.id})`);

  return {
    id: report.id,
    station_id: report.station_id,
    fuel_type: report.fuel_type,
    price: report.price,
    created_at: report.created_at,
  };
}

/**
 * Get price reports for a station
 */
async function getPriceReportsForStation(stationId, limit) {
  logger.info(`Fetching price reports for station ${stationId}...`);

  const reports = await priceRepository.getPriceReports(stationId, limit);

  logger.info(`Found ${reports.length} price reports`);

  return transformPriceReportData(reports);
}

/**
 * Get average price from recent reports
 */
async function getAveragePriceFromReports(stationId, fuelType, days) {
  logger.info(`Calculating average price for station ${stationId} (${fuelType})...`);

  const stats = await priceRepository.getAveragePriceFromReports(stationId, fuelType, days);

  return stats;
}

/**
 * Update fuel price for a station (owner/admin)
 */
async function updateFuelPrice(stationId, fuelType, price, updatedBy) {
  logger.info(`Updating ${fuelType} price for station ${stationId} to ₱${price} by ${updatedBy}`);

  const result = await priceRepository.updateStationFuelPrice(stationId, fuelType, price, updatedBy);

  logger.info(`Fuel price updated successfully`);
  return result;
}

/**
 * Delete fuel price for a station (owner/admin)
 */
async function deleteFuelPrice(stationId, fuelType, requestedBy) {
  logger.info(`Deleting ${fuelType} price for station ${stationId} by ${requestedBy}`);

  const result = await priceRepository.deleteStationFuelPrice(stationId, fuelType);

  if (result) {
    logger.info(`${fuelType} price deleted successfully`);
  }
  return result;
}

/**
 * Verify (approve) a price report
 */
async function verifyPriceReport(reportId, verifierName, verifierId, notes) {
  logger.info(`Verifying price report ${reportId} by ${verifierName}`);

  // We need to do this transactionally, which verifyPriceReport in repository handles
  // But we need to add the extra fields (verified_by_owner_id, notes) which might not be in the repo method
  // Let's check the repo method... it takes (reportId, verifiedBy).
  // The repo method is a bit limited for the owner case which sets verified_by_owner_id.
  // So we might need to implement the specific logic here or update the repo.
  // For now, let's use a direct query or update the repo.
  // Since we want to keep logic in service/repo, let's implement the specific owner verification here using pool.

  // Actually, looking at the ownerController logic, it does:
  // 1. Update fuel_price_reports
  // 2. Update fuel_prices
  // 3. Log activity

  // Let's try to reuse the repo method if possible, or extend it.
  // The repo method `verifyPriceReport` does both steps but doesn't support `verified_by_owner_id` or `notes`.
  // I will implement the logic here to match the controller's behavior exactly.

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get report details first
    const reportCheck = await client.query(
      `SELECT fpr.*, s.owner_id, s.name as station_name
       FROM fuel_price_reports fpr
       JOIN stations s ON s.id = fpr.station_id
       WHERE fpr.id = $1`,
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      throw new Error("Report not found");
    }

    const report = reportCheck.rows[0];

    // Update price report
    await client.query(
      `UPDATE fuel_price_reports 
       SET is_verified = TRUE,
           verified_by = $1,
           verified_by_owner_id = $2,
           verified_at = CURRENT_TIMESTAMP,
           notes = COALESCE($3, notes)
       WHERE id = $4`,
      [verifierName, verifierId, notes, reportId]
    );

    // Update station's fuel price
    await client.query(
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

    await client.query('COMMIT');

    return {
      report_id: reportId,
      station_id: report.station_id,
      fuel_type: report.fuel_type,
      price: report.price,
      station_name: report.station_name
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reject a price report
 */
async function rejectPriceReport(reportId, rejectorName) {
  logger.info(`Rejecting price report ${reportId} by ${rejectorName}`);

  const client = await pool.connect();
  try {
    // Get report details first to return them
    const reportCheck = await client.query(
      `SELECT fpr.*, s.name as station_name
       FROM fuel_price_reports fpr
       JOIN stations s ON s.id = fpr.station_id
       WHERE fpr.id = $1`,
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      throw new Error("Report not found");
    }

    const report = reportCheck.rows[0];

    // Delete the rejected report
    await client.query(
      `DELETE FROM fuel_price_reports WHERE id = $1`,
      [reportId]
    );

    return {
      report_id: reportId,
      station_id: report.station_id,
      fuel_type: report.fuel_type,
      price: report.price,
      station_name: report.station_name
    };
  } finally {
    client.release();
  }
}

module.exports = {
  submitPriceReport,
  getPriceReportsForStation,
  getAveragePriceFromReports,
  updateFuelPrice,
  deleteFuelPrice,
  verifyPriceReport,
  rejectPriceReport
};
