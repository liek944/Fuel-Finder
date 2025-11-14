/**
 * Owner Routes
 * API endpoints for owner-specific operations
 * 
 * These routes require:
 * 1. Access through owner subdomain (e.g., castillonfuels.fuelfinder.com)
 * 2. Valid API key in x-api-key header
 */

const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/ownerController");
const { detectOwner, requireOwner } = require("../middleware/ownerDetection");
const { verifyOwnerApiKey, enforceOwnerStationAccess } = require("../middleware/ownerAuth");
const { asyncHandler } = require("../middleware/errorHandler");
const ownerRateLimit = require("../middleware/ownerRateLimiter");

// Apply owner detection to all routes
router.use(detectOwner);
router.use(requireOwner);

// Apply per-owner rate limiting (must be after owner detection)
router.use(ownerRateLimit);

// =====================================================
// Public owner routes (no API key required)
// =====================================================

/**
 * GET /api/owner/info
 * Get basic owner information (public)
 */
router.get(
  "/info",
  asyncHandler(ownerController.getOwnerInfo)
);

// =====================================================
// Protected owner routes (API key required)
// =====================================================

// Apply API key verification to all routes below
router.use(verifyOwnerApiKey);
router.use(enforceOwnerStationAccess);

/**
 * GET /api/owner/dashboard
 * Get owner dashboard statistics and analytics
 */
router.get(
  "/dashboard",
  asyncHandler(ownerController.getDashboard)
);

/**
 * GET /api/owner/stations
 * Get all stations owned by this owner
 */
router.get(
  "/stations",
  asyncHandler(ownerController.getOwnerStations)
);

/**
 * GET /api/owner/stations/:id
 * Get specific station details (must be owned by this owner)
 */
router.get(
  "/stations/:id",
  asyncHandler(ownerController.getOwnerStation)
);

/**
 * PUT /api/owner/stations/:id
 * Update station details (must be owned by this owner)
 */
router.put(
  "/stations/:id",
  asyncHandler(ownerController.updateOwnerStation)
);

/**
 * PUT /api/owner/stations/:id/fuel-price
 * Update fuel price for a specific station
 */
router.put(
  "/stations/:id/fuel-price",
  asyncHandler(ownerController.updateFuelPrice)
);

/**
 * DELETE /api/owner/stations/:id/fuel-price/:fuelType
 * Delete fuel price for a specific station and fuel type
 */
router.delete(
  "/stations/:id/fuel-price/:fuelType",
  asyncHandler(ownerController.deleteFuelPrice)
);

/**
 * GET /api/owner/price-reports/pending
 * Get pending price reports for owner's stations
 */
router.get(
  "/price-reports/pending",
  asyncHandler(ownerController.getPendingPriceReports)
);

/**
 * POST /api/owner/price-reports/:id/verify
 * Verify (approve) a price report
 */
router.post(
  "/price-reports/:id/verify",
  asyncHandler(ownerController.verifyPriceReport)
);

/**
 * POST /api/owner/price-reports/:id/reject
 * Reject a price report
 */
router.post(
  "/price-reports/:id/reject",
  asyncHandler(ownerController.rejectPriceReport)
);

/**
 * GET /api/owner/activity-logs
 * Get owner's activity history
 */
router.get(
  "/activity-logs",
  asyncHandler(ownerController.getActivityLogs)
);

/**
 * GET /api/owner/analytics
 * Get advanced analytics for owner's stations
 */
router.get(
  "/analytics",
  asyncHandler(ownerController.getAnalytics)
);

/**
 * GET /api/owner/market-insights
 * Get market insights for owner's stations by municipality and time range
 */
router.get(
  "/market-insights",
  asyncHandler(ownerController.getMarketInsights)
);

/**
 * GET /api/owner/reviews
 * Get reviews for owner's stations
 */
const reviewController = require("../controllers/reviewController");
router.get(
  "/reviews",
  asyncHandler(reviewController.getReviewsForOwner)
);

/**
 * PATCH /api/owner/reviews/:id
 * Update review status (publish/reject)
 */
router.patch(
  "/reviews/:id",
  asyncHandler(reviewController.updateReviewStatusByOwner)
);

module.exports = router;
