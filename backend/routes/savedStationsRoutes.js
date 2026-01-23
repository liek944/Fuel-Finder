/**
 * Saved Stations Routes
 * API endpoints for managing user's saved/favorite stations
 * All routes require JWT authentication
 */

const express = require("express");
const router = express.Router();
const savedStationsController = require("../controllers/savedStationsController");
const { verifyToken } = require("../middleware/jwtAuth");
const { asyncHandler } = require("../middleware/errorHandler");

// All routes require authentication
router.use(verifyToken);

// GET /api/saved-stations - List all saved stations
router.get("/", asyncHandler(savedStationsController.listSavedStations));

// GET /api/saved-stations/ids - Get just the IDs (lightweight)
router.get("/ids", asyncHandler(savedStationsController.getSavedIds));

// GET /api/saved-stations/:stationId - Check if a station is saved
router.get("/:stationId", asyncHandler(savedStationsController.checkSaved));

// POST /api/saved-stations/:stationId - Save a station
router.post("/:stationId", asyncHandler(savedStationsController.saveStation));

// DELETE /api/saved-stations/:stationId - Unsave a station
router.delete("/:stationId", asyncHandler(savedStationsController.unsaveStation));

module.exports = router;
