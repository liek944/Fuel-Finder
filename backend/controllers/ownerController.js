/**
 * Owner Controller
 * Handles business logic for owner-specific operations
 */

const ownerService = require("../services/ownerService");
const priceService = require("../services/priceService");
const { checkStationOwnership, logOwnerActivity } = require("../middleware/ownerAuth");
const logger = require("../utils/logger");

/**
 * Get basic owner information (public, no API key required)
 */
async function getOwnerInfo(req, res) {
  try {
    const data = await ownerService.getOwnerInfo(req.ownerData);
    res.json(data);
  } catch (error) {
    logger.error("Error in getOwnerInfo:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get owner dashboard with statistics
 */
async function getDashboard(req, res) {
  try {
    const data = await ownerService.getDashboard(req.ownerData, req.ip, req.get('user-agent'));
    res.json(data);
  } catch (error) {
    logger.error("Error in getDashboard:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get all stations owned by this owner
 */
async function getOwnerStations(req, res) {
  try {
    const data = await ownerService.getOwnerStations(req.ownerData);
    res.json(data);
  } catch (error) {
    logger.error("Error in getOwnerStations:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get specific station details (must be owned by this owner)
 */
async function getOwnerStation(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;

    const data = await ownerService.getOwnerStation(req.ownerData.id, stationId);

    if (!data) {
      return res.status(404).json({
        error: "Station not found",
        message: "Station does not exist or you don't have access to it",
      });
    }

    res.json(data);
  } catch (error) {
    logger.error("Error in getOwnerStation:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Update station details (must be owned by this owner)
 */
async function updateOwnerStation(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;
    const updateData = req.validated.body;

    const data = await ownerService.updateOwnerStation(req.ownerData, stationId, updateData, req.ip, req.get('user-agent'));

    if (!data) {
      return res.status(404).json({
        error: "Station not found",
        message: "Station does not exist or update failed",
      });
    }

    res.json(data);
  } catch (error) {
    if (error.message.includes("Forbidden")) {
      return res.status(403).json({ error: "Forbidden", message: error.message });
    }
    if (error.message.includes("No updates")) {
      return res.status(400).json({ error: "Bad Request", message: error.message });
    }
    logger.error("Error in updateOwnerStation:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Update fuel price for a station (owner-verified)
 */
async function updateFuelPrice(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: stationId } = req.validated.params;
    const { fuel_type, price } = req.validated.body;

    const ownerId = req.ownerData.id;

    // Check ownership
    const hasAccess = await checkStationOwnership(ownerId, stationId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this station",
      });
    }

    await priceService.updateFuelPrice(stationId, fuel_type, price, 'owner');

    // Log the update
    await logOwnerActivity(
      ownerId,
      'update_fuel_price',
      stationId,
      req.ip,
      req.get('user-agent'),
      { fuel_type, price }
    );

    res.json({
      success: true,
      message: `${fuel_type} price updated to ₱${price.toFixed(2)}`,
      fuel_type,
      price,
    });
  } catch (error) {
    logger.error("Error in updateFuelPrice:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Delete fuel price for a station (owner-only)
 */
async function deleteFuelPrice(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: stationId, fuelType } = req.validated.params;
    const ownerId = req.ownerData.id;

    // Check ownership
    const hasAccess = await checkStationOwnership(ownerId, stationId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this station",
      });
    }

    const result = await priceService.deleteFuelPrice(stationId, fuelType, `owner:${ownerId}`);

    if (!result) {
      return res.status(404).json({
        error: "Fuel price not found",
        message: `No ${fuelType} price found for this station`,
      });
    }

    // Log the deletion
    await logOwnerActivity(
      ownerId,
      'delete_fuel_price',
      stationId,
      req.ip,
      req.get('user-agent'),
      { fuel_type: fuelType }
    );

    res.json({
      success: true,
      message: `${fuelType} price deleted successfully`,
      fuel_type: fuelType,
    });
  } catch (error) {
    logger.error("Error in deleteFuelPrice:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get pending price reports for owner's stations
 */
async function getPendingPriceReports(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = await ownerService.getPendingPriceReports(req.ownerData, limit);
    res.json(data);
  } catch (error) {
    logger.error("Error in getPendingPriceReports:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Verify (approve) a price report
 */
async function verifyPriceReport(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: reportId } = req.validated.params;
    const { notes } = req.validated.body;
    const ownerId = req.ownerData.id;

    // We need to check ownership first, but verifyPriceReport in service doesn't take ownerId to check
    // However, the service method I implemented does the verification directly.
    // I should probably check ownership here before calling service.
    // But wait, I can't easily check ownership without querying the report first.
    // The service method does query the report.
    // Let's let the service handle it or do a check here.
    // To keep controller thin, I'll just call service, but wait, the service I wrote doesn't check ownership against req.ownerData.id.
    // I should update the service to take ownerId and check it.
    // Or I can check it here if I query the report first.
    // Let's query it here for safety or update service.
    // Updating service is better. I'll update service in next step if needed, but for now I'll implement the check here using a direct query or helper.
    // Actually, I can just use the service and if it fails/throws, handle it.
    // But the service I wrote doesn't enforce ownerId match.
    // I will implement the logic in the service to check ownerId if I pass it.

    // Let's update the service call to include ownerId verification logic?
    // The service `verifyPriceReport` I wrote just takes (reportId, verifierName, verifierId, notes).
    // It doesn't check if the station belongs to verifierId (owner).
    // I should probably have added that check.
    // For now, I will rely on the fact that I can check it here or trust the service.
    // But wait, I can't check it here easily without a query.
    // I'll use a direct query here to check ownership before calling service.

    const { pool } = require("../config/database");
    const reportCheck = await pool.query(
      `SELECT s.owner_id FROM fuel_price_reports fpr JOIN stations s ON s.id = fpr.station_id WHERE fpr.id = $1`,
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (reportCheck.rows[0].owner_id !== ownerId) {
      return res.status(403).json({ error: "Forbidden", message: "You do not have access to this price report" });
    }

    const result = await priceService.verifyPriceReport(reportId, req.ownerData.name, ownerId, notes);

    // Log the verification
    await logOwnerActivity(
      ownerId,
      'verify_price',
      result.station_id,
      req.ip,
      req.get('user-agent'),
      {
        report_id: reportId,
        fuel_type: result.fuel_type,
        price: result.price,
        station_name: result.station_name
      }
    );

    res.json({
      success: true,
      message: `Price report verified successfully for ${result.station_name}`,
      ...result
    });
  } catch (error) {
    if (error.message === "Report not found") {
      return res.status(404).json({ error: "Report not found" });
    }
    logger.error("Error in verifyPriceReport:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Reject a price report
 */
async function rejectPriceReport(req, res) {
  try {
    // Validation is handled by middleware; use validated data
    const { id: reportId } = req.validated.params;
    const { reason } = req.validated.body;
    const ownerId = req.ownerData.id;

    // Check ownership
    const { pool } = require("../config/database");
    const reportCheck = await pool.query(
      `SELECT s.owner_id FROM fuel_price_reports fpr JOIN stations s ON s.id = fpr.station_id WHERE fpr.id = $1`,
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (reportCheck.rows[0].owner_id !== ownerId) {
      return res.status(403).json({ error: "Forbidden", message: "You do not have access to this price report" });
    }

    const result = await priceService.rejectPriceReport(reportId, req.ownerData.name);

    // Log the rejection
    await logOwnerActivity(
      ownerId,
      'reject_price',
      result.station_id,
      req.ip,
      req.get('user-agent'),
      {
        report_id: reportId,
        fuel_type: result.fuel_type,
        price: result.price,
        station_name: result.station_name,
        reason: reason || 'No reason provided'
      }
    );

    res.json({
      success: true,
      message: `Price report rejected for ${result.station_name}`,
      report_id: reportId,
    });
  } catch (error) {
    if (error.message === "Report not found") {
      return res.status(404).json({ error: "Report not found" });
    }
    logger.error("Error in rejectPriceReport:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get owner's activity history
 */
async function getActivityLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const data = await ownerService.getActivityLogs(req.ownerData.id, limit, offset);
    res.json(data);
  } catch (error) {
    logger.error("Error in getActivityLogs:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Get advanced analytics for owner's stations
 */
async function getAnalytics(req, res) {
  try {
    const data = await ownerService.getAnalytics(req.ownerData.id);
    res.json(data);
  } catch (error) {
    logger.error("Error in getAnalytics:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

async function getMarketInsights(req, res) {
  try {
    const days = parseInt(req.query.days, 10);
    const municipality = req.query.municipality || "";
    const data = await ownerService.getMarketInsights(req.ownerData.id, days, municipality);
    res.json(data);
  } catch (error) {
    logger.error("Error in getMarketInsights:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Request a magic link for passwordless login
 * Public endpoint - only requires owner subdomain detection
 */
async function requestMagicLink(req, res) {
  try {
    const { email } = req.validated.body;
    const magicLinkService = require("../services/magicLinkService");
    const { sendEmail } = require("../services/emailService");
    const { getMagicLinkEmailTemplate } = require("../services/emailTemplates");

    // Find owner by email (must match subdomain)
    const owner = await magicLinkService.findOwnerByEmail(email, req.ownerData?.domain);

    if (!owner) {
      // Don't reveal whether email exists - just show generic success
      // This prevents email enumeration attacks
      logger.warn(`Magic link requested for unknown email: ${email} (domain: ${req.ownerData?.domain})`);
      return res.json({
        success: true,
        message: "If an account exists with this email, you will receive a login link shortly."
      });
    }

    if (!owner.is_active) {
      return res.status(403).json({
        error: "Account deactivated",
        message: "Your account has been deactivated. Please contact support."
      });
    }

    // Build the base URL for the magic link
    const protocol = req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Generate magic link
    const { url, expiresAt } = await magicLinkService.generateMagicLink(owner.id, baseUrl);

    // Send email
    const { subject, html } = getMagicLinkEmailTemplate(
      owner.name,
      url,
      magicLinkService.TOKEN_EXPIRY_MINUTES
    );

    const emailResult = await sendEmail({ to: owner.email, subject, html });

    if (!emailResult.success) {
      logger.error(`Failed to send magic link email to ${owner.email}:`, emailResult.error);
      return res.status(500).json({
        error: "Email failed",
        message: "Failed to send login email. Please try again or use your API key."
      });
    }

    logger.info(`Magic link sent to ${owner.email} for owner ${owner.name}`);

    res.json({
      success: true,
      message: "If an account exists with this email, you will receive a login link shortly.",
      // Only include expiry for debugging in dev - remove in production
      ...(process.env.NODE_ENV === 'development' && { expiresAt })
    });

  } catch (error) {
    logger.error("Error in requestMagicLink:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

/**
 * Verify magic link token and return API key for session
 * Public endpoint - validates token from URL
 */
async function verifyMagicLinkToken(req, res) {
  try {
    const { token } = req.validated.params;
    const magicLinkService = require("../services/magicLinkService");

    const result = await magicLinkService.verifyMagicLink(token);

    if (!result.valid) {
      return res.status(401).json({
        error: "Invalid link",
        message: result.error
      });
    }

    logger.info(`Magic link verified for owner: ${result.owner.name}`);

    // Return owner data including API key for frontend to store
    res.json({
      success: true,
      message: "Login successful!",
      owner: {
        name: result.owner.name,
        domain: result.owner.domain,
        email: result.owner.email
      },
      api_key: result.owner.api_key
    });

  } catch (error) {
    logger.error("Error in verifyMagicLinkToken:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}

module.exports = {
  getOwnerInfo,
  getDashboard,
  getOwnerStations,
  getOwnerStation,
  updateOwnerStation,
  updateFuelPrice,
  deleteFuelPrice,
  getPendingPriceReports,
  verifyPriceReport,
  rejectPriceReport,
  getActivityLogs,
  getAnalytics,
  getMarketInsights,
  requestMagicLink,
  verifyMagicLinkToken
};

