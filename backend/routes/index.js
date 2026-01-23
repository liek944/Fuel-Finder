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
const ownerRoutes = require("./ownerRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const routeRoutes = require("./routeRoutes");
const reviewRoutes = require("./reviewRoutes");
const authRoutes = require("./authRoutes");
const savedStationsRoutes = require("./savedStationsRoutes");

// Register routes
router.use("/stations", stationRoutes);
router.use("/pois", poiRoutes);
router.use("/owner", ownerRoutes);
router.use("/admin", adminRoutes);
router.use("/user", userRoutes);
router.use("/route", routeRoutes);
router.use("/reviews", reviewRoutes);
router.use("/auth", authRoutes);
router.use("/saved-stations", savedStationsRoutes);

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
