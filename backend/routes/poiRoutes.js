/**
 * POI Routes
 * API endpoints for Points of Interest management
 */

const express = require("express");
const router = express.Router();
const poiController = require("../controllers/poiController");
const { optionalApiKey } = require("../middleware/authentication");
const rateLimit = require("../middleware/rateLimiter");
const requestDeduplication = require("../middleware/deduplication");
const { asyncHandler } = require("../middleware/errorHandler");

// GET routes (public)
router.get("/", asyncHandler(poiController.getAllPois));
router.get("/nearby", asyncHandler(poiController.getNearbyPois));
router.get("/:id", asyncHandler(poiController.getPoiById));

// Protected routes (require API key if configured)
router.post(
  "/",
  requestDeduplication,
  rateLimit,
  optionalApiKey,
  asyncHandler(poiController.createPoi)
);

router.put(
  "/:id",
  rateLimit,
  optionalApiKey,
  asyncHandler(poiController.updatePoi)
);

router.delete(
  "/:id",
  optionalApiKey,
  asyncHandler(poiController.deletePoi)
);

module.exports = router;
