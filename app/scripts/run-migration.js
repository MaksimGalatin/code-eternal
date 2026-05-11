const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}
const client = new Client({ connectionString: process.env.DATABASE_URL });

const sql = fs.readFileSync(path.join(__dirname, 'migrate.sql'), 'utf8');

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('Migration OK'); client.end(); })
  .catch(e => { console.error('Error:', e.message); client.end(); process.exit(1); });
