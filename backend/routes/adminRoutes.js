/**
 * Admin Routes
 * Handles all admin-related API endpoints
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { asyncHandler } = require("../middleware/errorHandler");
const rateLimit = require("../middleware/rateLimiter");

// Apply rate limiting to all admin routes
router.use(rateLimit);

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

module.exports = router;
