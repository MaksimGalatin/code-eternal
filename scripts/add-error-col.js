const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_ETuoDYl0fG9L@ep-odd-rain-alm1m69x.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});
client.connect()
  .then(() => client.query('ALTER TABLE site_generation_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;'))
  .then(() => { console.log('Column added'); client.end(); })
  .catch(e => { console.error(e.message); client.end(); process.exit(1); });
