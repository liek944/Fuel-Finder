const cron = require('node-cron');
const { fetchAndAggregateFuelPrices } = require('../services/priceAggregator.service');
const { runDoeScraper } = require('../services/doeScraperService');

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
    // Run at 07:00 AM PHT every Tuesday for DOE PDF parsing
    cron.schedule('0 7 * * 2', async () => {
        console.log('[Cron] Triggering DOE fuel price scraper...');
        try {
            await runDoeScraper();
        } catch (error) {
            console.error('[Cron] Error running DOE scraper:', error);
        }
    }, {
        timezone: "Asia/Manila"
    });
};

module.exports = { initCronJobs };
