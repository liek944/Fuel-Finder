#!/usr/bin/env node
/**
 * Setup script for iFuel Dangay Station Owner
 * Creates owner record and links station
 */

const { pool } = require('./database/db');

async function setupIfuelOwner() {
  console.log('🚀 Setting up iFuel Dangay Station as owner...\n');

  try {
    // Step 1: Create the owner
    console.log('📝 Creating owner record...');
    const ownerResult = await pool.query(`
      INSERT INTO owners (name, domain, api_key, email, contact_person, phone)
      VALUES (
        'iFuel Dangay Station',
        'ifuel-dangay',
        encode(gen_random_bytes(32), 'base64'),
        'owner@ifuel-dangay.com',
        'Station Owner',
        '+63-XXX-XXX-XXXX'
      )
      ON CONFLICT (domain) DO UPDATE 
      SET updated_at = CURRENT_TIMESTAMP
      RETURNING id, name, domain, api_key, email, created_at
    `);

    if (ownerResult.rows.length === 0) {
      console.log('ℹ️  Owner already exists, fetching details...');
      const existingOwner = await pool.query(
        'SELECT id, name, domain, api_key, email FROM owners WHERE domain = $1',
        ['ifuel-dangay']
      );
      const owner = existingOwner.rows[0];
      console.log('\n✅ Owner Details:');
      console.log('─────────────────────────────────────────────────');
      console.log(`Name:     ${owner.name}`);
      console.log(`Domain:   ${owner.domain}.duckdns.org`);
      console.log(`Email:    ${owner.email}`);
      console.log(`Owner ID: ${owner.id}`);
      console.log('\n🔑 API Key:');
      console.log(owner.api_key);
      console.log('─────────────────────────────────────────────────');
    } else {
      const owner = ownerResult.rows[0];
      console.log('\n✅ Owner created successfully!');
      console.log('─────────────────────────────────────────────────');
      console.log(`Name:     ${owner.name}`);
      console.log(`Domain:   ${owner.domain}.duckdns.org`);
      console.log(`Email:    ${owner.email}`);
      console.log(`Owner ID: ${owner.id}`);
      console.log(`Created:  ${owner.created_at}`);
      console.log('\n🔑 API Key (SAVE THIS SECURELY!):');
      console.log(owner.api_key);
      console.log('─────────────────────────────────────────────────');
    }

    // Step 2: Find iFuel station
    console.log('\n🔍 Finding iFuel Dangay station...');
    const stationResult = await pool.query(`
      SELECT id, name, brand, address, owner_id
      FROM stations 
      WHERE name ILIKE '%iFuel%Dangay%' OR name ILIKE '%iFUEL%Dangay%'
    `);

    if (stationResult.rows.length === 0) {
      console.log('⚠️  No iFuel Dangay station found in database!');
      console.log('Please create the station first or check the station name.');
      process.exit(1);
    }

    const station = stationResult.rows[0];
    console.log(`Found: ${station.name} (ID: ${station.id})`);

    // Step 3: Link station to owner
    console.log('\n🔗 Linking station to owner...');
    await pool.query(`
      UPDATE stations 
      SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
      WHERE id = $1
    `, [station.id]);

    console.log('✅ Station linked successfully!');

    // Step 4: Verify the setup
    console.log('\n🔍 Verifying setup...');
    const verifyResult = await pool.query(`
      SELECT 
        s.id as station_id,
        s.name as station_name,
        s.brand,
        s.address,
        o.name as owner_name,
        o.domain as owner_domain,
        o.is_active
      FROM stations s
      JOIN owners o ON s.owner_id = o.id
      WHERE o.domain = 'ifuel-dangay'
    `);

    console.log('\n✅ Setup Complete!');
    console.log('─────────────────────────────────────────────────');
    verifyResult.rows.forEach(row => {
      console.log(`Station:  ${row.station_name} (${row.brand})`);
      console.log(`Owner:    ${row.owner_name}`);
      console.log(`Domain:   https://${row.owner_domain}.duckdns.org`);
      console.log(`Status:   ${row.is_active ? '✅ Active' : '❌ Inactive'}`);
    });
    console.log('─────────────────────────────────────────────────');

    // Step 5: Show testing instructions
    console.log('\n📋 Next Steps:');
    console.log('1. Save the API key shown above');
    console.log('2. Test public endpoint:');
    console.log('   curl -H "Host: ifuel-dangay.duckdns.org" \\');
    console.log('        http://localhost:3000/api/owner/info\n');
    console.log('3. Test authenticated endpoint:');
    console.log('   curl -H "Host: ifuel-dangay.duckdns.org" \\');
    console.log('        -H "x-api-key: YOUR_API_KEY" \\');
    console.log('        http://localhost:3000/api/owner/dashboard\n');
    console.log('4. Access via browser:');
    console.log('   https://ifuel-dangay.duckdns.org\n');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupIfuelOwner()
  .then(() => {
    console.log('\n✨ Setup completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });
