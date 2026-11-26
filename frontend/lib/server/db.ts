import "server-only";

import { Pool, type QueryResultRow } from "pg";
import { poolConfig } from "./db-config.mjs";

// Keep one connection pool so we don't open new connections on every hot reload
const globalForDb = globalThis as unknown as { pool?: Pool };

function getPool() {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool(poolConfig());
  }
  return globalForDb.pool;
}

// Runs a query and returns the rows. Always pass values in params (never put them in the SQL string)
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}
