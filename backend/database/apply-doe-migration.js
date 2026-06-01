require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fuel_finder',
  password: process.env.DB_PASSWORD || 'password',
  port: Number(process.env.DB_PORT || 5432),
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
};

const pool = new Pool(dbConfig);

async function main() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '014_add_doe_prices_and_notifications.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration...');
    await pool.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    pool.end();
  }
}

main();
