/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { Server } = require('socket.io');
const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable');
const path = require('path');
const _ = require('lodash');
const fs = require('fs').promises;

// TODO: Separate disconnect logic to avoid code duplication (disconnectUser, disconnectServer, disconnectChannel)

// XP System Constants
const XP_SYSTEM = {
  BASE_XP: 5, // Base XP required for level 2
  GROWTH_RATE: 1.02, // XP requirement increases by 2% per level
  XP_PER_HOUR: 1, // XP gained per hour in voice channel
  INTERVAL_MS: 60 * 60 * 1000, // 1 hour in milliseconds
};

// Logger
class Logger {
  constructor(origin) {
    this.origin = origin;
  }
  info(message) {
    console.log(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.cyan(
        `[${this.origin}]`,
      )} ${message}`,
    );
  }
  command(message) {
    console.log(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.hex('#F3CCF3')(
        `[${this.origin}]`,
      )} ${message}`,
    );
  }
  success(message) {
    console.log(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.green(
        `[${this.origin}]`,
      )} ${message}`,
    );
  }
  warn(message) {
    console.warn(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.yellow(
        `[${this.origin}]`,
      )} ${message}`,
    );
  }
  error(message) {
    console.error(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.red(
        `[${this.origin}]`,
      )} ${message}`,
    );
  }
}

const port = 4500;
const CONTENT_TYPE_JSON = { 'Content-Type': 'application/json' };

// Message Types
// const MessageTypes = {
//   CHAT: 'chat',
//   VOICE_STATE: 'voice_state',
//   USER_STATUS: 'user_status',
//   CHANNEL_JOIN: 'channel_join',
//   CHANNEL_LEAVE: 'channel_leave',
//   USER_JOIN: 'user_join',
//   USER_LEAVE: 'user_leave',
//   FETCH: 'fetch',
// };

// User Sessions
const userSessions = new Map(); // sessionToken -> userId

// User Socket Connections
const userToSocket = new Map(); // userId -> socket.id
const socketToUser = new Map(); // socket.id -> userId

// User Contributions Interval
const contributionInterval = new Map(); // socket.id -> interval

// File Upload
const uploadDir = path.join(__dirname, 'uploads/serverAvatars');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Send Error/Success Response
const sendError = (res, statusCode, message) => {
  res.writeHead(statusCode, CONTENT_TYPE_JSON);
  res.end(JSON.stringify({ error: message }));
};

//socket error
class SocketError extends Error {
  constructor(
    message = 'unknown error',
    part = 'UNKNOWN_PART',
    tag = 'UNKNOWN_ERROR',
    status_code = 500,
  ) {
    super(message);
    this.name = 'SocketError';
    this.part = part;
    this.tag = tag;
    this.status_code = status_code;
  }
}

const sendSuccess = (res, data) => {
  res.writeHead(200, CONTENT_TYPE_JSON);
  res.end(JSON.stringify(data));
};

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// Update upload directory
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

// HTTP Server with CORS
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, PATCH');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, ngrok-skip-browser-warning, userId',
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    try {
      // Get the file path relative to uploads directory
      const relativePath = req.url.replace('/uploads/', '');
      const filePath = path.join(UPLOADS_DIR, relativePath);

      // Validate file path to prevent directory traversal
      if (!filePath.startsWith(UPLOADS_DIR)) {
        sendError(res, 403, '無權限存取此檔案');
        return;
      }

      // Get file extension and MIME type
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Read and serve the file
      fs.readFile(filePath)
        .then((data) => {
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'Access-Control-Allow-Origin': '*', // 允許跨域存取
          });
          res.end(data);
        })
        .catch((error) => {
          if (error.code === 'ENOENT') {
            sendError(res, 404, '找不到檔案');
          } else {
            sendError(res, 500, '讀取檔案失敗');
          }
        });
      return;
    } catch (error) {
      sendError(res, 500, '伺服器錯誤');
      return;
    }
  }

  if (req.method === 'POST' && req.url === '/servers') {
    const form = new formidable.IncomingForm({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 限制 5MB
      multiples: false,
      allowEmptyFiles: false,
    });

    form.parse(req, async (err, fields, files) => {
      // 用於追蹤上傳的檔案路徑
      let uploadedFilePath = null;

      try {
        if (err) {
          sendError(res, 400, '檔案上傳失敗');
          return;
        }

        // 保存上傳的檔案路徑以便需要時刪除
        if (files.icon && files.icon[0]) {
          uploadedFilePath = files.icon[0].filepath;
        }

        // 處理頭像路徑
        let iconPath = null;
        if (uploadedFilePath) {
          iconPath = `/uploads/serverAvatars/${path.basename(
            uploadedFilePath,
          )}`;
        }

        const _userId = fields.userId;
        const userId = _userId ? _userId.toString() : null;
        if (!userId) {
          throw new Error('缺少使用者ID');
        }

        const name = fields.name
          ? fields.name.toString().trim().substring(0, 30)
          : 'Untitled Server';
        const description = fields.description
          ? fields.description.toString().substring(0, 200)
          : '';

        // 驗證必要欄位
        if (!name || !userId) {
          throw new Error('缺少必要欄位');
        }

        // 獲取資料庫
        const servers = (await db.get('servers')) || {};
        const users = (await db.get('users')) || {};

        // 檢查用戶是否存在
        const user = users[userId];
        if (!user) {
          throw new Error('用戶不存在');
        }

        // 檢查用戶創建的伺服器數量
        const userOwnedServerCount = user.ownedServerIds.length;
        if (userOwnedServerCount >= 3) {
          throw new Error('已達到最大擁有伺服器數量限制');
        }

        // Create main channel
        const channelId = uuidv4();
        const channel = {
          id: channelId,
          name: '大廳',
          messageIds: [],
          parentId: null,
          userIds: [],
          isCategory: false,
          isLobby: true,
          settings: {
            bitrate: 64000,
            slowmode: false,
            userLimit: -1,
            visibility: 'public',
          },
          createdAt: Date.now().valueOf(),
          order: 0,
        };
        await db.set(`channels.${channelId}`, channel);

        // Create new server
        const displayId = await getDisplayId();
        const serverId = uuidv4();
        const server = {
          id: serverId,
          name: name,
          iconUrl: iconPath,
          level: 0,
          announcement: description || '',
          channelIds: [channelId],
          displayId: displayId,
          lobbyId: channelId,
          ownerId: userId,
          settings: {
            allowDirectMessage: true,
            visibility: 'public',
            defaultChannelId: channelId,
          },
          createdAt: Date.now().valueOf(),
        };
        await db.set(`servers.${serverId}`, server);

        // Create new member
        const memberId = uuidv4();
        const member = {
          id: memberId,
          nickname: user.name,
          serverId: serverId,
          userId: userId,
          contribution: 0,
          managedChannels: [],
          permissionLevel: 6,
          joinedAt: Date.now().valueOf(),
        };
        await db.set(`members.${memberId}`, member);

        // Update user data
        user.ownedServerIds.push(serverId);
        await db.set(`users.${userId}`, user);

        new Logger('Server').success(
          `New server created: ${serverId} by user ${userId}`,
        );

        sendSuccess(res, {
          message: 'success',
          data: {
            serverId: serverId,
          },
        });
      } catch (error) {
        // 刪除上傳的檔案
        if (uploadedFilePath) {
          fs.unlink(uploadedFilePath).catch((err) => {
            new Logger('Server').error(`Error deleting file: ${err.message}`);
          });
        }

        new Logger('Server').error(`Create server error: ${error.message}`);
        sendError(
          res,
          error.message === '用戶不存在' ? 404 : 400,
          error.message,
        );
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/user/friends') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data = {
        //  "sessionId": "123456",
        // }

        // Get database
        const users = (await db.get('users')) || {};

        // Validate data
        const userId = userSessions.get(data.sessionId);
        if (!userId) {
          throw new Error('Invalid session ID');
        }
        const user = users[userId];
        if (!user) {
          throw new Error('User not found');
        }

        sendSuccess(res, {
          message: '獲取好友成功',
          data: { friendCategories: await getFriendCategories(userId) },
        });
        new Logger('Friends').success(`User(${userId}) friends fetched`);
      } catch (error) {
        sendError(res, 500, `獲取好友時發生錯誤: ${error.message}`);
        new Logger('Friends').error(`Fetch friends error: ${error.message}`);
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/user/directMessage') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data = {
        //   "sessionId": "123456",
        //   "friendId": "789123",
        // }

        // Get database
        const users = (await db.get('users')) || {};

        // Validate data
        const sessionId = data.sessionId;
        const friendId = data.friendId;
        if (!sessionId || !friendId) {
          throw new Error('Missing required fields');
        }
        const userId = userSessions.get(sessionId);
        if (!userId) {
          throw new Error(`Invalid session ID(${sessionId})`);
        }
        const user = users[userId];
        if (!user) {
          throw new Error(`User(${userId}) not found`);
        }
        const friend = users[friendId];
        if (!friend) {
          throw new Error(`Friend(${friendId}) not found`);
        }

        sendSuccess(res, {
          message: '獲取私人訊息成功',
          data: { messages: await getDirectMessages(userId, friend.id) },
        });
        new Logger('DirectMessage').success(
          `User(${userId}) direct message fetched`,
        );
      } catch (error) {
        sendError(res, 500, `獲取私人訊息時發生錯誤: ${error.message}`);
        new Logger('DirectMessage').error(
          `Fetch direct message error: ${error.message}`,
        );
      }
    });
    return;
  }

  if (req.method == 'POST' && req.url == '/validateToken') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data = {
        //   "sessionId": "123456",
        // }

        // Validate data
        const sessionId = data.sessionId;
        if (!sessionId) {
          throw new Error('Missing required fields');
        }
        const isValid = userSessions.has(sessionId);
        if (!isValid) {
          throw new Error('Invalid session ID');
        }

        sendSuccess(res, { message: 'Token validated' });
      } catch (error) {
        sendError(res, 500, `Token validation error: ${error.message}`);
        new Logger('Auth').error(`Token validation error: ${error.message}`);
      }
    });
    return;
  }

  if (req.method == 'POST' && req.url == '/login') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data = {
        //   "password": "123456",
        //   "account": "test",
        // }
        // console.log(data);

        // Get database
        const userAccPwdList = (await db.get(`account_password`)) || {};
        const users = (await db.get(`users`)) || {};
        const presenceStates = (await db.get(`presenceStates`)) || {};

        // Validate data
        const account = data.account;
        const password = data.password;
        if (!account || !password) {
          throw new Error('無效的帳號或密碼');
        }
        const exist = userAccPwdList[account];
        if (!exist) {
          throw new Error('帳號或密碼錯誤');
        }
        if (password !== userAccPwdList[account]) {
          throw new Error('帳號或密碼錯誤');
        }
        const user = Object.values(users).find(
          (user) => user.account === account,
        );
        if (!user) {
          throw new Error('用戶不存在');
        }
        const presence = presenceStates[`presence_${user.id}`];
        if (!presence) {
          throw new Error('用戶狀態不存在');
        }

        // Update user presence
        presenceStates[presence.id] = {
          ...presence,
          status: 'online',
          lastActiveAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.set(
          `presenceStates.${presence.id}`,
          presenceStates[presence.id],
        );

        // Generate session id
        const sessionId = uuidv4();
        userSessions.set(sessionId, user.id);

        sendSuccess(res, {
          message: '登入成功',
          data: {
            sessionId: sessionId,
          },
        });
        new Logger('Auth').success(`User logged in: ${account}`);
      } catch (error) {
        sendError(res, 500, `登入時發生錯誤: ${error.message}`);
        new Logger('Auth').error(`Login error: ${error.message}`);
      }
    });
    return;
  }

  if (req.method == 'POST' && req.url == '/register') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data = {
        //   "account": "test",
        //   "password": "123456",
        //   "username": "test",
        // }
        // console.log(data);

        // Get database
        const userAccPwdList = (await db.get(`account_password`)) || {};
        const presenceStates = (await db.get(`presenceStates`)) || {};

        // Validate data
        const account = data.account;
        const password = data.password;
        if (!account || !password) {
          throw new Error('無效的帳號或密碼');
        }
        const username = data.username;
        if (!username) {
          throw new Error('無效的使用者名稱');
        }
        const exists = userAccPwdList[data.account];
        if (exists) {
          throw new Error('帳號已存在');
        }

        // Create user data
        const userId = uuidv4();
        const user = {
          id: userId,
          name: username,
          account: account,
          gender: data.gender || 'Male',
          xp: 0,
          level: 1,
          signature: '',
          badgeIds: ['nerd'],
          ownedServerIds: [],
          settings: {
            theme: 'light',
            notifications: true,
          },
          createdAt: Date.now(),
        };
        await db.set(`users.${userId}`, user);

        // Create user presence
        const presenceId = `presence_${userId}`;
        const presence = {
          id: presenceId,
          userId: userId,
          currentServerId: null,
          currentChannelId: null,
          status: 'gn',
          customStatus: '',
          lastActiveAt: Date.now(),
          updatedAt: Date.now(),
        };
        presenceStates[presenceId] = presence;
        await db.set(`presenceStates.${presenceId}`, presence);

        // Create account password list
        await db.set(`account_password.${account}`, password);

        sendSuccess(res, { message: '註冊成功' });
        new Logger('Auth').success(`User registered: ${account}`);
      } catch (error) {
        sendError(res, 500, `註冊時發生錯誤: ${error.message}`);
        new Logger('Auth').error(`Register error: ${error.message}`);
      }
    });
    return;
  }

  sendSuccess(res, { message: 'Hello World!' });
  return;
});

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
  },
});

const Call = require("./server");
let serverCall = new Call();
async function runServerCall() {
  const channels = (await db.get('channels')) || {};
  serverCall = new Call(io, channels);
}
runServerCall();

io.on('connection', async (socket) => {
  socket.on('disconnect', async () => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        throw new SocketError(
          'Invalid socket ID',
          'DISCONNECT',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'DISCONNECT',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'DISCONNECT',
          'PRESENCE',
          404,
        );
      }
      const channel = channels[presence.currentChannelId];
      if (!channel) {
        new Logger('WebSocket').warn(
          `Channel(${presence.currentChannelId}) not found. Won't disconnect channel.`,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        new Logger('WebSocket').warn(
          `Server(${presence.currentServerId}) not found. Won't disconnect server.`,
        );
      }

      // Clear user contribution interval
      clearContributionInterval(socket.id);

      // Remove user socket connection
      if (!deleteUserIdSocketIdMap(userId, socket.id)) {
        throw new SocketError(
          'Cannot delete user socket connection',
          'DISCONNECT',
          'DELETE_ID_FUNCTION',
          500,
        );
      }

      // Update user presence
      presenceStates[presence.id] = {
        ...presence,
        currentServerId: null,
        currentChannelId: null,
        lastActiveAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      if (channel) {
        // Update channel
        channel.userIds = channel.userIds.filter((id) => id !== userId);
        await db.set(`channels.${channel.id}`, channel);

        // Emit data (to all users in the channel)
        io.to(`server_${server.id}`).emit('serverUpdate', {
          ...(await getServer(server.id)),
        });
      }

      serverCall.handleDisconnect(socket);

      new Logger('WebSocket').success(`User(${userId}) disconnected`);
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `斷線時發生無法預期的錯誤: ${error.message}`,
          part: 'DISCONNECT',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }

      new Logger('WebSocket').error(
        `Error disconnecting user: ${error.message}`,
      );
    }
  });

  socket.on('connectUser', async (data) => {
    // data = {
    //   sessionId: '123456',
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      if (!sessionId) {
        throw new SocketError(
          'Missing required fields',
          'CONNECTUSER',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          'Invalid session ID(${sessionId})',
          'CONNECTUSER',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'CONNECTUSER',
          'USER',
          404,
        );
      }

      // Check if user is already connected
      for (const [key, value] of socketToUser) {
        if (value === userId) {
          // Remove user socket connection
          if (!deleteUserIdSocketIdMap(value, key)) {
            throw new SocketError(
              'Cannot delete user socket connection',
              'CONNECTUSER',
              'DELETE_ID_FUNCTION',
              500,
            );
          }

          // Emit force disconnect event
          io.to(key).emit('forceDisconnect');

          new Logger('WebSocket').warn(
            `User(${userId}) already connected from another socket. Force disconnecting...`,
          );
        }
      }

      // Save user socket connection
      if (!createUserIdSocketIdMap(userId, socket.id)) {
        throw new SocketError(
          'Cannot create user socket connection',
          'CONNECTUSER',
          'CREATE_ID_FUNCTION',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('userConnect', {
        ...(await getUser(userId)),
        members: await getUserMembers(userId),
      });

      new Logger('WebSocket').success(`User(${userId}) connected`);
    } catch (error) {
      // Emit error data (only to the user)
      io.to(socket.id).emit('userDisconnect', null);
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `取得使用者時發生無法預期的錯誤: ${error.message}`,
          part: 'CONNECTUSER',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error getting user data: ${error.message}`,
      );
    }
  });

  socket.on('disconnectUser', async (data) => {
    // data = {
    //   sessionId: '123456',
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      if (!sessionId) {
        throw new SocketError(
          'Missing required fields',
          'DISCONNECTUSER',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          'Invalid session ID(${sessionId})',
          'DISCONNECTUSER',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'DISCONNECTUSER',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'DISCONNECTUSER',
          'PRESENCE',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        new Logger('WebSocket').warn(
          `Server(${presence.currentServerId}) not found. Won't disconnect server.`,
        );
      }
      const channel = channels[presence.currentChannelId];
      if (!channel) {
        new Logger('WebSocket').warn(
          `Channel(${presence.currentChannelId}) not found. Won't disconnect channel.`,
        );
      }

      // Remove user socket connection
      if (!deleteUserIdSocketIdMap(userId, socket.id)) {
        throw new SocketError(
          'Cannot delete user socket connection',
          'DISCONNECTUSER',
          'DELETE_ID_FUNCTION',
          500,
        );
      }

      // Update user presence
      presenceStates[presence.id] = {
        ...presence,
        currentServerId: null,
        currentChannelId: null,
        status: 'gn',
        lastActiveAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      if (channel) {
        // Clear user contribution interval
        clearContributionInterval(socket.id);

        // Update channel
        channel.userIds = channel.userIds.filter((id) => id !== userId);
        await db.set(`channels.${channel.id}`, channel);

        // leave the channel
        socket.leave(`channel_${channel.id}`);

        // Emit data (only to the user)
        io.to(socket.id).emit('channelDisconnect');

        // Emit data (to all users in the channel)
        io.to(`server_${server.id}`).emit('serverUpdate', {
          ...(await getServer(server.id)),
        });
      }

      if (server) {
        // leave the server
        socket.leave(`server_${server.id}`);

        // Emit data (only to the user)
        io.to(socket.id).emit('serverDisconnect');
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('userDisconnect');

      new Logger('WebSocket').success(`User(${userId}) disconnected`);
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `登出時發生無法預期的錯誤: ${error.message}`,
          part: 'DISCONNECTUSER',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }

      new Logger('WebSocket').error(
        `Error disconnecting user: ${error.message}`,
      );
    }
  });

  socket.on('updateServer', async (data) => {
    let uploadedFilePath = null;

    try {
      // Get database
      const users = (await db.get('users')) || {};
      const servers = (await db.get('servers')) || {};

      // Validate data
      const { sessionId, serverId, updates } = data;
      if (!sessionId || !serverId || !updates) {
        throw new SocketError(
          'Missing required fields',
          'UPDATESERVER',
          'DATA',
          400,
        );
      }

      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          'Invalid session ID(${sessionId})',
          'UPDATESERVER',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'UPDATESERVER',
          'USER',
          404,
        );
      }

      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'UPDATESERVER',
          'SERVER',
          404,
        );
      }

      // Check permissions
      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 5) {
        throw new SocketError(
          'Insufficient permissions',
          'UPDATESERVER',
          'PERMISSION',
          403,
        );
      }

      if (updates.fileData && updates.fileType) {
        // Create file with unique name
        const ext = updates.fileType.split('/')[1];
        const fileName = `${uuidv4()}.${ext}`;
        uploadedFilePath = path.join(uploadDir, fileName);

        // Save file
        const buffer = Buffer.from(updates.fileData, 'base64');
        await fs.writeFile(uploadedFilePath, buffer);

        // Create icon path
        const iconPath = `/uploads/serverAvatars/${fileName}`;

        // Delete old icon if exists
        if (server.iconUrl && !server.iconUrl.includes('logo_server_def.png')) {
          const oldPath = path.join(
            UPLOADS_DIR,
            server.iconUrl.replace('/uploads/', ''),
          );
          try {
            await fs.unlink(oldPath);
          } catch (error) {
            new Logger('Server').warn(
              `Error deleting old icon: ${error.message}`,
            );
          }
        }

        // Add icon URL to updates
        updates.iconUrl = iconPath;
      }

      // Remove file data from updates before saving
      const { fileData, fileType, ...serverUpdates } = updates;

      // Validate specific fields
      if (
        serverUpdates.name &&
        (serverUpdates.name.length > 30 || !serverUpdates.name.trim())
      ) {
        throw new SocketError(
          'Invalid server name',
          'UPDATESERVER',
          'NAME',
          400,
        );
      }
      if (serverUpdates.description && serverUpdates.description.length > 200) {
        throw new SocketError(
          'Invalid server description',
          'UPDATESERVER',
          'DESCRIPTION',
          400,
        );
      }

      // Create new server object with only allowed updates
      const updatedServer = {
        ...server,
        ..._.pick(serverUpdates, [
          'name',
          'slogan',
          'description',
          'iconUrl',
          'announcement',
        ]),
        settings: {
          ...server.settings,
          ..._.pick(serverUpdates.settings || {}, ['visibility']),
        },
      };

      // Update in database
      await db.set(`servers.${serverId}`, updatedServer);

      // Emit updated data to all users in the server
      io.to(`server_${serverId}`).emit('serverUpdate', {
        ...(await getServer(serverId)),
      });

      new Logger('Server').success(
        `Server(${serverId}) updated by user(${userId})`,
      );
    } catch (error) {
      // Delete uploaded file if error occurs
      if (uploadedFilePath) {
        fs.unlink(uploadedFilePath).catch(console.error);
      }
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `更新伺服器時發生無法預期的錯誤: ${error.message}`,
          part: 'UPDATESERVER',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('Server').error(`Error updating server: ${error.message}`);
    }
  });

  socket.on('updateUser', async (data) => {
    // data = {
    //   sessionId
    //   user: {
    //     name:
    //     gender:
    //     signature:
    //     ...
    //   }
    // }

    // Get database
    const users = (await db.get('users')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const editedUser = data.user;
      if (!sessionId || !editedUser) {
        throw new SocketError(
          'Missing required fields',
          'UPDATEUSER',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          'Invalid session ID(${sessionId})',
          'UPDATEUSER',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'UPDATEUSER',
          'USER',
          404,
        );
      }

      // Update user data
      users[userId] = {
        ...user,
        ...editedUser,
      };
      await db.set(`users.${userId}`, users[userId]);

      // Emit data (only to the user)
      io.to(socket.id).emit('userUpdate', {
        ...editedUser,
      });

      new Logger('WebSocket').success(`User(${userId}) updated`);
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `更新使用者時發生無法預期的錯誤: ${error.message}`,
          part: 'UPDATEUSER',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(`Error updating user: ${error.message}`);
    }
  });

  socket.on('updatePresence', async (data) => {
    // data = {
    //   sessionId
    //   presence: {
    //     status:
    //     customStatus:
    //     ...
    //   }
    // }

    // Get database
    const users = (await db.get('users')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const editedPresence = data.presence;
      if (!sessionId || !editedPresence) {
        throw new SocketError(
          'Missing required fields',
          'UPDATEPRESENCE',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          'Invalid session ID(${sessionId})',
          'UPDATEPRESENCE',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'UPDATEPRESENCE',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'UPDATEPRESENCE',
          'PRESENCE',
          404,
        );
      }

      // Update user presence
      presenceStates[presence.id] = {
        ...presence,
        ...editedPresence,
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      // Emit data (only to the user)
      io.to(socket.id).emit('userPresenceUpdate', {
        ...editedPresence,
      });

      new Logger('WebSocket').success(`User(${userId}) presence updated`);
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,

          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `更新狀態時發生無法預期的錯誤: ${error.message}`,
          part: 'UPDATEPRESENCE',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error updating presence: ${error.message}`,
      );
    }
  });

  socket.on('connectServer', async (data) => {
    // data = {
    //   sessionId:
    //   serverId:
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const serverId = data.serverId;
      if (!sessionId || !serverId) {
        throw new SocketError(
          'Missing required fields',
          'CONNECTSERVER',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'CONNECTSERVER',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'CONNECTSERVER',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'CONNECTSERVER',
          'PRESENCE',
          404,
        );
      }
      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'CONNECTSERVER',
          'SERVER',
          404,
        );
      }

      // Check user is blocked from the server
      const isBlocked = checkUserBlocked(members, server.id, userId);
      if (isBlocked) {
        throw new SocketError(
          'User is blocked from the server',
          'CONNECTSERVER',
          'BLOCKED',
          403,
        );
      }

      // Check if user is already exists in the server
      const exists = Object.values(members).find(
        (member) => member.serverId === server.id && member.userId === userId,
      );
      if (!exists) {
        // Create new membership
        const memberId = uuidv4();
        const member = {
          id: memberId,
          serverId: server.id,
          userId: user.id,
          nickname: user.name,
          permissionLevel: 1,
          managedChannels: [],
          contribution: 0,
          joinedAt: Date.now(),
        };
        members[memberId] = member;
        await db.set(`members.${memberId}`, member);
      }

      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 2 && server.settings.visibility === 'invisible') {
        throw new SocketError(
          '該群組只允許會員加入，請先申請加入(重新整理後可見)',
          'CONNECTSERVER',
          'VISIBILITY',
          403,
        );
      }

      // Update user presence
      presenceStates[presence.id] = {
        ...presence,
        currentServerId: server.id,
        lastActiveAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      // Join the server
      socket.join(`server_${server.id}`);

      // Emit data (only to the user)
      io.to(socket.id).emit('serverConnect', {
        ...(await getServer(server.id)),
        applications:
          userPermission >= 5 ? await getServerApplications(server.id) : [],
      });
      io.to(socket.id).emit('userPresenceUpdate', {
        ...(await getPresenceState(userId)),
      });

      new Logger('WebSocket').success(
        `User(${userId}) connected to server(${server.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      io.to(socket.id).emit('serverDisconnect');
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,

          part: error.part,

          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `加入伺服器時發生無法預期的錯誤: ${error.message}`,
          part: 'CONNECTSERVER',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error getting server data: ${error.message}`,
      );
    }
  });

  socket.on('disconnectServer', async (data) => {
    // data = {
    //   sessionId: '123456',
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      if (!sessionId) {
        throw new SocketError(
          'Missing required fields',
          'DISCONNECTSERVER',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'DISCONNECTSERVER',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'DISCONNECTSERVER',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'DISCONNECTSERVER',
          'PRESENCE',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        throw new SocketError(
          `Server(${presence.currentServerId}) not found`,
          'DISCONNECTSERVER',
          'SERVER',
          404,
        );
      }
      const channel = channels[presence.currentChannelId];
      if (!channel) {
        new Logger('WebSocket').warn(
          `Channel(${presence.currentChannelId}) not found. Won't disconnect channel.`,
        );
      }

      // Update user presence
      presenceStates[presence.id] = {
        ...presence,
        currentServerId: null,
        currentChannelId: null,
        lastActiveAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      if (channel) {
        // Clear user contribution interval
        clearContributionInterval(socket.id);

        // Update channel
        channel.userIds = channel.userIds.filter((id) => id !== userId);
        await db.set(`channels.${channel.id}`, channel);

        // leave the channel
        socket.leave(`channel_${channel.id}`);

        // Emit data (only to the user)
        io.to(socket.id).emit('channelDisconnect');

        // Emit data (to all users in the channel)
        io.to(`server_${server.id}`).emit('serverUpdate', {
          ...(await getServer(server.id)),
        });
      }

      // Leave the server
      socket.leave(`server_${server.id}`);

      // Emit data (only to the user)
      io.to(socket.id).emit('serverDisconnect');
      io.to(socket.id).emit('userPresenceUpdate', {
        ...(await getPresenceState(userId)),
      });

      new Logger('WebSocket').success(
        `User(${userId}) disconnected from server(${server.id})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `離開伺服器時發生無法預期的錯誤: ${error.message}`,
          part: 'DISCONNECTSERVER',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error disconnecting from server: ${error.message}`,
      );
    }
  });

  socket.on('connectChannel', async (data) => {
    // data = {
    //   sessionId: '123456',
    //   channelId: '123456',
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // validate data
      const sessionId = data.sessionId;
      const channelId = data.channelId;
      if (!sessionId || !channelId) {
        throw new SocketError(
          'Missing required fields',
          'CONNECTCHANNEL',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'CONNECTCHANNEL',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'CONNECTCHANNEL',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'CONNECTCHANNEL',
          'PRESENCE',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        throw new SocketError(
          `Server(${presence.currentServerId}) not found`,
          'CONNECTCHANNEL',
          'SERVER',
          404,
        );
      }
      const channel = channels[channelId];
      if (!channel && channelId) {
        throw new SocketError(
          `Channel(${channelId}) not found`,
          'CONNECTCHANNEL',
          'CHANNEL',
          404,
        );
      }
      if (channel.permission === 'private') {
        throw new SocketError(
          'Insufficient permissions',
          'CONNECTCHANNEL',
          'CHANNEL_PERMISSION',
          403,
        );
      }
      const prevChannel = channels[presence.currentChannelId];

      // check if user is already in a channel, if so, disconnect the channel
      if (prevChannel) {
        // Update Channel
        prevChannel.userIds = prevChannel.userIds.filter((id) => id !== userId);
        await db.set(`channels.${prevChannel.id}`, prevChannel);

        // Leave the channel
        socket.leave(`channel_${prevChannel.id}`);

        // Play sound
        io.to(`channel_${prevChannel.id}`).emit('playSound', 'leave');
      } else {
        // Setup user interval for accumulate contribution
        setupContributionInterval(socket.id, userId);
      }

      // Update user presence
      presenceStates[presence.id] = {
        ...presence,
        currentServerId: server.id,
        currentChannelId: channel.id,
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      // Update channel
      if (!channel.userIds.includes(userId)) {
        channel.userIds.push(userId);
        await db.set(`channels.${channel.id}`, channel);
      }

      // Play sound
      io.to(`channel_${channel.id}`).emit('playSound', 'join');

      // Join the channel
      socket.join(`channel_${channel.id}`);

      // Emit updated data (only to the user)
      io.to(socket.id).emit('channelConnect', channel);
      io.to(socket.id).emit('userPresenceUpdate', {
        ...(await getPresenceState(userId)),
      });

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      new Logger('WebSocket').success(
        `User(${user.id}) connected to channel(${channel.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      io.to(socket.id).emit('channelDisconnect');
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `加入頻道時發生無法預期的錯誤: ${error.message}`,
          part: 'JOINCHANNEL',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error connecting to channel: ${error.message}`,
      );
    }
  });

  socket.on('getMembers', async (data) => {
    // data = {
    //   sessionId
    //   serverId
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const serverId = data.serverId;
      if (!sessionId || !serverId) {
        throw new SocketError(
          'Missing required fields',
          'GETMEMBERS',
          'DATA',
          400,
        );
      }

      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'GETMEMBERS',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'GETMEMBERS',
          'USER',
          404,
        );
      }

      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'GETMEMBERS',
          'SERVER',
          404,
        );
      }

      // Check if user has permission to view members
      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 5) {
        throw new SocketError(
          'Insufficient permissions',
          'GETMEMBERS',
          'USER_PERMISSION',
          403,
        );
      }

      // Get all members for this server
      const serverMembers = Object.values(members)
        .filter((member) => member.serverId === serverId)
        .map(async (member) => ({
          ...member,
        }));

      const resolvedMembers = await Promise.all(serverMembers);

      socket.emit('members', resolvedMembers);

      new Logger('Members').success(`Members fetched for server(${serverId})`);
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `獲取成員時發生無法預期的錯誤: ${error.message}`,
          part: 'GETMEMBERS',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('Members').error(`Error getting members: ${error.message}`);

      // Emit error data (only to the user)
      io.to(socket.id).emit('members', []);
    }
  });

  socket.on('getApplications', async (data) => {
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const applications = (await db.get('serverApplications')) || {};

    try {
      const { sessionId, serverId } = data;
      if (!sessionId || !serverId) {
        throw new SocketError(
          'Missing required fields',
          'GETAPPLICATIONS',
          'DATA',
          400,
        );
      }

      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'GETAPPLICATIONS',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'GETAPPLICATIONS',
          'USER',
          404,
        );
      }

      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'GETAPPLICATIONS',
          'SERVER',
          404,
        );
      }

      // Check if user has permission to view applications
      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 5) {
        throw new SocketError(
          'Insufficient permissions',
          'GETAPPLICATIONS',
          'USER_PERMISSION',
          403,
        );
      }

      // Get all applications for this server
      const serverApplications = Object.values(applications)
        .filter((app) => app.serverId === serverId)
        .map(async (app) => ({
          ...app,
          user: await getUser(app.userId),
        }));

      const resolvedApplications = await Promise.all(serverApplications);

      socket.emit('applications', resolvedApplications);

      new Logger('Applications').success(
        `Applications fetched for server(${serverId})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `獲取申請列表時發生無法預期的錯誤: ${error.message}`,
          part: 'GETAPPLICATIONS',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('Applications').error(
        `Error getting applications: ${error.message}`,
      );
    }
  });

  socket.on('handleApplication', async (data) => {
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};
    const applications = (await db.get('serverApplications')) || {};

    try {
      const { sessionId, serverId, applicationId, action } = data;
      if (!sessionId || !serverId || !applicationId || !action) {
        throw new SocketError(
          'Missing required fields',
          'HANDLEAPPLICATION',
          'DATA',
          400,
        );
      }

      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'HANDLEAPPLICATION',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'HANDLEAPPLICATION',
          'USER',
          404,
        );
      }

      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'HANDLEAPPLICATION',
          'SERVER',
          404,
        );
      }

      // Check if user has permission to handle applications
      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 5) {
        throw new SocketError(
          'Insufficient permissions',
          'HANDLEAPPLICATION',
          'USER_PERMISSION',
          403,
        );
      }

      const application = applications[applicationId];
      if (!application) {
        throw new SocketError(
          `Application(${applicationId}) not found`,
          'HANDLEAPPLICATION',
          'APPLICATION',
          404,
        );
      }

      if (action === 'accept') {
        // Create new membership if it doesn't exist
        const exists = Object.values(members).find(
          (member) =>
            member.serverId === server.id &&
            member.userId === application.userId,
        );

        if (!exists) {
          const memberId = uuidv4();
          const member = {
            id: memberId,
            serverId: server.id,
            userId: application.userId,
            nickname: users[application.userId].name,
            permissionLevel: 2,
            managedChannels: [],
            contribution: 0,
            joinedAt: Date.now(),
          };
          await db.set(`members.${memberId}`, member);
        } else {
          // Update existing membership
          exists.joinedAt = Date.now();
          if (exists.permissionLevel < 2) exists.permissionLevel = 2;
          await db.set(`members.${exists.id}`, exists);
        }
      }

      // Delete application
      await db.delete(`serverApplications.${applicationId}`);

      // Emit updated applications list to admin
      const updatedApplications = await getServerApplications(serverId);
      socket.emit('applications', updatedApplications);

      if (action === 'accept') {
        // emit server update to all users
        io.to(`server_${serverId}`).emit('serverUpdate', {
          ...(await getServer(serverId)),
        });

        // emit user update to the user
        const targetSocketId = userToSocket.get(application.userId);
        if (targetSocketId) {
          const sockets = await io.fetchSockets();
          for (const socket of sockets)
            if (socket.id == targetSocketId)
              io.to(socket.id).emit('userConnect', {
                ...(await getUser(application.userId)),
                members: await getUserMembers(application.userId),
              });
        }
      }

      new Logger('Applications').success(
        `Application(${applicationId}) ${action}ed for server(${serverId})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `處理申請時發生無法預期的錯誤: ${error.message}`,
          part: 'HANDLEAPPLICATION',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('Applications').error(
        `Error handling application: ${error.message}`,
      );
    }
  });

  socket.on('applyServerMembership', async (data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const applications = (await db.get('serverApplications')) || {};

    try {
      // Validate data
      const { sessionId, serverId, application } = data;
      if (!sessionId || !serverId || !application) {
        throw new SocketError(
          'Missing required fields',
          'APPLYSERVERMEMBERSHIP',
          'DATA',
          400,
        );
      }

      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'APPLYSERVERMEMBERSHIP',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'APPLYSERVERMEMBERSHIP',
          'USER',
          404,
        );
      }

      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'APPLYSERVERMEMBERSHIP',
          'SERVER',
          404,
        );
      }

      // Check if user already has a pending application
      const existingApplication = Object.values(applications).find(
        (app) => app.userId === userId && app.serverId === serverId,
      );
      if (existingApplication) {
        throw new SocketError(
          '您已經有一個待審核的申請，請等待管理員審核',
          'APPLYSERVERMEMBERSHIP',
          'APPLICATION',
          400,
        );
      }

      // Create new application
      const applicationId = uuidv4();
      const newApplication = {
        id: applicationId,
        userId: userId,
        serverId: serverId,
        description: application.description || '',
        createdAt: Date.now().valueOf(),
      };

      // Save to database
      applications[applicationId] = newApplication;
      await db.set(`serverApplications.${applicationId}`, newApplication);

      // Send success response
      socket.emit('applicationResponse', {
        success: true,
        message: '申請已送出，請等待管理員審核',
      });

      new Logger('Application').success(
        `User(${userId}) applied to server(${serverId})`,
      );
    } catch (error) {
      io.to(socket.id).emit('applicationResponse', {
        success: false,
        message: `申請失敗: ${error.message}`,
      });
    }
  });

  socket.on('userKicked', async (data) => {
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      const { sessionId, serverId, userId, targetId } = data;
      if (!sessionId || !serverId || !userId || !targetId) {
        throw new SocketError(
          'Missing required fields',
          'USERKICKED',
          'DATA',
          400,
        );
      }

      const user = users[userId];
      const target = users[targetId];
      if (!user || !target) {
        throw new SocketError(
          `User(${userId} or ${targetId}) not found`,
          'USERKICKED',
          'USER',
          404,
        );
      }

      const presence = presenceStates[`presence_${targetId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${targetId}`}) not found`,
          'USERKICKED',
          'PRESENCE',
          404,
        );
      }

      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'USERKICKED',
          'SERVER',
          404,
        );
      }

      const channel = channels[presence.currentChannelId];
      if (!channel) {
        throw new SocketError(
          `Channel(${presence.currentChannelId}) not found`,
          'USERKICKED',
          'CHANNEL',
          404,
        );
      }

      // 檢查權限
      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 3) {
        throw new SocketError(
          'Insufficient permissions',
          'USERKICKED',
          'USER_PERMISSION',
          403,
        );
      }

      // 獲取被踢用戶的 socket.id
      const targetSocketId = userToSocket.get(targetId);
      if (!targetSocketId) {
        throw new SocketError(
          `User(${targetId}) is not connected`,
          'USERKICKED',
          'USER',
          404,
        );
      }

      // 從頻道移除
      channel.userIds = channel.userIds.filter((id) => id !== targetId);
      await db.set(`channels.${channel.id}`, channel);

      // 更新 Presence 狀態
      presenceStates[presence.id] = {
        ...presence,
        currentChannelId: null,
        lastActiveAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      const sockets = await io.fetchSockets();

      for (const socket of sockets) {
        if (socket.id == targetSocketId) {
          // Leave the server
          socket.leave(`channel_${channel.id}`);
          socket.leave(`server_${server.id}`);
        }
      }

      // 向被踢用戶發送事件，讓客戶端處理 UI 變更
      io.to(targetSocketId).emit('channelDisconnect');
      io.to(targetSocketId).emit('serverDisconnect');
      io.to(targetSocketId).emit('userPresenceUpdate', {
        ...(await getPresenceState(targetId)),
      });

      // 發送通知給所有用戶
      io.to(`server_${server.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      new Logger('WebSocket').success(
        `User(${targetId}) kicked from channel(${channel.id}) by user(${userId})`,
      );
      new Logger('WebSocket').success(
        `User(${targetId}) kicked from server(${server.id}) by user(${userId})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `踢出使用者時發生無法預期的錯誤: ${error.message}`,
          part: 'USERKICKED',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error kicking user from channel: ${error.message}`,
      );
    }
  });

  socket.on('userAddFriend', async (data) => {
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const messages = (await db.get('messages')) || {};
    const friends = (await db.get('friends')) || {};

    try {
      const { sessionId, serverId, userId, targetId } = data;
      if (!sessionId || !serverId || !userId || !targetId) {
        throw new Error('Missing required fields');
      }

      const user = users[userId];
      const target = users[targetId];
      if (!user || !target) {
        throw new Error(`User(${userId} or ${targetId}) not found`);
      }

      const server = servers[serverId];
      if (!server) {
        throw new Error(`Server(${serverId}) not found`);
      }

      // Find direct message and update (if not exists, create one)
      const friend = await getFriend(userId, targetId);
      if (!friend) {
        // Create new message
        const messageId = uuidv4();
        const messageTemp = {
          id: messageId,
          timestamp: Date.now().valueOf(),
        };
        messages[messageId] = messageTemp;
        await db.set(`messages.${messageId}`, messageTemp);

        const friendId = uuidv4();
        friends[friendId] = {
          id: friendId,
          status: 'pending',
          userIds: [userId, targetId],
          messageIds: [messageId],
          createdAt: Date.now(),
        };
        await db.set(`friends.${friendId}`, friends[friendId]);
      } else if (friend) {
        throw new Error(`target friend(${targetId}) is found`);
      }

      new Logger('WebSocket').success(
        `User(${targetId}) add friend from server(${server.id}) by user(${userId})`,
      );
    } catch (error) {
      io.to(socket.id).emit('error', {
        message: `新增好友時發生錯誤: ${error.message}`,
        part: 'ADDFRIENDFROMCHANNEL',
        tag: 'EXCEPTION_ERROR',
        status_code: 500,
      });

      new Logger('WebSocket').error(
        `Error add friend from channel: ${error.message}`,
      );
    }
  });

  socket.on('disconnectChannel', async (data) => {
    // data = {
    //   sessionId: '123456',
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      if (!sessionId) {
        throw new SocketError(
          'Missing required fields',
          'DISCONNECTCHANNEL',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'DISCONNECTCHANNEL',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'DISCONNECTCHANNEL',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'DISCONNECTCHANNEL',
          'PRESENCE',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        throw new SocketError(
          `Server(${presence.currentServerId}) not found`,
          'DISCONNECTCHANNEL',
          'SERVER',
          404,
        );
      }
      const channel = channels[presence.currentChannelId];
      if (!channel) {
        throw new SocketError(
          `Channel(${presence.currentChannelId}) not found`,
          'DISCONNECTCHANNEL',
          'CHANNEL',
          404,
        );
      }

      // Clear user contribution interval
      clearContributionInterval(socket.id);

      // Update user presence
      presenceStates[presence.id] = {
        ...presence,
        currentChannelId: null,
        updatedAt: Date.now(),
      };
      await db.set(
        `presenceStates.${presence.id}`,
        presenceStates[presence.id],
      );

      // Update channel
      channel.userIds = channel.userIds.filter((id) => id !== user.id);
      await db.set(`channels.${channel.id}`, channel);

      // Leave the channel
      socket.leave(`channel_${channel.id}`);

      // Emit updated data (only to the user)
      io.to(socket.id).emit('channelDisconnect');
      io.to(socket.id).emit('userPresenceUpdate', {
        ...(await getPresenceState(user.id)),
      });

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      // Play sound
      io.to(`channel_${channel.id}`).emit('playSound', 'leave');

      new Logger('WebSocket').success(
        `User(${user.id}) disconnected from channel(${channel.id})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `離開頻道時發生無法預期的錯誤: ${error.message}`,
          part: 'DISCONNECTCHANNEL',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error disconnecting from channel: ${error.message}`,
      );
    }
  });

  socket.on('sendMessage', async (data) => {
    // data = {
    //   sessionId: '123456',
    //   message: {
    //     senderId: "",
    //     content: "",
    //   }
    // };
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const messages = (await db.get('messages')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const newMessage = data.message;
      if (!sessionId || !newMessage) {
        throw new SocketError(
          'Missing required fields',
          'SENDMESSAGE',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'SENDMESSAGE',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'SENDMESSAGE',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'SENDMESSAGE',
          'PRESENCE',
          404,
        );
      }
      const channel = channels[presence.currentChannelId];
      if (!channel) {
        throw new SocketError(
          `Channel(${presence.currentChannelId}) not found`,
          'SENDMESSAGE',
          'CHANNEL',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        throw new SocketError(
          `Server(${presence.currentServerId}) not found`,
          'SENDMESSAGE',
          'SERVER',
          404,
        );
      }

      // Create new message
      const messageId = uuidv4();
      const message = {
        ...newMessage,
        id: messageId,
        timestamp: Date.now().valueOf(),
      };
      messages[messageId] = message;
      await db.set(`messages.${messageId}`, message);

      // Add message to channel
      channel.messageIds.push(messageId);
      await db.set(`channels.${channel.id}`, channel);

      // Emit updated data (to all users in the channel)
      io.to(`channel_${channel.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      new Logger('WebSocket').info(
        `User(${user.id}) sent ${message.content} to channel(${channel.id})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `傳送訊息時發生無法預期的錯誤: ${error.message}`,
          part: 'CHATMESSAGE',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error('Error sending message: ' + error.message);
    }
  });

  socket.on('sendDirectMessage', async (data) => {
    // data = {
    //   sessionId: '123456',
    //   recieverId: '123456',
    //   message: {
    //     senderId: "",
    //     content: "",
    //   }
    // };

    // Get database
    const users = (await db.get('users')) || {};
    const messages = (await db.get('messages')) || {};
    const friends = (await db.get('friends')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const recieverId = data.recieverId;
      const newMessage = data.message;
      if (!sessionId || !newMessage) {
        throw new SocketError(
          'Missing required fields',
          'SENDDIRECTMESSAGE',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'SENDDIRECTMESSAGE',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'SENDDIRECTMESSAGE',
          'USER',
          404,
        );
      }

      // Create new message
      const messageId = uuidv4();
      const message = {
        ...newMessage,
        id: messageId,
        timestamp: Date.now().valueOf(),
      };
      messages[messageId] = message;
      await db.set(`messages.${messageId}`, message);

      // Find direct message and update (if not exists, create one)
      const friend = await getFriend(userId, recieverId);
      if (!friend) {
        const friendId = uuidv4();
        friends[friendId] = {
          id: friendId,
          status: 'pending',
          userIds: [userId, recieverId],
          messageIds: [messageId],
          createdAt: Date.now(),
        };
        await db.set(`friends.${friendId}`, friends[friendId]);
      } else {
        friend.messageIds.push(messageId);
        await db.set(`friends.${friend.id}`, friend);
      }

      // Emit updated data (to the user and reciever)
      const recieverSocketId = userToSocket.get(recieverId);
      console.log(recieverSocketId, socket.id);
      io.to(socket.id).emit('directMessage', [
        ...(await getDirectMessages(userId, recieverId)),
      ]);
      io.to(recieverSocketId).emit('directMessage', [
        ...(await getDirectMessages(userId, recieverId)),
      ]);

      new Logger('WebSocket').info(
        `User(${userId}) sent ${message.content} to user(${recieverId})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `傳送私訊時發生無法預期的錯誤: ${error.message}`,
          part: 'DIRECTMESSAGE',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }

      new Logger('WebSocket').error(
        'Error sending direct message: ' + error.message,
      );
    }
  });

  socket.on('updateChannelOrder', async (data) => {
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};

    try {
      const userId = userSessions.get(data.sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${data.sessionId})`,
          'UPDATECHANNELORDER',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'UPDATECHANNELORDER',
          'USER',
          404,
        );
      }

      const server = servers[data.serverId];
      if (!server) {
        throw new SocketError(
          `Server(${data.serverId}) not found`,
          'UPDATECHANNELORDER',
          'SERVER',
          404,
        );
      }

      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 5) {
        throw new SocketError(
          'Insufficient permissions',
          'UPDATECHANNELORDER',
          'USER_PERMISSION',
          403,
        );
      }

      for (const updatedChannel of data.updatedChannels) {
        const channel = channels[updatedChannel.id];
        if (channel) {
          const hasChildren = Object.values(channels).some(
            (c) => c.parentId === channel.id,
          );

          channels[channel.id] = {
            ...channel,
            order: updatedChannel.order,
            parentId: updatedChannel.parentId,
            isCategory: hasChildren,
          };

          await db.set(`channels.${channel.id}`, channels[channel.id]);
        }
      }

      const serverChannels = server.channelIds
        .map((id) => channels[id])
        .filter((channel) => channel)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      server.channelIds = serverChannels.map((c) => c.id);
      await db.set(`servers.${server.id}`, server);

      io.to(`server_${server.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      new Logger('WebSocket').success(
        `Channels reordered in server(${server.id})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `更新頻道順序時發生無法預期的錯誤: ${error.message}`,
          part: 'UPDATECHANNELORDER',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error updating channel order: ${error.message}`,
      );
    }
  });

  socket.on('getServers', async (data) => {
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};

    try {
      const { sessionId, searchQuery } = data;

      if (!sessionId) {
        throw new SocketError(
          'Missing required fields',
          'GETSERVERS',
          'DATA',
          400,
        );
      }

      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'GETSERVERS',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'GETSERVERS',
          'USER',
          404,
        );
      }

      // Get user's joined server IDs
      const userServerIds = new Set(
        Object.values(members)
          .filter((member) => member.userId === userId)
          .map((member) => member.serverId),
      );

      if (searchQuery) {
        // Get all servers for searching
        const allServers = Object.values(servers);
        const normalizedQuery = searchQuery.toLowerCase().trim();

        // Handle search
        let searchResults = allServers.filter((server) => {
          // ID 完全匹配時允許看到不可見伺服器
          if (server.displayId.toString() === normalizedQuery) {
            return true;
          }

          // 名稱搜尋時只搜尋可見伺服器
          if (
            server.settings.visibility === 'invisible' &&
            !userServerIds.has(server.id)
          ) {
            return false;
          }

          // 模糊名稱匹配
          const normalizedName = server.name.toLowerCase().trim();
          return (
            normalizedName.includes(normalizedQuery) ||
            calculateSimilarity(normalizedName, normalizedQuery) > 0.6
          );
        });

        // Sort by relevance and limit to 10 results
        searchResults = searchResults
          .sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aSimilarity = calculateSimilarity(aName, normalizedQuery);
            const bSimilarity = calculateSimilarity(bName, normalizedQuery);
            return bSimilarity - aSimilarity;
          })
          .slice(0, 10);

        socket.emit('serversUpdate', {
          recommendedServers: [],
          joinedServers: searchResults,
        });
        return;
      }

      // Normal view (no search)
      // Get all joined servers
      const joinedServers = Object.values(servers).filter((server) =>
        userServerIds.has(server.id),
      );

      // Get recommended servers (public servers not joined by user)
      const availableForRecommendation = Object.values(servers).filter(
        (server) =>
          !userServerIds.has(server.id) &&
          server.settings.visibility !== 'invisible',
      );

      const recommendedServers = _.sampleSize(availableForRecommendation, 10);

      socket.emit('serversUpdate', {
        recommendedServers,
        joinedServers,
      });
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `搜尋伺服器時發生無法預期的錯誤: ${error.message}`,
          part: 'SEARCHSERVERS',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
    }
  });

  socket.on('ManageUserAction', async (data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Common validation
      const { sessionId, serverId, targetId, type } = data;
      if (!sessionId || !serverId || !targetId || !type) {
        throw new SocketError(
          'Missing required fields',
          'MANAGEUSERACTION',
          'DATA',
          400,
        );
      }

      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'MANAGEUSERACTION',
          'USER_ID',
          400,
        );
      }

      const user = users[userId];
      const target = users[targetId];
      if (!user || !target) {
        throw new SocketError(
          `User(${userId} or ${targetId}) not found`,
          'MANAGEUSERACTION',
          'USER',
          404,
        );
      }

      const server = servers[serverId];
      if (!server) {
        throw new SocketError(
          `Server(${serverId}) not found`,
          'MANAGEUSERACTION',
          'SERVER',
          404,
        );
      }

      const targetPresence = presenceStates[`presence_${targetId}`];
      if (!targetPresence) {
        throw new SocketError(
          `Target presence not found`,
          'MANAGEUSERACTION',
          'PRESENCE',
          404,
        );
      }

      const selfPresence = presenceStates[`presence_${userId}`];
      if (!selfPresence) {
        throw new SocketError(
          `Self presence not found`,
          'MANAGEUSERACTION',
          'PRESENCE',
          404,
        );
      }

      // Check required permission level based on action type
      const userPermission = await getPermissionLevel(userId, server.id);
      const requiredPermission = type === 'move' ? 3 : 5;

      if (userPermission < requiredPermission) {
        throw new SocketError(
          'Insufficient permissions',
          'MANAGEUSERACTION',
          'PERMISSION',
          403,
        );
      }

      // Special validation for kick/block
      if (type === 'kick' || type === 'block') {
        // Check if target is the owner
        if (server.ownerId === targetId) {
          throw new SocketError(
            'Cannot perform action on server owner',
            'MANAGEUSERACTION',
            'OWNER',
            400,
          );
        }

        if (type === 'block') {
          const members = Object.values(await db.get('members')) || [];
          const serverBlockedUsers =
            members.filter(
              (member) => member.serverId === serverId && member.isBlocked,
            ) || [];

          if (serverBlockedUsers.includes(targetId)) {
            throw new SocketError(
              'User is already blocked',
              'MANAGEUSERACTION',
              'BLOCKED',
              400,
            );
          }

          server.blockedUserIds =
            serverBlockedUsers.map((member) => member.userId) || [];
        }
      }

      // Get target's socket and current channel if they're connected
      const targetSocketId = userToSocket.get(targetId);
      const targetCurrentChannel = channels[targetPresence.currentChannelId];

      switch (type) {
        case 'move': {
          // Additional move validation
          if (
            selfPresence.currentServerId !== targetPresence.currentServerId ||
            !selfPresence.currentChannelId ||
            !targetPresence.currentChannelId
          ) {
            throw new SocketError(
              'Users must be in same server and channels',
              'MANAGEUSERACTION',
              'CHANNEL',
              400,
            );
          }

          const destinationChannel = channels[selfPresence.currentChannelId];
          if (!destinationChannel) {
            throw new SocketError(
              'Destination channel not found',
              'MANAGEUSERACTION',
              'CHANNEL',
              404,
            );
          }

          // Remove from current channel
          if (targetCurrentChannel) {
            targetCurrentChannel.userIds = targetCurrentChannel.userIds.filter(
              (id) => id !== targetId,
            );
            await db.set(
              `channels.${targetCurrentChannel.id}`,
              targetCurrentChannel,
            );
          }

          // Add to destination channel
          if (!destinationChannel.userIds.includes(targetId)) {
            destinationChannel.userIds.push(targetId);
            await db.set(
              `channels.${destinationChannel.id}`,
              destinationChannel,
            );
          }

          // Update presence
          targetPresence.currentChannelId = destinationChannel.id;
          targetPresence.updatedAt = Date.now();
          await db.set(`presenceStates.${targetPresence.id}`, targetPresence);

          // Handle socket operations
          if (targetSocketId) {
            const sockets = await io.fetchSockets();
            for (const socket of sockets) {
              if (socket.id === targetSocketId) {
                if (targetCurrentChannel) {
                  socket.leave(`channel_${targetCurrentChannel.id}`);
                }
                socket.join(`channel_${destinationChannel.id}`);
              }
            }

            // Play sound in destination channel
            io.to(`channel_${destinationChannel.id}`).emit('playSound', 'join');

            // Notify target
            io.to(targetSocketId).emit('userPresenceUpdate', {
              ...(await getPresenceState(targetId)),
            });
          }

          break;
        }

        case 'kick': {
          // Remove from channel if connected
          if (targetCurrentChannel) {
            targetCurrentChannel.userIds = targetCurrentChannel.userIds.filter(
              (id) => id !== targetId,
            );
            await db.set(
              `channels.${targetCurrentChannel.id}`,
              targetCurrentChannel,
            );
          }

          // Clear contribution interval if exists
          if (targetSocketId) {
            clearContributionInterval(targetSocketId);
          }

          // Update presence
          targetPresence.currentServerId = null;
          targetPresence.currentChannelId = null;
          targetPresence.updatedAt = Date.now();
          await db.set(`presenceStates.${targetPresence.id}`, targetPresence);

          // Remove member permission
          const member = await getMember(targetId, serverId);
          if (member) {
            member.permissionLevel = 0;
            await db.set(`members.${member.id}`, member);
          }

          // Handle socket operations
          if (targetSocketId) {
            const sockets = await io.fetchSockets();
            for (const socket of sockets) {
              if (socket.id === targetSocketId) {
                if (targetCurrentChannel) {
                  socket.leave(`channel_${targetCurrentChannel.id}`);
                }
                socket.leave(`server_${serverId}`);
              }
            }

            // Notify target
            io.to(targetSocketId).emit('channelDisconnect');
            io.to(targetSocketId).emit('serverDisconnect');
            io.to(targetSocketId).emit('userPresenceUpdate', {
              ...(await getPresenceState(targetId)),
            });
          }

          break;
        }

        case 'block': {
          // First kick the user if they're connected
          if (targetCurrentChannel) {
            targetCurrentChannel.userIds = targetCurrentChannel.userIds.filter(
              (id) => id !== targetId,
            );
            await db.set(
              `channels.${targetCurrentChannel.id}`,
              targetCurrentChannel,
            );
          }

          if (targetSocketId) {
            clearContributionInterval(targetSocketId);
          }

          // Update presence
          targetPresence.currentServerId = null;
          targetPresence.currentChannelId = null;
          targetPresence.updatedAt = Date.now();
          await db.set(`presenceStates.${targetPresence.id}`, targetPresence);

          // Remove member permission change isBlocked to true
          const member = await getMember(targetId, serverId);
          if (member) {
            member.permissionLevel = 0;
            member.isBlocked = true;
            await db.set(`members.${member.id}`, member);
          }

          // Handle socket operations
          if (targetSocketId) {
            const sockets = await io.fetchSockets();
            for (const socket of sockets) {
              if (socket.id === targetSocketId) {
                if (targetCurrentChannel) {
                  socket.leave(`channel_${targetCurrentChannel.id}`);
                }
                socket.leave(`server_${serverId}`);
              }
            }

            // Notify target
            io.to(targetSocketId).emit('channelDisconnect');
            io.to(targetSocketId).emit('serverDisconnect');
            io.to(targetSocketId).emit('userPresenceUpdate', {
              ...(await getPresenceState(targetId)),
            });
            // Update user's blocked status
            io.to(socket.id).emit('userConnect', {
              ...(await getUser(userId)),
              members: await getUserMembers(userId),
            });
          }

          break;
        }

        default:
          throw new SocketError(
            'Invalid action type',
            'MANAGEUSERACTION',
            'TYPE',
            400,
          );
      }

      // Update all clients with new server state
      io.to(`server_${serverId}`).emit('serverUpdate', {
        ...(await getServer(serverId)),
      });

      new Logger('WebSocket').success(
        `User(${targetId}) ${type} action performed by user(${userId}) in server(${serverId})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `處理用戶操作時發生無法預期的錯誤: ${error.message}`,
          part: 'MANAGEUSERACTION',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error(
        `Error performing user action: ${error.message}`,
      );
    }
  });

  socket.on('addChannel', async (data) => {
    // d = {
    //   sessionId: '123456',
    //   channel: {
    //     name: '',
    //     permission: 'public',
    //     isLobby: false,
    //     isCategory: false,
    //     ...
    //   },
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const newChannel = data.channel;
      if (!sessionId || !newChannel) {
        throw new SocketError(
          'Missing required fields',
          'ADDCHANNEL',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'ADDCHANNEL',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'ADDCHANNEL',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'ADDCHANNEL',
          'PRESENCE',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        throw new SocketError(
          `Server(${presence.currentServerId}) not found`,
          'ADDCHANNEL',
          'SERVER',
          404,
        );
      }

      // Check permissions
      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 5) {
        throw new SocketError(
          'Insufficient permissions',
          'ADDCHANNEL',
          'USER_PERMISSION',
          403,
        );
      }

      // Create new channel
      const channelId = uuidv4();
      const channel = {
        ...newChannel,
        id: channelId,
        createdAt: Date.now().valueOf(),
        order: server.channelIds.length,
      };
      channels[channelId] = channel;
      await db.set(`channels.${channelId}`, channel);

      // Add channel to server
      server.channelIds.push(channel.id);
      await db.set(`servers.${server.id}`, server);

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      new Logger('WebSocket').info(
        `Adding new channel(${channel.id}) to server(${server.id})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `新增頻道時發生無法預期的錯誤: ${error.message}`,
          part: 'ADDCHANNEL',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error('Error adding channel: ' + error.message);
    }
  });

  socket.on('editChannel', async (data) => {
    // data = {
    //   sessionId: '123456',
    //   channel: {
    //     id:
    //     name:
    //     permission:
    //     isCategory:
    //     ...
    //   },
    // };
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const editedChannel = data.channel;
      if (!sessionId || !editedChannel) {
        throw new SocketError(
          'Missing required fields',
          'EDITCHANNEL',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'EDITCHANNEL',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'EDITCHANNEL',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'EDITCHANNEL',
          'PRESENCE',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        throw new SocketError(
          `Server(${presence.currentServerId}) not found`,
          'EDITCHANNEL',
          'SERVER',
          404,
        );
      }
      const channel = channels[editedChannel.id];
      if (!channel) {
        throw new SocketError(
          `Channel(${editedChannel.id}) not found`,
          'EDITCHANNEL',
          'CHANNEL',
          404,
        );
      }

      // Check permissions
      const userPermission = await getPermissionLevel(userId, server.id);
      if (userPermission < 4) {
        throw new SocketError(
          'Insufficient permissions',
          'EDITCHANNEL',
          'USER_PERMISSION',
          403,
        );
      }

      // Update channel
      channels[channel.id] = {
        ...channel,
        ...editedChannel,
      };
      await db.set(`channels.${channel.id}`, channels[channel.id]);

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      new Logger('WebSocket').info(
        `Edit channel(${channel.id}) in server(${server.id})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `編輯頻道時發生無法預期的錯誤: ${error.message}`,
          part: 'EDITCHANNEL',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error('Error editing channel: ' + error.message);
    }
  });

  socket.on('deleteChannel', async (data) => {
    // data = {
    //   sessionId: '123456',
    //   channelId: '123456',
    // }
    // console.log(data);

    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const channels = (await db.get('channels')) || {};
    const presenceStates = (await db.get('presenceStates')) || {};

    try {
      // Validate data
      const sessionId = data.sessionId;
      const channelId = data.channelId;
      if (!sessionId || !channelId) {
        throw new SocketError(
          'Missing required fields',
          'DELETECHANNEL',
          'DATA',
          400,
        );
      }
      const userId = userSessions.get(sessionId);
      if (!userId) {
        throw new SocketError(
          `Invalid session ID(${sessionId})`,
          'DELETECHANNEL',
          'USER_ID',
          400,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new SocketError(
          `User(${userId}) not found`,
          'DELETECHANNEL',
          'USER',
          404,
        );
      }
      const presence = presenceStates[`presence_${userId}`];
      if (!presence) {
        throw new SocketError(
          `Presence(${`presence_${userId}`}) not found`,
          'DELETECHANNEL',
          'PRESENCE',
          404,
        );
      }
      const server = servers[presence.currentServerId];
      if (!server) {
        throw new SocketError(
          `Server(${presence.currentServerId}) not found`,
          'DELETECHANNEL',
          'SERVER',
          404,
        );
      }
      const channel = channels[channelId];
      if (!channel) {
        throw new SocketError(
          `Channel(${channelId}) not found`,
          'DELETECHANNEL',
          'CHANNEL',
          404,
        );
      }

      // Delete channel
      server.channelIds = server.channelIds.filter(
        (channelId) => channelId != channel.id,
      );
      await db.set(`servers.${server.id}`, server);

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        ...(await getServer(server.id)),
      });

      new Logger('WebSocket').info(
        `Remove channel(${channel.id}) from server(${server.id})`,
      );
    } catch (error) {
      if (error instanceof SocketError) {
        io.to(socket.id).emit('error', {
          message: error.message,
          part: error.part,
          tag: error.tag,
          status_code: error.status_code,
        });
      } else {
        io.to(socket.id).emit('error', {
          message: `刪除頻道時發生無法預期的錯誤: ${error.message}`,
          part: 'DELETECHANNEL',
          tag: 'EXCEPTION_ERROR',
          status_code: 500,
        });
      }
      new Logger('WebSocket').error('Error deleting channel: ' + error.message);
    }
  });
});

// Functions
const setupContributionInterval = async (socketId, userId) => {
  try {
    // Get user data
    const user = (await db.get(`users.${userId}`)) || {};

    // Initialize xp if it doesn't exist
    if (user.xp === undefined) {
      user.xp = 0;
    }

    // Calculate catch-up XP if needed
    if (user.lastXpAwardedAt) {
      const timeSinceLastAward = Date.now() - user.lastXpAwardedAt;
      const hoursSinceLastAward = Math.floor(
        timeSinceLastAward / XP_SYSTEM.INTERVAL_MS,
      );

      if (hoursSinceLastAward > 0) {
        // Award catch-up XP
        const catchUpXp = hoursSinceLastAward * XP_SYSTEM.XP_PER_HOUR;
        user.xp += catchUpXp;

        // Add catch-up contribution to current server
        const presence = await getPresenceState(userId);
        if (presence.currentServerId) {
          const member = await getMember(userId, presence.currentServerId);
          if (member) {
            member.contribution += catchUpXp;
            await db.set(`members.${member.id}`, member);
          }
        }

        // Process any level ups
        while (user.xp >= calculateRequiredXP(user.level)) {
          const requiredXP = calculateRequiredXP(user.level);
          user.level += 1;
          user.xp -= requiredXP;
          new Logger('WebSocket').info(
            `User(${userId}) leveled up to ${user.level}`,
          );
        }

        // Update lastXpAwardedAt to align with hourly intervals
        user.lastXpAwardedAt += hoursSinceLastAward * XP_SYSTEM.INTERVAL_MS;
      }
    } else {
      // First time setup
      user.lastXpAwardedAt = Date.now();
    }

    // Save user changes
    await db.set(`users.${userId}`, user);

    // Calculate delay to align with next hour interval
    const timeUntilNextAward =
      XP_SYSTEM.INTERVAL_MS -
      ((Date.now() - user.lastXpAwardedAt) % XP_SYSTEM.INTERVAL_MS);

    // Setup initial timeout to align with hour intervals
    setTimeout(() => {
      // Start regular interval once aligned
      const interval = setInterval(async () => {
        try {
          const user = (await db.get(`users.${userId}`)) || {};

          // Add XP
          user.xp += XP_SYSTEM.XP_PER_HOUR;
          user.lastXpAwardedAt = Date.now();

          // Add contribution to current server
          const presence = await getPresenceState(userId);
          if (presence.currentServerId) {
            const member = await getMember(userId, presence.currentServerId);
            if (member) {
              member.contribution += XP_SYSTEM.XP_PER_HOUR;
              await db.set(`members.${member.id}`, member);
            }
          }

          // Check for level up
          const requiredXP = calculateRequiredXP(user.level);
          if (user.xp >= requiredXP) {
            user.level += 1;
            user.xp -= requiredXP;
            new Logger('WebSocket').info(
              `User(${userId}) leveled up to ${user.level}`,
            );
          }

          // Save changes
          await db.set(`users.${userId}`, user);

          // Emit updated data
          io.to(socketId).emit('userUpdate', {
            level: user.level,
            xp: user.xp,
            requiredXP: calculateRequiredXP(user.level),
          });
        } catch (error) {
          new Logger('WebSocket').error(
            `Error in XP interval: ${error.message}`,
          );
        }
      }, XP_SYSTEM.INTERVAL_MS);

      contributionInterval.set(socketId, interval);
    }, timeUntilNextAward);

    // Emit initial XP state
    io.to(socketId).emit('userUpdate', {
      level: user.level,
      xp: user.xp,
      requiredXP: calculateRequiredXP(user.level),
    });
  } catch (error) {
    clearContributionInterval(socketId);
    new Logger('WebSocket').error(
      'Error setting up contribution interval: ' + error.message,
    );
  }
};

const clearContributionInterval = (socketId) => {
  clearInterval(contributionInterval.get(socketId));
  contributionInterval.delete(socketId);
};
const setupCleanupInterval = async () => {
  const cleanupUnusedAvatars = async () => {
    try {
      // Get all avatar files from directory
      const files = await fs.readdir(uploadDir);

      // Get all servers from database
      const servers = (await db.get('servers')) || {};

      // Get list of active avatar URLs
      const activeAvatars = new Set(
        Object.values(servers)
          .map((server) => server.iconUrl)
          .filter((url) => url && !url.includes('logo_server_def.png'))
          .map((url) => path.basename(url)),
      );

      // Find unused avatar files
      const unusedFiles = files.filter((file) => {
        // Skip non-image files
        if (!Object.keys(MIME_TYPES).some((ext) => file.endsWith(ext))) {
          return false;
        }
        // Check if file is not used by any server
        return !activeAvatars.has(file);
      });

      // Delete unused files
      for (const file of unusedFiles) {
        try {
          await fs.unlink(path.join(uploadDir, file));
          new Logger('Cleanup').success(`Deleted unused avatar: ${file}`);
        } catch (error) {
          new Logger('Cleanup').error(
            `Error deleting file ${file}: ${error.message}`,
          );
        }
      }

      if (!unusedFiles.length) {
        new Logger('Cleanup').info('No unused avatars to delete');
      } else {
        new Logger('Cleanup').info(
          `Deleted ${unusedFiles.length} unused avatars`,
        );
      }
    } catch (error) {
      new Logger('Cleanup').error(`Avatar cleanup failed: ${error.message}`);
    }
  };

  // Run cleanup every 24 hours
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  setInterval(cleanupUnusedAvatars, CLEANUP_INTERVAL);

  // Run initial cleanup on setup
  cleanupUnusedAvatars().catch(console.error);
};
const checkUserBlocked = (members, serverId, userId) => {
  const serverMember = Object.values(members).find(
    (member) => member.serverId === serverId && member.userId === userId,
  );

  if (serverMember?.isBlocked) {
    throw new SocketError(
      '您已被此群組封鎖',
      'CONNECTSERVER',
      'USER_BLOCKED',
      403,
    );
  }

  return false;
};
const calculateRequiredXP = (level) => {
  return Math.ceil(XP_SYSTEM.BASE_XP * Math.pow(XP_SYSTEM.GROWTH_RATE, level));
};
const createUserIdSocketIdMap = (userId, socketId) => {
  if (!socketToUser.has(socketId) && !userToSocket.has(userId)) {
    socketToUser.set(socketId, userId);
    userToSocket.set(userId, socketId);
    return true;
  }
  return false;
};
const deleteUserIdSocketIdMap = (userId = null, socketId = null) => {
  if (userId && userToSocket.has(userId)) {
    socketToUser.delete(userToSocket.get(userId));
    userToSocket.delete(userId);
    return true;
  }
  if (socketId && socketToUser.has(socketId)) {
    userToSocket.delete(socketToUser.get(socketId));
    socketToUser.delete(socketId);
    return true;
  }
  return false;
};
// 計算文字相似度 (0-1)
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
};

// Levenshtein Distance 算法
const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[str1.length][str2.length];
};
// Get Functions
const getServer = async (serverId) => {
  const servers = (await db.get('servers')) || {};
  const server = servers[serverId];
  if (!server) return null;

  // Get all channels including child channels
  const allChannels = await Promise.all(
    server.channelIds.map(async (channelId) => await getChannels(channelId)),
  );

  // Filter out any null channels and ensure hierarchy is preserved
  const channels = allChannels
    .filter((channel) => channel)
    .map((channel) => {
      // Preserve parent-child relationships
      if (channel.parentId) {
        const parent = allChannels.find((c) => c.id === channel.parentId);
        if (parent) {
          parent.isCategory = true;
        }
      }
      return channel;
    });

  return {
    ...server,
    members: await getServerMembers(serverId),
    channels: channels,
    lobby: await getChannels(server.lobbyId),
    owner: await getUser(server.ownerId),
  };
};
const getChannels = async (channelId) => {
  const _channels = (await db.get('channels')) || {};
  const channel = _channels[channelId];
  if (!channel) return null;
  return {
    ...channel,
    users: (
      await Promise.all(
        channel.userIds.map(async (userId) => await getUser(userId)),
      )
    ).filter((user) => user),
    messages: (
      await Promise.all(
        channel.messageIds.map(
          async (messageId) => await getMessages(messageId),
        ),
      )
    ).filter((message) => message),
  };
};
const getMessages = async (messageId) => {
  const _messages = (await db.get('messages')) || {};
  const message = _messages[messageId];
  if (!message) return null;
  return {
    ...message,
    sender: await getUser(message.senderId),
  };
};
const getUser = async (userId) => {
  const _users = (await db.get('users')) || {};
  const user = _users[userId];
  if (!user) return null;
  const { account, ...restUser } = user;
  const xpInfo = {
    xp: user.xp || 0,
    required: calculateRequiredXP(user.level),
    progress: ((user.xp || 0) / calculateRequiredXP(user.level)) * 100,
  };

  return {
    ...restUser,
    xpInfo,
    badges: await getUserBadges(userId),
    presence: await getPresenceState(userId),
  };
};
const getUserBadges = async (userId) => {
  const _users = (await db.get('users')) || {};
  const _badges = (await db.get('badgeList')) || {};
  const userBadges = _users[userId].badgeIds
    .map((badgeId) => _badges[badgeId])
    .filter((badge) => badge);
  if (!userBadges) return null;
  return [...userBadges];
};
const getPresenceState = async (userId) => {
  const _presenceStates = (await db.get('presenceStates')) || {};
  const userPresenceState = Object.values(_presenceStates).find(
    (presence) => presence.userId === userId,
  );
  if (!userPresenceState) return null;
  return {
    ...userPresenceState,
  };
};
const getPermissionLevel = async (userId, serverId) => {
  const _members = (await db.get('members')) || {};
  const member = Object.values(_members).find(
    (member) => member.userId === userId && member.serverId === serverId,
  );
  if (!member) return null;
  return member.permissionLevel;
};
const getMember = async (userId, serverId) => {
  const _members = (await db.get('members')) || {};
  const member = Object.values(_members).find(
    (member) => member.userId === userId && member.serverId === serverId,
  );
  if (!member) return null;
  return member;
};
const getUserMembers = async (userId) => {
  const _members = (await db.get('members')) || {};
  const members = Object.values(_members).reduce((result, member) => {
    if (member?.userId === userId) {
      result[member.serverId] = member;
    }
    return result;
  }, {});
  if (!members) return null;
  return {
    ...members,
  };
};
const getServerMembers = async (serverId) => {
  const _members = (await db.get('members')) || {};
  const members = Object.values(_members).reduce((result, member) => {
    if (member?.serverId === serverId) {
      result[member.userId] = member;
    }
    return result;
  }, {});
  if (!members) return null;
  return {
    ...members,
  };
};
const getFriendCategories = async (userId) => {
  const _friendCategories = (await db.get('friendCategories')) || {};
  const userFriendCategories = Object.values(_friendCategories).filter(
    (fs) => fs.userId === userId,
  );
  if (!userFriendCategories) return null;
  return [
    ...(
      await Promise.all(
        userFriendCategories.map(
          async (category) => await getFriendCategory(category.id),
        ),
      )
    ).filter((category) => category),
  ];
};
const getFriendCategory = async (categoryId) => {
  const _friendCategories = (await db.get('friendCategories')) || {};
  const category = _friendCategories[categoryId];
  if (!category) return null;
  return {
    ...category,
    friends: (
      await Promise.all(
        category.friendIds.map(
          async (friendId) => await getFriend(category.userId, friendId),
        ),
      )
    ).filter((friend) => friend),
  };
};
const getFriends = async (userId) => {
  const _friends = (await db.get('friends')) || {};
  const friends = Object.values(_friends).filter((friend) =>
    friend.userIds.includes(userId),
  );
  if (!friends) return null;
  return [...friends];
};
const getFriend = async (userId, friendId) => {
  const _friends = (await db.get('friends')) || {};
  const friend = Object.values(_friends).find(
    (friend) =>
      friend.userIds.includes(userId) && friend.userIds.includes(friendId),
  );
  if (!friend) return null;
  return {
    ...friend,
    user: await getUser(friend.userIds.find((id) => id !== userId)),
    messages: (
      await Promise.all(
        friend.messageIds.map(
          async (messageId) => await getMessages(messageId),
        ),
      )
    ).filter((message) => message),
  };
};
const getDirectMessages = async (userId, friendId) => {
  const friend = await getFriend(userId, friendId);
  if (!friend) return null;
  return [...friend.messages];
};
const getDisplayId = async (baseId = 20000000) => {
  const servers = (await db.get('servers')) || {};
  let displayId = baseId + Object.keys(servers).length;
  // Ensure displayId is unique
  while (
    Object.values(servers).some((server) => server.displayId === displayId)
  ) {
    displayId++;
  }
  return displayId;
};
const getServerApplications = async (serverId) => {
  const _serverApplications = (await db.get('serverApplications')) || {};
  const serverApplications = Object.values(_serverApplications).filter(
    (app) => app.serverId === serverId,
  );
  if (!serverApplications) return null;
  return [
    ...(
      await Promise.all(
        serverApplications.map(async (app) => {
          return {
            ...app,
            user: await getUser(app.userId),
          };
        }),
      )
    ).filter((app) => app),
  ];
};

// Error Handling
server.on('error', (error) => {
  new Logger('Server').error(`Server error: ${error.message}`);
});

process.on('uncaughtException', (error) => {
  new Logger('Server').error(`Uncaught Exception: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
  new Logger('Server').error(`Unhandled Rejection: ${error.message}`);
});

// Start Server
server.listen(port, () => {
  new Logger('Server').success(`Server is running on port ${port}`);
  setupCleanupInterval();
});