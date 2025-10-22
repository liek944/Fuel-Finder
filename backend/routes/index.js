/**
 * Route Aggregator
 * Central location for registering all API routes
 */

const express = require("express");
const router = express.Router();

// Import route modules
const stationRoutes = require("./stationRoutes");
const poiRoutes = require("./poiRoutes");
const healthRoutes = require("./healthRoutes");

// Register routes
router.use("/stations", stationRoutes);
router.use("/pois", poiRoutes);

// Health and stats routes
router.use("/", healthRoutes);

// Debug endpoint to check API key configuration
router.get("/admin/debug", (req, res) => {
  const config = require("../config/environment");
  const headerKey = req.header("x-api-key");
  
  res.json({
    adminApiKeyConfigured: !!config.adminApiKey,
    headerKeyProvided: !!headerKey,
    keyMatch: headerKey === config.adminApiKey,
    configuredKey: config.adminApiKey ? `"${config.adminApiKey}"` : "NOT SET",
  });
});

module.exports = router;
