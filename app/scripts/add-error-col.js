const { Client } = require('pg');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('ALTER TABLE site_generation_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;'))
  .then(() => { console.log('Column added'); client.end(); })
  .catch(e => { console.error(e.message); client.end(); process.exit(1); });
