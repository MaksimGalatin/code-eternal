#!/usr/bin/env node
require("dotenv").config({ path: require("path").join(__dirname, "../../secrets/credentials.env") });
const { Pool } = require("pg");
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS site_bio text,
      ADD COLUMN IF NOT EXISTS site_manifesto text,
      ADD COLUMN IF NOT EXISTS site_telegram varchar(32),
      ADD COLUMN IF NOT EXISTS site_twitter varchar(15),
      ADD COLUMN IF NOT EXISTS site_website varchar(256)
  `);
  console.log("Migration OK: site columns added to users table");
  await db.end();
}

main().catch(err => { console.error(err); process.exit(1); });
