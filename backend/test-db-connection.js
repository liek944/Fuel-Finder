#!/usr/bin/env node

// Database Connection Diagnostic Tool
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Database Connection Diagnostic Tool\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Display current configuration
console.log('📋 Current Configuration:');
console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'NOT SET'}`);
console.log(`   DB_SSL: ${process.env.DB_SSL || 'NOT SET'}`);
console.log(`   DB_CONNECTION_TIMEOUT_MS: ${process.env.DB_CONNECTION_TIMEOUT_MS || 'NOT SET (default: 2000)'}`);
console.log(`   DB_MAX_CONNECTIONS: ${process.env.DB_MAX_CONNECTIONS || 'NOT SET (default: 20)'}`);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: DNS Resolution
console.log('🧪 Test 1: DNS Resolution');
const dns = require('dns');
const host = process.env.DB_HOST;

if (!host) {
  console.log('   ❌ DB_HOST is not set in .env file\n');
  process.exit(1);
}

dns.resolve4(host, (err, addresses) => {
  if (err) {
    console.log(`   ❌ Failed to resolve ${host}`);
    console.log(`   Error: ${err.message}\n`);
  } else {
    console.log(`   ✅ DNS resolved: ${host} -> ${addresses.join(', ')}\n`);
  }
  
  // Test 2: TCP Connection
  console.log('🧪 Test 2: TCP Connection Test');
  const net = require('net');
  const port = parseInt(process.env.DB_PORT || '5432');
  const socket = new net.Socket();
  
  const timeout = setTimeout(() => {
    socket.destroy();
    console.log(`   ❌ TCP connection timeout after 10 seconds`);
    console.log(`   Cannot reach ${host}:${port}\n`);
    testDatabaseConnection();
  }, 10000);
  
  socket.connect(port, host, () => {
    clearTimeout(timeout);
    console.log(`   ✅ TCP connection successful to ${host}:${port}\n`);
    socket.destroy();
    testDatabaseConnection();
  });
  
  socket.on('error', (err) => {
    clearTimeout(timeout);
    console.log(`   ❌ TCP connection failed: ${err.message}\n`);
    testDatabaseConnection();
  });
});

// Test 3: PostgreSQL Connection
async function testDatabaseConnection() {
  console.log('🧪 Test 3: PostgreSQL Connection');
  
  const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
  
  const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000'),
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  };
  
  console.log(`   Attempting connection with ${config.connectionTimeoutMillis}ms timeout...`);
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`   ✅ PostgreSQL connection successful! (${duration}ms)\n`);
    
    // Test 4: Database Version
    console.log('🧪 Test 4: PostgreSQL Version');
    try {
      const versionResult = await client.query('SELECT version()');
      console.log(`   ✅ ${versionResult.rows[0].version.split(',')[0]}\n`);
    } catch (err) {
      console.log(`   ❌ Failed to get version: ${err.message}\n`);
    }
    
    // Test 5: PostGIS Extension
    console.log('🧪 Test 5: PostGIS Extension');
    try {
      const postgisResult = await client.query('SELECT PostGIS_Version()');
      console.log(`   ✅ PostGIS version: ${postgisResult.rows[0].postgis_version}\n`);
    } catch (err) {
      console.log(`   ❌ PostGIS not available: ${err.message}`);
      console.log(`   💡 You may need to run: CREATE EXTENSION IF NOT EXISTS postgis;\n`);
    }
    
    // Test 6: Tables Check
    console.log('🧪 Test 6: Required Tables');
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('stations', 'pois', 'images', 'fuel_prices', 'fuel_price_reports')
        ORDER BY table_name
      `);
      
      const requiredTables = ['stations', 'pois', 'images', 'fuel_prices', 'fuel_price_reports'];
      const existingTables = tablesResult.rows.map(r => r.table_name);
      
      requiredTables.forEach(table => {
        if (existingTables.includes(table)) {
          console.log(`   ✅ Table '${table}' exists`);
        } else {
          console.log(`   ⚠️  Table '${table}' missing`);
        }
      });
      console.log('');
      
      if (existingTables.length === 0) {
        console.log('   💡 No tables found. Run: npm run db:init\n');
      }
    } catch (err) {
      console.log(`   ❌ Failed to check tables: ${err.message}\n`);
    }
    
    // Test 7: Sample Query
    console.log('🧪 Test 7: Sample Query (Count Stations)');
    try {
      const countResult = await client.query('SELECT COUNT(*) as count FROM stations');
      console.log(`   ✅ Stations in database: ${countResult.rows[0].count}\n`);
    } catch (err) {
      console.log(`   ❌ Failed to query stations: ${err.message}\n`);
    }
    
    client.release();
    await pool.end();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
    
  } catch (err) {
    console.log(`   ❌ PostgreSQL connection failed!\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Connection Error Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Error Code: ${err.code || 'N/A'}`);
    console.log(`Error Message: ${err.message}`);
    
    if (err.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Database server is not running or not accessible');
      console.log('   - Check if the host and port are correct');
      console.log('   - Check firewall rules');
    } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Connection timeout - server is too slow or unreachable');
      console.log('   - Try increasing DB_CONNECTION_TIMEOUT_MS (currently: ' + config.connectionTimeoutMillis + 'ms)');
      console.log('   - Check network connectivity');
      console.log('   - Verify Supabase pooler is accessible from your location');
    } else if (err.code === 'ENOTFOUND') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - DNS resolution failed');
      console.log('   - Check DB_HOST value in .env file');
    } else if (err.code === '28P01') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Authentication failed');
      console.log('   - Check DB_USER and DB_PASSWORD in .env file');
    } else if (err.code === '3D000') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Database does not exist');
      console.log('   - Check DB_NAME in .env file');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await pool.end();
    process.exit(1);
  }
}
