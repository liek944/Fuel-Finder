/**
 * Admin Routes
 * Handles all admin-related API endpoints
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { asyncHandler } = require("../middleware/errorHandler");
const rateLimit = require("express-rate-limit");

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many admin requests from this IP, please try again later.",
});

// Apply rate limiting to all admin routes
router.use(adminLimiter);

// Price report management routes
router.get("/price-reports/pending", asyncHandler(adminController.getPendingPriceReports));
router.get("/price-reports/stats", asyncHandler(adminController.getPriceReportStats));
router.get("/price-reports/trends", asyncHandler(adminController.getPriceReportTrends));
router.post("/price-reports/:id/verify", asyncHandler(adminController.verifyPriceReport));
router.delete("/price-reports/:id", asyncHandler(adminController.deletePriceReport));

// Station price management routes
router.put("/stations/:id/prices", asyncHandler(adminController.updateStationPrices));

module.exports = router;
