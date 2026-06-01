const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { runDoeScraper } = require('../services/doeScraperService');

/**
 * Get latest DOE price update
 */
router.get('/latest', async (req, res) => {
  try {
    const query = `
      SELECT * FROM doe_price_updates 
      ORDER BY date DESC 
      LIMIT 1
    `;
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching latest DOE prices:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Admin trigger to run scraper manually
 */
router.post('/trigger-scraper', async (req, res) => {
  try {
    // Fire and forget
    runDoeScraper().catch(e => console.error("Manual trigger failed:", e));
    res.json({ success: true, message: 'Scraper triggered manually.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
