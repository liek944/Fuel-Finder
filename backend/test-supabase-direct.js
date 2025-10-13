#!/usr/bin/env node

// Test Supabase connection with different methods
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing Supabase Connection Methods\n');

// Method 1: Pooler with Transaction Mode (Port 6543)
async function testPoolerTransaction() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Method 1: Supabase Pooler (Transaction Mode) - Port 6543');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 6543,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  };
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)`);
    
    const result = await client.query('SELECT NOW(), version()');
    console.log(`✅ Query successful: ${result.rows[0].now}`);
    
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    await pool.end();
    return false;
  }
}

// Method 2: Direct Connection (Port 5432)
async function testDirectConnection() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Method 2: Direct Connection - Port 5432');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const directHost = process.env.DB_HOST.replace('.pooler.', '.');
  
  const config = {
    user: process.env.DB_USER,
    host: directHost,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  };
  
  console.log(`Trying: ${directHost}:5432`);
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)`);
    
    const result = await client.query('SELECT NOW(), version()');
    console.log(`✅ Query successful: ${result.rows[0].now}`);
    
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    await pool.end();
    return false;
  }
}

// Method 3: Pooler Session Mode (Port 5432 on pooler)
async function testPoolerSession() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Method 3: Supabase Pooler (Session Mode) - Port 5432');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  };
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)`);
    
    const result = await client.query('SELECT NOW(), version()');
    console.log(`✅ Query successful: ${result.rows[0].now}`);
    
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    await pool.end();
    return false;
  }
}

// Method 4: Without SSL
async function testWithoutSSL() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Method 4: Without SSL - Port 6543');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 6543,
    connectionTimeoutMillis: 15000,
    ssl: false,
  };
  
  const pool = new Pool(config);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connected! (${duration}ms)`);
    
    const result = await client.query('SELECT NOW(), version()');
    console.log(`✅ Query successful: ${result.rows[0].now}`);
    
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    await pool.end();
    return false;
  }
}

// Run all tests
(async () => {
  const results = {
    poolerTransaction: await testPoolerTransaction(),
    directConnection: await testDirectConnection(),
    poolerSession: await testPoolerSession(),
    withoutSSL: await testWithoutSSL(),
  };
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Pooler Transaction (6543): ${results.poolerTransaction ? '✅' : '❌'}`);
  console.log(`Direct Connection (5432):  ${results.directConnection ? '✅' : '❌'}`);
  console.log(`Pooler Session (5432):     ${results.poolerSession ? '✅' : '❌'}`);
  console.log(`Without SSL (6543):        ${results.withoutSSL ? '✅' : '❌'}`);
  
  const anySuccess = Object.values(results).some(r => r);
  
  if (anySuccess) {
    console.log('\n✅ At least one method worked!');
    console.log('💡 Update your .env file with the working configuration.');
  } else {
    console.log('\n❌ All methods failed!');
    console.log('💡 Possible issues:');
    console.log('   - Wrong credentials (DB_USER or DB_PASSWORD)');
    console.log('   - Database does not exist');
    console.log('   - IP address blocked by Supabase');
    console.log('   - Network/firewall issues');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})();
