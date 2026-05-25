const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../database/db'); // Using existing db pool

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'dummy_key';

/**
 * Searches the web for recent fuel prices in Oriental Mindoro and uses Gemini to extract the average prices.
 */
const fetchAndAggregateFuelPrices = async () => {
    try {
        console.log('[Price Aggregator] Starting regional fuel price aggregation...');
        
        if (!process.env.GEMINI_API_KEY || !process.env.SERPAPI_KEY) {
            console.warn('[Price Aggregator] Missing API keys. Skipping execution.');
            return null;
        }

        // 1. Search the web using SerpApi
        const searchQuery = "fuel prices Oriental Mindoro update regular premium diesel";
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}&tbm=nws`;
        
        const response = await axios.get(searchUrl);
        const articles = response.data.news_results || [];
        
        if (articles.length === 0) {
            console.log('[Price Aggregator] No recent news found for fuel prices.');
            return null;
        }

        // Extract snippets to feed to Gemini
        const snippets = articles.map(article => `Title: ${article.title}\nSnippet: ${article.snippet}`).join('\n\n');
        
        // 2. Use Gemini to extract prices
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
        Analyze the following news snippets about fuel prices in Oriental Mindoro, Philippines.
        Extract the current average price for these specific fuel types: Regular, Premium, and Diesel.
        If a price is a range, take the midpoint.
        Return ONLY a JSON array of objects with the following keys: "fuel_type" (must be "Regular", "Premium", or "Diesel") and "average_price" (number).
        If no price can be confidently found for a fuel type, do not include it.
        
        Snippets:
        ${snippets}
        `;

        const result = await model.generateContent(prompt);
        let textResult = result.response.text();
        
        // Clean up markdown block if present
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const extractedPrices = JSON.parse(textResult);
        console.log('[Price Aggregator] Extracted Prices:', extractedPrices);

        if (!Array.isArray(extractedPrices) || extractedPrices.length === 0) {
            console.log('[Price Aggregator] No valid prices extracted from snippets.');
            return null;
        }

        const dataSources = JSON.stringify(articles.map(a => a.link).slice(0, 5));

        // 3. Save to Database
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const item of extractedPrices) {
                if (item.fuel_type && item.average_price && !isNaN(item.average_price)) {
                    await client.query(
                        `INSERT INTO regional_fuel_prices (region_name, fuel_type, average_price, data_sources) 
                         VALUES ($1, $2, $3, $4)`,
                        ['Oriental Mindoro', item.fuel_type, item.average_price, dataSources]
                    );
                }
            }
            
            await client.query('COMMIT');
            console.log('[Price Aggregator] Successfully updated regional fuel prices.');
            return extractedPrices;
        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('[Price Aggregator] Error during execution:', error);
        throw error;
    }
};

module.exports = {
    fetchAndAggregateFuelPrices
};
