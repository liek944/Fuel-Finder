const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../database/db'); // Using existing db pool

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
        const searchQuery = `("fuel prices" OR "pump prices" OR "price hike" OR "rollback") "Oriental Mindoro" OR "Calapan" (site:ormindoro.gov.ph OR site:facebook.com OR site:gmanetwork.com OR site:inquirer.net OR site:news.abs-cbn.com OR site:doe.gov.ph)`;
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}`;
        
        const response = await axios.get(searchUrl);
        const articles = response.data.organic_results || [];
        
        if (articles.length === 0) {
            console.log('[Price Aggregator] No recent news found for fuel prices.');
            return null;
        }

        // Extract snippets to feed to Gemini
        const snippets = articles.map(article => `Title: ${article.title}\nDate: ${article.date || 'Unknown'}\nSnippet: ${article.snippet}`).join('\n\n');
        
        // 2. Use Gemini to extract prices
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        
        const currentDate = new Date().toDateString();
        const prompt = `
        Analyze the following search snippets about fuel prices in Oriental Mindoro, Philippines.
        The current date is ${currentDate}.
        Extract the current average price for EACH fuel type mentioned (e.g., Gasoline, Diesel, Premium, Regular, Kerosene).
        Look carefully at the text and the provided Date. If the information is "way too old" (e.g., older than 7 days from the current date), DISCARD it and do not extract those prices.
        If a snippet says "Gasoline prices range from ₱83.50 to ₱97.29... while diesel...", you MUST extract BOTH Gasoline and Diesel.
        If a price is a range, take the midpoint (e.g., (83.50 + 97.29) / 2 = 90.40).
        Return ONLY a JSON array of objects. Each object must have:
        - "fuel_type": String (e.g., "Gasoline", "Diesel", "Premium", "Regular", "Kerosene").
        - "average_price": Number (the extracted price or midpoint of range).
        If all snippets are too old or contain no prices, return an empty array [].
        Do not include markdown blocks, just the JSON array.
        
        Snippets:U
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
