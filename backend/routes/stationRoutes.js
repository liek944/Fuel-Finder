/**
 * Station Routes
 * API endpoints for fuel station management
 */

const express = require("express");
const router = express.Router();
const stationController = require("../controllers/stationController");
const { optionalApiKey } = require("../middleware/authentication");
const rateLimit = require("../middleware/rateLimiter");
const requestDeduplication = require("../middleware/deduplication");
const { asyncHandler } = require("../middleware/errorHandler");

// GET routes (public)
router.get("/", asyncHandler(stationController.getAllStations));
router.get("/nearby", asyncHandler(stationController.getNearbyStations));
router.get("/search", asyncHandler(stationController.searchStations));
router.get("/brand/:brand", asyncHandler(stationController.getStationsByBrand));
router.get("/:id", asyncHandler(stationController.getStationById));

// Protected routes (require API key if configured)
router.post(
  "/",
  requestDeduplication,
  rateLimit,
  optionalApiKey,
  asyncHandler(stationController.createStation)
);

router.put(
  "/:id",
  rateLimit,
  optionalApiKey,
  asyncHandler(stationController.updateStation)
);

router.delete(
  "/:id",
  optionalApiKey,
  asyncHandler(stationController.deleteStation)
);

module.exports = router;
