/**
 * Authentication Routes
 * Public endpoints for user registration and login
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/jwtAuth");
const { asyncHandler } = require("../middleware/errorHandler");
const rateLimit = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");
const authSchemas = require("../schemas/authSchemas");

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post(
  "/register",
  rateLimit,
  validate(authSchemas.registerSchema),
  asyncHandler(authController.register)
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  "/login",
  rateLimit,
  validate(authSchemas.loginSchema),
  asyncHandler(authController.login)
);

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get(
  "/me",
  verifyToken,
  asyncHandler(authController.getMe)
);

/**
 * POST /api/auth/logout
 * Client-side logout (just a placeholder for any server-side cleanup)
 */
router.post("/logout", (req, res) => {
  // JWT is stateless, so logout is handled client-side by removing the token
  // This endpoint exists for future token blacklisting if needed
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;
