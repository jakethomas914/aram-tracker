/**
 * Desktop shell: starts the bundled Next server on loopback, opens it in a window,
 * and keeps syncing in the background while the app is open.
 *
 * The server runs under Electron's own Node (ELECTRON_RUN_AS_NODE), so the packaged
 * app needs nothing installed on the user's machine.
 */
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const APP_NAME = "ARAM Group Tracker";
const PREFERRED_PORT = 43127;
const SERVER_START_TIMEOUT_MS = 60_000;
const MIN_SYNC_INTERVAL_MS = 30_000;

app.setName(APP_NAME);

let serverProcess = null;
let serverUrl = null;
let mainWindow = null;
let quitting = false;
let syncTimer = null;

const dataDir = () => path.join(app.getPath("userData"), "data");
const exportDir = () => path.join(app.getPath("documents"), APP_NAME);

function serverDirectory() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app-server")
    : path.join(__dirname, "..", ".next", "standalone");
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

/** A stable port keeps the address the same between launches when it is free. */
async function pickPort() {
  if (await isPortFree(PREFERRED_PORT)) return PREFERRED_PORT;
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function openLog() {
  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  return fs.createWriteStream(path.join(logDir, "server.log"), { flags: "a" });
}

async function waitForServer(url, isAlive) {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isAlive()) throw new Error("The app server stopped while starting.");
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The app server did not start in time.");
}

async function startServer() {
  const directory = serverDirectory();
  const entry = path.join(directory, "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error(`Missing ${entry}. Run "npm run desktop:prepare" first.`);
  }

  fs.mkdirSync(dataDir(), { recursive: true });
  fs.mkdirSync(exportDir(), { recursive: true });

  const port = await pickPort();
  const log = openLog();
  let alive = true;

  serverProcess = spawn(process.execPath, [entry], {
    cwd: directory,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATA_DIR: dataDir(),
      EXPORT_DIR: exportDir(),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  serverProcess.stdout.pipe(log, { end: false });
  serverProcess.stderr.pipe(log, { end: false });
  serverProcess.on("exit", (code) => {
    alive = false;
    serverProcess = null;
    if (!quitting) {
      dialog.showErrorBox(
        APP_NAME,
        `The app's background server stopped unexpectedly (exit code ${code}). ` +
          `Details are in ${path.join(app.getPath("userData"), "logs", "server.log")}.`,
      );
      app.quit();
    }
  });

  serverUrl = `http://127.0.0.1:${port}`;
  await waitForServer(serverUrl, () => alive);
  return serverUrl;
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

/**
 * The web version relies on `npm run watch` for polling. Here the shell does it,
 * reading the interval from the saved settings so changes apply without a restart.
 */
async function backgroundSync() {
  let delay = 60_000;
  try {
    const response = await fetch(`${serverUrl}/api/state`, { cache: "no-store" });
    const state = await response.json();
    delay = Math.max(MIN_SYNC_INTERVAL_MS, state.settings.watchIntervalSeconds * 1000);

    const nothingToDo =
      state.syncState.running ||
      // Riot refused the key; the app shows a banner until a new one is pasted.
      state.syncState.keyRejected ||
      (!state.demoMode && state.roster.length === 0);

    if (!nothingToDo) {
      await fetch(`${serverUrl}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    }
  } catch {
    // The server may be mid-restart; the next tick tries again.
  }
  if (!quitting) syncTimer = setTimeout(backgroundSync, delay);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    title: APP_NAME,
    backgroundColor: "#0b1220",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // Anything that is not the local app opens in the user's own browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(serverUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(serverUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "Open spreadsheet folder", click: () => shell.openPath(exportDir()) },
        { label: "Open data folder", click: () => shell.openPath(dataDir()) },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "togglefullscreen" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();
    try {
      await startServer();
    } catch (error) {
      dialog.showErrorBox(APP_NAME, error instanceof Error ? error.message : String(error));
      app.quit();
      return;
    }
    createWindow();
    syncTimer = setTimeout(backgroundSync, 15_000);
  });

  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    quitting = true;
    if (syncTimer) clearTimeout(syncTimer);
    stopServer();
  });
}
