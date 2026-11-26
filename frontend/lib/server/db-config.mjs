// Shared by the app (lib/server/db.ts) and the migration script (scripts/migrate.mjs).
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Aiven requires TLS. We verify the server against Aiven's CA certificate (download ca.pem from the
 * service's Overview page) rather than turning verification off.
 * @returns {import("pg").PoolConfig}
 */
export function poolConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set. Add your Aiven service URI to .env.");

  // `sslmode` in the URL would override the `ssl` option below, so we drop it and set TLS explicitly.
  const url = new URL(raw);
  url.searchParams.delete("sslmode");

  const caPath = path.resolve(process.cwd(), process.env.DATABASE_CA_CERT ?? "certs/aiven-ca.pem");
  let ca;
  try {
    ca = readFileSync(caPath, "utf8");
  } catch {
    throw new Error(`Aiven CA certificate not found at ${caPath}. Download ca.pem from Aiven and save it there.`);
  }

  return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true }, max: 5 };
}
