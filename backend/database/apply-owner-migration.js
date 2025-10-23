/**
 * Apply Owner-Based Access Control Migration
 * Run this script to add the owners table and owner authentication system
 * 
 * Usage:
 *   node database/apply-owner-migration.js
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function applyMigration() {
  console.log('🚀 Starting owner-based access control migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_add_owner_based_access_control.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('📝 Executing migration SQL...');
    await pool.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Fetch and display created owners with their API keys
    console.log('📋 Sample Owners Created:\n');
    console.log('=' .repeat(80));
    
    const result = await pool.query(`
      SELECT 
        name, 
        domain, 
        api_key, 
        email, 
        contact_person, 
        phone 
      FROM owners 
      ORDER BY name
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  No owners found. The sample data may not have been inserted.');
    } else {
      result.rows.forEach((owner, index) => {
        console.log(`\n${index + 1}. ${owner.name}`);
        console.log(`   Subdomain: ${owner.domain}.fuelfinder.com`);
        console.log(`   API Key: ${owner.api_key}`);
        console.log(`   Email: ${owner.email}`);
        console.log(`   Contact: ${owner.contact_person}`);
        console.log(`   Phone: ${owner.phone}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    // Display station assignments
    console.log('\n📍 Station Ownership Assignments:\n');
    const stationResult = await pool.query(`
      SELECT 
        s.name AS station_name,
        s.brand,
        o.name AS owner_name,
        o.domain
      FROM stations s
      JOIN owners o ON o.id = s.owner_id
      ORDER BY o.name, s.name
    `);

    if (stationResult.rows.length === 0) {
      console.log('⚠️  No stations assigned to owners yet.');
    } else {
      let currentOwner = '';
      stationResult.rows.forEach((row) => {
        if (row.owner_name !== currentOwner) {
          console.log(`\n${row.owner_name} (${row.domain}):`);
          currentOwner = row.owner_name;
        }
        console.log(`  - ${row.station_name} (${row.brand})`);
      });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Save the API keys above in a secure location');
    console.log('   2. Configure DNS to point subdomains to your server');
    console.log('   3. Test the owner endpoints with the provided API keys');
    console.log('   4. Review the OWNER_ACCESS_CONTROL_GUIDE.md for testing instructions\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
applyMigration();
