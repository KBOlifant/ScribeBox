// Database connection settings (used by the app and the migrate script)
import { readFileSync } from "node:fs";
import path from "node:path";

export function poolConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL in .env");
  }

  // Remove sslmode from the URL because we set up SSL ourselves below
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");

  // Aiven needs SSL, so we load their CA certificate
  const certPath = path.resolve(process.cwd(), process.env.DATABASE_CA_CERT || "certs/aiven-ca.pem");
  let ca;
  try {
    ca = readFileSync(certPath, "utf8");
  } catch {
    throw new Error("Could not find the Aiven CA certificate at " + certPath);
  }

  return {
    connectionString: url.toString(),
    ssl: { ca: ca, rejectUnauthorized: true },
    max: 5,
  };
}
