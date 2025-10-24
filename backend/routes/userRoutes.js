/**
 * User Activity Tracking Routes
 * Handles user heartbeat and activity tracking (public endpoints)
 */

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorHandler");
const rateLimit = require("../middleware/rateLimiter");
const userActivityTracker = require("../services/userActivityTracker");

/**
 * Heartbeat endpoint for tracking active users
 * POST /api/user/heartbeat
 * 
 * Body: {
 *   sessionId: string,
 *   location: { lat, lng, city, region },
 *   page: string,
 *   feature: string
 * }
 */
router.post(
  "/heartbeat",
  rateLimit,
  asyncHandler(async (req, res) => {
    const { sessionId, location, page, feature } = req.body;

    // Extract user agent
    const userAgent = req.headers["user-agent"];

    // Record activity
    const result = userActivityTracker.recordActivity({
      sessionId,
      location,
      userAgent,
      page,
      feature,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Activity recorded",
      activeUsers: userActivityTracker.getActiveUserCount(),
    });
  })
);

/**
 * Get active user count (lightweight, public)
 * GET /api/user/count
 */
router.get(
  "/count",
  asyncHandler(async (req, res) => {
    const count = userActivityTracker.getActiveUserCount();

    res.json({
      success: true,
      activeUsers: count,
    });
  })
);

module.exports = router;
