// Creates the database tables from db/schema.sql
import { readFileSync } from "node:fs";
import pg from "pg";
import { poolConfig } from "../lib/server/db-config.mjs";

const sql = readFileSync("db/schema.sql", "utf8");
const client = new pg.Client(poolConfig());

try {
  await client.connect();
  await client.query(sql);
  console.log("Tables created");
} catch (error) {
  console.log("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
