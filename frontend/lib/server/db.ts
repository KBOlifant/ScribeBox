import "server-only";

import { Pool, type QueryResultRow } from "pg";
import { poolConfig } from "./db-config.mjs";

// Keep one connection pool so we don't open new connections on every hot reload
const globalForDb = globalThis as unknown as { pool?: Pool };

function getPool() {
  if (!globalForDb.pool) {
    const pool = new Pool(poolConfig());
    globalForDb.pool = pool;
    // Open the first connection straight away, so the first request doesn't wait for it.
    // A failure here is fine: the next query connects (and retries) on its own
    void connectWithRetry(pool).catch(() => {});
  }
  return globalForDb.pool;
}

async function connectWithRetry(pool: Pool) {
  for (let attempt = 1; ; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      return;
    } catch (error) {
      if (attempt >= ATTEMPTS || !isConnectionError(error)) throw error;
    }
  }
}

// Connecting to the hosted database sometimes stalls until the connect timeout. Only errors that
// mean the query was never sent count, so retrying can't run a write twice:
// - "timeout exceeded when trying to connect": no free connection in the pool in time
// - "Connection terminated due to connection timeout": a new connection's handshake stalled
// - DNS and refused connections
function isConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /timeout exceeded when trying to connect|terminated due to connection timeout|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(
    message,
  );
}

// A stalled connect fails after 5s (connectionTimeoutMillis) and the next try nearly always works
const ATTEMPTS = 3;

// Runs a query and returns the rows. Always pass values in params (never put them in the SQL string).
// If connecting fails before the query is sent, it tries again (up to 3 attempts in all)
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  for (let attempt = 1; ; attempt++) {
    try {
      return (await getPool().query<T>(sql, params)).rows;
    } catch (error) {
      if (attempt >= ATTEMPTS || !isConnectionError(error)) throw error;
      console.log(`Database connection failed (attempt ${attempt} of ${ATTEMPTS}), retrying:`, (error as Error).message);
    }
  }
}
