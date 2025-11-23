/**
 * Owner Detection Middleware
 * Detects subdomain from request hostname and attaches owner context
 * 
 * This middleware enables multi-tenant architecture where each station owner
 * accesses the system through their own subdomain (e.g., castillonfuels.fuelfinder.com)
 */

const { pool } = require("../config/database");
const { LRUCache } = require("lru-cache");

// Initialize cache for owner lookups
// Cache up to 100 owners for 5 minutes to reduce database load
const ownerCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});

/**
 * Extract subdomain from hostname
 * @param {string} hostname - Request hostname (e.g., "castillonfuels.fuelfinder.com")
 * @returns {string|null} - Subdomain or null if not found
 * 
 * Examples:
 * - castillonfuels.fuelfinder.com -> "castillonfuels"
 * - santosgas.fuelfinder.com -> "santosgas"
 * - fuelfinder.com -> null (main domain, no subdomain)
 * - localhost:3000 -> null (local development)
 */
function extractSubdomain(hostname) {
  if (!hostname) return null;

  // Remove port if present (e.g., "localhost:3000" -> "localhost")
  const host = hostname.split(':')[0];

  // Split by dots
  const parts = host.split('.');

  // Handle different scenarios:
  // 1. localhost or IP address -> no subdomain
  if (parts.length <= 1 || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  // 2. subdomain.domain.tld (e.g., castillonfuels.fuelfinder.com)
  if (parts.length >= 3) {
    // Get the first part (subdomain)
    const subdomain = parts[0];

    // Ignore common prefixes that aren't owner subdomains
    if (subdomain === 'www' || subdomain === 'api' || subdomain === 'admin') {
      return null;
    }

    return subdomain;
  }

  // 3. domain.tld only (e.g., fuelfinder.com) -> no subdomain
  return null;
}

/**
 * Middleware to detect owner from subdomain OR x-owner-domain header
 * Attaches req.owner and req.ownerData to the request object
 * 
 * Supports two detection methods:
 * 1. Subdomain from hostname (e.g., ifuel-dangay.fuelfinder.com)
 * 2. x-owner-domain header (for Netlify/Vercel deployments where frontend is on different domain)
 */
async function detectOwner(req, res, next) {
  try {
    let subdomain = null;

    // Method 1: PRIORITIZE x-owner-domain header (for Netlify/Vercel deployments)
    // This is needed when frontend is deployed separately from backend
    const ownerDomainHeader = req.header("x-owner-domain");
    if (ownerDomainHeader) {
      subdomain = ownerDomainHeader;
      // console.log(`🏷️  Owner domain from header: ${subdomain}`);
    }

    // Method 2: If no header, try to extract subdomain from hostname
    if (!subdomain) {
      subdomain = extractSubdomain(req.hostname);
      if (subdomain) {
        // console.log(`🔍 Owner domain from hostname: ${subdomain} (${req.hostname})`);
      }
    }

    if (!subdomain) {
      // No subdomain detected - this is a public/main domain request
      req.owner = null;
      req.ownerData = null;
      // console.log(`🌐 Public request from: ${req.hostname}`);
      return next();
    }

    // CHECK CACHE FIRST
    if (ownerCache.has(subdomain)) {
      const cachedOwner = ownerCache.get(subdomain);
      req.owner = cachedOwner.domain;
      req.ownerData = cachedOwner;
      // console.log(`⚡ Cached owner detected: ${cachedOwner.name}`);
      return next();
    }

    // Look up owner in database by subdomain
    const result = await pool.query(
      `SELECT id, name, domain, email, contact_person, phone, is_active, created_at, theme_config
       FROM owners 
       WHERE domain = $1 AND is_active = TRUE`,
      [subdomain]
    );

    if (result.rows.length === 0) {
      // Subdomain doesn't match any active owner
      console.warn(`⚠️  Unknown subdomain: ${subdomain} (from ${req.hostname})`);

      return res.status(404).json({
        error: "Owner not found",
        message: `Subdomain '${subdomain}' is not registered. Please check your URL.`,
        subdomain: subdomain
      });
    }

    // Attach owner data to request
    const owner = result.rows[0];
    req.owner = owner.domain; // Just the subdomain string
    req.ownerData = owner; // Full owner object

    // STORE IN CACHE
    ownerCache.set(subdomain, owner);

    console.log(`👤 Owner request detected: ${owner.name} (${owner.domain}) from ${req.hostname}`);

    next();
  } catch (error) {
    console.error("❌ Error in owner detection middleware:", error);
    next(error);
  }
}

/**
 * Middleware that requires an owner to be detected
 * Use this for owner-only endpoints
 */
function requireOwner(req, res, next) {
  if (!req.owner || !req.ownerData) {
    return res.status(403).json({
      error: "Owner access required",
      message: "This endpoint requires access through an owner subdomain (e.g., yourcompany.fuelfinder.com)",
      hint: "Make sure you're accessing the system through your assigned subdomain"
    });
  }
  next();
}

/**
 * Optional owner detection (doesn't fail if no owner)
 * Use this for endpoints that work for both public and owner-specific requests
 */
async function optionalOwnerDetection(req, res, next) {
  try {
    const subdomain = extractSubdomain(req.hostname);

    if (subdomain) {
      // CHECK CACHE FIRST
      if (ownerCache.has(subdomain)) {
        const cachedOwner = ownerCache.get(subdomain);
        req.owner = cachedOwner.domain;
        req.ownerData = cachedOwner;
        return next();
      }

      const result = await pool.query(
        `SELECT id, name, domain, email, is_active, theme_config
         FROM owners 
         WHERE domain = $1 AND is_active = TRUE`,
        [subdomain]
      );

      if (result.rows.length > 0) {
        const owner = result.rows[0];
        req.owner = owner.domain;
        req.ownerData = owner;

        // STORE IN CACHE
        ownerCache.set(subdomain, owner);
      }
    }

    next();
  } catch (error) {
    console.error("❌ Error in optional owner detection:", error);
    next();
  }
}

module.exports = {
  extractSubdomain,
  detectOwner,
  requireOwner,
  optionalOwnerDetection
};
