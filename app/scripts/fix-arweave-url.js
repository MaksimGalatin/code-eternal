require("dotenv").config({ path: require("path").join(__dirname, "../secrets/credentials.env") });
const { Pool } = require("pg");

const OLD_URL = "https://arweave.net/i5be1vAMzMgAEyhkpmzWfLxu3QPRRfyMX85AdjvejSU";
const NEW_URL = "https://devnet.irys.xyz/i5be1vAMzMgAEyhkpmzWfLxu3QPRRfyMX85AdjvejSU";
const JOB_ID = 3;

const db = new Pool({ connectionString: process.env.DATABASE_URL });
db.query(
  "UPDATE site_generation_jobs SET arweave_url=$1 WHERE id=$2",
  [NEW_URL, JOB_ID]
).then(r => { console.log("Updated rows:", r.rowCount); return db.end(); })
  .catch(e => { console.error(e.message); process.exit(1); });
