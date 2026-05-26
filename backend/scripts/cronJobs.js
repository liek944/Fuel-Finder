const cron = require('node-cron');
const { fetchAndAggregateFuelPrices } = require('../services/priceAggregator.service');

const initCronJobs = () => {
    console.log('[Cron] Initializing scheduled jobs...');
    
    // Run at 06:00 AM PHT every Tuesday
    cron.schedule('0 6 * * 2', async () => {
        console.log('[Cron] Triggering weekly fuel price aggregation...');
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
