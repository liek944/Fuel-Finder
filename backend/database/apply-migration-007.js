#!/usr/bin/env node

/**
 * Apply Migration 007: Add is_community column to fuel_prices table
 * Run this on EC2 to fix the missing column error
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  console.log('🚀 Applying Migration 007: Add is_community column');
  console.log('================================================');
  console.log('');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '007_add_is_community_to_fuel_prices.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    const result = await pool.query(migrationSQL);
    
    console.log('');
    console.log('✅ Migration applied successfully!');
    console.log('');

    // Verify the column exists
    console.log('🔍 Verifying column exists...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'fuel_prices' 
        AND column_name = 'is_community';
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Column verified:');
      console.table(verifyResult.rows);
    } else {
      console.log('❌ Column not found! Migration may have failed.');
    }

    // Show statistics
    console.log('');
    console.log('📊 Current fuel_prices statistics:');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_prices,
        COUNT(*) FILTER (WHERE is_community = TRUE) as community_prices,
        COUNT(*) FILTER (WHERE is_community = FALSE) as official_prices
      FROM fuel_prices;
    `);
    console.table(statsResult.rows);

    console.log('');
    console.log('================================================');
    console.log('✅ Migration 007 Complete!');
    console.log('================================================');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
applyMigration();
