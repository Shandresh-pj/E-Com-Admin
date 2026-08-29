const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ─── ROTATING FILE LOGGER ───────────────────────────────────────────────────
const userDataPath = app.getPath('userData');
const logDir = path.join(userDataPath, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'app.log');

function logToFile(type, message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${type.toUpperCase()}] ${typeof message === 'object' ? JSON.stringify(message) : message}\n`;
  try {
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (e) {
    console.error('Failed writing log line:', e);
  }
}

process.on('uncaughtException', (error) => {
  logToFile('CRITICAL', `Uncaught Exception: ${error.stack || error}`);
});

process.on('unhandledRejection', (reason) => {
  logToFile('ERROR', `Unhandled Rejection: ${reason}`);
});

// ─── WINDOW STATE PERSISTENCE ───────────────────────────────────────────────
const stateFilePath = path.join(userDataPath, 'window-state.json');

function loadWindowState() {
  const defaultState = { width: 1366, height: 768, isMaximized: false };
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf8');
      return { ...defaultState, ...JSON.parse(data) };
    }
  } catch (e) {
    logToFile('WARN', `Could not read window state: ${e.message}`);
  }
  return defaultState;
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    };
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    logToFile('WARN', `Could not save window state: ${e.message}`);
  }
}

// ─── NATIVE APPLICATION MENU ────────────────────────────────────────────────
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SVK Enterprise ERP',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              title: 'About SVK Enterprise ERP',
              message: 'SVK Enterprise ERP Desktop Application',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nOS: ${process.platform} ${process.arch}`,
              buttons: ['OK'],
              icon: path.join(__dirname, 'src', 'favicon.ico')
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── MAIN WINDOW CREATION ───────────────────────────────────────────────────
function createWindow() {
  const savedState = loadWindowState();

  const options = {
    width: savedState.width,
    height: savedState.height,
    minWidth: 1024,
    minHeight: 600,
    title: 'SVK Enterprise ERP — Desktop OS',
    show: false, // Don't show until ready-to-show to avoid flicker
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  };

  if (savedState.x !== undefined && savedState.y !== undefined) {
    options.x = savedState.x;
    options.y = savedState.y;
  }

  mainWindow = new BrowserWindow(options);

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isDev = process.env.ELECTRON_IS_DEV === '1' || process.argv.includes('--dev');
  const distPathDirect = path.join(__dirname, 'dist', 'Spike', 'index.html');
  const distPathBrowser = path.join(__dirname, 'dist', 'Spike', 'browser', 'index.html');

  if (isDev) {
    logToFile('INFO', 'Attempting to load Angular Dev Server at http://localhost:4200');
    mainWindow.loadURL('http://localhost:4200').catch((err) => {
      logToFile('WARN', `Dev server not responding (${err.message}). Checking local built dist index.html...`);
      if (fs.existsSync(distPathDirect)) {
        mainWindow.loadFile(distPathDirect);
      } else if (fs.existsSync(distPathBrowser)) {
        mainWindow.loadFile(distPathBrowser);
      }
    });
  } else {
    if (fs.existsSync(distPathDirect)) {
      logToFile('INFO', `Loading index.html from: ${distPathDirect}`);
      mainWindow.loadFile(distPathDirect);
    } else if (fs.existsSync(distPathBrowser)) {
      logToFile('INFO', `Loading index.html from: ${distPathBrowser}`);
      mainWindow.loadFile(distPathBrowser);
    } else {
      logToFile('WARN', 'Production dist files not found, falling back to http://localhost:4200');
      mainWindow.loadURL('http://localhost:4200').catch(() => {});
    }
  }

  // Handle external link clicks safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Save window bounds on resize/move/close
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  logToFile('INFO', `Starting SVK Enterprise ERP v${app.getVersion()}`);
  createApplicationMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
