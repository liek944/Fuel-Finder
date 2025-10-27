#!/usr/bin/env node

/**
 * Apply Theme Configuration Migration
 * 
 * Adds theme_config JSONB columns to owners and stations tables
 * for per-owner branding customization
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function applyMigration() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      APPLYING THEME CONFIGURATION MIGRATION (007)         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '007_add_owner_theme_config.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Reading migration file...');
    console.log('   File: 007_add_owner_theme_config.sql\n');

    // Execute migration
    console.log('⚙️  Executing migration...\n');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying changes...\n');
    
    const verifyOwners = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'owners' 
        AND column_name = 'theme_config'
    `);

    const verifyStations = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stations' 
        AND column_name = 'theme_config'
    `);

    if (verifyOwners.rows.length > 0) {
      console.log('   ✓ owners.theme_config column added');
    }
    if (verifyStations.rows.length > 0) {
      console.log('   ✓ stations.theme_config column added');
    }

    // Check if iFuel Dangay theme was set
    const ifuelTheme = await pool.query(`
      SELECT name, domain, 
             theme_config->>'brandName' as brand_name,
             theme_config->'colors'->>'primary' as primary_color,
             theme_config->>'mode' as theme_mode
      FROM owners 
      WHERE domain = 'ifuel-dangay'
    `);

    if (ifuelTheme.rows.length > 0) {
      const theme = ifuelTheme.rows[0];
      console.log('\n📦 Sample Theme Applied:');
      console.log('   ════════════════════════════════════════');
      console.log(`   Owner:         ${theme.name}`);
      console.log(`   Domain:        ${theme.domain}`);
      console.log(`   Brand Name:    ${theme.brand_name || 'Not set'}`);
      console.log(`   Primary Color: ${theme.primary_color || 'Not set'}`);
      console.log(`   Theme Mode:    ${theme.theme_mode || 'Not set'}`);
      console.log('   ════════════════════════════════════════');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  MIGRATION SUCCESSFUL! ✅                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📝 Next Steps:\n');
    console.log('   1. Update /api/owner/info to return theme_config');
    console.log('   2. Create OwnerThemeProvider in frontend');
    console.log('   3. Update OwnerLogin.tsx to apply themes');
    console.log('   4. Update OwnerDashboard.tsx to use theme variables\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
applyMigration().catch(console.error);
