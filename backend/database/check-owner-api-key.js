/**
 * Check Owner API Key
 * Utility script to verify owner credentials in database
 */

const { pool } = require('../config/database');

async function checkOwnerCredentials() {
  try {
    console.log('🔍 Checking owner credentials in database...\n');

    // Check all owners
    const result = await pool.query(`
      SELECT 
        id,
        name,
        domain,
        api_key,
        email,
        is_active,
        created_at
      FROM owners
      WHERE domain = 'ifuel-dangay'
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No owner found with domain "ifuel-dangay"');
      console.log('\nAvailable owners:');
      
      const allOwners = await pool.query(`
        SELECT domain, name, is_active 
        FROM owners 
        ORDER BY created_at DESC
      `);
      
      allOwners.rows.forEach(owner => {
        console.log(`  - ${owner.domain} (${owner.name}) - Active: ${owner.is_active}`);
      });
    } else {
      console.log('✅ Owner found!\n');
      result.rows.forEach(owner => {
        console.log('Owner Details:');
        console.log('─────────────────────────────────────────────────');
        console.log(`ID:           ${owner.id}`);
        console.log(`Name:         ${owner.name}`);
        console.log(`Domain:       ${owner.domain}`);
        console.log(`Email:        ${owner.email || 'N/A'}`);
        console.log(`Active:       ${owner.is_active}`);
        console.log(`Created:      ${owner.created_at}`);
        console.log(`\nAPI Key:      ${owner.api_key}`);
        console.log('─────────────────────────────────────────────────');
      });
      
      // Check stations
      const stations = await pool.query(`
        SELECT id, name, brand, address
        FROM stations
        WHERE owner_id = $1
      `, [result.rows[0].id]);
      
      console.log(`\nAssigned Stations: ${stations.rows.length}`);
      if (stations.rows.length > 0) {
        stations.rows.forEach(station => {
          console.log(`  - ${station.name} (${station.brand || 'No brand'}) - ID: ${station.id}`);
        });
      }
      
      // Check pending reports
      const reports = await pool.query(`
        SELECT COUNT(*) as count
        FROM fuel_price_reports fpr
        JOIN stations s ON s.id = fpr.station_id
        WHERE s.owner_id = $1 AND fpr.is_verified = FALSE
      `, [result.rows[0].id]);
      
      console.log(`\nPending Reports: ${reports.rows[0].count}`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkOwnerCredentials();
