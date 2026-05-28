#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function applyMigration() {
  console.log('🔄 Applying reviews user migration...');
  
  try {
    const migrationPath = path.join(__dirname, 'migrations', '013_add_user_id_to_reviews.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Reviews user migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
