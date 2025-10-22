/**
 * Server Entry Point
 * Starts the Express server and initializes database connections
 */

const http = require("http");
const app = require("./app");
const config = require("./config/environment");
const { testConnection } = require("./config/database");
const { ensurePoisTable } = require("./repositories/poiRepository");
const { verifySupabaseConnection } = require("./services/supabaseStorage");
const userActivityTracker = require("./services/userActivityTracker");

console.log(
  "🚀 Starting Fuel Finder backend server with PostgreSQL + PostGIS...",
);
console.log(
  `🔑 ADMIN_API_KEY configured: ${config.adminApiKey ? `"${config.adminApiKey}"` : "NOT SET"}`,
);

// Test database connection on startup
(async () => {
  try {
    await testConnection();
    await ensurePoisTable();
    console.log("✅ Database initialization complete");

    // Test Supabase connection if configured
    if (config.supabase.url && config.supabase.anonKey) {
      const supabaseResult = await verifySupabaseConnection();
      console.log(`🪣 Supabase storage: ${
        supabaseResult.connected ? "✅ Connected" : "❌ Not available"
      }`);
      if (!supabaseResult.connected && supabaseResult.error) {
        console.log(`   Error: ${supabaseResult.error}`);
      }
    } else {
      console.log("🪣 Supabase storage: Not configured");
    }
  } catch (err) {
    console.error("❌ Startup checks failed:", err.message);
    process.exit(1);
  }
})();

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(config.port, () => {
  console.log(`✅ Server running on port ${config.port}`);
  console.log(`📍 API base URL: http://localhost:${config.port}/api`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  
  if (config.adminApiKey) {
    console.log("🔐 Admin endpoints protected with API key");
  } else {
    console.log("⚠️  WARNING: No API key configured - admin endpoints are unprotected!");
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

module.exports = server;
