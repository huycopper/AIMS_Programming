const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  const client = new pg.Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: 'postgres'
  });

  await client.connect();
  try {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='aims_db_test'");
    if (res.rowCount === 0) {
      await client.query("CREATE DATABASE aims_db_test");
      console.log("Database aims_db_test created successfully.");
    } else {
      console.log("Database aims_db_test already exists.");
    }
  } catch (err) {
    console.error("Error creating database:", err);
  } finally {
    await client.end();
  }
}

main();
