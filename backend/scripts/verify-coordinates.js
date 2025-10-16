#!/usr/bin/env node
/**
 * Coordinate Verification Script
 * Checks all stations and POIs for potentially swapped coordinates
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fuel_finder',
  password: process.env.DB_PASSWORD || 'password',
  port: Number(process.env.DB_PORT || 5432),
  ssl: (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Philippines bounds for validation
const PHILIPPINES_BOUNDS = {
  minLat: 4.0,
  maxLat: 22.0,
  minLng: 116.0,
  maxLng: 127.0,
};

async function verifyCoordinates() {
  console.log('🔍 Verifying Coordinates for Fuel Finder\n');
  console.log('📍 Philippines Valid Ranges:');
  console.log(`   Latitude:  ${PHILIPPINES_BOUNDS.minLat}° to ${PHILIPPINES_BOUNDS.maxLat}°N`);
  console.log(`   Longitude: ${PHILIPPINES_BOUNDS.minLng}° to ${PHILIPPINES_BOUNDS.maxLng}°E\n`);

  try {
    // Check Stations
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 CHECKING FUEL STATIONS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const stationsQuery = `
      SELECT 
        id,
        name,
        brand,
        ST_Y(geom) as latitude,
        ST_X(geom) as longitude,
        CASE 
          WHEN ST_Y(geom) >= ${PHILIPPINES_BOUNDS.minLat} AND ST_Y(geom) <= ${PHILIPPINES_BOUNDS.maxLat}
               AND ST_X(geom) >= ${PHILIPPINES_BOUNDS.minLng} AND ST_X(geom) <= ${PHILIPPINES_BOUNDS.maxLng}
          THEN 'VALID'
          WHEN ST_Y(geom) >= ${PHILIPPINES_BOUNDS.minLng} AND ST_Y(geom) <= ${PHILIPPINES_BOUNDS.maxLng}
               AND ST_X(geom) >= ${PHILIPPINES_BOUNDS.minLat} AND ST_X(geom) <= ${PHILIPPINES_BOUNDS.maxLat}
          THEN 'SWAPPED'
          ELSE 'OUT_OF_BOUNDS'
        END as status
      FROM stations
      ORDER BY 
        CASE 
          WHEN status = 'SWAPPED' THEN 1
          WHEN status = 'OUT_OF_BOUNDS' THEN 2
          ELSE 3
        END,
        name;
    `;

    const stationsResult = await pool.query(stationsQuery);
    const stations = stationsResult.rows;

    let validCount = 0;
    let swappedCount = 0;
    let invalidCount = 0;

    stations.forEach((station) => {
      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);
      
      const isLatValid = lat >= PHILIPPINES_BOUNDS.minLat && lat <= PHILIPPINES_BOUNDS.maxLat;
      const isLngValid = lng >= PHILIPPINES_BOUNDS.minLng && lng <= PHILIPPINES_BOUNDS.maxLng;
      
      let status = '✓ VALID';
      let statusColor = '\x1b[32m'; // Green
      
      if (!isLatValid && !isLngValid) {
        status = '⚠️ OUT OF BOUNDS';
        statusColor = '\x1b[33m'; // Yellow
        invalidCount++;
      } else if (!isLatValid && isLngValid) {
        status = '❌ LIKELY SWAPPED';
        statusColor = '\x1b[31m'; // Red
        swappedCount++;
      } else if (isLatValid && !isLngValid) {
        status = '❌ LIKELY SWAPPED';
        statusColor = '\x1b[31m'; // Red
        swappedCount++;
      } else {
        validCount++;
      }

      console.log(`${statusColor}${status}\x1b[0m`);
      console.log(`  ID: ${station.id} | ${station.brand} - ${station.name}`);
      console.log(`  Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      if (status.includes('SWAPPED')) {
        console.log(`  🔄 Suggested fix: ${lng.toFixed(6)}, ${lat.toFixed(6)}`);
        console.log(`  📝 SQL: UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(${lat}, ${lng}), 4326) WHERE id = ${station.id};`);
      }
      console.log('');
    });

    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Total Stations: ${stations.length}`);
    console.log(`  ✓ Valid: ${validCount}`);
    console.log(`  ❌ Likely Swapped: ${swappedCount}`);
    console.log(`  ⚠️ Out of Bounds: ${invalidCount}`);
    console.log('');

    // Check POIs
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 CHECKING POIs (Points of Interest)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const poisQuery = `
      SELECT 
        id,
        name,
        type,
        ST_Y(geom) as latitude,
        ST_X(geom) as longitude
      FROM pois
      ORDER BY name;
    `;

    const poisResult = await pool.query(poisQuery);
    const pois = poisResult.rows;

    let poisValidCount = 0;
    let poisSwappedCount = 0;
    let poisInvalidCount = 0;

    pois.forEach((poi) => {
      const lat = parseFloat(poi.latitude);
      const lng = parseFloat(poi.longitude);
      
      const isLatValid = lat >= PHILIPPINES_BOUNDS.minLat && lat <= PHILIPPINES_BOUNDS.maxLat;
      const isLngValid = lng >= PHILIPPINES_BOUNDS.minLng && lng <= PHILIPPINES_BOUNDS.maxLng;
      
      let status = '✓ VALID';
      let statusColor = '\x1b[32m'; // Green
      
      if (!isLatValid && !isLngValid) {
        status = '⚠️ OUT OF BOUNDS';
        statusColor = '\x1b[33m'; // Yellow
        poisInvalidCount++;
      } else if (!isLatValid && isLngValid) {
        status = '❌ LIKELY SWAPPED';
        statusColor = '\x1b[31m'; // Red
        poisSwappedCount++;
      } else if (isLatValid && !isLngValid) {
        status = '❌ LIKELY SWAPPED';
        statusColor = '\x1b[31m'; // Red
        poisSwappedCount++;
      } else {
        poisValidCount++;
      }

      console.log(`${statusColor}${status}\x1b[0m`);
      console.log(`  ID: ${poi.id} | [${poi.type}] ${poi.name}`);
      console.log(`  Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      if (status.includes('SWAPPED')) {
        console.log(`  🔄 Suggested fix: ${lng.toFixed(6)}, ${lat.toFixed(6)}`);
        console.log(`  📝 SQL: UPDATE pois SET geom = ST_SetSRID(ST_MakePoint(${lat}, ${lng}), 4326) WHERE id = ${poi.id};`);
      }
      console.log('');
    });

    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Total POIs: ${pois.length}`);
    console.log(`  ✓ Valid: ${poisValidCount}`);
    console.log(`  ❌ Likely Swapped: ${poisSwappedCount}`);
    console.log(`  ⚠️ Out of Bounds: ${poisInvalidCount}`);
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Items Checked: ${stations.length + pois.length}`);
    console.log(`  ✓ Valid Coordinates: ${validCount + poisValidCount}`);
    console.log(`  ❌ Likely Swapped: ${swappedCount + poisSwappedCount}`);
    console.log(`  ⚠️ Out of Bounds: ${invalidCount + poisInvalidCount}`);
    console.log('');

    if (swappedCount + poisSwappedCount > 0) {
      console.log('\x1b[33m⚠️ ACTION REQUIRED:\x1b[0m');
      console.log('Some coordinates appear to be swapped. Run the SQL commands above to fix them,');
      console.log('or delete and re-add them via the Admin Portal with the new smart validation.');
      console.log('');
    }

    if (invalidCount + poisInvalidCount > 0) {
      console.log('\x1b[33m⚠️ WARNING:\x1b[0m');
      console.log('Some coordinates are outside the Philippines region.');
      console.log('Verify these are correct or re-enter them via the Admin Portal.');
      console.log('');
    }

    if (swappedCount + poisSwappedCount === 0 && invalidCount + poisInvalidCount === 0) {
      console.log('\x1b[32m✅ All coordinates are valid!\x1b[0m');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error verifying coordinates:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run verification
verifyCoordinates()
  .then(() => {
    console.log('✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
