
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'android_export', 'stations.db');
const imagesDir = path.join(__dirname, 'android_export', 'station_images');

console.log(`Open DB: ${dbPath}`);
if (!fs.existsSync(dbPath)) {
  console.error('DB does not exist!');
  process.exit(1);
}

const db = new Database(dbPath);
const row = db.prepare('SELECT id, name, image_path FROM stations WHERE image_path IS NOT NULL LIMIT 1').get();

if (row) {
  console.log('Sample Station:', row);
  if (row.image_path.startsWith('file:///android_asset/station_images/')) {
    console.log('✅ Image path format is correct');
  } else {
    console.error('❌ Image path format is incorrect:', row.image_path);
  }
} else {
  console.error('❌ No stations with images found');
}

const files = fs.readdirSync(imagesDir);
console.log(`Found ${files.length} images in ${imagesDir}`);
if (files.length > 0) {
    console.log(`Sample image: ${files[0]}`);
}
