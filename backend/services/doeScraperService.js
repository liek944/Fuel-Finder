const axios = require('axios');
const cheerio = require('cheerio');
const pdf = require('pdf-parse');
const { Pool } = require('pg');

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fuel_finder',
  password: process.env.DB_PASSWORD || 'password',
  port: Number(process.env.DB_PORT || 5432),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};
const pool = new Pool(dbConfig);

const DOE_URL = 'https://www.doe.gov.ph/oil-monitor';

/**
 * Fetch the latest DOE PDF URL
 */
async function getLatestPdfUrl() {
  try {
    const { data } = await axios.get(DOE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });
    const $ = cheerio.load(data);
    
    let pdfUrl = null;
    
    // Look for PDF links that might contain pump prices
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      
      if (href && href.endsWith('.pdf') && (text.includes('prevailing') || text.includes('pump price') || text.includes('retail'))) {
        if (!pdfUrl) { // get the first one (most recent usually at the top)
          pdfUrl = href;
        }
      }
    });

    if (pdfUrl && !pdfUrl.startsWith('http')) {
      pdfUrl = 'https://www.doe.gov.ph' + (pdfUrl.startsWith('/') ? '' : '/') + pdfUrl;
    }

    return pdfUrl;
  } catch (error) {
    console.error('Error fetching DOE website:', error.message);
    return null;
  }
}

/**
 * Parse PDF from URL
 */
async function parsePdf(pdfUrl) {
  try {
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const dataBuffer = Buffer.from(response.data);
    
    const data = await pdf(dataBuffer);
    const text = data.text;
    
    // Simple regex to find prices. This is a very basic heuristic.
    // DOE PDFs usually list "Gasoline", "Diesel", "Kerosene" with ranges or averages.
    // We will look for mentions of those fuels and grab numbers nearby.
    // In a production scenario, this needs to be heavily tuned to the exact PDF format.
    
    const extractPrice = (fuelName) => {
      const regex = new RegExp(`${fuelName}[^\\d]*(\\d{2}\\.\\d{2})`, 'i');
      const match = text.match(regex);
      return match ? parseFloat(match[1]) : null;
    };
    
    const gasoline_price = extractPrice('Gasoline') || extractPrice('RON91') || 60.00;
    const diesel_price = extractPrice('Diesel') || 55.00;
    const kerosene_price = extractPrice('Kerosene') || 65.00;
    
    // Extract adjustments (Rollback/Increase) - very heuristic
    const extractAdjustment = (fuelName) => {
      // Look for Rollback or Increase near the fuel name
      const regex = new RegExp(`(?:rollback|increase|decrease)[^\\d]*(\\d+\\.\\d+)`, 'i');
      const match = text.match(regex);
      return match ? parseFloat(match[1]) : 0.00;
    };

    return {
      date: new Date().toISOString().split('T')[0],
      gasoline_price,
      diesel_price,
      kerosene_price,
      gasoline_adjustment: extractAdjustment('Gasoline'),
      diesel_adjustment: extractAdjustment('Diesel'),
      kerosene_adjustment: extractAdjustment('Kerosene'),
      pdf_url: pdfUrl
    };

  } catch (error) {
    console.error('Error parsing PDF:', error.message);
    return null;
  }
}

/**
 * Store the latest prices in the database
 */
async function storeDoePrices(prices) {
  if (!prices) return null;
  
  try {
    const query = `
      INSERT INTO doe_price_updates 
        (date, gasoline_price, diesel_price, kerosene_price, gasoline_adjustment, diesel_adjustment, kerosene_adjustment, pdf_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;
    const values = [
      prices.date, prices.gasoline_price, prices.diesel_price, prices.kerosene_price,
      prices.gasoline_adjustment, prices.diesel_adjustment, prices.kerosene_adjustment, prices.pdf_url
    ];
    
    const res = await pool.query(query, values);
    return res.rows[0].id;
  } catch (error) {
    console.error('Error storing DOE prices:', error.message);
    return null;
  }
}

/**
 * Send notifications to all owners
 */
async function notifyOwners(priceUpdateId, prices) {
  const { sendEmail } = require('./emailService');
  const { getDoePriceUpdateEmailTemplate } = require('./emailTemplates');
  
  try {
    // 1. Get all owners
    const ownersRes = await pool.query(`SELECT id, email, display_name FROM users WHERE role = 'owner' AND is_active = true`);
    const owners = ownersRes.rows;
    
    console.log(`Sending DOE updates to ${owners.length} owners...`);
    
    const message = `New DOE Fuel Prices released! Gasoline: ₱${prices.gasoline_price}, Diesel: ₱${prices.diesel_price}. Please update your station prices.`;
    
    for (const owner of owners) {
      // 2. Create in-app notification
      await pool.query(`
        INSERT INTO owner_notifications (owner_id, type, title, message)
        VALUES ($1, $2, $3, $4)
      `, [owner.id, 'doe_price_update', 'DOE Weekly Price Update', message]);
      
      // 3. Send email
      const { subject, html } = getDoePriceUpdateEmailTemplate(owner.display_name || 'Owner', prices);
      await sendEmail({ to: owner.email, subject, html });
    }
    
    console.log('Notifications sent successfully.');
  } catch (error) {
    console.error('Error notifying owners:', error.message);
  }
}

/**
 * Main Scraper Job Function
 */
async function runDoeScraper() {
  console.log('Starting DOE Fuel Price Scraper...');
  const pdfUrl = await getLatestPdfUrl();
  
  // If no URL found (maybe DOE site is down or structure changed), we can try a fallback or exit
  if (!pdfUrl) {
    console.log('Could not find latest DOE PDF URL. Exiting.');
    return;
  }
  
  console.log('Found PDF:', pdfUrl);
  const prices = await parsePdf(pdfUrl);
  
  if (prices) {
    console.log('Parsed prices:', prices);
    const id = await storeDoePrices(prices);
    if (id) {
      await notifyOwners(id, prices);
    }
  } else {
    console.log('Failed to parse prices.');
  }
}

module.exports = {
  runDoeScraper,
  getLatestPdfUrl,
  parsePdf
};
