#!/usr/bin/env node

// Test with correct Supabase connection string format
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing Supabase Connection - Correct Format\n');

// Extract project ref from the host
// Format: aws-1-ap-southeast-1.pooler.supabase.com
// Project ref is in the DB_USER: postgres.ycmoophkkikrltgroane
const projectRef = process.env.DB_USER.split('.')[1]; // ycmoophkkikrltgroane

console.log(`Project Reference: ${projectRef}\n`);

// Test 1: Session Mode Pooler (Port 5432)
async function testSessionMode() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Test 1: Session Mode Pooler (Recommended)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const config = {
    user: 'postgres.ycmoophkkikrltgroane',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: 5432, // Session mode
    connectionTimeoutMillis: 20000,
    ssl: { rejectUnauthorized: false },
  };
  
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}\n`);
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)`);
    
    const result = await client.query('SELECT NOW(), current_database()');
    console.log(`✅ Query successful: ${result.rows[0].now}`);
    console.log(`✅ Database: ${result.rows[0].current_database}\n`);
    
    client.release();
    await pool.end();
    return { success: true, config };
  } catch (err) {
    console.log(`❌ Failed: ${err.message}\n`);
    await pool.end();
    return { success: false, error: err.message };
  }
}

// Test 2: Direct Connection (bypassing pooler)
async function testDirectConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Test 2: Direct Connection (No Pooler)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const config = {
    user: 'postgres.ycmoophkkikrltgroane',
    host: `db.${projectRef}.supabase.co`,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: 5432,
    connectionTimeoutMillis: 20000,
    ssl: { rejectUnauthorized: false },
  };
  
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}\n`);
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)`);
    
    const result = await client.query('SELECT NOW(), current_database()');
    console.log(`✅ Query successful: ${result.rows[0].now}`);
    console.log(`✅ Database: ${result.rows[0].current_database}\n`);
    
    client.release();
    await pool.end();
    return { success: true, config };
  } catch (err) {
    console.log(`❌ Failed: ${err.message}\n`);
    await pool.end();
    return { success: false, error: err.message };
  }
}

// Test 3: With fuel_finder database
async function testWithFuelFinderDB() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Test 3: Session Mode with fuel_finder database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const config = {
    user: 'postgres.ycmoophkkikrltgroane',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    database: 'fuel_finder',
    password: process.env.DB_PASSWORD,
    port: 5432,
    connectionTimeoutMillis: 20000,
    ssl: { rejectUnauthorized: false },
  };
  
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}\n`);
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)`);
    
    const result = await client.query('SELECT NOW(), current_database()');
    console.log(`✅ Query successful: ${result.rows[0].now}`);
    console.log(`✅ Database: ${result.rows[0].current_database}`);
    
    // Check for tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✅ Tables found: ${tables.rows.length}`);
    if (tables.rows.length > 0) {
      tables.rows.forEach(t => console.log(`   - ${t.table_name}`));
    }
    console.log('');
    
    client.release();
    await pool.end();
    return { success: true, config };
  } catch (err) {
    console.log(`❌ Failed: ${err.message}\n`);
    await pool.end();
    return { success: false, error: err.message };
  }
}

// Run all tests
(async () => {
  const results = {
    sessionMode: await testSessionMode(),
    directConnection: await testDirectConnection(),
    fuelFinderDB: await testWithFuelFinderDB(),
  };
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Results Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Session Mode (postgres):      ${results.sessionMode.success ? '✅' : '❌'}`);
  console.log(`Direct Connection:            ${results.directConnection.success ? '✅' : '❌'}`);
  console.log(`Session Mode (fuel_finder):   ${results.fuelFinderDB.success ? '✅' : '❌'}`);
  
  const workingConfig = [results.fuelFinderDB, results.sessionMode, results.directConnection]
    .find(r => r.success);
  
  if (workingConfig) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SOLUTION: Update your .env file with:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`DB_HOST=${workingConfig.config.host}`);
    console.log(`DB_PORT=${workingConfig.config.port}`);
    console.log(`DB_NAME=${workingConfig.config.database}`);
    console.log(`DB_USER=${workingConfig.config.user}`);
    console.log('DB_PASSWORD=(keep current)');
    console.log('DB_SSL=true');
    console.log('DB_CONNECTION_TIMEOUT_MS=20000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    console.log('\n❌ All connection methods failed!');
    console.log('💡 Check:');
    console.log('   1. Supabase project is active');
    console.log('   2. Database password is correct');
    console.log('   3. fuel_finder database exists');
    console.log('   4. Your IP is not blocked\n');
  }
})();
