const cron = require('node-cron');
const { fetchAndAggregateFuelPrices } = require('../services/priceAggregator.service');

const initCronJobs = () => {
    console.log('[Cron] Initializing scheduled jobs...');
    
    // Run at 02:00 AM every day
    cron.schedule('0 2 * * *', async () => {
        console.log('[Cron] Triggering daily fuel price aggregation...');
        try {
            await fetchAndAggregateFuelPrices();
        } catch (error) {
            console.error('[Cron] Error running price aggregation:', error);
        }
    });
};

module.exports = { initCronJobs };
