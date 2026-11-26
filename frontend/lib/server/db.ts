import "server-only";

import { Pool, type QueryResultRow } from "pg";
import { poolConfig } from "./db-config.mjs";

// Reuse one pool across hot reloads in development instead of opening new connections each time.
const globalForDb = globalThis as unknown as { scribeboxPool?: Pool };

function getPool(): Pool {
  globalForDb.scribeboxPool ??= new Pool(poolConfig());
  return globalForDb.scribeboxPool;
}

/** Runs a parameterised query. Always pass values through `params`, never by building the SQL string. */
export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
