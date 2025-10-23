/**
 * Owner Access Control Test Suite
 * Tests the multi-owner authentication and data isolation system
 * 
 * Usage:
 *   node test-owner-access.js
 */

const axios = require('axios');
const { pool } = require('./config/database');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 5000;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.cyan}🧪 ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`   ✅ ${message}`, 'green');
}

function logError(message) {
  log(`   ❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`   ⚠️  ${message}`, 'yellow');
}

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  logTest(testName);
  try {
    await testFn();
    passedTests++;
    logSuccess('Test passed');
  } catch (error) {
    failedTests++;
    logError(`Test failed: ${error.message}`);
    if (error.response) {
      logError(`Response status: ${error.response.status}`);
      logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

async function getOwners() {
  const result = await pool.query('SELECT id, name, domain, api_key FROM owners ORDER BY name LIMIT 3');
  return result.rows;
}

async function testOwnerDetection() {
  const owners = await getOwners();
  
  if (owners.length === 0) {
    throw new Error('No owners found in database. Run migration first.');
  }

  const owner = owners[0];
  
  // Test with subdomain
  await runTest('Owner Detection - Valid Subdomain', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/owner/info`, {
        headers: {
          Host: `${owner.domain}.fuelfinder.com`
        },
        timeout: TEST_TIMEOUT
      });
      
      if (response.data.domain !== owner.domain) {
        throw new Error(`Expected domain ${owner.domain}, got ${response.data.domain}`);
      }
      
      if (response.data.name !== owner.name) {
        throw new Error(`Expected name ${owner.name}, got ${response.data.name}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Server not running. Start the server first: npm start');
      }
      throw error;
    }
  });

  // Test with invalid subdomain
  await runTest('Owner Detection - Invalid Subdomain', async () => {
    try {
      await axios.get(`${BASE_URL}/api/owner/info`, {
        headers: {
          Host: 'nonexistent.fuelfinder.com'
        },
        timeout: TEST_TIMEOUT
      });
      throw new Error('Should have returned 404 for invalid subdomain');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Expected - test passes
        return;
      }
      throw error;
    }
  });
}

async function testApiKeyAuthentication() {
  const owners = await getOwners();
  const owner = owners[0];

  // Test without API key
  await runTest('API Key Auth - Missing Key', async () => {
    try {
      await axios.get(`${BASE_URL}/api/owner/dashboard`, {
        headers: {
          Host: `${owner.domain}.fuelfinder.com`
        },
        timeout: TEST_TIMEOUT
      });
      throw new Error('Should have returned 401 without API key');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return; // Expected
      }
      throw error;
    }
  });

  // Test with invalid API key
  await runTest('API Key Auth - Invalid Key', async () => {
    try {
      await axios.get(`${BASE_URL}/api/owner/dashboard`, {
        headers: {
          Host: `${owner.domain}.fuelfinder.com`,
          'x-api-key': 'invalid-key-12345'
        },
        timeout: TEST_TIMEOUT
      });
      throw new Error('Should have returned 403 with invalid API key');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        return; // Expected
      }
      throw error;
    }
  });

  // Test with valid API key
  await runTest('API Key Auth - Valid Key', async () => {
    const response = await axios.get(`${BASE_URL}/api/owner/dashboard`, {
      headers: {
        Host: `${owner.domain}.fuelfinder.com`,
        'x-api-key': owner.api_key
      },
      timeout: TEST_TIMEOUT
    });

    if (!response.data.owner_name) {
      throw new Error('Dashboard should return owner_name');
    }
  });
}

async function testDataIsolation() {
  const owners = await getOwners();
  
  if (owners.length < 2) {
    logWarning('Need at least 2 owners to test data isolation');
    return;
  }

  const owner1 = owners[0];
  const owner2 = owners[1];

  // Get stations for owner 1
  await runTest('Data Isolation - Owner 1 Stations', async () => {
    const response = await axios.get(`${BASE_URL}/api/stations`, {
      headers: {
        Host: `${owner1.domain}.fuelfinder.com`
      },
      timeout: TEST_TIMEOUT
    });

    const stations = response.data;
    logSuccess(`Owner 1 (${owner1.name}) has ${stations.length} stations`);
  });

  // Get stations for owner 2
  await runTest('Data Isolation - Owner 2 Stations', async () => {
    const response = await axios.get(`${BASE_URL}/api/stations`, {
      headers: {
        Host: `${owner2.domain}.fuelfinder.com`
      },
      timeout: TEST_TIMEOUT
    });

    const stations = response.data;
    logSuccess(`Owner 2 (${owner2.name}) has ${stations.length} stations`);
  });

  // Verify they get different results
  await runTest('Data Isolation - Different Results', async () => {
    const [resp1, resp2] = await Promise.all([
      axios.get(`${BASE_URL}/api/stations`, {
        headers: { Host: `${owner1.domain}.fuelfinder.com` },
        timeout: TEST_TIMEOUT
      }),
      axios.get(`${BASE_URL}/api/stations`, {
        headers: { Host: `${owner2.domain}.fuelfinder.com` },
        timeout: TEST_TIMEOUT
      })
    ]);

    // Check if any station IDs overlap (they shouldn't)
    const ids1 = resp1.data.map(s => s.id);
    const ids2 = resp2.data.map(s => s.id);
    const overlap = ids1.filter(id => ids2.includes(id));

    if (overlap.length > 0) {
      throw new Error(`Data isolation failed: ${overlap.length} stations appear in both owner's results`);
    }

    logSuccess('No station overlap - data isolation working');
  });
}

async function testOwnerEndpoints() {
  const owners = await getOwners();
  const owner = owners[0];

  // Test getting owner stations
  await runTest('Owner Endpoints - Get Stations', async () => {
    const response = await axios.get(`${BASE_URL}/api/owner/stations`, {
      headers: {
        Host: `${owner.domain}.fuelfinder.com`,
        'x-api-key': owner.api_key
      },
      timeout: TEST_TIMEOUT
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Response should be an array');
    }

    logSuccess(`Retrieved ${response.data.length} stations`);
  });

  // Test getting pending reports
  await runTest('Owner Endpoints - Pending Reports', async () => {
    const response = await axios.get(`${BASE_URL}/api/owner/price-reports/pending`, {
      headers: {
        Host: `${owner.domain}.fuelfinder.com`,
        'x-api-key': owner.api_key
      },
      timeout: TEST_TIMEOUT
    });

    if (typeof response.data.count !== 'number') {
      throw new Error('Response should have count property');
    }

    logSuccess(`Found ${response.data.count} pending reports`);
  });

  // Test analytics
  await runTest('Owner Endpoints - Analytics', async () => {
    const response = await axios.get(`${BASE_URL}/api/owner/analytics`, {
      headers: {
        Host: `${owner.domain}.fuelfinder.com`,
        'x-api-key': owner.api_key
      },
      timeout: TEST_TIMEOUT
    });

    if (!response.data.stations || !response.data.price_reports) {
      throw new Error('Analytics should return stations and price_reports data');
    }

    logSuccess('Analytics data retrieved');
  });

  // Test activity logs
  await runTest('Owner Endpoints - Activity Logs', async () => {
    const response = await axios.get(`${BASE_URL}/api/owner/activity-logs?limit=10`, {
      headers: {
        Host: `${owner.domain}.fuelfinder.com`,
        'x-api-key': owner.api_key
      },
      timeout: TEST_TIMEOUT
    });

    if (!Array.isArray(response.data.logs)) {
      throw new Error('Response should have logs array');
    }

    logSuccess(`Retrieved ${response.data.logs.length} activity logs`);
  });
}

async function testActivityLogging() {
  const owners = await getOwners();
  const owner = owners[0];

  await runTest('Activity Logging - Authentication Logged', async () => {
    // Make an authenticated request
    await axios.get(`${BASE_URL}/api/owner/dashboard`, {
      headers: {
        Host: `${owner.domain}.fuelfinder.com`,
        'x-api-key': owner.api_key
      },
      timeout: TEST_TIMEOUT
    });

    // Check if it was logged
    const result = await pool.query(
      `SELECT * FROM owner_activity_logs 
       WHERE owner_id = $1 
       AND action_type = 'auth_success' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [owner.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Authentication was not logged');
    }

    logSuccess('Authentication logged successfully');
  });

  await runTest('Activity Logging - Failed Auth Logged', async () => {
    // Make a failed request
    try {
      await axios.get(`${BASE_URL}/api/owner/dashboard`, {
        headers: {
          Host: `${owner.domain}.fuelfinder.com`,
          'x-api-key': 'wrong-key'
        },
        timeout: TEST_TIMEOUT
      });
    } catch (error) {
      // Expected to fail
    }

    // Check if failure was logged
    const result = await pool.query(
      `SELECT * FROM owner_activity_logs 
       WHERE owner_id = $1 
       AND action_type = 'auth_attempt'
       AND success = FALSE
       ORDER BY created_at DESC 
       LIMIT 1`,
      [owner.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed authentication was not logged');
    }

    logSuccess('Failed authentication logged successfully');
  });
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  log('\n📊 Test Summary\n', 'blue');
  log(`Total Tests: ${totalTests}`, 'cyan');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 
      failedTests === 0 ? 'green' : 'yellow');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  log('\n🚀 Owner Access Control Test Suite\n', 'blue');
  log('Testing multi-owner authentication and data isolation...\n', 'cyan');

  try {
    // Check database connection
    await pool.query('SELECT 1');
    logSuccess('Database connection successful');

    // Get owners
    const owners = await getOwners();
    log(`\nFound ${owners.length} owner(s) in database:`, 'cyan');
    owners.forEach((owner, i) => {
      console.log(`  ${i + 1}. ${owner.name} (${owner.domain})`);
    });

    if (owners.length === 0) {
      logError('\nNo owners found! Please run the migration first:');
      console.log('  node database/apply-owner-migration.js\n');
      process.exit(1);
    }

    // Run test suites
    log('\n📝 Running Test Suites...\n', 'blue');

    await testOwnerDetection();
    await testApiKeyAuthentication();
    await testDataIsolation();
    await testOwnerEndpoints();
    await testActivityLogging();

    // Print summary
    await printSummary();

    if (failedTests === 0) {
      log('✨ All tests passed! Owner access control is working correctly.\n', 'green');
    } else {
      log(`⚠️  ${failedTests} test(s) failed. Review errors above.\n`, 'yellow');
    }

  } catch (error) {
    logError(`\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
main();
