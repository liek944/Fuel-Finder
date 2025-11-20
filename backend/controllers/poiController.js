/**
 * POI Controller
 * Handles business logic for POI-related operations
 */

const poiService = require("../services/poiService");
const logger = require("../utils/logger");

/**
 * Get all POIs
 */
async function getAllPois(req, res) {
  try {
    const data = await poiService.getAllPois();
    res.json(data);
  } catch (error) {
    logger.error("Error in getAllPois:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get nearby POIs
 */
async function getNearbyPois(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radiusMeters || req.query.radius) || 3000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message: "Please provide valid latitude and longitude values",
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: "Coordinates out of range",
        message: "Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    const data = await poiService.getNearbyPois(lat, lng, radius);
    res.json(data);
  } catch (error) {
    logger.error("Error in getNearbyPois:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get POI by ID
 */
async function getPoiById(req, res) {
  try {
    const poiId = parseInt(req.params.id);

    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({
        error: "Invalid ID",
        message: "POI ID must be a valid number",
      });
    }

    const data = await poiService.getPoiById(poiId);

    if (!data) {
      return res.status(404).json({
        error: "POI not found",
        message: `POI with ID ${poiId} does not exist`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error("Error in getPoiById:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Create a new POI
 */
async function createPoi(req, res) {
  try {
    const { name, type, location } = req.body;

    // Validation
    if (!name || !type || !location || !location.lat || !location.lng) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Name, type, and location (lat, lng) are required",
      });
    }

    if (!["gas", "convenience", "repair", "car_wash", "motor_shop"].includes(type)) {
      return res.status(400).json({
        error: "Invalid type",
        message: "Type must be one of: gas, convenience, repair, car_wash, motor_shop",
      });
    }

    const data = await poiService.createPoi(req.body);
    res.status(201).json(data);
  } catch (error) {
    logger.error("Error in createPoi:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Update a POI
 */
async function updatePoi(req, res) {
  try {
    const poiId = parseInt(req.params.id);
    const { type } = req.body;

    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({
        error: "Invalid ID",
        message: "POI ID must be a valid number",
      });
    }

    // Validate type if provided
    if (type && !["gas", "convenience", "repair", "car_wash", "motor_shop"].includes(type)) {
      return res.status(400).json({
        error: "Invalid type",
        message: "Type must be one of: gas, convenience, repair, car_wash, motor_shop",
      });
    }

    const data = await poiService.updatePoi(poiId, req.body);

    if (!data) {
      return res.status(404).json({
        error: "POI not found",
        message: `POI with ID ${poiId} does not exist`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error("Error in updatePoi:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Delete a POI
 */
async function deletePoi(req, res) {
  try {
    const poiId = parseInt(req.params.id);

    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({
        error: "Invalid ID",
        message: "POI ID must be a valid number",
      });
    }

    const deleted = await poiService.deletePoi(poiId);

    if (!deleted) {
      return res.status(404).json({
        error: "POI not found",
        message: `POI with ID ${poiId} does not exist`,
      });
    }

    res.json({
      success: true,
      message: `POI ${deleted.name} deleted successfully`,
      deletedId: poiId,
    });
  } catch (error) {
    logger.error("Error in deletePoi:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

module.exports = {
  getAllPois,
  getNearbyPois,
  getPoiById,
  createPoi,
  updatePoi,
  deletePoi
};
