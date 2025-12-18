
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: { rejectUnauthorized: false },
});

async function checkImages() {
  const res = await pool.query('SELECT * FROM images LIMIT 5');
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

checkImages();
