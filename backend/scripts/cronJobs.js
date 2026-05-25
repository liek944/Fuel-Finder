const cron = require('node-cron');
const { fetchAndAggregateFuelPrices } = require('../services/priceAggregator.service');

const initCronJobs = () => {
    console.log('[Cron] Initializing scheduled jobs...');
    
    // Run at 06:00 AM PHT every day
    cron.schedule('0 6 * * *', async () => {
        console.log('[Cron] Triggering daily fuel price aggregation...');
        try {
            await fetchAndAggregateFuelPrices();
        } catch (error) {
            console.error('[Cron] Error running price aggregation:', error);
        }
    }, {
        timezone: "Asia/Manila"
    });
};

module.exports = { initCronJobs };
