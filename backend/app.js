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

// Route imports
const apiRoutes = require("./routes");

// Create Express application
const app = express();

// Trust proxy - REQUIRED for AWS EC2 behind reverse proxy/load balancer
app.set("trust proxy", true);

// Middleware setup
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
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

// API routes
app.use("/api", apiRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
