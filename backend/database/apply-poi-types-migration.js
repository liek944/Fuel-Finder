/**
 * Apply POI Types Migration
 * Expands POI types to include car_wash and motor_shop
 */

const { pool } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting POI types migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '003_expand_poi_types.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('📊 POI types now supported: gas, convenience, repair, car_wash, motor_shop');
    
    // Verify the constraint
    const result = await client.query(`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conname = 'pois_type_check'
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Constraint verified:', result.rows[0].consrc);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
applyMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
