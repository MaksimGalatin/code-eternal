import { Pool } from "pg";
import { logger } from "./logger";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on("error", (err) => {
  logger.error("Unexpected DB error:", err);
});
