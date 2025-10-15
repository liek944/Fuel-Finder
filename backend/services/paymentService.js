/**
 * Payment Service - PayMongo Integration
 * Handles all payment processing for donations and subscriptions
 * 
 * @requires axios
 * @requires crypto (built-in)
 */

const axios = require('axios');
const crypto = require('crypto');

class PaymentService {
  constructor() {
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;
    this.webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    this.baseUrl = 'https://api.paymongo.com/v1';
    
    // Base64 encode secret key for Basic Auth
    this.authHeader = Buffer.from(this.secretKey + ':').toString('base64');
    
    // Validate configuration
    if (!this.secretKey || !this.publicKey) {
      console.warn('⚠️  PayMongo credentials not configured. Payment features will not work.');
    }
  }

  /**
   * Check if PayMongo is properly configured
   */
  isConfigured() {
    return !!(this.secretKey && this.publicKey);
  }

  /**
   * Create a PayMongo Payment Intent
   * 
   * @param {number} amount - Amount in PHP (will be converted to centavos)
   * @param {string} description - Payment description
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} PayMongo payment intent
   */
  async createPaymentIntent(amount, description, metadata = {}) {
    if (!this.isConfigured()) {
      throw new Error('PayMongo is not configured. Please add API keys to environment variables.');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/payment_intents`,
        {
          data: {
            attributes: {
              amount: Math.round(amount * 100), // Convert PHP to centavos
              currency: 'PHP',
              description: description,
              statement_descriptor: 'Fuel Finder',
              metadata: {
                ...metadata,
                app: 'fuel_finder',
                version: '1.0'
              }
            }
          }
        },
        {
          headers: {
            Authorization: `Basic ${this.authHeader}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Payment intent created:', response.data.data.id);
      return response.data.data;
    } catch (error) {
      console.error('❌ PayMongo API Error:', error.response?.data || error.message);
      throw new Error(`Failed to create payment intent: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
    }
  }

  /**
   * Create a PayMongo Payment Method
   * 
   * @param {object} details - Payment method details
   * @returns {Promise<object>} PayMongo payment method
   */
  async createPaymentMethod(details) {
    if (!this.isConfigured()) {
      throw new Error('PayMongo is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/payment_methods`,
        {
          data: {
            attributes: {
              type: details.type, // 'card', 'gcash', 'paymaya', etc.
              details: details.details
            }
          }
        },
        {
          headers: {
            Authorization: `Basic ${this.authHeader}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Payment method created:', response.data.data.id);
      return response.data.data;
    } catch (error) {
      console.error('❌ PayMongo API Error:', error.response?.data || error.message);
      throw new Error(`Failed to create payment method: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
    }
  }

  /**
   * Attach a Payment Intent to a Payment Method
   * 
   * @param {string} paymentIntentId - Payment Intent ID
   * @param {string} paymentMethodId - Payment Method ID
   * @param {string} returnUrl - URL to return to after payment
   * @returns {Promise<object>} Updated payment intent
   */
  async attachPaymentIntent(paymentIntentId, paymentMethodId, returnUrl) {
    if (!this.isConfigured()) {
      throw new Error('PayMongo is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/payment_intents/${paymentIntentId}/attach`,
        {
          data: {
            attributes: {
              payment_method: paymentMethodId,
              return_url: returnUrl
            }
          }
        },
        {
          headers: {
            Authorization: `Basic ${this.authHeader}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Payment intent attached:', paymentIntentId);
      return response.data.data;
    } catch (error) {
      console.error('❌ PayMongo API Error:', error.response?.data || error.message);
      throw new Error(`Failed to attach payment intent: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
    }
  }

  /**
   * Retrieve a Payment Intent by ID
   * 
   * @param {string} paymentIntentId - Payment Intent ID
   * @returns {Promise<object>} Payment intent details
   */
  async retrievePaymentIntent(paymentIntentId) {
    if (!this.isConfigured()) {
      throw new Error('PayMongo is not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/payment_intents/${paymentIntentId}`,
        {
          headers: {
            Authorization: `Basic ${this.authHeader}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('❌ PayMongo API Error:', error.response?.data || error.message);
      throw new Error(`Failed to retrieve payment intent: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
    }
  }

  /**
   * Create a PayMongo Payment Link (easier for donations)
   * This generates a hosted checkout page
   * 
   * @param {number} amount - Amount in PHP
   * @param {string} description - Payment description
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Payment link details
   */
  async createPaymentLink(amount, description, metadata = {}) {
    if (!this.isConfigured()) {
      throw new Error('PayMongo is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/links`,
        {
          data: {
            attributes: {
              amount: Math.round(amount * 100),
              description: description,
              remarks: metadata.remarks || 'Fuel Finder Donation',
              payment_method_types: ['gcash', 'paymaya', 'card', 'billease', 'dob', 'dob_ubp']
            }
          }
        },
        {
          headers: {
            Authorization: `Basic ${this.authHeader}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Payment link created:', response.data.data.id);
      return response.data.data;
    } catch (error) {
      console.error('❌ PayMongo API Error:', error.response?.data || error.message);
      throw new Error(`Failed to create payment link: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
    }
  }

  /**
   * Verify PayMongo Webhook Signature
   * 
   * @param {string} payload - Raw request body
   * @param {string} signature - Signature from headers
   * @returns {boolean} Whether signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('⚠️  Webhook secret not configured, skipping signature verification');
      return true; // Allow in development
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('❌ Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse webhook event data
   * 
   * @param {object} event - Webhook event object
   * @returns {object} Parsed event data
   */
  parseWebhookEvent(event) {
    const eventType = event.data.attributes.type;
    const eventData = event.data.attributes.data;

    return {
      type: eventType,
      id: eventData.id,
      attributes: eventData.attributes,
      raw: event
    };
  }

  /**
   * Format amount for display (centavos to PHP)
   * 
   * @param {number} centavos - Amount in centavos
   * @returns {string} Formatted amount in PHP
   */
  formatAmount(centavos) {
    const php = centavos / 100;
    return `₱${php.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Calculate payment processing fee
   * PayMongo: 3.5% + ₱15 per transaction
   * 
   * @param {number} amount - Amount in PHP
   * @returns {object} Fee breakdown
   */
  calculateFee(amount) {
    const percentageFee = amount * 0.035;
    const fixedFee = 15;
    const totalFee = percentageFee + fixedFee;
    const netAmount = amount - totalFee;

    return {
      grossAmount: amount,
      percentageFee: percentageFee,
      fixedFee: fixedFee,
      totalFee: totalFee,
      netAmount: netAmount
    };
  }
}

// Export singleton instance
module.exports = new PaymentService();
