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
    // Validation is handled by middleware; use validated data
    const { lat, lng, radius } = req.validated.query;

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
    // Validation is handled by middleware; use validated data
    const { id: poiId } = req.validated.params;

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
    // Validation is handled by middleware; use validated data
    const poiData = req.validated.body;

    const data = await poiService.createPoi(poiData);
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
    // Validation is handled by middleware; use validated data
    const { id: poiId } = req.validated.params;
    const updateData = req.validated.body;

    const data = await poiService.updatePoi(poiId, updateData);

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
    // Validation is handled by middleware; use validated data
    const { id: poiId } = req.validated.params;

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

