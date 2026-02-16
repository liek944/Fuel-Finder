/**
 * SMS OTP Service — Twilio Verify API
 * Uses Twilio's purpose-built Verify service instead of raw Programmable Messaging.
 * Twilio generates, delivers, and validates OTP codes server-side.
 */

const crypto = require('crypto');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Initialize Twilio client (lazy, so missing env vars don't crash on boot)
 */
let _twilioClient = null;
function getTwilioClient() {
  if (!_twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env'
      );
    }

    const twilio = require('twilio');
    _twilioClient = twilio(accountSid, authToken);
  }
  return _twilioClient;
}

/**
 * Get the Verify Service SID from env
 */
function getVerifyServiceSid() {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) {
    throw new Error(
      'TWILIO_VERIFY_SERVICE_SID not configured. Create a Verify Service at https://www.twilio.com/console/verify/services'
    );
  }
  return sid;
}

/**
 * Normalize Philippine phone numbers to international E.164 format
 * 09XXXXXXXXX  → +639XXXXXXXXX
 * 639XXXXXXXXX → +639XXXXXXXXX
 * +639XXXXXXXXX → +639XXXXXXXXX (unchanged)
 * @param {string} phone - Raw phone string (already stripped of spaces/dashes)
 * @returns {string}
 */
function normalizePhPhone(phone) {
  // Already international with +
  if (phone.startsWith('+')) return phone;

  // Local PH mobile: 09XXXXXXXXX → +639XXXXXXXXX
  if (phone.startsWith('09') && phone.length === 11) {
    return '+63' + phone.slice(1);
  }

  // Missing + prefix: 639XXXXXXXXX → +639XXXXXXXXX
  if (phone.startsWith('63') && phone.length === 12) {
    return '+' + phone;
  }

  return phone;
}

/**
 * Find owner by phone number within a subdomain context
 * @param {string} phone - Owner's phone number
 * @param {string} domain - Owner's subdomain (optional)
 * @returns {Promise<object|null>}
 */
async function findOwnerByPhone(phone, domain = null) {
  // Normalize: strip spaces, dashes, parens — keep only digits and leading +
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  // Convert PH local format to international
  normalized = normalizePhPhone(normalized);

  let query = `SELECT id, name, domain, email, phone, api_key, is_active FROM owners WHERE phone = $1`;
  const params = [normalized];

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
 * Send a verification code via Twilio Verify API
 * @param {string} phone - Phone number to send to
 * @param {string} ownerDomain - Owner's subdomain
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function sendOtp(phone, ownerDomain) {
  // Normalize phone to E.164 before lookup and Twilio send
  const normalizedPhone = normalizePhPhone(phone.replace(/[\s\-\(\)]/g, ''));
  const owner = await findOwnerByPhone(normalizedPhone, ownerDomain);

  if (!owner) {
    // Don't reveal whether phone exists — return generic success
    logger.warn(`SMS OTP requested for unknown phone (domain: ${ownerDomain})`);
    return { success: true, message: 'If an account exists with this phone, you will receive a code.' };
  }

  if (!owner.is_active) {
    return { success: false, error: 'Account deactivated. Please contact support.' };
  }

  // Send verification via Twilio Verify API
  try {
    const client = getTwilioClient();
    const serviceSid = getVerifyServiceSid();

    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: normalizedPhone,
        channel: 'sms',
      });

    logger.info(`📱 Twilio Verify sent to ${normalizedPhone} for owner ${owner.name} (status: ${verification.status})`);
  } catch (err) {
    logger.error(`Failed to send Verify SMS to ${normalizedPhone}:`, err.message, `Code: ${err.code || 'N/A'}`);
    return {
      success: false,
      error: 'Failed to send SMS. Please try another login method.',
      details: err.code ? `Twilio error ${err.code}: ${err.message}` : err.message,
    };
  }

  return {
    success: true,
    message: 'If an account exists with this phone, you will receive a code.',
  };
}

/**
 * Verify an OTP code via Twilio Verify API and return owner credentials
 * @param {string} phone - The phone number that received the OTP
 * @param {string} code - The OTP code entered by the user
 * @param {string} ownerDomain - Owner's subdomain
 * @returns {Promise<{valid: boolean, api_key?: string, error?: string}>}
 */
async function verifyOtp(phone, code, ownerDomain) {
  const normalizedPhone = normalizePhPhone(phone.replace(/[\s\-\(\)]/g, ''));

  // Check the code via Twilio Verify API
  let verificationCheck;
  try {
    const client = getTwilioClient();
    const serviceSid = getVerifyServiceSid();

    verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: normalizedPhone,
        code: code,
      });
  } catch (err) {
    logger.error(`Twilio Verify check failed for ${normalizedPhone}:`, err.message);
    return { valid: false, error: 'Verification failed. Please request a new code.' };
  }

  if (verificationCheck.status !== 'approved') {
    logger.warn(`SMS OTP verification failed: status=${verificationCheck.status} for ${normalizedPhone}`);
    return { valid: false, error: 'Incorrect code. Please try again.' };
  }

  // Code is valid — look up the owner
  const owner = await findOwnerByPhone(normalizedPhone, ownerDomain);

  if (!owner) {
    logger.warn(`SMS OTP verified but no owner found for ${normalizedPhone}`);
    return { valid: false, error: 'Invalid or expired code.' };
  }

  if (!owner.is_active) {
    return { valid: false, error: 'Account deactivated. Please contact support.' };
  }

  // Record the login in owner_magic_links for audit trail
  try {
    await pool.query(
      `INSERT INTO owner_magic_links (owner_id, token, otp_phone, used_at, verified_api_key, expires_at)
       VALUES ($1, $2, $3, NOW(), $4, NOW() + INTERVAL '5 minutes')`,
      [owner.id, crypto.randomBytes(32).toString('hex'), normalizedPhone, owner.api_key]
    );
  } catch (auditErr) {
    // Non-fatal — don't block login if audit insert fails
    logger.error('Failed to write OTP audit log:', auditErr.message);
  }

  logger.info(`✅ SMS OTP verified via Twilio Verify for owner: ${owner.name} (${owner.domain})`);

  return {
    valid: true,
    api_key: owner.api_key,
    owner: {
      name: owner.name,
      domain: owner.domain,
      email: owner.email,
    },
  };
}

module.exports = {
  sendOtp,
  verifyOtp,
  findOwnerByPhone,
};
