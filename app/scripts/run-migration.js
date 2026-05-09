const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_ETuoDYl0fG9L@ep-odd-rain-alm1m69x.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

const sql = fs.readFileSync(path.join(__dirname, 'migrate.sql'), 'utf8');

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('Migration OK'); client.end(); })
  .catch(e => { console.error('Error:', e.message); client.end(); process.exit(1); });
