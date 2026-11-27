// Builds the ScribeBox desktop app:
// 1. `next build` with standalone output (ELECTRON_BUILD=1), which gives a self-contained server.js
// 2. copies what the standalone server doesn't include: static assets, public/, the database CA
//    certificate and .env (bundled into the app, as chosen for this build)
// 3. packages it with electron-builder into dist-electron/
//
// Pass --dir to skip the installer and only produce the unpacked app (faster).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";

const standalone = ".next/standalone";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync(standalone, { recursive: true, force: true });
run("npx", ["next", "build"], { ELECTRON_BUILD: "1" });

cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${standalone}/public`, { recursive: true });
if (existsSync("certs")) cpSync("certs", `${standalone}/certs`, { recursive: true });
if (existsSync(".env")) cpSync(".env", `${standalone}/.env`);
else console.log("No .env found: the app will start, but sign-in, the database and analysis won't work");

const builderArgs = ["electron-builder", "--win", ...(process.argv.includes("--dir") ? ["--dir"] : [])];
run("npx", builderArgs);
