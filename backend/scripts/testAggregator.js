// Load env vars
require('dotenv').config();

const { fetchAndAggregateFuelPrices } = require('../services/priceAggregator.service');

const runTest = async () => {
    console.log('Testing Price Aggregator...');
    try {
        const prices = await fetchAndAggregateFuelPrices();
        if (prices) {
            console.log('✅ Aggregator returned:', prices);
        } else {
            console.log('⚠️ Aggregator ran but returned nothing (perhaps missing API keys or no data).');
        }
    } catch (err) {
        console.error('❌ Aggregator test failed:', err);
    } finally {
        process.exit(0);
    }
};

runTest();
