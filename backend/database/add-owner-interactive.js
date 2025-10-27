#!/usr/bin/env node

/**
 * Interactive Script to Add New Station Owner
 * 
 * Usage: node add-owner-interactive.js
 * 
 * This script will:
 * 1. Generate a secure API key
 * 2. Create a new owner in the database
 * 3. Optionally assign stations to the owner
 * 4. Display the portal access information
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Import pool lazily - only when needed
let pool = null;
function getPool() {
  if (!pool) {
    pool = require('../config/database').pool;
  }
  return pool;
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateApiKey() {
  return crypto.randomBytes(32).toString('base64');
}

async function checkSubdomainAvailable(subdomain) {
  const result = await getPool().query(
    'SELECT id FROM owners WHERE domain = $1',
    [subdomain]
  );
  return result.rows.length === 0;
}

async function createOwner(ownerData) {
  const query = `
    INSERT INTO owners (name, domain, api_key, email, contact_person, phone, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, TRUE)
    RETURNING id, name, domain, api_key, email, contact_person, phone, created_at
  `;
  
  const result = await getPool().query(query, [
    ownerData.name,
    ownerData.domain,
    ownerData.apiKey,
    ownerData.email,
    ownerData.contactPerson,
    ownerData.phone
  ]);
  
  return result.rows[0];
}

async function assignStations(ownerId, stationIds) {
  const query = `
    UPDATE stations 
    SET owner_id = $1 
    WHERE id = ANY($2::int[])
    RETURNING id, name, brand
  `;
  
  const result = await getPool().query(query, [ownerId, stationIds]);
  return result.rows;
}

async function listUnassignedStations() {
  const query = `
    SELECT id, name, brand, address
    FROM stations
    WHERE owner_id IS NULL
    ORDER BY id
    LIMIT 20
  `;
  
  const result = await getPool().query(query);
  return result.rows;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         ADD NEW STATION OWNER - INTERACTIVE SETUP          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Collect owner information
    console.log('📋 STEP 1: Owner Information\n');
    
    const name = await question('Company/Owner Name: ');
    if (!name.trim()) {
      console.log('❌ Owner name is required!');
      rl.close();
      process.exit(1);
    }

    let domain = await question('Subdomain (e.g., "shell-network" for shell-network.fuelfinder.com): ');
    domain = domain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    if (!domain) {
      console.log('❌ Subdomain is required!');
      rl.close();
      process.exit(1);
    }

    // Check subdomain availability
    const isAvailable = await checkSubdomainAvailable(domain);
    if (!isAvailable) {
      console.log(`❌ Subdomain "${domain}" is already taken!`);
      rl.close();
      process.exit(1);
    }

    const email = await question('Contact Email: ');
    const contactPerson = await question('Contact Person Name: ');
    const phone = await question('Phone Number (optional): ');

    // Step 2: Generate API key
    console.log('\n🔐 STEP 2: Generating Secure API Key\n');
    const apiKey = generateApiKey();
    console.log(`✓ API Key generated: ${apiKey.substring(0, 20)}...`);

    // Step 3: Confirm creation
    console.log('\n📝 STEP 3: Review Information\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Company Name:     ${name}`);
    console.log(`Subdomain:        ${domain}.fuelfinder.com`);
    console.log(`Email:            ${email}`);
    console.log(`Contact Person:   ${contactPerson}`);
    console.log(`Phone:            ${phone || 'Not provided'}`);
    console.log(`API Key:          ${apiKey}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const confirm = await question('Create this owner? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled by user.');
      rl.close();
      process.exit(0);
    }

    // Step 4: Create owner in database
    console.log('\n💾 STEP 4: Creating Owner in Database\n');
    const owner = await createOwner({
      name,
      domain,
      apiKey,
      email,
      contactPerson,
      phone: phone || null
    });

    console.log('✓ Owner created successfully!');
    console.log(`   Owner ID: ${owner.id}\n`);

    // Step 5: Assign stations (optional)
    console.log('🏪 STEP 5: Assign Stations to Owner\n');
    const assignNow = await question('Do you want to assign stations now? (yes/no): ');
    
    if (assignNow.toLowerCase() === 'yes' || assignNow.toLowerCase() === 'y') {
      console.log('\nFetching unassigned stations...\n');
      const unassignedStations = await listUnassignedStations();
      
      if (unassignedStations.length === 0) {
        console.log('ℹ️  No unassigned stations available.');
      } else {
        console.log('Available Unassigned Stations:');
        console.log('═══════════════════════════════════════════════════════════');
        unassignedStations.forEach(station => {
          console.log(`  [${station.id}] ${station.name} ${station.brand ? `(${station.brand})` : ''}`);
          console.log(`      ${station.address}`);
        });
        console.log('═══════════════════════════════════════════════════════════\n');
        
        const stationIdsInput = await question('Enter station IDs to assign (comma-separated, e.g., "1,2,3"): ');
        
        if (stationIdsInput.trim()) {
          const stationIds = stationIdsInput.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          
          if (stationIds.length > 0) {
            console.log(`\nAssigning ${stationIds.length} station(s)...`);
            const assignedStations = await assignStations(owner.id, stationIds);
            
            console.log(`✓ Assigned ${assignedStations.length} station(s) successfully!\n`);
            assignedStations.forEach(station => {
              console.log(`   - ${station.name} ${station.brand ? `(${station.brand})` : ''}`);
            });
          }
        }
      }
    }

    // Step 6: Display final information
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ SETUP COMPLETE!                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('📋 OWNER PORTAL ACCESS INFORMATION\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Portal URL:       https://${domain}.fuelfinder.com`);
    console.log(`Login URL:        https://${domain}.fuelfinder.com/owner/login`);
    console.log(`API Key:          ${apiKey}`);
    console.log(`Company Name:     ${name}`);
    console.log(`Contact Email:    ${email}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('⚠️  IMPORTANT: Save the API key securely! Give it to the owner.\n');
    console.log('📝 Next Steps:');
    console.log('   1. Configure DNS: Add subdomain record to point to your server');
    console.log('   2. Share portal URL and API key with the owner');
    console.log('   3. Owner can login and manage their stations\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    rl.close();
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
main().catch(console.error);
