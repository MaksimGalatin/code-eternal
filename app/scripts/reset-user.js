#!/usr/bin/env node
// Resets a user's purchase state in DB so they can redo the buy flow.
// On-chain UserState PDA is NOT touched (devnet — just re-buy).
// Usage: node scripts/reset-user.js <wallet>

require("dotenv").config({ path: require("path").join(__dirname, "../secrets/credentials.env") });

const { Pool } = require("pg");

const wallet = process.argv[2];
if (!wallet) {
  console.error("Usage: node scripts/reset-user.js <wallet>");
  process.exit(1);
}

async function main() {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: before } = await db.query(
    "SELECT tier FROM users WHERE wallet = $1", [wallet]
  );
  if (!before.length) {
    console.log("User not found in DB:", wallet);
    await db.end(); return;
  }
  console.log("Current tier:", before[0].tier);

  await db.query("UPDATE users SET tier = 0 WHERE wallet = $1", [wallet]);
  console.log("users.tier → 0");

  const { rowCount } = await db.query(
    "DELETE FROM site_generation_jobs WHERE wallet = $1", [wallet]
  );
  console.log(`Deleted ${rowCount} site_generation_jobs row(s)`);

  await db.end();
  console.log("Done. User can now go through the buy flow again.");
}

main().catch(err => { console.error(err); process.exit(1); });
