#!/usr/bin/env node
/**
 * Check and Apply Owner Migration to Supabase
 * This script checks if the owners table exists and applies migration 006 if needed
 */

const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function checkOwnerTable() {
  try {
    console.log('🔍 Checking if owners table exists...');
    
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'owners'
      );
    `);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error('❌ Error checking owners table:', error.message);
    throw error;
  }
}

async function applyMigration() {
  try {
    console.log('📄 Reading migration file...');
    
    const migrationPath = path.join(__dirname, 'migrations', '006_add_owner_based_access_control.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Applying migration 006...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    throw error;
  }
}

async function getOwnerInfo() {
  try {
    console.log('\n📊 Fetching owner information...\n');
    
    const result = await pool.query(`
      SELECT 
        name, 
        domain, 
        api_key,
        email,
        contact_person,
        is_active,
        created_at
      FROM owners
      ORDER BY name;
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No owners found in database');
      return;
    }
    
    console.log('='.repeat(80));
    console.log('OWNER ACCOUNTS');
    console.log('='.repeat(80));
    
    result.rows.forEach((owner, index) => {
      console.log(`\n${index + 1}. ${owner.name}`);
      console.log(`   Domain: ${owner.domain}.fuelfinder.com`);
      console.log(`   API Key: ${owner.api_key}`);
      console.log(`   Contact: ${owner.contact_person} (${owner.email})`);
      console.log(`   Status: ${owner.is_active ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Created: ${owner.created_at}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Get station assignments
    console.log('\n📍 Station Assignments:\n');
    
    const stationResult = await pool.query(`
      SELECT 
        o.name AS owner_name,
        o.domain,
        s.name AS station_name,
        s.id AS station_id,
        s.brand
      FROM owners o
      LEFT JOIN stations s ON s.owner_id = o.id
      WHERE o.is_active = TRUE
      ORDER BY o.name, s.name;
    `);
    
    if (stationResult.rows.length === 0) {
      console.log('⚠️  No stations assigned to owners yet');
    } else {
      let currentOwner = '';
      stationResult.rows.forEach(row => {
        if (row.owner_name !== currentOwner) {
          currentOwner = row.owner_name;
          console.log(`\n${currentOwner} (${row.domain}):`);
        }
        if (row.station_name) {
          console.log(`  • ${row.station_name} (${row.brand || 'No brand'}) - ID: ${row.station_id}`);
        } else {
          console.log('  • No stations assigned');
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error fetching owner info:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🏁 Starting owner migration check...\n');
    
    const ownerTableExists = await checkOwnerTable();
    
    if (ownerTableExists) {
      console.log('✅ Owners table already exists!');
    } else {
      console.log('⚠️  Owners table does not exist. Applying migration...');
      await applyMigration();
    }
    
    await getOwnerInfo();
    
    console.log('\n✅ All done!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
