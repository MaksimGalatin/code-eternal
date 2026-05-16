const { Pool } = require("pg");
const { readFileSync } = require("fs");
const { join } = require("path");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = readFileSync(join(__dirname, "add-indexes.sql"), "utf8");

pool.query(sql).then(() => {
  console.log("Indexes created.");
  pool.end();
}).catch(err => {
  console.error("Failed:", err.message);
  pool.end();
  process.exit(1);
});
