#!/usr/bin/env node
// Run: DATABASE_URL='...' node app/scripts/run-migrate-games.js
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, "migrate-games.sql"), "utf8");
  await pool.query(sql);
  console.log("✅ game_wins table ready");
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
