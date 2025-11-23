require('dotenv').config();
const { Pool } = require('pg');

const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "fuel_finder",
  password: process.env.DB_PASSWORD || "password",
  port: Number(process.env.DB_PORT || 5432),
  max: Number(process.env.DB_MAX_CONNECTIONS || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 2000),
  ssl: (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") ? { rejectUnauthorized: false } : undefined,
};

console.log("--- Database Configuration Check ---");
console.log("DB_HOST:", dbConfig.host);
console.log("DB_USER:", dbConfig.user);
console.log("DB_PORT:", dbConfig.port);
console.log("DB_SSL:", !!dbConfig.ssl);
console.log("DB_MAX_CONNECTIONS:", dbConfig.max);
console.log("DB_IDLE_TIMEOUT_MS:", dbConfig.idleTimeoutMillis);
console.log("DB_CONNECTION_TIMEOUT_MS:", dbConfig.connectionTimeoutMillis);
console.log("------------------------------------");

const pool = new Pool(dbConfig);

(async () => {
  try {
    console.log("Attempting to connect...");
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    console.log(`✅ Connected successfully in ${duration}ms`);
    client.release();
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await pool.end();
  }
})();
