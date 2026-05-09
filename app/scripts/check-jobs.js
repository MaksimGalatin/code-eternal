require("dotenv").config({ path: require("path").join(__dirname, "../secrets/credentials.env") });
const { Pool } = require("pg");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
db.query(
  "SELECT id, status, arweave_url, tier FROM site_generation_jobs WHERE wallet=$1 ORDER BY id DESC LIMIT 5",
  ["AAefXLA3iWp7iyekpvtgZpe9q6zUGWLfxgpSCYfw7qtw"]
).then(r => { console.log(JSON.stringify(r.rows, null, 2)); return db.end(); })
  .catch(e => { console.error(e.message); process.exit(1); });
