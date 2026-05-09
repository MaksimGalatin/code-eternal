require("dotenv").config({ path: require("path").join(__dirname, "../secrets/credentials.env") });
const { Pool } = require("pg");
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const tables = ["site_generation_jobs", "referral_payments", "burn_events", "users"];
  for (const t of tables) {
    const r = await db.query(`DELETE FROM ${t}`);
    console.log(`${t}: deleted ${r.rowCount} rows`);
  }
  await db.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
