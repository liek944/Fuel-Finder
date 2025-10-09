#!/usr/bin/env node

/**
 * Apply Database Migrations
 * 
 * This script applies database migrations for the Fuel Finder app.
 * Run: node backend/database/apply_migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (_) {}

// Database configuration
const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fuel_finder',
  password: process.env.DB_PASSWORD || 'password',
  port: Number(process.env.DB_PORT || 5432),
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
};

const pool = new Pool(dbConfig);

async function applyMigration(migrationFile) {
  const client = await pool.connect();
  
  try {
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      return false;
    }
    
    console.log(`📄 Reading migration: ${migrationFile}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`🔄 Applying migration...`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log(`✅ Migration applied successfully: ${migrationFile}`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration failed: ${migrationFile}`);
    console.error(`Error: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Starting migration process...\n');
  console.log('📋 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${useSSL ? 'enabled' : 'disabled'}\n`);
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 Creating migrations directory...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found in migrations directory');
      return;
    }
    
    console.log(`📦 Found ${migrationFiles.length} migration(s):\n`);
    migrationFiles.forEach(f => console.log(`   - ${f}`));
    console.log('');
    
    // Apply migrations
    let successCount = 0;
    let failCount = 0;
    
    for (const file of migrationFiles) {
      const success = await applyMigration(file);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      console.log('');
    }
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 Migration Summary');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📋 Total: ${migrationFiles.length}`);
    console.log('═══════════════════════════════════════\n');
    
    if (failCount > 0) {
      console.log('⚠️  Some migrations failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('🎉 All migrations applied successfully!');
      console.log('💡 You can now restart your backend server.\n');
    }
    
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
