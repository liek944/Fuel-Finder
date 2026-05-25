const express = require('express');
const router = express.Router();
const pool = require('../database/db');

// GET /api/regional-prices
// Fetches the latest average fuel prices for Oriental Mindoro
router.get('/', async (req, res) => {
    try {
        // Query to get the latest average price for each fuel type
        const query = `
            SELECT DISTINCT ON (fuel_type) 
                fuel_type, 
                average_price, 
                created_at, 
                data_sources 
            FROM regional_fuel_prices 
            WHERE region_name = 'Oriental Mindoro'
            ORDER BY fuel_type, created_at DESC;
        `;
        
        const result = await pool.query(query);
        
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('[Regional Prices Route] Error fetching data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch regional fuel prices'
        });
    }
});

module.exports = router;
