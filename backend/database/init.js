const fs = require('fs').promises;
const path = require('path');
const { pool } = require('./db');

async function initializeDatabase() {
    let client;
    try {
        console.log('🚀 Initializing database...');

        client = await pool.connect();

        // Read and execute schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        console.log('📋 Executing schema...');
        await client.query(schema);

        console.log('✅ Database initialized successfully!');

        // Test by counting stations
        const result = await client.query('SELECT COUNT(*) FROM stations');
        console.log(`📊 Total stations in database: ${result.rows[0].count}`);

        // Show sample stations
        const sampleStations = await client.query(`
            SELECT name, brand, fuel_price, ST_X(geom) as lng, ST_Y(geom) as lat
            FROM stations
            ORDER BY id
            LIMIT 5
        `);

        console.log('🏪 Sample stations:');
        sampleStations.rows.forEach(station => {
            console.log(`  - ${station.name} (${station.brand}) - ₱${station.fuel_price}/L at [${station.lat}, ${station.lng}]`);
        });

    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function resetDatabase() {
    let client;
    try {
        console.log('🧹 Resetting database...');

        client = await pool.connect();

        // Drop tables in correct order (respect foreign keys)
        console.log('🗑️  Dropping existing tables...');
        await client.query('DROP TABLE IF EXISTS stations CASCADE');
        await client.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');

        console.log('✅ Database reset complete!');

        // Re-initialize
        await initializeDatabase();

    } catch (err) {
        console.error('❌ Database reset failed:', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function checkDatabase() {
    let client;
    try {
        console.log('🔍 Checking database status...');

        client = await pool.connect();

        // Check if PostGIS is available
        const postgisResult = await client.query('SELECT PostGIS_Version()');
        console.log('✅ PostGIS version:', postgisResult.rows[0].postgis_version);

        // Check if tables exist
        const tablesResult = await client.query(`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        console.log('📋 Tables in database:');
        tablesResult.rows.forEach(row => {
            console.log(`  - ${row.tablename}`);
        });

        // Check stations table specifically
        try {
            const stationsCount = await client.query('SELECT COUNT(*) FROM stations');
            console.log(`🏪 Stations count: ${stationsCount.rows[0].count}`);

            // Check spatial index
            const indexResult = await client.query(`
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'stations' AND indexname LIKE '%geom%'
            `);

            if (indexResult.rows.length > 0) {
                console.log('✅ Spatial index exists:', indexResult.rows[0].indexname);
            } else {
                console.log('⚠️  No spatial index found on stations.geom');
            }

        } catch (err) {
            console.log('❌ Stations table not found or not accessible');
        }

    } catch (err) {
        console.error('❌ Database check failed:', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function addSampleData() {
    let client;
    try {
        console.log('📦 Adding additional sample data...');

        client = await pool.connect();

        // Add more diverse stations
        const additionalStations = [
            {
                name: 'Unioil Station',
                brand: 'Unioil',
                fuel_price: 59.75,
                services: ['WiFi', 'Convenience Store', 'Car Wash'],
                address: 'Mansalay, Oriental Mindoro',
                lat: 12.5200,
                lng: 121.4500
            },
            {
                name: 'Phoenix Petroleum',
                brand: 'Phoenix',
                fuel_price: 60.00,
                services: ['ATM', 'Restroom', 'Convenience Store'],
                address: 'Bulalacao, Oriental Mindoro',
                lat: 12.3300,
                lng: 121.3400
            },
            {
                name: 'Seaoil Station',
                brand: 'Seaoil',
                fuel_price: 58.90,
                services: ['WiFi', 'Car Wash', 'Tire Service'],
                address: 'Pinamalayan, Oriental Mindoro',
                lat: 13.2900,
                lng: 121.4700
            }
        ];

        for (const station of additionalStations) {
            try {
                await client.query(`
                    INSERT INTO stations (name, brand, fuel_price, services, address, geom)
                    VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326))
                    ON CONFLICT DO NOTHING
                `, [
                    station.name,
                    station.brand,
                    station.fuel_price,
                    station.services,
                    station.address,
                    station.lat,
                    station.lng
                ]);

                console.log(`✅ Added: ${station.name}`);
            } catch (err) {
                console.log(`⚠️  Skipped: ${station.name} (already exists or error)`);
            }
        }

        // Show final count
        const result = await client.query('SELECT COUNT(*) FROM stations');
        console.log(`📊 Total stations now: ${result.rows[0].count}`);

    } catch (err) {
        console.error('❌ Failed to add sample data:', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run commands based on CLI arguments
async function main() {
    const command = process.argv[2];

    try {
        switch (command) {
            case 'reset':
                await resetDatabase();
                break;

            case 'check':
                await checkDatabase();
                break;

            case 'sample':
                await addSampleData();
                break;

            case 'init':
            default:
                await initializeDatabase();
                break;
        }

        console.log('🎉 Operation completed successfully!');

    } catch (err) {
        console.error('💥 Operation failed:', err.message);
        process.exit(1);
    } finally {
        // Close the database pool
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    console.log('🔧 Fuel Finder Database Management Tool');
    console.log('Available commands:');
    console.log('  init   - Initialize database (default)');
    console.log('  reset  - Reset and reinitialize database');
    console.log('  check  - Check database status');
    console.log('  sample - Add additional sample data');
    console.log('');

    main();
}

module.exports = {
    initializeDatabase,
    resetDatabase,
    checkDatabase,
    addSampleData
};
