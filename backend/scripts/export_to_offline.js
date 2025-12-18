#!/usr/bin/env node
/**
 * Export Script: Postgres → SQLite for Android Offline App
 * 
 * This script exports fuel station data from Postgres to SQLite format
 * compatible with Android Room database.
 * 
 * Usage: node export_to_offline.js
 * Output: ../android_export/stations.db
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'android_export');
const DB_OUTPUT = path.join(OUTPUT_DIR, 'stations.db');
const IMAGES_OUTPUT = path.join(OUTPUT_DIR, 'station_images');
const POI_IMAGES_OUTPUT = path.join(OUTPUT_DIR, 'poi_images');

// Postgres configuration
const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fuel_finder',
  password: process.env.DB_PASSWORD || 'password',
  port: Number(process.env.DB_PORT || 5432),
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

/**
 * Create output directories
 */
function ensureDirectories() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created directory: ${OUTPUT_DIR}`);
  }
  if (!fs.existsSync(IMAGES_OUTPUT)) {
    fs.mkdirSync(IMAGES_OUTPUT, { recursive: true });
    console.log(`✅ Created directory: ${IMAGES_OUTPUT}`);
  }
  if (!fs.existsSync(POI_IMAGES_OUTPUT)) {
    fs.mkdirSync(POI_IMAGES_OUTPUT, { recursive: true });
    console.log(`✅ Created directory: ${POI_IMAGES_OUTPUT}`);
  }
}

/**
 * Create SQLite database with Room-compatible schema
 */
function createSQLiteDatabase() {
  // Remove existing database
  if (fs.existsSync(DB_OUTPUT)) {
    fs.unlinkSync(DB_OUTPUT);
    console.log('🗑️  Removed existing database');
  }

  const db = new Database(DB_OUTPUT);
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  
  // Create stations table (Room Entity compatible)
  db.exec(`
    CREATE TABLE stations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      services TEXT,
      operating_hours TEXT,
      image_path TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  
  // Create fuel_prices table (Room Entity compatible)
  db.exec(`
    CREATE TABLE fuel_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      fuel_type TEXT NOT NULL,
      price REAL NOT NULL,
      price_updated_at TEXT,
      price_updated_by TEXT,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
      UNIQUE(station_id, fuel_type)
    );
  `);
  
  // Create indexes for efficient queries
  db.exec(`
    CREATE INDEX idx_stations_brand ON stations(brand);
    CREATE INDEX idx_stations_location ON stations(lat, lng);
    CREATE INDEX idx_fuel_prices_station ON fuel_prices(station_id);
    CREATE INDEX idx_fuel_prices_type ON fuel_prices(fuel_type);
  `);

  // Create pois table (Room Entity compatible)
  db.exec(`
    CREATE TABLE pois (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      operating_hours TEXT,
      image_path TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  
  // Create indexes for pois
  db.exec(`
    CREATE INDEX idx_pois_type ON pois(type);
    CREATE INDEX idx_pois_location ON pois(lat, lng);
  `);
  
  console.log('✅ Created SQLite database with Room-compatible schema');
  return db;
}

/**
 * Fetch all stations from Postgres
 */
async function fetchStations() {
  const query = `
    SELECT
      s.id,
      s.name,
      s.brand,
      s.address,
      s.phone,
      s.services,
      s.operating_hours,
      ST_Y(s.geom) AS lat,
      ST_X(s.geom) AS lng,
      s.created_at,
      s.updated_at,
      (
        SELECT i.filename
        FROM images i
        WHERE i.station_id = s.id AND i.is_primary = true
        LIMIT 1
      ) AS primary_image
    FROM stations s
    ORDER BY s.id;
  `;
  
  const result = await pool.query(query);
  console.log(`📊 Fetched ${result.rows.length} stations from Postgres`);
  return result.rows;
}

/**
 * Fetch all fuel prices from Postgres
 */
async function fetchFuelPrices() {
  const query = `
    SELECT
      id,
      station_id,
      fuel_type,
      price,
      price_updated_at,
      price_updated_by
    FROM fuel_prices
    ORDER BY station_id, fuel_type;
  `;
  
  const result = await pool.query(query);
  console.log(`📊 Fetched ${result.rows.length} fuel prices from Postgres`);
  return result.rows;
}

/**
 * Fetch all images from Postgres for download
 */
async function fetchImages() {
  const query = `
    SELECT
      id,
      filename,
      station_id,
      is_primary
    FROM images
    WHERE station_id IS NOT NULL
    ORDER BY station_id, is_primary DESC, display_order;
  `;
  
  const result = await pool.query(query);
  console.log(`📊 Fetched ${result.rows.length} image records from Postgres`);
  return result.rows;
}

/**
 * Fetch all POIs from Postgres
 */
async function fetchPois() {
  const query = `
    SELECT
      p.id,
      p.name,
      p.type,
      p.address,
      p.phone,
      p.operating_hours,
      ST_Y(p.geom) AS lat,
      ST_X(p.geom) AS lng,
      p.created_at,
      p.updated_at,
      (
        SELECT i.filename
        FROM images i
        WHERE i.poi_id = p.id AND i.is_primary = true
        LIMIT 1
      ) AS primary_image
    FROM pois p
    ORDER BY p.id;
  `;
  
  const result = await pool.query(query);
  console.log(`📊 Fetched ${result.rows.length} POIs from Postgres`);
  return result.rows;
}

/**
 * Fetch all POI images from Postgres for download
 */
async function fetchPoiImages() {
  const query = `
    SELECT
      id,
      filename,
      poi_id,
      is_primary
    FROM images
    WHERE poi_id IS NOT NULL
    ORDER BY poi_id, is_primary DESC, display_order;
  `;
  
  const result = await pool.query(query);
  console.log(`📊 Fetched ${result.rows.length} POI image records from Postgres`);
  return result.rows;
}

/**
 * Download an image from URL to local file
 * @param {string} imageUrl - Source URL
 * @param {string} destPath - Destination file path
 */
function downloadImage(imageUrl, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    
    protocol.get(imageUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        file.close();
        fs.unlinkSync(destPath);
        downloadImage(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      } else {
        console.log(`    Status Code: ${response.statusCode}`);
        file.close();
        fs.unlinkSync(destPath);
        resolve(false);
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      console.error(`❌ Download error: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Download station images from Supabase storage
 * @param {Array} images - Image records from database
 */
async function downloadStationImages(images) {
  const supabaseUrl = process.env.SUPABASE_URL;
  
  if (!supabaseUrl) {
    console.log('⚠️  SUPABASE_URL not set, skipping image downloads');
    console.log('   Images will need to be downloaded manually or from backend API');
    return;
  }
  
  console.log('\n📥 Downloading station images...');
  
  let downloaded = 0;
  let failed = 0;
  
  for (const img of images) {
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/station-images/stations/${img.filename}`;
    const destPath = path.join(IMAGES_OUTPUT, `${img.station_id}.jpg`);
    
    // Only download primary images (one per station)
    if (!img.is_primary) continue;
    
    // Skip if already downloaded
    if (fs.existsSync(destPath)) {
      downloaded++;
      continue;
    }
    
    const success = await downloadImage(imageUrl, destPath);
    if (success) {
      downloaded++;
      console.log(`  ✓ Station ${img.station_id}`);
    } else {
      failed++;
      console.log(`  ✗ Station ${img.station_id} (failed)`);
      console.log(`    Filename: ${img.filename}`);
      console.log(`    URL: ${imageUrl}`);
    }
  }
  
  console.log(`\n📊 Images: ${downloaded} downloaded, ${failed} failed`);
}

/**
 * Download POI images from Supabase storage
 * @param {Array} images - Image records from database
 */
async function downloadPoiImages(images) {
  const supabaseUrl = process.env.SUPABASE_URL;
  
  if (!supabaseUrl) return; // Already logged warning in station images download
  
  console.log('\n📥 Downloading POI images...');
  
  let downloaded = 0;
  let failed = 0;
  
  for (const img of images) {
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/station-images/pois/${img.filename}`;
    const destPath = path.join(POI_IMAGES_OUTPUT, `${img.poi_id}.jpg`);
    
    // Only download primary images (one per POI)
    if (!img.is_primary) continue;
    
    // Skip if already downloaded
    if (fs.existsSync(destPath)) {
      downloaded++;
      continue;
    }
    
    const success = await downloadImage(imageUrl, destPath);
    if (success) {
      downloaded++;
      console.log(`  ✓ POI ${img.poi_id}`);
    } else {
      failed++;
      console.log(`  ✗ POI ${img.poi_id} (failed)`);
    }
  }
  
  console.log(`\n📊 POI Images: ${downloaded} downloaded, ${failed} failed`);
}

/**
 * Insert stations into SQLite
 */
function insertStations(db, stations) {
  const stmt = db.prepare(`
    INSERT INTO stations (id, name, brand, address, phone, lat, lng, services, operating_hours, image_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((stationList) => {
    for (const s of stationList) {
      // Convert services array to comma-separated string
      const services = Array.isArray(s.services) ? s.services.join(',') : (s.services || '');
      
      // Convert operating_hours JSON to string
      const operatingHours = s.operating_hours ? JSON.stringify(s.operating_hours) : null;
      
      // Set image path for Android assets
      const imagePath = s.primary_image 
        ? `file:///android_asset/station_images/${s.id}.jpg`
        : null;
      
      stmt.run(
        s.id,
        s.name,
        s.brand,
        s.address,
        s.phone,
        s.lat,
        s.lng,
        services,
        operatingHours,
        imagePath,
        s.created_at?.toISOString() || null,
        s.updated_at?.toISOString() || null
      );
    }
  });
  
  insertMany(stations);
  console.log(`✅ Inserted ${stations.length} stations into SQLite`);
}

/**
 * Insert fuel prices into SQLite
 */
function insertFuelPrices(db, fuelPrices) {
  const stmt = db.prepare(`
    INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_at, price_updated_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((priceList) => {
    for (const fp of priceList) {
      stmt.run(
        fp.station_id,
        fp.fuel_type,
        parseFloat(fp.price),
        fp.price_updated_at?.toISOString() || null,
        fp.price_updated_by
      );
    }
  });
  
  insertMany(fuelPrices);
  console.log(`✅ Inserted ${fuelPrices.length} fuel prices into SQLite`);
}

/**
 * Insert POIs into SQLite
 */
function insertPois(db, pois) {
  const stmt = db.prepare(`
    INSERT INTO pois (id, name, type, address, phone, lat, lng, operating_hours, image_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((poiList) => {
    for (const p of poiList) {
      // Convert operating_hours JSON to string
      const operatingHours = p.operating_hours ? JSON.stringify(p.operating_hours) : null;
      
      // Set image path for Android assets
      const imagePath = p.primary_image 
        ? `file:///android_asset/poi_images/${p.id}.jpg`
        : null;
      
      stmt.run(
        p.id,
        p.name,
        p.type,
        p.address,
        p.phone,
        p.lat,
        p.lng,
        operatingHours,
        imagePath,
        p.created_at?.toISOString() || null,
        p.updated_at?.toISOString() || null
      );
    }
  });
  
  insertMany(pois);
  console.log(`✅ Inserted ${pois.length} POIs into SQLite`);
}

/**
 * Generate summary statistics
 */
function generateSummary(db) {
  const stationCount = db.prepare('SELECT COUNT(*) as count FROM stations').get();
  const priceCount = db.prepare('SELECT COUNT(*) as count FROM fuel_prices').get();
  const poiCount = db.prepare('SELECT COUNT(*) as count FROM pois').get();
  const brandStats = db.prepare('SELECT brand, COUNT(*) as count FROM stations GROUP BY brand ORDER BY count DESC').all();
  const fuelTypeStats = db.prepare('SELECT fuel_type, COUNT(*) as count FROM fuel_prices GROUP BY fuel_type ORDER BY count DESC').all();
  const poiTypeStats = db.prepare('SELECT type, COUNT(*) as count FROM pois GROUP BY type ORDER BY count DESC').all();
  
  console.log('\n📊 Export Summary:');
  console.log('─'.repeat(40));
  console.log(`Total Stations: ${stationCount.count}`);
  console.log(`Total Fuel Prices: ${priceCount.count}`);
  console.log(`Total POIs: ${poiCount.count}`);
  console.log('\nStations by Brand:');
  brandStats.forEach(b => console.log(`  ${b.brand}: ${b.count}`));
  console.log('\nPrices by Fuel Type:');
  fuelTypeStats.forEach(f => console.log(`  ${f.fuel_type}: ${f.count}`));
  console.log('\nPOIs by Type:');
  poiTypeStats.forEach(p => console.log(`  ${p.type}: ${p.count}`));
  console.log('─'.repeat(40));
  
  // Get file size
  const stats = fs.statSync(DB_OUTPUT);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n📦 Output: ${DB_OUTPUT}`);
  console.log(`📦 Size: ${fileSizeMB} MB`);
}

/**
 * Main export function
 */
async function main() {
  console.log('═'.repeat(50));
  console.log('🚀 Fuel Finder - Postgres to SQLite Export');
  console.log('═'.repeat(50));
  console.log();
  
  try {
    // Test Postgres connection
    console.log('🔌 Connecting to Postgres...');
    await pool.query('SELECT 1');
    console.log('✅ Postgres connection successful\n');
    
    // Create directories
    ensureDirectories();
    
    // Create SQLite database
    const db = createSQLiteDatabase();
    
    // Fetch data from Postgres
    console.log('\n📡 Fetching data from Postgres...');
    const [stations, fuelPrices, stationImages, pois, poiImages] = await Promise.all([
      fetchStations(),
      fetchFuelPrices(),
      fetchImages(),
      fetchPois(),
      fetchPoiImages()
    ]);
    
    // Insert into SQLite
    console.log('\n💾 Writing to SQLite...');
    insertStations(db, stations);
    insertFuelPrices(db, fuelPrices);
    insertPois(db, pois);
    
    // Vacuum to optimize
    db.exec('VACUUM');
    
    // Close database
    db.close();
    
    // Download images (optional, based on SUPABASE_URL)
    await downloadStationImages(stationImages);
    await downloadPoiImages(poiImages);
    
    // Generate summary
    const reopenedDb = new Database(DB_OUTPUT);
    generateSummary(reopenedDb);
    reopenedDb.close();
    
    console.log('\n✅ Export completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Copy android_export/stations.db to APK assets/db/');
    console.log('   2. Copy android_export/station_images/ to APK assets/station_images/');
    console.log('   3. Copy android_export/poi_images/ to APK assets/poi_images/');
    
  } catch (err) {
    console.error('\n❌ Export failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
main();
