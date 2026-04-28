import { Pool } from "pg";

// Reuse pool across hot-reloads in development
const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };

export const db =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = db;
}
