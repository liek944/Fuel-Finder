/**
 * Node.js 18 Polyfills for Vercel Serverless environment
 * Fixes crashes caused by newer packages expecting Node 20+ globals
 */

// Polyfill File (needed by undici / @supabase/supabase-js)
if (typeof File === 'undefined') {
  try {
    global.File = require('buffer').File;
  } catch (e) {
    global.File = class File {};
  }
}

// Polyfill DOMMatrix (needed by pdf-parse on load)
if (typeof DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}

// Polyfill DOMPoint (often used with DOMMatrix)
if (typeof DOMPoint === 'undefined') {
  global.DOMPoint = class DOMPoint {};
}

module.exports = {};
