#!/usr/bin/env node

// Test direct connection only
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing Direct Supabase Connection (bypassing pooler)\n');

const directHost = 'aws-0-ap-southeast-1.pooler.supabase.com'.replace('.pooler.', '.');
const actualHost = process.env.DB_HOST.replace('.pooler.', '.');

console.log(`Original host: ${process.env.DB_HOST}`);
console.log(`Direct host: ${actualHost}`);
console.log('Port: 5432 (direct connection)\n');

const config = {
  user: process.env.DB_USER,
  host: actualHost,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  connectionTimeoutMillis: 20000,
  query_timeout: 10000,
  statement_timeout: 10000,
  ssl: { rejectUnauthorized: false },
};

const pool = new Pool(config);

(async () => {
  try {
    console.log('Connecting...');
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)\n`);
    
    console.log('Testing query...');
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log(`✅ Query successful!`);
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}\n`);
    
    console.log('Testing PostGIS...');
    try {
      const postgis = await client.query('SELECT PostGIS_Version()');
      console.log(`✅ PostGIS: ${postgis.rows[0].postgis_version}\n`);
    } catch (e) {
      console.log(`⚠️  PostGIS not available: ${e.message}\n`);
    }
    
    console.log('Testing stations table...');
    try {
      const stations = await client.query('SELECT COUNT(*) as count FROM stations');
      console.log(`✅ Stations count: ${stations.rows[0].count}\n`);
    } catch (e) {
      console.log(`⚠️  Stations table: ${e.message}\n`);
    }
    
    client.release();
    await pool.end();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS! Use this configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`DB_HOST=${actualHost}`);
    console.log('DB_PORT=5432');
    console.log('DB_SSL=true');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    console.log(`Error code: ${err.code}\n`);
    await pool.end();
    process.exit(1);
  }
})();
