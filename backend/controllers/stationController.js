/**
 * Station Controller
 * Handles business logic for station-related operations
 */

const stationService = require("../services/stationService");
const priceService = require("../services/priceService");
const logger = require("../utils/logger");

/**
 * Get all stations
 * If accessed via owner subdomain, returns only owner's stations
 */
async function getAllStations(req, res) {
  try {
    const data = await stationService.getAllStations(req.ownerData);
    res.json(data);
  } catch (error) {
    logger.error("Error in getAllStations:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get nearby stations
 * If accessed via owner subdomain, returns only owner's nearby stations
 */
async function getNearbyStations(req, res) {
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

    const data = await stationService.getNearbyStations(lat, lng, radius, req.ownerData);
    res.json(data);
  } catch (error) {
    logger.error("Error in getNearbyStations:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get station by ID
 */
async function getStationById(req, res) {
  try {
    const stationId = parseInt(req.params.id);

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid ID",
        message: "Station ID must be a valid number",
      });
    }

    const data = await stationService.getStationById(stationId);

    if (!data) {
      return res.status(404).json({
        error: "Station not found",
        message: `Station with ID ${stationId} does not exist`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error("Error in getStationById:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Create a new station
 */
async function createStation(req, res) {
  try {
    const { name, brand, location } = req.body;

    // Validation
    if (!name || !brand || !location || !location.lat || !location.lng) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Name, brand, and location (lat, lng) are required",
      });
    }

    const data = await stationService.createStation(req.body);
    res.status(201).json(data);
  } catch (error) {
    logger.error("Error in createStation:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Update a station
 */
async function updateStation(req, res) {
  try {
    const stationId = parseInt(req.params.id);

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid ID",
        message: "Station ID must be a valid number",
      });
    }

    const data = await stationService.updateStation(stationId, req.body);

    if (!data) {
      return res.status(404).json({
        error: "Station not found",
        message: `Station with ID ${stationId} does not exist`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error("Error in updateStation:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Delete a station
 */
async function deleteStation(req, res) {
  try {
    const stationId = parseInt(req.params.id);

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid ID",
        message: "Station ID must be a valid number",
      });
    }

    const deleted = await stationService.deleteStation(stationId);

    if (!deleted) {
      return res.status(404).json({
        error: "Station not found",
        message: `Station with ID ${stationId} does not exist`,
      });
    }

    res.json({
      success: true,
      message: `Station ${deleted.name} deleted successfully`,
      deletedId: stationId,
    });
  } catch (error) {
    logger.error("Error in deleteStation:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Search stations
 */
async function searchStations(req, res) {
  try {
    const query = req.query.q;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid search query",
        message: "Search query must be at least 2 characters long",
      });
    }

    const data = await stationService.searchStations(query);
    res.json(data);
  } catch (error) {
    logger.error("Error in searchStations:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get stations by brand
 */
async function getStationsByBrand(req, res) {
  try {
    const brand = req.params.brand;

    if (!brand) {
      return res.status(400).json({
        error: "Invalid brand",
        message: "Brand name is required",
      });
    }

    const data = await stationService.getStationsByBrand(brand);
    res.json(data);
  } catch (error) {
    logger.error("Error in getStationsByBrand:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Submit a fuel price report (public endpoint)
 */
async function submitPriceReport(req, res) {
  try {
    const stationId = parseInt(req.params.id);

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    const { price } = req.body;

    // Validate price
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({
        error: "Invalid price",
        message: "Price must be a positive number",
      });
    }

    // Validate price range (reasonable limits for Philippine fuel prices)
    const priceNum = parseFloat(price);
    if (priceNum < 30 || priceNum > 200) {
      return res.status(400).json({
        error: "Invalid price range",
        message: "Price must be between ₱30 and ₱200 per liter",
      });
    }

    // Get reporter IP
    const reporter_ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";

    const report = await priceService.submitPriceReport(stationId, { ...req.body, price: priceNum }, reporter_ip);

    if (!report) {
      return res.status(404).json({
        error: "Station not found",
        message: `No station found with ID ${stationId}`,
      });
    }

    res.status(201).json({
      success: true,
      message: "Price report submitted successfully. Thank you for contributing!",
      report,
    });
  } catch (error) {
    logger.error("Error in submitPriceReport:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get price reports for a station
 */
async function getPriceReportsForStation(req, res) {
  try {
    const stationId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit || "10");

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    const reports = await priceService.getPriceReportsForStation(stationId, limit);
    res.json({ reports });
  } catch (error) {
    logger.error("Error in getPriceReportsForStation:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get average price from recent reports
 */
async function getAveragePriceFromReports(req, res) {
  try {
    const stationId = parseInt(req.params.id);
    const fuelType = req.query.fuel_type || "Regular";
    const days = parseInt(req.query.days || "7");

    if (!stationId || isNaN(stationId)) {
      return res.status(400).json({
        error: "Invalid station ID",
        message: "Station ID must be a valid number",
      });
    }

    const stats = await priceService.getAveragePriceFromReports(stationId, fuelType, days);
    res.json(stats);
  } catch (error) {
    logger.error("Error in getAveragePriceFromReports:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

module.exports = {
  getAllStations,
  getNearbyStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
  searchStations,
  getStationsByBrand,
  submitPriceReport,
  getPriceReportsForStation,
  getAveragePriceFromReports
};
