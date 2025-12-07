/**
 * POI Routes
 * API endpoints for Points of Interest management
 */

const express = require("express");
const router = express.Router();
const poiController = require("../controllers/poiController");
const imageController = require("../controllers/imageController");
const { optionalApiKey } = require("../middleware/authentication");
const rateLimit = require("../middleware/rateLimiter");
const requestDeduplication = require("../middleware/deduplication");
const { asyncHandler } = require("../middleware/errorHandler");
const { validate } = require("../middleware/validate");
const schemas = require("../schemas").poi;

// GET routes (public)
router.get("/", asyncHandler(poiController.getAllPois));
router.get("/nearby", validate(schemas.getNearbyPoisSchema), asyncHandler(poiController.getNearbyPois));
router.get("/:id", validate(schemas.getPoiByIdSchema), asyncHandler(poiController.getPoiById));

// Protected routes (require API key if configured)
router.post(
  "/",
  requestDeduplication,
  rateLimit,
  optionalApiKey,
  validate(schemas.createPoiSchema),
  asyncHandler(poiController.createPoi)
);

router.put(
  "/:id",
  rateLimit,
  optionalApiKey,
  validate(schemas.updatePoiSchema),
  asyncHandler(poiController.updatePoi)
);

router.delete(
  "/:id",
  optionalApiKey,
  validate(schemas.deletePoiSchema),
  asyncHandler(poiController.deletePoi)
);

// Image upload routes
router.post(
  "/:id/images",
  requestDeduplication,
  rateLimit,
  optionalApiKey,
  asyncHandler(imageController.uploadPoiImages)
);

router.get(
  "/:id/images",
  asyncHandler(imageController.getPoiImages)
);

module.exports = router;
