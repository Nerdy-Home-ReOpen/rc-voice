import path from 'path';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import serve from 'electron-serve';
import net from 'net';
import DiscordRPC from 'discord-rpc';
import { io } from 'socket.io-client';
import electronUpdater from 'electron-updater';
import Store from 'electron-store';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { autoUpdater } = electronUpdater;
const store = new Store();

const SocketClientEvent = {
  // User
  SEARCH_USER: 'searchUser',
  UPDATE_USER: 'updateUser',
  // Server
  SEARCH_SERVER: 'searchServer',
  CONNECT_SERVER: 'connectServer',
  DISCONNECT_SERVER: 'disconnectServer',
  CREATE_SERVER: 'createServer',
  UPDATE_SERVER: 'updateServer',
  DELETE_SERVER: 'deleteServer',
  // Category
  CREATE_CATEGORY: 'createCategory',
  UPDATE_CATEGORY: 'updateCategory',
  DELETE_CATEGORY: 'deleteCategory',
  // Channel
  CONNECT_CHANNEL: 'connectChannel',
  DISCONNECT_CHANNEL: 'disconnectChannel',
  CREATE_CHANNEL: 'createChannel',
  UPDATE_CHANNEL: 'updateChannel',
  DELETE_CHANNEL: 'deleteChannel',
  // Friend Group
  CREATE_FRIEND_GROUP: 'createFriendGroup',
  UPDATE_FRIEND_GROUP: 'updateFriendGroup',
  DELETE_FRIEND_GROUP: 'deleteFriendGroup',
  // Member
  CREATE_MEMBER: 'createMember',
  UPDATE_MEMBER: 'updateMember',
  DELETE_MEMBER: 'deleteMember',
  // Friend
  CREATE_FRIEND: 'createFriend',
  UPDATE_FRIEND: 'updateFriend',
  DELETE_FRIEND: 'deleteFriend',
  // Member Application
  CREATE_MEMBER_APPLICATION: 'createMemberApplication',
  UPDATE_MEMBER_APPLICATION: 'updateMemberApplication',
  DELETE_MEMBER_APPLICATION: 'deleteMemberApplication',
  // Friend Application
  CREATE_FRIEND_APPLICATION: 'createFriendApplication',
  UPDATE_FRIEND_APPLICATION: 'updateFriendApplication',
  DELETE_FRIEND_APPLICATION: 'deleteFriendApplication',
  // Message
  SEND_MESSAGE: 'message',
  SEND_DIRECT_MESSAGE: 'directMessage',
  // RTC
  RTC_OFFER: 'RTCOffer',
  RTC_ANSWER: 'RTCAnswer',
  RTC_ICE_CANDIDATE: 'RTCIceCandidate',
};

const SocketServerEvent = {
  // Socket
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  // Notification
  NOTIFICATION: 'notification', // not used yet
  // User
  USER_SEARCH: 'userSearch',
  USER_UPDATE: 'userUpdate',
  // Server
  SERVER_SEARCH: 'serverSearch',
  SERVER_UPDATE: 'serverUpdate',
  // Channel
  CHANNEL_UPDATE: 'channelUpdate',
  // Category
  CATEGORY_UPDATE: 'categoryUpdate',
  // Friend Group
  FRIEND_GROUP_UPDATE: 'friendGroupUpdate',
  // Member
  MEMBER_UPDATE: 'memberUpdate',
  // Member Application
  MEMBER_APPLICATION_UPDATE: 'memberApplicationUpdate',
  // Friend
  FRIEND_UPDATE: 'friendUpdate',
  // Friend Application
  FRIEND_APPLICATION_UPDATE: 'friendApplicationUpdate',
  // Popup
  OPEN_POPUP: 'openPopup',
  // RTC
  RTC_OFFER: 'RTCOffer',
  RTC_ANSWER: 'RTCAnswer',
  RTC_ICE_CANDIDATE: 'RTCIceCandidate',
  RTC_JOIN: 'RTCJoin',
  RTC_LEAVE: 'RTCLeave',
  // Error
  ERROR: 'error',
};

let isDev = process.argv.includes('--dev');

const appServe = app.isPackaged
  ? serve({
      directory: path.join(__dirname, './out'),
    })
  : !isDev
  ? serve({
      directory: path.join(__dirname, './out'),
    })
  : null;

let baseUri = '';

if (isDev) {
  baseUri = 'http://127.0.0.1:3000';
}

// Track windows
let mainWindow = null;
let authWindow = null;
let popups = {};

// Socket connection
const WS_URL = process.env.NEXT_PUBLIC_SERVER_URL;
let socketInstance = null;

// Discord RPC
const clientId = '1242441392341516288';
DiscordRPC.register(clientId);
let rpc = null;

const defaultPrecence = {
  details: '正在使用應用',
  state: '準備中',
  startTimestamp: Date.now(),
  largeImageKey: 'app_icon',
  largeImageText: '應用名稱',
  smallImageKey: 'status_icon',
  smallImageText: '狀態說明',
  instance: false,
  buttons: [
    {
      label: '加入我們的Discord伺服器',
      url: 'https://discord.gg/adCWzv6wwS',
    },
  ],
};

function waitForPort(port) {
  return new Promise((resolve, reject) => {
    let timeout = 30000; // 30 seconds timeout
    let timer;

    function tryConnect() {
      const client = new net.Socket();

      client.once('connect', () => {
        clearTimeout(timer);
        client.destroy();
        resolve();
      });

      client.once('error', () => {
        client.destroy();
        if (timeout <= 0) {
          clearTimeout(timer);
          reject(new Error('Timeout waiting for port'));
          return;
        }
        setTimeout(tryConnect, 1000);
        timeout -= 1000;
      });

      client.connect({ port: port, host: '127.0.0.1' });
    }
    tryConnect();
  });
}

function setAutoLaunch(enable) {
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: false,
    });
  } catch (error) {
    console.error('設置開機自動啟動時出錯:', error);
  }
}

function isAutoLaunchEnabled() {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (error) {
    console.error('讀取開機自動啟動狀態時出錯:', error);
    return false;
  }
}

async function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return mainWindow;
  }

  if (isDev) {
    try {
      await waitForPort(3000);
    } catch (err) {
      console.error('Failed to connect to Next.js server:', err);
      app.quit();
      return;
    }
  }

  mainWindow = new BrowserWindow({
    minWidth: 1400,
    minHeight: 800,
    frame: false,
    transparent: true,
    resizable: true,
    hasShadow: true,
    icon: path.join(
      __dirname,
      'resources',
      process.platform === 'win32' ? 'icon.ico' : 'icon.png',
    ),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (app.isPackaged || !isDev) {
    appServe(mainWindow).then(() => {
      mainWindow.loadURL('app://-');
    });
  } else {
    mainWindow.loadURL(`${baseUri}`);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send(
      mainWindow.isMaximized() ? 'window-maximized' : 'window-unmaximized',
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('close', () => {
    app.quit();
  });

  return mainWindow;
}

async function createAuthWindow() {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.focus();
    return authWindow;
  }

  if (isDev) {
    try {
      await waitForPort(3000);
    } catch (err) {
      console.error('Failed to connect to Next.js server:', err);
      app.quit();
      return;
    }
  }

  authWindow = new BrowserWindow({
    width: 610,
    height: 450,
    resizable: false,
    frame: false,
    transparent: true,
    hasShadow: true,
    icon: path.join(
      __dirname,
      'resources',
      process.platform === 'win32' ? 'icon.ico' : 'icon.png',
    ),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (app.isPackaged || !isDev) {
    appServe(authWindow).then(() => {
      authWindow.loadURL('app://./auth.html');
    });
  } else {
    authWindow.loadURL(`${baseUri}/auth`);
    authWindow.webContents.openDevTools();
  }

  authWindow.webContents.on('did-finish-load', () => {
    authWindow.webContents.send(
      authWindow.isMaximized() ? 'window-maximized' : 'window-unmaximized',
    );
  });

  authWindow.webContents.on('close', () => {
    app.quit();
  });

  return authWindow;
}

async function createPopup(type, height, width) {
  // Track popup windows
  if (popups[type] && !popups[type].isDestroyed()) {
    popups[type].focus();
    return popups[type];
  }

  if (isDev) {
    try {
      await waitForPort(3000);
    } catch (err) {
      console.error('Failed to connect to Next.js server:', err);
      app.quit();
      return;
    }
  }

  popups[type] = new BrowserWindow({
    width: width ?? 800,
    height: height ?? 600,
    resizable: false,
    frame: false,
    transparent: true,
    hasShadow: true,
    modal: true,
    parent: null,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (app.isPackaged || !isDev) {
    appServe(popups[type]).then(() => {
      popups[type].loadURL(`app://./popup.html?type=${type}`);
    });
  } else {
    popups[type].loadURL(`${baseUri}/popup?type=${type}`);
    popups[type].webContents.openDevTools();
  }

  popups[type].webContents.on('resize', (_, width, height) => {
    popups[type].webContents.setSize(width, height);
  });

  popups[type].webContents.on('closed', () => {
    popups[type] = null;
  });

  return popups[type];
}

function connectSocket(token) {
  if (!token) return null;
  if (socketInstance) return socketInstance;

  const socket = io(WS_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: false,
    query: {
      jwt: token,
    },
  });

  const ipcHandlers = Object.values(SocketClientEvent).reduce((acc, event) => {
    acc[event] = (_, data) => socket.emit(event, data);
    return acc;
  }, {});

  socket.on('connect', () => {
    Object.entries(ipcHandlers).forEach(([event, handler]) => {
      ipcMain.on(event, handler);
    });
    Object.values(SocketServerEvent).forEach((event) => {
      socket.on(event, (data) => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(event, data);
        });
      });
    });
  });

  socket.ipcHandlers = ipcHandlers;
  return socket;
}

function disconnectSocket(socket) {
  if (!socket) return null;

  if (socket.ipcHandlers) {
    Object.entries(socket.ipcHandlers).forEach(([event, handler]) => {
      ipcMain.removeListener(event, handler);
    });
  }

  return null;
}

async function setActivity(activity) {
  if (!rpc) return;
  try {
    rpc.setActivity(activity);
  } catch (error) {
    console.error('設置Rich Presence時出錯:', error);
    rpc.setActivity(defaultPrecence);
  }
}

function configureAutoUpdater() {
  if (isDev) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
  }

  autoUpdater.on('error', (error) => {
    if (isDev && error.message.includes('dev-app-update.yml')) {
      console.log('開發環境中跳過更新檢查');
      return;
    }
    dialog.showMessageBox({
      type: 'error',
      title: '更新錯誤',
      message: '檢查更新時發生錯誤：' + error.message,
    });
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('正在檢查更新...');
  });

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: '有新版本可用',
      message: `正在下載新版本 ${info.version}，請稍後...`,
      buttons: ['確定'],
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('目前是最新版本');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let message = `下載速度: ${progressObj.bytesPerSecond}`;
    message = `${message} - 已下載 ${progressObj.percent}%`;
    message = `${message} (${progressObj.transferred}/${progressObj.total})`;
    console.log(message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox({
        type: 'info',
        title: '安裝更新',
        message: `版本 ${info.version} 已下載完成，是否立即安裝？`,
        buttons: ['立即安裝', '稍後安裝'],
      })
      .then((buttonIndex) => {
        if (buttonIndex.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });
}

async function configureDiscordRPC() {
  try {
    rpc = new DiscordRPC.Client({ transport: 'ipc' });
    await rpc.login({ clientId }).catch(() => {
      console.log('Discord RPC登錄失敗, 將不會顯示Discord Rich Presence');
      rpc = null;
    });

    if (rpc) {
      rpc.on('ready', () => {
        setActivity(defaultPrecence);
      });
    }
  } catch (error) {
    console.error('Discord RPC初始化失敗:', error);
    rpc = null;
  }
}

const configureUpdateChecker = async () => {
  try {
    if (!isDev) {
      await autoUpdater.checkForUpdates();
      setInterval(updateChecker, 60 * 60 * 1000);
    }
  } catch (error) {
    console.error('定期檢查更新失敗:', error);
  }
};

app.on('ready', async () => {
  await createAuthWindow();
  await createMainWindow();

  mainWindow.hide();
  authWindow.show();

  configureAutoUpdater();
  configureUpdateChecker();
  configureDiscordRPC();

  app.on('before-quit', () => {
    if (rpc) {
      try {
        rpc.destroy();
      } catch (error) {
        console.error('Discord RPC銷毀失敗:', error);
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  // Auth handlers
  ipcMain.on('login', (_, token) => {
    mainWindow.show();
    authWindow.hide();
    if (!socketInstance) socketInstance = connectSocket(token);
    socketInstance.connect();
  });
  ipcMain.on('logout', () => {
    mainWindow.hide();
    authWindow.show();
    socketInstance.disconnect();
    socketInstance = disconnectSocket(socketInstance);
  });

  // Initial data request handlers
  ipcMain.on('request-initial-data', (_, to) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('request-initial-data', to);
    });
  });
  ipcMain.on('response-initial-data', (_, from, data) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('response-initial-data', from, data);
    });
  });

  // Popup handlers
  ipcMain.on('open-popup', async (_, type, height, width) => {
    createPopup(type, height, width);
  });
  ipcMain.on('popup-submit', (_, to) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('popup-submit', to);
    });
  });

  // Window control event handlers
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

  // Discord RPC handlers
  ipcMain.on('update-discord-presence', (_, updatePresence) => {
    setActivity(updatePresence);
  });

  // Auto launch handlers
  ipcMain.on('set-auto-launch', (_, enable) => {
    setAutoLaunch(enable);
  });
  ipcMain.on('get-auto-launch', (event) => {
    event.reply('auto-launch-status', isAutoLaunchEnabled());
  });

  // Audio device handlers
  ipcMain.on('set-audio-device', (_, { deviceId, type }) => {
    if (type === 'input') {
      store.set('audioInputDevice', deviceId);
    } else if (type === 'output') {
      store.set('audioOutputDevice', deviceId);
    }
  });
  ipcMain.on('get-audio-device', (event) => {
    event.reply('audio-device-status', {
      input: store.get('audioInputDevice'),
      output: store.get('audioOutputDevice'),
    });
  });

  // Open external url handlers
  ipcMain.on('open-external', (_, url) => {
    shell.openExternal(url);
  });
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createAuthWindow();
    await createMainWindow();

    mainWindow.hide();
    authWindow.show();
  }
});
