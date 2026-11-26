// Creates the database tables. Run with: npm run db:migrate
import { readFileSync } from "node:fs";
import pg from "pg";
import { poolConfig } from "../lib/server/db-config.mjs";

const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new pg.Client(poolConfig());

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
