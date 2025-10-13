#!/usr/bin/env node

/**
 * Test script to verify request deduplication is working
 * Run this AFTER starting your backend server
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'your-api-key';

// Test data
const testStationId = 20; // Change this to an existing station ID
const testImage = {
  filename: 'test-image.jpg',
  base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 transparent PNG
  mimeType: 'image/png'
};

async function testDeduplication() {
  console.log('🧪 Testing Request Deduplication\n');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Testing with station ID: ${testStationId}\n`);

  const endpoint = `${API_BASE_URL}/api/stations/${testStationId}/images`;
  const payload = { images: [testImage] };
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': ADMIN_API_KEY
  };

  console.log('📤 Sending 3 identical requests simultaneously...\n');

  try {
    // Send 3 identical requests at the same time
    const promises = [
      axios.post(endpoint, payload, { headers }),
      axios.post(endpoint, payload, { headers }),
      axios.post(endpoint, payload, { headers })
    ];

    const results = await Promise.allSettled(promises);

    console.log('📊 Results:\n');
    
    let successCount = 0;
    let dedupCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      console.log(`Request ${index + 1}:`);
      
      if (result.status === 'fulfilled') {
        const response = result.value;
        console.log(`  Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 201) {
          successCount++;
          console.log(`  ✅ Successfully uploaded`);
        } else if (response.status === 202) {
          dedupCount++;
          console.log(`  ⚠️  Deduplicated (blocked as duplicate)`);
          console.log(`  Message: ${response.data.message}`);
        }
      } else {
        errorCount++;
        console.log(`  ❌ Error: ${result.reason.message}`);
        if (result.reason.response) {
          console.log(`  Status: ${result.reason.response.status}`);
          console.log(`  Data:`, result.reason.response.data);
        }
      }
      console.log('');
    });

    console.log('📈 Summary:');
    console.log(`  ✅ Successful uploads: ${successCount}`);
    console.log(`  ⚠️  Deduplicated: ${dedupCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('');

    if (successCount === 1 && dedupCount === 2) {
      console.log('✅ TEST PASSED: Deduplication is working correctly!');
      console.log('   Only 1 request succeeded, 2 were blocked as duplicates.');
      process.exit(0);
    } else if (successCount === 3) {
      console.log('❌ TEST FAILED: All 3 requests succeeded!');
      console.log('   Deduplication is NOT working. Check your server configuration.');
      process.exit(1);
    } else {
      console.log('⚠️  TEST INCONCLUSIVE: Unexpected results.');
      console.log('   Please check the server logs for more details.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
console.log('='.repeat(60));
console.log('REQUEST DEDUPLICATION TEST');
console.log('='.repeat(60));
console.log('');

testDeduplication();
