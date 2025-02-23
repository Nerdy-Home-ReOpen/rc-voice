/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev');

const baseUri = isDev
  ? 'http://127.0.0.1:3000' // Load localhost:3000 in development mode
  : `file://${path.join(__dirname, '../build/index.html')}`; // Load built files in production mode

// Track windows
let mainWindow = null;
let authWindow = null;

function createMainWindow() {
  // If main window already exists, just focus it
  if (mainWindow) {
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(`${baseUri}`);

  // Open DevTools in development mode
  if (isDev) mainWindow.webContents.openDevTools();

  // wait for page load to send initial state
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send(
      mainWindow.isMaximized() ? 'window-maximized' : 'window-unmaximized',
    );
  });

  // listen for window state change
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized');
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-unmaximized');
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function createAuthWindow() {
  // If auth window already exists, just focus it
  if (authWindow) {
    authWindow.focus();
    return authWindow;
  }

  authWindow = new BrowserWindow({
    width: 600,
    height: 450,
    minWidth: 600,
    minHeight: 450,
    resizable: true,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  authWindow.loadURL(`${baseUri}`);

  // Open DevTools in development mode
  if (isDev) authWindow.webContents.openDevTools();

  // wait for page load to send initial state
  authWindow.webContents.on('did-finish-load', () => {
    authWindow.webContents.send(
      authWindow.isMaximized() ? 'window-maximized' : 'window-unmaximized',
    );
  });

  // listen for window state change
  authWindow.on('maximize', () => {
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.webContents.send('window-maximized');
    }
  });

  authWindow.on('unmaximize', () => {
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.webContents.send('window-unmaximized');
    }
  });

  // Handle window closed
  authWindow.on('closed', () => {
    authWindow = null;
  });

  return authWindow;
}

function createPopup(page) {
  const popup = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    resizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  popup.loadURL(`${baseUri}/popup?page=${page}`); // Add page query parameter

  // Open DevTools in development mode
  if (isDev) createServerPopup.webContents.openDevTools();

  return createServerPopup;
}

app.whenReady().then(() => {
  // Start with auth window
  createAuthWindow();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAuthWindow();
  }
});

// Window management IPC handlers
ipcMain.on('auth-success', () => {
  // Close auth window and create main window
  if (authWindow) {
    authWindow.close();
    authWindow = null;
  }
  createMainWindow();
});

ipcMain.on('logout', () => {
  // Close main window and create auth window
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  createAuthWindow();
});

// Window control handlers
ipcMain.on('minimize-window', () => {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    currentWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    if (currentWindow.isMaximized()) {
      currentWindow.unmaximize();
    } else {
      currentWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    currentWindow.close();
  }
});

// Socket IPC event handling
ipcMain.on('socket-event', (event, data) => {
  // Forward the event to all other windows except the sender
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.webContents !== event.sender) {
      window.webContents.send('socket-event', data);
    }
  });
});

// Popup handlers
ipcMain.on('open-popup', (popup) => {
  switch (popup) {
    case 'create-server':
      createCreateServerPopup();
      break;
    default:
      break;
  }
});

// listen for window control event
ipcMain.on('window-control', (event, command) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;

  switch (command) {
    case 'minimize':
      window.minimize();
      break;
    case 'maximize':
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      break;
    case 'unmaximize':
      window.unmaximize();
      break;
    case 'close':
      window.close();
      break;
  }
});
