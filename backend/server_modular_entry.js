/**
 * Fuel Finder Backend Server - Modular Entry Point
 * Uses the modular app.js architecture
 */

const app = require("./app");
const config = require("./config/environment");
const { testConnection } = require("./config/database");
const { verifySupabaseConnection } = require("./services/supabaseStorage");

const port = config.port;

console.log("🚀 Starting Fuel Finder backend server (Modular Architecture)...");
console.log(`🔑 ADMIN_API_KEY configured: ${config.adminApiKey ? `"${config.adminApiKey}"` : "NOT SET"}`);

// Test database connection on startup
(async () => {
  try {
    await testConnection();
    console.log("✅ Database connection successful");

    // Test Supabase connection if configured
    if (config.supabase.url && config.supabase.anonKey) {
      const supabaseResult = await verifySupabaseConnection();
      console.log(`🪣 Supabase storage: ${supabaseResult.connected ? "✅ Connected" : "❌ Not available"}`);
      if (!supabaseResult.connected && supabaseResult.error) {
        console.log(`   Error: ${supabaseResult.error}`);
      }
    } else {
      console.log("🪣 Supabase storage: Not configured (using local storage)");
    }
  } catch (err) {
    console.error("❌ Startup checks failed:", err.message);
  }
})();

// Start server (skip on Vercel - serverless doesn't need app.listen)
if (!process.env.VERCEL) {
  app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 API base URL: http://localhost:${port}/api`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  console.log(`🏗️  Architecture: Modular (app.js + routes + controllers + repositories)`);
  
  if (config.adminApiKey) {
    console.log("🔐 Admin endpoints protected with API key");
  } else {
    console.log("⚠️  WARNING: No API key configured - admin endpoints may be unprotected!");
  }
  
  console.log("\n📋 Available route modules:");
  console.log("   • /api/stations - Station management & price reporting");
  console.log("   • /api/pois - Points of Interest");
  console.log("   • /api/owner - Owner portal (multi-tenant)");
  console.log("   • /api/health - Health check & stats\n");
  });
}

module.exports = app;
