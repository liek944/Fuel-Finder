#!/usr/bin/env node
/**
 * Automatically version the service worker with current timestamp
 * Run this during build to ensure SW updates on every deployment
 */

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, 'build', 'sw.js');
const buildTime = Date.now();

// Read the built service worker
let swContent = fs.readFileSync(swPath, 'utf8');

// Replace the placeholder with actual timestamp
swContent = swContent.replace('__BUILD_TIME__', buildTime);

// Write back
fs.writeFileSync(swPath, swContent, 'utf8');

console.log(`✅ Service Worker versioned: v${buildTime}`);
console.log(`📝 This ensures automatic updates on every deployment`);
