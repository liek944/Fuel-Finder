/**
 * Database Connection Configuration
 * Manages PostgreSQL connection pool and database initialization
 */

const { Pool } = require("pg");
const config = require("./environment");

// Create database configuration object
const dbConfig = {
  user: config.database.user,
  host: config.database.host,
  database: config.database.name,
  password: config.database.password,
  port: config.database.port,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");

    // Test PostGIS extension and try to enable if missing
    try {
      const result = await client.query("SELECT PostGIS_Version()");
      console.log("✅ PostGIS version:", result.rows[0].postgis_version);
    } catch (e) {
      console.warn(
        "⚠️  PostGIS not available. Attempting to enable extension (CREATE EXTENSION postgis)...",
      );
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
        const verify = await client.query("SELECT PostGIS_Version()");
        console.log(
          "✅ PostGIS enabled. Version:",
          verify.rows[0].postgis_version,
        );
      } catch (enableErr) {
        console.error(
          "❌ Unable to enable PostGIS automatically. Please enable PostGIS on the database:",
          enableErr.message,
        );
        console.error(
          "   • Connect to your database and run: CREATE EXTENSION IF NOT EXISTS postgis;",
        );
        throw enableErr;
      }
    }

    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err;
  }
}

module.exports = {
  pool,
  testConnection
};
