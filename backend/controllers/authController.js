/**
 * Authentication Controller
 * Handles user registration, login, and profile retrieval
 */

const bcrypt = require("bcrypt");
const { pool } = require("../config/database");
const { generateToken } = require("../middleware/jwtAuth");
const { sendWelcomeEmail } = require("../services/emailService");

const BCRYPT_ROUNDS = 12;

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, password, displayName } = req.body;

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "An account with this email already exists",
      });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create the user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, role, created_at`,
      [email.toLowerCase(), passwordHash, displayName || null]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    console.log(`✅ New user registered: ${user.email}`);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.display_name).catch((err) => {
      console.error(`⚠️ Failed to send welcome email to ${user.email}:`, err.message);
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    next(error);
  }
}

/**
 * Login with email and password
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await pool.query(
      `SELECT id, email, password_hash, display_name, role, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    console.log(`✅ User logged in: ${user.email}`);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    next(error);
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 * Requires JWT authentication
 */
async function getMe(req, res, next) {
  try {
    // req.user is set by verifyToken middleware
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, email, display_name, role, email_verified, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error("❌ GetMe error:", error);
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
};
