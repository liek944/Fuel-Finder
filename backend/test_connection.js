const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔍 PostgreSQL Connection Test');
console.log('=============================');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
    console.log('✅ Loaded .env file');
} else {
    console.log('⚠️  No .env file found');
}

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'fuel_finder',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 5432,
};

console.log('\n📋 Connection Configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Password: ${dbConfig.password ? '[SET]' : '[EMPTY]'}`);

// Create connection pool
const pool = new Pool(dbConfig);

async function testConnection() {
    let client;
    try {
        console.log('\n🔌 Attempting to connect...');

        // Test connection
        client = await pool.connect();
        console.log('✅ Database connection successful!');

        // Test PostGIS
        console.log('\n🗺️  Testing PostGIS...');
        const postgisResult = await client.query('SELECT PostGIS_Version()');
        console.log(`✅ PostGIS Version: ${postgisResult.rows[0].postgis_version}`);

        // Test stations table
        console.log('\n🏪 Testing stations table...');
        const stationsResult = await client.query('SELECT COUNT(*) FROM stations');
        console.log(`✅ Found ${stationsResult.rows[0].count} stations in database`);

        // Test spatial query
        console.log('\n📍 Testing spatial query...');
        const spatialResult = await client.query(`
            SELECT
                name,
                brand,
                ST_X(geom) as lng,
                ST_Y(geom) as lat,
                ST_Distance(geom, ST_SetSRID(ST_MakePoint(121.52, 12.59), 4326)::geography) as distance_meters
            FROM stations
            ORDER BY distance_meters
            LIMIT 3
        `);

        console.log('✅ Closest stations:');
        spatialResult.rows.forEach((station, index) => {
            console.log(`   ${index + 1}. ${station.name} (${station.brand}) - ${Math.round(station.distance_meters)}m away`);
        });

        console.log('\n🎉 All tests passed! The database is working correctly.');

    } catch (error) {
        console.error('\n❌ Connection failed!');
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Error Message: ${error.message}`);
        console.error(`   Full Error:`, error);

        // Specific error handling
        if (error.code === '28P01') {
            console.error('\n💡 Authentication Failed - Possible solutions:');
            console.error('   1. Check if password is correct in .env file');
            console.error('   2. Verify pg_hba.conf allows password authentication');
            console.error('   3. Try connecting with psql using same credentials:');
            console.error(`      PGPASSWORD='${dbConfig.password}' psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database}`);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Connection Refused - Possible solutions:');
            console.error('   1. Check if PostgreSQL is running on the specified port');
            console.error('   2. Verify the port number in .env matches PostgreSQL');
            console.error('   3. Check: sudo systemctl status postgresql');
        }

        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

// Run the test
testConnection().catch(console.error);
