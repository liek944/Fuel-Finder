#!/usr/bin/env node
/**
 * Apply reviews table migration
 * Run: node backend/database/apply-reviews-migration.js
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function applyMigration() {
  console.log('🔄 Applying reviews table migration...');
  
  try {
    const migrationPath = path.join(__dirname, 'migrations', 'add-reviews-table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Reviews table migration applied successfully!');
    console.log('📊 Table: reviews');
    console.log('📋 Indexes: target, status, created_at, session+target');
    
    // Verify table creation
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'reviews'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Reviews table structure:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
