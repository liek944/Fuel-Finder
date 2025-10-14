#!/usr/bin/env node

/**
 * Test script to verify image upload deduplication is working
 * 
 * This simulates 3 rapid identical upload requests to test:
 * 1. Backend deduplication middleware
 * 2. Request ID tracking
 * 3. Proper response codes (201 for first, 202 for duplicates)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const TEST_STATION_ID = process.env.TEST_STATION_ID || '25';

// Create a small test image (1x1 red pixel PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const testPayload = {
  images: [
    {
      filename: 'test-image.png',
      base64: TEST_IMAGE_BASE64,
      mimeType: 'image/png'
    }
  ]
};

async function sendUploadRequest(requestNumber) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/stations/${TEST_STATION_ID}/images`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ADMIN_API_KEY
        },
        validateStatus: () => true // Accept any status code
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      requestNumber,
      status: response.status,
      duration,
      data: response.data,
      success: true
    };
  } catch (error) {
    return {
      requestNumber,
      status: error.response?.status || 'ERROR',
      duration: Date.now() - startTime,
      error: error.message,
      success: false
    };
  }
}

async function runTest() {
  console.log('\n🧪 IMAGE UPLOAD DEDUPLICATION TEST');
  console.log('=====================================\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Station ID: ${TEST_STATION_ID}`);
  console.log(`API Key: ${ADMIN_API_KEY ? '***' + ADMIN_API_KEY.slice(-4) : 'NOT SET'}\n`);
  
  if (!ADMIN_API_KEY) {
    console.error('❌ ERROR: ADMIN_API_KEY not set!');
    console.log('Set it with: export ADMIN_API_KEY=your-key-here\n');
    process.exit(1);
  }
  
  console.log('📤 Sending 3 identical upload requests simultaneously...\n');
  
  // Send 3 requests at the exact same time
  const promises = [
    sendUploadRequest(1),
    sendUploadRequest(2),
    sendUploadRequest(3)
  ];
  
  const results = await Promise.all(promises);
  
  // Analyze results
  console.log('📊 RESULTS:\n');
  
  results.forEach(result => {
    const statusEmoji = result.status === 201 ? '✅' : 
                        result.status === 202 ? '⚠️' : '❌';
    const statusText = result.status === 201 ? 'CREATED (Original)' :
                       result.status === 202 ? 'ACCEPTED (Duplicate)' :
                       result.status === 401 ? 'UNAUTHORIZED' :
                       result.status === 404 ? 'NOT FOUND' :
                       'ERROR';
    
    console.log(`${statusEmoji} Request ${result.requestNumber}:`);
    console.log(`   Status: ${result.status} ${statusText}`);
    console.log(`   Duration: ${result.duration}ms`);
    
    if (result.data) {
      if (result.data.message) {
        console.log(`   Message: ${result.data.message}`);
      }
      if (result.data.timeSinceOriginal) {
        console.log(`   Time since original: ${result.data.timeSinceOriginal}`);
      }
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    console.log('');
  });
  
  // Determine test result
  const status201Count = results.filter(r => r.status === 201).length;
  const status202Count = results.filter(r => r.status === 202).length;
  const errorCount = results.filter(r => !r.success || (r.status !== 201 && r.status !== 202)).length;
  
  console.log('📈 SUMMARY:\n');
  console.log(`   201 Created: ${status201Count}`);
  console.log(`   202 Accepted (Deduplicated): ${status202Count}`);
  console.log(`   Errors: ${errorCount}\n`);
  
  // Test verdict
  if (status201Count === 1 && status202Count === 2 && errorCount === 0) {
    console.log('✅ TEST PASSED: Deduplication is working correctly!');
    console.log('   Only 1 request succeeded, 2 were blocked as duplicates.\n');
    process.exit(0);
  } else if (status201Count === 3) {
    console.log('❌ TEST FAILED: All 3 requests succeeded!');
    console.log('   Deduplication is NOT working. Multiple images will be uploaded.\n');
    console.log('💡 TROUBLESHOOTING:');
    console.log('   1. Check if requestDeduplication middleware is applied to the endpoint');
    console.log('   2. Verify PM2 is running in fork mode (not cluster)');
    console.log('   3. Check backend logs for deduplication messages\n');
    process.exit(1);
  } else if (errorCount > 0) {
    console.log('⚠️  TEST INCONCLUSIVE: Some requests failed');
    console.log('   Check the error messages above.\n');
    process.exit(1);
  } else {
    console.log('⚠️  TEST INCONCLUSIVE: Unexpected result pattern');
    console.log('   Expected: 1 success (201), 2 duplicates (202)\n');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the test
runTest().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
