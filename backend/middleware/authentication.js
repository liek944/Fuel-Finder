/**
 * Authentication Middleware
 * Handles API key authentication for admin endpoints
 */

const config = require("../config/environment");

/**
 * Verify API key for admin endpoints
 */
function verifyApiKey(req, res, next) {
  // Skip if no API key is configured
  if (!config.adminApiKey) {
    return next();
  }

  const headerKey = req.header("x-api-key");
  
  if (!headerKey || headerKey !== config.adminApiKey) {
    console.warn(`⚠️  Invalid API key attempt from IP: ${req.ip || "unknown"}`);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid API key required for admin operations",
    });
  }

  next();
}

/**
 * Optional API key verification
 * Allows request to proceed even without API key if not configured
 */
function optionalApiKey(req, res, next) {
  // If ADMIN_API_KEY is configured, require matching x-api-key header
  if (config.adminApiKey) {
    return verifyApiKey(req, res, next);
  }
  next();
}

module.exports = {
  verifyApiKey,
  optionalApiKey
};
