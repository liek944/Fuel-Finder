/**
 * Station Routes
 * API endpoints for fuel station management
 */

const express = require("express");
const router = express.Router();
const stationController = require("../controllers/stationController");
const imageController = require("../controllers/imageController");
const { optionalApiKey } = require("../middleware/authentication");
const rateLimit = require("../middleware/rateLimiter");
const requestDeduplication = require("../middleware/deduplication");
const { asyncHandler } = require("../middleware/errorHandler");
const { validate } = require("../middleware/validate");
const schemas = require("../schemas").station;

// GET routes (public)
router.get("/", asyncHandler(stationController.getAllStations));
router.get("/nearby", validate(schemas.getNearbyStationsSchema), asyncHandler(stationController.getNearbyStations));
router.get("/search", validate(schemas.searchStationsSchema), asyncHandler(stationController.searchStations));
router.get("/brand/:brand", validate(schemas.getStationsByBrandSchema), asyncHandler(stationController.getStationsByBrand));
router.get("/:id", validate(schemas.getStationByIdSchema), asyncHandler(stationController.getStationById));

// Price reporting routes (public)
router.post("/:id/report-price", rateLimit, validate(schemas.submitPriceReportSchema), asyncHandler(stationController.submitPriceReport));
router.get("/:id/price-reports", validate(schemas.getPriceReportsSchema), asyncHandler(stationController.getPriceReportsForStation));
router.get("/:id/average-price", validate(schemas.getAveragePriceSchema), asyncHandler(stationController.getAveragePriceFromReports));

// Direct fuel price management routes (used by admin portal & owner tools)
router.put(
  "/:id/fuel-prices/:fuelType",
  rateLimit,
  optionalApiKey,
  validate(schemas.updateFuelPriceSchema),
  asyncHandler(stationController.updateStationFuelPrice)
);

router.delete(
  "/:id/fuel-prices/:fuelType",
  optionalApiKey,
  validate(schemas.deleteFuelPriceSchema),
  asyncHandler(stationController.deleteStationFuelPrice)
);

// Protected routes (require API key if configured)
router.post(
  "/",
  requestDeduplication,
  rateLimit,
  optionalApiKey,
  validate(schemas.createStationSchema),
  asyncHandler(stationController.createStation)
);

router.put(
  "/:id",
  rateLimit,
  optionalApiKey,
  validate(schemas.updateStationSchema),
  asyncHandler(stationController.updateStation)
);

router.delete(
  "/:id",
  optionalApiKey,
  validate(schemas.deleteStationSchema),
  asyncHandler(stationController.deleteStation)
);

// Image upload routes
router.post(
  "/:id/images",
  requestDeduplication,
  rateLimit,
  optionalApiKey,
  asyncHandler(imageController.uploadStationImages)
);

router.get(
  "/:id/images",
  asyncHandler(imageController.getStationImages)
);

module.exports = router;
