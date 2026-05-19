// Migration: add chat memory columns and table
// Run once: node app/scripts/add-chat-memory.js
require("dotenv").config({ path: require("path").join(__dirname, "../../secrets/credentials.env") });
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Add pointer column to users
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_chat_tx_id varchar(256)
    `);
    console.log("✓ users.last_chat_tx_id");

    // Session index table for the portal
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id           serial primary key,
        wallet       varchar(44) not null,
        tx_id        varchar(256) not null unique,
        prev_tx_id   varchar(256),
        session_id   varchar(64) not null,
        chunk_index  integer not null default 0,
        chat_title   varchar(200),
        summary      text,
        msg_count    integer not null default 0,
        created_at   timestamptz not null default now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_wallet
        ON chat_sessions(wallet)
    `);
    console.log("✓ chat_sessions table + index");

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
