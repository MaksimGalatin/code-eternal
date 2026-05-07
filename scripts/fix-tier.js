require("dotenv").config({ path: require("path").join(__dirname, "../secrets/credentials.env") });
const { Pool } = require("pg");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
db.query("UPDATE users SET tier=2 WHERE wallet=$1", ["AAefXLA3iWp7iyekpvtgZpe9q6zUGWLfxgpSCYfw7qtw"])
  .then(r => { console.log("Updated rows:", r.rowCount); return db.end(); })
  .catch(e => { console.error(e.message); process.exit(1); });
