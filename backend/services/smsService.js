/**
 * SMS OTP Service
 * Handles Twilio SMS sending and OTP generation/verification for owner login
 */

const crypto = require('crypto');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;

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
 * Generate a random numeric OTP code
 * @returns {string} e.g. "482917"
 */
function generateOtpCode() {
  // Generate cryptographically secure random digits
  const min = Math.pow(10, OTP_LENGTH - 1); // 100000
  const max = Math.pow(10, OTP_LENGTH) - 1;  // 999999
  const code = crypto.randomInt(min, max + 1);
  return code.toString();
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

  let query = `SELECT id, name, domain, email, phone, is_active FROM owners WHERE phone = $1`;
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
 * Send an OTP code via SMS to the owner's phone
 * @param {string} phone - Phone number to send to
 * @param {string} ownerDomain - Owner's subdomain
 * @returns {Promise<{success: boolean, sessionToken?: string, error?: string}>}
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

  // Generate OTP and session token
  const otpCode = generateOtpCode();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store in owner_magic_links table (reusing table with otp fields)
  await pool.query(
    `INSERT INTO owner_magic_links (owner_id, token, session_token, otp_code, otp_phone, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [owner.id, crypto.randomBytes(32).toString('hex'), sessionToken, otpCode, normalizedPhone, expiresAt]
  );

  // Send SMS via Twilio
  try {
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured in .env');
    }

    await client.messages.create({
      body: `Your Fuel Finder login code is: ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      from: fromNumber,
      to: normalizedPhone,
    });

    logger.info(`📱 SMS OTP sent to ${normalizedPhone} for owner ${owner.name}`);
  } catch (err) {
    logger.error(`Failed to send SMS to ${normalizedPhone}:`, err.message);
    return {
      success: false,
      error: 'Failed to send SMS. Please try another login method.',
    };
  }

  return {
    success: true,
    message: 'If an account exists with this phone, you will receive a code.',
    sessionToken,
  };
}

/**
 * Verify an OTP code submitted by the user
 * @param {string} phone - The phone number that received the OTP
 * @param {string} code - The 6-digit OTP code entered by the user
 * @param {string} ownerDomain - Owner's subdomain
 * @returns {Promise<{valid: boolean, api_key?: string, error?: string}>}
 */
async function verifyOtp(phone, code, ownerDomain) {
  const normalized = normalizePhPhone(phone.replace(/[\s\-\(\)]/g, ''));

  // Find the most recent unexpired, unused OTP for this phone
  const result = await pool.query(
    `SELECT ml.id, ml.otp_code, ml.expires_at, ml.used_at,
            o.id as owner_id, o.name, o.domain, o.api_key, o.email, o.is_active
     FROM owner_magic_links ml
     JOIN owners o ON o.id = ml.owner_id
     WHERE ml.otp_phone = $1
       AND ml.otp_code IS NOT NULL
       AND ml.used_at IS NULL
       AND ml.expires_at > NOW()
     ORDER BY ml.expires_at DESC
     LIMIT 1`,
    [normalized]
  );

  if (result.rows.length === 0) {
    logger.warn(`SMS OTP verification failed: no valid OTP for ${normalized}`);
    return { valid: false, error: 'Invalid or expired code. Please request a new one.' };
  }

  const row = result.rows[0];

  // Verify domain matches
  if (ownerDomain && row.domain !== ownerDomain) {
    return { valid: false, error: 'Invalid or expired code.' };
  }

  // Constant-time comparison to prevent timing attacks
  const codeBuffer = Buffer.from(code);
  const storedBuffer = Buffer.from(row.otp_code);
  if (codeBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(codeBuffer, storedBuffer)) {
    logger.warn(`SMS OTP verification failed: wrong code for ${normalized}`);
    return { valid: false, error: 'Incorrect code. Please try again.' };
  }

  if (!row.is_active) {
    return { valid: false, error: 'Account deactivated. Please contact support.' };
  }

  // Mark as used
  await pool.query(
    `UPDATE owner_magic_links SET used_at = NOW(), verified_api_key = $2 WHERE id = $1`,
    [row.id, row.api_key]
  );

  logger.info(`✅ SMS OTP verified for owner: ${row.name} (${row.domain})`);

  return {
    valid: true,
    api_key: row.api_key,
    owner: {
      name: row.name,
      domain: row.domain,
      email: row.email,
    },
  };
}

module.exports = {
  sendOtp,
  verifyOtp,
  findOwnerByPhone,
  OTP_EXPIRY_MINUTES,
};
