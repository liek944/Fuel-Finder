/**
 * Admin Controller
 * Handles admin-related business logic and API responses
 */

const priceRepository = require("../repositories/priceRepository");
const userRepository = require("../repositories/userRepository");

/**
 * Get all pending (unverified) price reports
 * GET /api/admin/price-reports/pending
 */
async function getPendingPriceReports(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  const result = await priceRepository.getPendingPriceReports(limit, offset);
  
  res.json({
    success: true,
    reports: result.reports,
    pagination: {
      total: result.total,
      limit: limit,
      offset: offset
    }
  });
}

/**
 * Get price report statistics
 * GET /api/admin/price-reports/stats
 */
async function getPriceReportStats(req, res) {
  const stats = await priceRepository.getPriceReportStats();
  
  // Return stats directly to match frontend expectations
  res.json(stats);
}

/**
 * Get price report trends over time
 * GET /api/admin/price-reports/trends
 */
async function getPriceReportTrends(req, res) {
  const days = parseInt(req.query.days) || 7;
  
  const trends = await priceRepository.getPriceReportTrends(days);
  
  res.json({
    success: true,
    data: trends,
  });
}

/**
 * Verify a price report
 * POST /api/admin/price-reports/:id/verify
 */
async function verifyPriceReport(req, res) {
  const reportId = parseInt(req.params.id);
  const verifiedBy = req.body.verifiedBy || "admin";
  
  if (!reportId) {
    return res.status(400).json({
      success: false,
      error: "Report ID is required",
    });
  }
  
  const report = await priceRepository.verifyPriceReport(reportId, verifiedBy);
  
  if (!report) {
    return res.status(404).json({
      success: false,
      error: "Price report not found",
    });
  }
  
  res.json({
    success: true,
    message: "Price report verified successfully",
    data: report,
  });
}

/**
 * Delete a price report
 * DELETE /api/admin/price-reports/:id
 */
async function deletePriceReport(req, res) {
  const reportId = parseInt(req.params.id);
  
  if (!reportId) {
    return res.status(400).json({
      success: false,
      error: "Report ID is required",
    });
  }
  
  const result = await priceRepository.deletePriceReport(reportId);
  
  if (!result) {
    return res.status(404).json({
      success: false,
      error: "Price report not found",
    });
  }
  
  res.json({
    success: true,
    message: "Price report deleted successfully",
  });
}

/**
 * Get all price reports with optional filters
 * GET /api/admin/price-reports
 */
async function getAllPriceReports(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const verified = req.query.verified;
  const stationName = req.query.station_name;
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  
  const filters = {
    limit,
    offset,
    verified,
    stationName,
    startDate,
    endDate
  };
  
  const result = await priceRepository.getAllPriceReports(filters);
  
  res.json({
    success: true,
    reports: result.reports,
    pagination: {
      total: result.total,
      limit: limit,
      offset: offset
    }
  });
}

/**
 * Update station fuel prices
 * PUT /api/admin/stations/:id/prices
 */
async function updateStationPrices(req, res) {
  const stationId = parseInt(req.params.id);
  const { prices, updatedBy = "admin" } = req.body;
  
  if (!stationId) {
    return res.status(400).json({
      success: false,
      error: "Station ID is required",
    });
  }
  
  if (!prices || !Array.isArray(prices)) {
    return res.status(400).json({
      success: false,
      error: "Prices array is required",
    });
  }
  
  // Update each fuel type price
  const results = [];
  for (const priceData of prices) {
    const { fuel_type, price } = priceData;
    
    if (!fuel_type || !price) {
      continue;
    }
    
    const result = await priceRepository.updateStationFuelPrice(
      stationId,
      fuel_type,
      price,
      updatedBy
    );
    
    results.push(result);
  }
  
  res.json({
    success: true,
    message: `Updated ${results.length} fuel prices`,
    data: results,
  });
}

/**
 * Get user statistics
 * GET /api/admin/users/stats
 */
async function getUserStats(req, res) {
  const stats = await userRepository.getUserStats();
  
  res.json({
    success: true,
    stats: stats,
  });
}

/**
 * Get active users
 * GET /api/admin/users/active
 */
async function getActiveUsers(req, res) {
  const users = await userRepository.getActiveUsers();
  
  res.json({
    success: true,
    users: users,
  });
}

/**
 * Get user activity logs
 * GET /api/admin/users/activity
 */
async function getUserActivityLogs(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  const logs = await userRepository.getUserActivityLogs(limit, offset);
  
  res.json({
    success: true,
    logs: logs,
    pagination: {
      total: logs.length,
      limit: limit,
      offset: offset
    }
  });
}

module.exports = {
  getPendingPriceReports,
  getAllPriceReports,
  getPriceReportStats,
  getPriceReportTrends,
  verifyPriceReport,
  deletePriceReport,
  updateStationPrices,
  getUserStats,
  getActiveUsers,
  getUserActivityLogs,
};
