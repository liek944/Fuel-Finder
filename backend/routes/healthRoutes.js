/**
 * Health and Stats Routes
 * API endpoints for system health checks and statistics
 */

const express = require("express");
const router = express.Router();
const { testConnection } = require("../config/database");
const stationRepository = require("../repositories/stationRepository");
const { verifySupabaseConnection } = require("../services/supabaseStorage");
const { asyncHandler } = require("../middleware/errorHandler");

// Health check endpoint with database and Supabase connectivity test
router.get("/health", asyncHandler(async (req, res) => {
  await testConnection();
  const stats = await stationRepository.getDatabaseStats();
  
  let supabaseStatus = "Not configured";
  let supabaseError = null;
  
  try {
    const supabaseResult = await verifySupabaseConnection();
    supabaseStatus = supabaseResult.connected ? "Connected" : "Failed";
    if (!supabaseResult.connected) {
      supabaseError = supabaseResult.error;
    }
  } catch (err) {
    supabaseStatus = "Error";
    supabaseError = err.message;
  }

  res.json({
    status: "healthy",
    database: "connected",
    supabase: supabaseStatus,
    supabaseError,
    stats: {
      stations: parseInt(stats.total_stations),
      brands: parseInt(stats.unique_brands),
      pois: parseInt(stats.total_pois),
      images: parseInt(stats.total_images),
      priceReports: parseInt(stats.total_price_reports),
      totalImageSize: stats.total_image_size_bytes
        ? `${(parseInt(stats.total_image_size_bytes) / (1024 * 1024)).toFixed(2)} MB`
        : "0 MB",
      databaseSize: stats.database_size,
    },
    timestamp: new Date().toISOString(),
  });
}));

// Get database statistics (for admin/monitoring)
router.get("/stats", asyncHandler(async (req, res) => {
  console.log("📊 Fetching database statistics...");
  
  const stats = await stationRepository.getDatabaseStats();
  
  console.log("✅ Database stats retrieved");
  res.json({
    stations: parseInt(stats.total_stations),
    brands: parseInt(stats.unique_brands),
    pois: parseInt(stats.total_pois),
    images: parseInt(stats.total_images),
    priceReports: parseInt(stats.total_price_reports),
    totalImageSize: stats.total_image_size_bytes
      ? `${(parseInt(stats.total_image_size_bytes) / (1024 * 1024)).toFixed(2)} MB`
      : "0 MB",
    databaseSize: stats.database_size,
  });
}));

module.exports = router;
