/**
 * Email Service
 * Handles sending transactional emails using nodemailer with Gmail SMTP
 */

const nodemailer = require('nodemailer');
const { getWelcomeEmailTemplate } = require('./emailTemplates');

// SMTP configuration from environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER;

// Create reusable transporter
let transporter = null;

/**
 * Initialize the email transporter
 * @returns {Object|null} Nodemailer transporter or null if not configured
 */
function getTransporter() {
  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.warn('⚠️ Email service not configured: SMTP_USER or SMTP_PASS missing');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }

  return transporter;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @returns {Promise<Object>} Send result or error
 */
async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`📧 [DEV] Would send email to ${to}: "${subject}"`);
    return { success: false, reason: 'Email not configured' };
  }

  try {
    const info = await transport.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to a newly registered user
 * @param {string} email - User's email address
 * @param {string} displayName - User's display name (optional)
 * @returns {Promise<Object>} Send result
 */
async function sendWelcomeEmail(email, displayName) {
  const { subject, html } = getWelcomeEmailTemplate(displayName);
  return sendEmail({ to: email, subject, html });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
};
