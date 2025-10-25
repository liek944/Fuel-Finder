/**
 * Owner Authentication Middleware
 * Validates API keys for owner-specific operations
 * 
 * This middleware ensures that only authenticated owners can perform
 * sensitive actions like verifying prices or updating stations.
 */

const { pool } = require("../config/database");

/**
 * Verify owner API key
 * Checks if the provided API key matches the owner's key in the database
 * 
 * Prerequisites:
 * - detectOwner middleware must run before this
 * - req.ownerData must be populated
 */
async function verifyOwnerApiKey(req, res, next) {
  try {
    // Check if owner detection ran first
    if (!req.ownerData) {
      console.warn("⚠️  verifyOwnerApiKey called without owner detection");
      return res.status(403).json({
        error: "Forbidden",
        message: "Owner authentication required. Access this endpoint through your subdomain.",
      });
    }

    // Get API key from header and trim whitespace
    const providedApiKey = req.header("x-api-key")?.trim();

    if (!providedApiKey) {
      console.warn(`⚠️  Missing API key for owner: ${req.ownerData.name}`);
      
      // Log failed attempt
      await logOwnerActivity(
        req.ownerData.id,
        'auth_attempt',
        null,
        req.ip,
        req.get('user-agent'),
        { reason: 'missing_api_key' },
        false,
        'API key not provided'
      );

      return res.status(401).json({
        error: "Unauthorized",
        message: "API key required. Please provide your API key in the 'x-api-key' header.",
      });
    }

    // Fetch owner's API key from database
    const result = await pool.query(
      "SELECT api_key, is_active FROM owners WHERE id = $1",
      [req.ownerData.id]
    );

    if (result.rows.length === 0) {
      console.error(`❌ Owner not found in database: ${req.ownerData.id}`);
      return res.status(403).json({
        error: "Forbidden",
        message: "Owner account not found",
      });
    }

    const owner = result.rows[0];

    // Check if owner is still active
    if (!owner.is_active) {
      console.warn(`⚠️  Inactive owner attempted access: ${req.ownerData.name}`);
      
      await logOwnerActivity(
        req.ownerData.id,
        'auth_attempt',
        null,
        req.ip,
        req.get('user-agent'),
        { reason: 'inactive_account' },
        false,
        'Owner account is inactive'
      );

      return res.status(403).json({
        error: "Forbidden",
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Verify API key
    if (providedApiKey !== owner.api_key) {
      console.warn(`⚠️  Invalid API key attempt for owner: ${req.ownerData.name} from IP: ${req.ip}`);
      console.warn(`   Expected length: ${owner.api_key.length}, Received length: ${providedApiKey.length}`);
      
      // Check if it's a partial match (common issue: missing trailing '=' in base64)
      const isPartialMatch = owner.api_key.startsWith(providedApiKey) || 
                             providedApiKey.startsWith(owner.api_key);
      
      // Log failed attempt for security monitoring
      await logOwnerActivity(
        req.ownerData.id,
        'auth_attempt',
        null,
        req.ip,
        req.get('user-agent'),
        { 
          reason: 'invalid_api_key',
          provided_key_prefix: providedApiKey.substring(0, 8) + '...',
          expected_length: owner.api_key.length,
          provided_length: providedApiKey.length,
          is_partial_match: isPartialMatch
        },
        false,
        'Invalid API key provided'
      );

      // Provide helpful error message
      let errorMessage = "Invalid API key. Please check your credentials.";
      if (isPartialMatch) {
        errorMessage = "Invalid API key. The key appears incomplete - make sure to copy the entire key including any trailing characters like '='.";
      }

      return res.status(403).json({
        error: "Forbidden",
        message: errorMessage,
        hint: isPartialMatch ? "Double-check that you copied the complete API key, including the ending '=' character if present." : undefined
      });
    }

    // Success! API key is valid
    console.log(`✅ Owner authenticated: ${req.ownerData.name} (${req.ownerData.domain})`);
    
    // Log successful authentication
    await logOwnerActivity(
      req.ownerData.id,
      'auth_success',
      null,
      req.ip,
      req.get('user-agent'),
      { endpoint: req.path, method: req.method },
      true
    );

    // Proceed to next middleware
    next();
  } catch (error) {
    console.error("❌ Error in owner API key verification:", error);
    next(error);
  }
}

/**
 * Helper function to log owner activity
 * Wrapper around the database logging function
 */
async function logOwnerActivity(
  ownerId,
  actionType,
  stationId = null,
  requestIp = null,
  userAgent = null,
  details = null,
  success = true,
  errorMessage = null
) {
  try {
    await pool.query(
      `INSERT INTO owner_activity_logs 
       (owner_id, action_type, station_id, request_ip, user_agent, details, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        ownerId,
        actionType,
        stationId,
        requestIp,
        userAgent,
        details ? JSON.stringify(details) : null,
        success,
        errorMessage
      ]
    );
  } catch (error) {
    // Don't fail the request if logging fails, just log the error
    console.error("❌ Failed to log owner activity:", error);
  }
}

/**
 * Middleware to ensure owner only accesses their own stations
 * Use this to filter station data by owner_id
 */
function enforceOwnerStationAccess(req, res, next) {
  if (!req.ownerData) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Owner authentication required",
    });
  }

  // Attach owner filter to request for use in controllers
  req.ownerFilter = {
    owner_id: req.ownerData.id
  };

  next();
}

/**
 * Check if owner has access to a specific station
 * Returns true if owner owns the station, false otherwise
 */
async function checkStationOwnership(ownerId, stationId) {
  try {
    const result = await pool.query(
      "SELECT id FROM stations WHERE id = $1 AND owner_id = $2",
      [stationId, ownerId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error("❌ Error checking station ownership:", error);
    return false;
  }
}

module.exports = {
  verifyOwnerApiKey,
  enforceOwnerStationAccess,
  checkStationOwnership,
  logOwnerActivity
};
