/**
 * Magic Link Service
 * Handles generation and verification of passwordless login tokens for owners
 */

const crypto = require('crypto');
const { pool } = require('../config/database');

// Token configuration
const TOKEN_BYTES = 32; // 64 hex characters
const TOKEN_EXPIRY_MINUTES = 15;

/**
 * Generate a magic link token for an owner
 * @param {number} ownerId - Owner's database ID
 * @param {string} baseUrl - Base URL for the magic link (e.g., https://subdomain.fuelfinder.com)
 * @returns {Promise<{token: string, url: string, expiresAt: Date}>}
 */
async function generateMagicLink(ownerId, baseUrl) {
  // Generate cryptographically secure tokens
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const sessionToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  
  // Calculate expiration time
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
  
  // Store in database with session token for cross-device polling
  await pool.query(
    `INSERT INTO owner_magic_links (owner_id, token, session_token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [ownerId, token, sessionToken, expiresAt]
  );
  
  // Build full URL - must match the backend route in ownerRoutes.js
  const url = `${baseUrl}/api/owner/auth/verify/${token}`;
  
  console.log(`🔗 Magic link generated for owner ${ownerId}, expires at ${expiresAt.toISOString()}`);
  
  return { token, sessionToken, url, expiresAt };
}

/**
 * Verify a magic link token
 * @param {string} token - The token from the magic link URL
 * @returns {Promise<{valid: boolean, owner?: object, error?: string}>}
 */
async function verifyMagicLink(token) {
  // Find the token
  const result = await pool.query(
    `SELECT ml.id, ml.owner_id, ml.expires_at, ml.used_at,
            o.id as owner_id, o.name, o.domain, o.api_key, o.email, o.is_active
     FROM owner_magic_links ml
     JOIN owners o ON o.id = ml.owner_id
     WHERE ml.token = $1`,
    [token]
  );
  
  if (result.rows.length === 0) {
    console.warn(`⚠️ Magic link verification failed: token not found`);
    return { valid: false, error: 'Invalid or expired link' };
  }
  
  const link = result.rows[0];
  
  // Check if already used
  if (link.used_at) {
    console.warn(`⚠️ Magic link already used: ${token.substring(0, 8)}...`);
    return { valid: false, error: 'This link has already been used. Please request a new one.' };
  }
  
  // Check if expired
  if (new Date(link.expires_at) < new Date()) {
    console.warn(`⚠️ Magic link expired: ${token.substring(0, 8)}...`);
    return { valid: false, error: 'This link has expired. Please request a new one.' };
  }
  
  // Check if owner is active
  if (!link.is_active) {
    console.warn(`⚠️ Magic link for inactive owner: ${link.name}`);
    return { valid: false, error: 'Your account has been deactivated. Please contact support.' };
  }
  
  // Mark as used and store API key for cross-device polling
  await pool.query(
    `UPDATE owner_magic_links SET used_at = NOW(), verified_api_key = $2 WHERE id = $1`,
    [link.id, link.api_key]
  );
  
  console.log(`✅ Magic link verified for owner: ${link.name} (${link.domain})`);
  
  return {
    valid: true,
    owner: {
      id: link.owner_id,
      name: link.name,
      domain: link.domain,
      email: link.email,
      api_key: link.api_key
    }
  };
}

/**
 * Check magic link session status (for cross-device polling)
 * PC polls this after requesting a magic link to detect when phone verifies
 * @param {string} sessionToken - The session token returned when requesting the magic link
 * @returns {Promise<{status: 'pending'|'verified'|'expired'|'not_found', apiKey?: string, owner?: object}>}
 */
async function checkMagicLinkStatus(sessionToken) {
  const result = await pool.query(
    `SELECT ml.id, ml.expires_at, ml.used_at, ml.verified_api_key,
            o.name, o.domain, o.email
     FROM owner_magic_links ml
     JOIN owners o ON o.id = ml.owner_id
     WHERE ml.session_token = $1`,
    [sessionToken]
  );
  
  if (result.rows.length === 0) {
    return { status: 'not_found' };
  }
  
  const link = result.rows[0];
  
  // Check if expired
  if (new Date(link.expires_at) < new Date()) {
    return { status: 'expired' };
  }
  
  // Check if verified (phone clicked the link)
  if (link.used_at && link.verified_api_key) {
    return {
      status: 'verified',
      apiKey: link.verified_api_key,
      owner: {
        name: link.name,
        domain: link.domain,
        email: link.email
      }
    };
  }
  
  // Still waiting for phone to click the link
  return { status: 'pending' };
}

/**
 * Find owner by email within a subdomain context
 * @param {string} email - Owner's email address
 * @param {string} domain - Owner's subdomain (optional, for multi-tenant validation)
 * @returns {Promise<object|null>} Owner object or null if not found
 */
async function findOwnerByEmail(email, domain = null) {
  let query = `SELECT id, name, domain, email, is_active FROM owners WHERE email = $1`;
  const params = [email.toLowerCase().trim()];
  
  if (domain) {
    query += ` AND domain = $2`;
    params.push(domain);
  }
  
  const result = await pool.query(query, params);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Cleanup expired and used tokens (call periodically)
 * @returns {Promise<number>} Number of tokens deleted
 */
async function cleanupExpiredTokens() {
  const result = await pool.query(
    `DELETE FROM owner_magic_links 
     WHERE expires_at < NOW() - INTERVAL '1 day'
        OR used_at IS NOT NULL AND used_at < NOW() - INTERVAL '1 day'`
  );
  
  if (result.rowCount > 0) {
    console.log(`🧹 Cleaned up ${result.rowCount} expired/used magic link tokens`);
  }
  
  return result.rowCount;
}

module.exports = {
  generateMagicLink,
  verifyMagicLink,
  checkMagicLinkStatus,
  findOwnerByEmail,
  cleanupExpiredTokens,
  TOKEN_EXPIRY_MINUTES
};
