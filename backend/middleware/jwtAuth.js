/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user data to request
 */

const jwt = require("jsonwebtoken");
const config = require("../config/environment");

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "fuel-finder-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token middleware
 * Extracts token from Authorization header and verifies it
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "No authorization header provided",
    });
  }

  // Expect format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid authorization header format. Use: Bearer <token>",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token has expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    return res.status(401).json({
      error: "Unauthorized",
      message: "Token verification failed",
    });
  }
}

/**
 * Optional token verification
 * If token is present, verify it; otherwise continue without user
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    req.user = null;
    return next();
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }

  next();
}

/**
 * Role-based access control middleware
 * Requires verifyToken to run first
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This action requires one of these roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  optionalAuth,
  requireRole,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
