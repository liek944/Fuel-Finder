/**
 * Admin Controller
 * Handles admin-related business logic and API responses
 */

const priceRepository = require("../repositories/priceRepository");

/**
 * Get all pending (unverified) price reports
 * GET /api/admin/price-reports/pending
 */
async function getPendingPriceReports(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  
  const reports = await priceRepository.getPendingPriceReports(limit);
  
  res.json({
    success: true,
    count: reports.length,
    data: reports,
  });
}

/**
 * Get price report statistics
 * GET /api/admin/price-reports/stats
 */
async function getPriceReportStats(req, res) {
  const stats = await priceRepository.getPriceReportStats();
  
  res.json({
    success: true,
    data: stats,
  });
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

module.exports = {
  getPendingPriceReports,
  getPriceReportStats,
  getPriceReportTrends,
  verifyPriceReport,
  deletePriceReport,
  updateStationPrices,
};
