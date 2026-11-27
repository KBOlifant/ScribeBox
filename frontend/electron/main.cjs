// Electron main process for the ScribeBox desktop app.
//
// The packaged app carries the whole Next.js app: its standalone server (pages and API) runs as a
// child process on a fixed local port, and the window loads it. The port is fixed because Firebase
// keeps the sign-in per origin, so a different port each launch would sign the user out.
//
// `npm run electron:dev` opens the window on a running `next dev` (http://localhost:3000) instead.
const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const PORT = 47823;
const DEV = process.argv.includes("--dev");
const START_URL = DEV ? "http://localhost:3000" : `http://127.0.0.1:${PORT}`;

let server = null;
let quitting = false;

// The standalone Next.js server: inside the installed app's resources, or the local build
function serverDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "app-server") : path.join(__dirname, "..", ".next", "standalone");
}

// Reads KEY=VALUE lines from the bundled .env (quotes and trailing comments allowed)
function readEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    const quoted = /^(["'])(.*)\1/.exec(value);
    value = quoted ? quoted[2] : value.replace(/\s+#.*$/, "");
    values[match[1]] = value;
  }
  return values;
}

// Resolves once the server answers, or rejects after the timeout
function waitForServer(url, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (Date.now() - started > timeoutMs) reject(new Error(`The app server didn't start within ${timeoutMs / 1000}s`));
        else setTimeout(attempt, 300);
      });
    };
    attempt();
  });
}

function startServer() {
  const dir = serverDir();
  const entry = path.join(dir, "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error(`The app server is missing (${entry}). Run "npm run electron:build" first.`);
  }
  server = spawn(process.execPath, [entry], {
    cwd: dir,
    env: {
      ...process.env,
      ...readEnv(path.join(dir, ".env")),
      // Run the Electron binary as plain Node for the server
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "inherit",
  });
  server.on("exit", (code) => {
    server = null;
    if (!quitting) {
      dialog.showErrorBox("ScribeBox stopped", `The app server exited (code ${code}). Restart ScribeBox to continue.`);
      app.quit();
    }
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    title: "ScribeBox",
    backgroundColor: "#141317",
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.once("ready-to-show", () => window.show());

  // Links to other sites open in the user's browser, not inside the app
  const isAppUrl = (url) => url.startsWith(START_URL);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAppUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  window.loadURL(START_URL);
}

// One copy at a time: a second launch would fight over the port
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      if (!DEV) {
        startServer();
        await waitForServer(START_URL, 60_000);
      }
      createWindow();
    } catch (error) {
      dialog.showErrorBox("ScribeBox couldn't start", String(error.message ?? error));
      app.quit();
    }
  });

  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    quitting = true;
    if (server) server.kill();
  });
}
