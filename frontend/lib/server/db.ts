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

// Connecting to the hosted database sometimes stalls. Only errors that mean the query was never
// sent count, so retrying can't run a write twice
function isConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /timeout exceeded when trying to connect|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(message);
}

// Runs a query and returns the rows. Always pass values in params (never put them in the SQL string).
// If the connection fails before the query runs, it tries once more
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  try {
    return (await getPool().query<T>(sql, params)).rows;
  } catch (error) {
    if (!isConnectionError(error)) throw error;
    console.log("Database connection failed, retrying once:", (error as Error).message);
    return (await getPool().query<T>(sql, params)).rows;
  }
}
