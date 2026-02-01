/**
 * Apply Owner Magic Links Migration
 * Run: node database/apply-magic-links-migration.js
 */

const { pool } = require("../config/database");
const fs = require("fs");
const path = require("path");

async function applyMigration() {
  console.log("🔄 Applying owner magic links migration...\n");

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, "migrations/010_add_owner_magic_links.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute the migration
    await pool.query(sql);

    console.log("✅ Owner magic links migration applied successfully!");

    // Verify the table exists
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'owner_magic_links'
      ORDER BY ordinal_position
    `);

    console.log("\n📋 owner_magic_links table structure:");
    result.rows.forEach((col) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
