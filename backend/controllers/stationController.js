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
    // Validation is handled by middleware; use validated data
    const { lat, lng, radius } = req.validated.query;

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
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;

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
    // Validation is handled by middleware; use validated data
    const stationData = req.validated.body;

    const data = await stationService.createStation(stationData);
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
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;
    const updateData = req.validated.body;

    const data = await stationService.updateStation(stationId, updateData);

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
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;

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
    // Validation is handled by middleware; use validated data
    const { q: query } = req.validated.query;

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
    // Validation is handled by middleware; use validated data
    const { brand } = req.validated.params;

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
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;
    const { price, fuel_type, notes } = req.validated.body;

    // Get reporter IP
    const reporter_ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";

    const report = await priceService.submitPriceReport(
      stationId,
      { price, fuel_type, notes },
      reporter_ip
    );

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
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;
    const { limit } = req.validated.query;

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
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;
    const { fuel_type: fuelType, days } = req.validated.query;

    const stats = await priceService.getAveragePriceFromReports(stationId, fuelType, days);
    res.json(stats);
  } catch (error) {
    logger.error("Error in getAveragePriceFromReports:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Update station fuel price (admin/owner via /api/stations/:id/fuel-prices/:fuelType)
 */
async function updateStationFuelPrice(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: stationId, fuelType } = req.validated.params;
    const { price, updated_by } = req.validated.body;

    const updatedBy = updated_by || "admin";

    const result = await priceService.updateFuelPrice(stationId, fuelType, price, updatedBy);

    res.json({
      success: true,
      message: `${fuelType} price updated to ₱${price.toFixed(2)}`,
      fuel_type: fuelType,
      price: result ? result.price : price,
      price_updated_at: result ? result.price_updated_at : undefined,
      price_updated_by: result ? result.price_updated_by : updatedBy,
    });
  } catch (error) {
    logger.error("Error in updateStationFuelPrice:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Delete station fuel price (admin/owner via /api/stations/:id/fuel-prices/:fuelType)
 */
async function deleteStationFuelPrice(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: stationId, fuelType } = req.validated.params;

    const result = await priceService.deleteFuelPrice(stationId, fuelType, "admin");

    if (!result) {
      return res.status(404).json({
        error: "Fuel price not found",
        message: `No ${fuelType} price found for this station`,
      });
    }

    res.json({
      success: true,
      message: `${fuelType} price deleted successfully`,
      fuel_type: fuelType,
    });
  } catch (error) {
    logger.error("Error in deleteStationFuelPrice:", error);
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
  getAveragePriceFromReports,
  updateStationFuelPrice,
  deleteStationFuelPrice
};
