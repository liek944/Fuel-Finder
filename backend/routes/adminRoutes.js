/**
 * Admin Routes
 * Handles all admin-related API endpoints
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { asyncHandler } = require("../middleware/errorHandler");
const adminRateLimit = require("../middleware/adminRateLimiter");

// Apply admin-specific rate limiting (more lenient for dashboard auto-refresh)
router.use(adminRateLimit);

// User analytics routes
router.get("/users/stats", asyncHandler(adminController.getUserStats));
router.get("/users/active", asyncHandler(adminController.getActiveUsers));
router.get("/users/activity", asyncHandler(adminController.getUserActivityLogs));

// Price report management routes (specific routes first to avoid conflicts)
router.get("/price-reports/pending", asyncHandler(adminController.getPendingPriceReports));
router.get("/price-reports/stats", asyncHandler(adminController.getPriceReportStats));
router.get("/price-reports/trends", asyncHandler(adminController.getPriceReportTrends));
router.get("/price-reports", asyncHandler(adminController.getAllPriceReports)); // General query with filters
router.post("/price-reports/:id/verify", asyncHandler(adminController.verifyPriceReport));
router.delete("/price-reports/:id", asyncHandler(adminController.deletePriceReport));

// Station price management routes
router.put("/stations/:id/prices", asyncHandler(adminController.updateStationPrices));

// Review management routes
const reviewController = require("../controllers/reviewController");
router.get("/reviews", asyncHandler(reviewController.getAllReviewsForAdmin));
router.patch("/reviews/:id", asyncHandler(reviewController.updateReviewStatus));
router.delete("/reviews/:id", asyncHandler(reviewController.deleteReview));

// Owner management routes
const ownerManagementController = require("../controllers/ownerManagementController");
router.get("/owners", asyncHandler(ownerManagementController.getAllOwners));
router.get("/owners/:id", asyncHandler(ownerManagementController.getOwnerById));
router.post("/owners", asyncHandler(ownerManagementController.createOwner));
router.put("/owners/:id", asyncHandler(ownerManagementController.updateOwner));
router.post("/owners/:id/stations", asyncHandler(ownerManagementController.assignStations));
router.delete("/owners/:id/stations", asyncHandler(ownerManagementController.unassignStations));
router.get("/stations/unassigned", asyncHandler(ownerManagementController.getUnassignedStations));
router.post("/owners/:id/logo", asyncHandler(ownerManagementController.uploadOwnerLogo));

module.exports = router;
