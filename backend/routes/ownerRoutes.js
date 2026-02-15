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
const { validate } = require("../middleware/validate");
const schemas = require("../schemas").owner;

// =====================================================
// Auth routes - NO owner detection required
// These work regardless of hostname (e.g., Vercel deploys)
// =====================================================

/**
 * GET /api/owner/auth/verify/:token
 * Verify magic link token and get API key for session (public)
 * No owner detection needed — pure token lookup
 */
router.get(
  "/auth/verify/:token",
  validate(schemas.verifyMagicLinkSchema),
  asyncHandler(ownerController.verifyMagicLinkToken)
);

/**
 * GET /api/owner/auth/status/:sessionToken
 * Check magic link session status for cross-device polling (public)
 * No owner detection needed — pure session token lookup
 */
router.get(
  "/auth/status/:sessionToken",
  validate(schemas.checkMagicLinkStatusSchema),
  asyncHandler(ownerController.checkMagicLinkStatus)
);

// =====================================================
// Auth routes that need optional owner context
// detectOwner is applied inline (not requireOwner)
// =====================================================

/**
 * POST /api/owner/auth/request-link
 * Request a magic link email for passwordless login (public)
 * Needs detectOwner so findOwnerByEmail can scope by domain
 */
router.post(
  "/auth/request-link",
  detectOwner,
  validate(schemas.requestMagicLinkSchema),
  asyncHandler(ownerController.requestMagicLink)
);

/**
 * POST /api/owner/auth/request-sms
 * Request an SMS OTP code for login (public)
 */
router.post(
  "/auth/request-sms",
  detectOwner,
  validate(schemas.requestSmsOtpSchema),
  asyncHandler(ownerController.requestSmsOtp)
);

/**
 * POST /api/owner/auth/verify-sms
 * Verify SMS OTP code and get API key (public)
 */
router.post(
  "/auth/verify-sms",
  detectOwner,
  validate(schemas.verifySmsOtpSchema),
  asyncHandler(ownerController.verifySmsOtp)
);

// =====================================================
// Owner-detected routes (require subdomain)
// =====================================================

// Apply owner detection + requirement to all remaining routes
router.use(detectOwner);
router.use(requireOwner);
router.use(ownerRateLimit);

/**
 * GET /api/owner/info
 * Get basic owner information (requires owner subdomain)
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
  validate(schemas.getOwnerStationSchema),
  asyncHandler(ownerController.getOwnerStation)
);

/**
 * PUT /api/owner/stations/:id
 * Update station details (must be owned by this owner)
 */
router.put(
  "/stations/:id",
  validate(schemas.updateOwnerStationSchema),
  asyncHandler(ownerController.updateOwnerStation)
);

/**
 * PUT /api/owner/stations/:id/fuel-price
 * Update fuel price for a specific station
 */
router.put(
  "/stations/:id/fuel-price",
  validate(schemas.updateFuelPriceSchema),
  asyncHandler(ownerController.updateFuelPrice)
);

/**
 * DELETE /api/owner/stations/:id/fuel-price/:fuelType
 * Delete fuel price for a specific station and fuel type
 */
router.delete(
  "/stations/:id/fuel-price/:fuelType",
  validate(schemas.deleteFuelPriceSchema),
  asyncHandler(ownerController.deleteFuelPrice)
);

/**
 * GET /api/owner/price-reports/pending
 * Get pending price reports for owner's stations
 */
router.get(
  "/price-reports/pending",
  validate(schemas.getPendingPriceReportsSchema),
  asyncHandler(ownerController.getPendingPriceReports)
);

/**
 * POST /api/owner/price-reports/:id/verify
 * Verify (approve) a price report
 */
router.post(
  "/price-reports/:id/verify",
  validate(schemas.verifyPriceReportSchema),
  asyncHandler(ownerController.verifyPriceReport)
);

/**
 * POST /api/owner/price-reports/:id/reject
 * Reject a price report
 */
router.post(
  "/price-reports/:id/reject",
  validate(schemas.rejectPriceReportSchema),
  asyncHandler(ownerController.rejectPriceReport)
);

/**
 * GET /api/owner/activity-logs
 * Get owner's activity history
 */
router.get(
  "/activity-logs",
  validate(schemas.getActivityLogsSchema),
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
  validate(schemas.getMarketInsightsSchema),
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
