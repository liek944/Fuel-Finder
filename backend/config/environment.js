/**
 * Environment Configuration
 * Centralizes all environment variables and provides defaults
 */

const path = require("path");

// Load environment variables from .env
// Specify path explicitly since this file is in a subdirectory
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch (_) { }

const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    name: process.env.DB_NAME || "fuel_finder",
    password: process.env.DB_PASSWORD || "password",
    port: Number(process.env.DB_PORT || 5432),
    maxConnections: Number(process.env.DB_MAX_CONNECTIONS || 20),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 2000),
    ssl: process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
  },

  // API Configuration
  adminApiKey: process.env.ADMIN_API_KEY || "",

  // CORS Configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS || "capacitor://localhost,http://localhost:3000,http://localhost:3001",

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "10", 10)
  },

  // OSRM Configuration
  osrm: {
    url: process.env.OSRM_URL || "http://54.242.12.213:5000",
    timeoutMs: parseInt(process.env.OSRM_TIMEOUT_MS || "15000", 10)
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_PROJECT_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  },

  // Stripe Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxImageWidth: 2048,
    maxImageHeight: 2048,
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    baseDir: "uploads"
  },

  // Request Deduplication
  deduplication: {
    windowMs: 5000
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'INFO'
};

module.exports = config;
