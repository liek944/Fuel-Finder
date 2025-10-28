/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config/environment");

// Middleware imports
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { optionalOwnerDetection } = require("./middleware/ownerDetection");

// Route imports
const apiRoutes = require("./routes");

// Create Express application
const app = express();

// Trust proxy - REQUIRED for AWS EC2 behind reverse proxy/load balancer
app.set("trust proxy", true);

// Middleware setup - CORS with explicit allowed origins
const allowedOrigins = config.allowedOrigins 
  ? config.allowedOrigins.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

console.log('🌐 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(null, true); // Still allow for now, but log the warning
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-owner-domain", "X-Session-Id"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // 24 hours
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files for uploads (if needed for local development)
app.use("/uploads/stations", express.static(path.join(__dirname, "uploads/stations")));
app.use("/uploads/pois", express.static(path.join(__dirname, "uploads/pois")));
app.use("/uploads/images", express.static(path.join(__dirname, "uploads/images")));

// Log requests in development
if (config.nodeEnv === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Apply optional owner detection to all requests
// This attaches owner context if request comes from owner subdomain
app.use(optionalOwnerDetection);

// API routes
app.use("/api", apiRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
