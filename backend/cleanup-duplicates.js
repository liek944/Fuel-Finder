#!/usr/bin/env node

/**
 * Cleanup duplicate images from database
 * Keeps the oldest image, deletes newer duplicates
 */

require('dotenv').config();
const { pool } = require('./database/db');

async function findDuplicates() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        station_id,
        original_filename,
        COUNT(*) as duplicate_count,
        array_agg(id ORDER BY created_at ASC) as image_ids,
        array_agg(created_at ORDER BY created_at ASC) as created_dates
      FROM images
      WHERE station_id IS NOT NULL
      GROUP BY station_id, original_filename
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `);

    return result.rows;
  } finally {
    client.release();
  }
}

async function deleteDuplicates(dryRun = true) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      WITH duplicates AS (
        SELECT 
          id,
          station_id,
          original_filename,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY station_id, original_filename 
            ORDER BY created_at ASC
          ) as row_num
        FROM images
        WHERE station_id IS NOT NULL
      )
      ${dryRun ? 'SELECT' : 'DELETE FROM images WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1) RETURNING'} 
        id, station_id, original_filename, created_at
      ${dryRun ? 'FROM duplicates WHERE row_num > 1' : ''}
    `);

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('\n🔍 DRY RUN - No changes made to database\n');
    } else {
      await client.query('COMMIT');
      console.log('\n✅ Duplicates deleted successfully\n');
    }

    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🧹 Duplicate Image Cleanup Tool\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Find duplicates
    console.log('\n📊 Step 1: Finding duplicates...\n');
    const duplicates = await findDuplicates();

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found! Database is clean.\n');
      process.exit(0);
    }

    console.log(`⚠️  Found ${duplicates.length} sets of duplicate images:\n`);
    
    let totalDuplicates = 0;
    duplicates.forEach((dup, index) => {
      const dupsToDelete = dup.duplicate_count - 1;
      totalDuplicates += dupsToDelete;
      
      console.log(`${index + 1}. Station ID: ${dup.station_id}`);
      console.log(`   Filename: ${dup.original_filename}`);
      console.log(`   Total copies: ${dup.duplicate_count}`);
      console.log(`   Will delete: ${dupsToDelete} duplicate(s)`);
      console.log(`   Image IDs: ${dup.image_ids.join(', ')}`);
      console.log('');
    });

    console.log(`📈 Total duplicate images to delete: ${totalDuplicates}\n`);

    // Step 2: Dry run
    console.log('📋 Step 2: Dry run (preview what will be deleted)...\n');
    const toDelete = await deleteDuplicates(true);
    
    console.log(`Preview: ${toDelete.length} images would be deleted:\n`);
    toDelete.forEach((img, index) => {
      console.log(`  ${index + 1}. ID: ${img.id}, Station: ${img.station_id}, File: ${img.original_filename}`);
    });

    // Step 3: Confirm deletion
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  WARNING: This will permanently delete duplicate images!');
    console.log('='.repeat(60));
    console.log('\nTo actually delete duplicates, run:');
    console.log('  node cleanup-duplicates.js --confirm\n');

    // Check for --confirm flag
    if (process.argv.includes('--confirm')) {
      console.log('🗑️  Step 3: Deleting duplicates...\n');
      const deleted = await deleteDuplicates(false);
      console.log(`✅ Successfully deleted ${deleted.length} duplicate images\n`);
      
      // Verify
      const remaining = await findDuplicates();
      if (remaining.length === 0) {
        console.log('✅ Verification: No duplicates remain!\n');
      } else {
        console.log(`⚠️  Warning: ${remaining.length} duplicate sets still remain\n`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
