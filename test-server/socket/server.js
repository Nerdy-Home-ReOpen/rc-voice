const { v4: uuidv4 } = require('uuid');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const formidable = require('formidable');
// Constants
const {
  UPLOADS_PATH,
  SERVER_AVATAR_PATH,
  UPLOADS_DIR,
  SERVER_AVATAR_DIR,
} = require('../constant');
// Utils
const utils = require('../utils');
const Logger = utils.logger;
const Map = utils.map;
const Get = utils.get;
const Interval = utils.interval;
const Func = utils.func;
const Set = utils.set;
const JWT = utils.jwt;
// Socket error
const StandardizedError = require('../standardizedError');
// Handlers
const channelHandler = require('./channel');

const serverHandler = {
  connectServer: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};

    try {
      // data = {
      //   serverId:
      // }
      // console.log(data);

      // Validate data
      const jwt = socket.jwt;
      if (!jwt) {
        throw new StandardizedError(
          '無可用的 JWT',
          'ValidationError',
          'CONNECTSERVER',
          'TOKEN_MISSING',
          401,
        );
      }
      const sessionId = socket.sessionId;
      if (!sessionId) {
        throw new StandardizedError(
          '無可用的 session ID',
          'ValidationError',
          'CONNECTSERVER',
          'SESSION_MISSING',
          401,
        );
      }
      const result = JWT.verifyToken(jwt);
      if (!result.valid) {
        throw new StandardizedError(
          '無效的 token',
          'ValidationError',
          'CONNECTSERVER',
          'TOKEN_INVALID',
          401,
        );
      }
      const { serverId } = data;
      if (!serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CONNECTSERVER',
          'DATA_INVALID',
          401,
        );
      }
      const userId = Map.sessionToUser.get(sessionId);
      if (!userId) {
        throw new StandardizedError(
          `無效的 session ID(${sessionId})`,
          'ValidationError',
          'CONNECTSERVER',
          'SESSION_EXPIRED',
          401,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new StandardizedError(
          `使用者(${userId})不存在`,
          'ValidationError',
          'CONNECTSERVER',
          'USER',
          404,
        );
      }
      const server = servers[serverId];
      if (!server) {
        throw new StandardizedError(
          `伺服器(${serverId})不存在`,
          'ValidationError',
          'CONNECTSERVER',
          'SERVER',
          404,
        );
      }
      const member = members[`mb_${user.id}-${server.id}`];
      if (
        server.settings.visibility === 'invisible' &&
        !(member?.permissionLevel > 1)
      ) {
        throw new StandardizedError(
          '該伺服器為私人伺服器',
          'ValidationError',
          'CONNECTSERVER',
          'VISIBILITY',
          403,
        );
      }
      if (member?.isBlocked) {
        throw new StandardizedError(
          '您已被該伺服器封鎖',
          'ValidationError',
          'CONNECTSERVER',
          'BLOCKED',
          403,
        );
      }

      // Create new membership if there isn't one
      if (!member) {
        await Set.member(`mb_${user.id}-${server.id}`, {
          nickname: user.name,
          serverId: server.id,
          userId: user.id,
          createdAt: Date.now(),
        });
      }

      // Leave prev server
      if (user.currentServerId) {
        await serverHandler.disconnectServer(io, socket, {
          serverId: user.currentServerId,
        });
      }

      // Connect to the server's lobby channel
      await channelHandler.connectChannel(io, socket, {
        channelId: server.lobbyId,
      });

      // Update user-server
      const update_userServer = {
        userId: user.id,
        serverId: server.id,
        recent: true,
        timestamp: Date.now(),
      };
      await Set.userServer(`us_${user.id}-${server.id}`, update_userServer);

      // Update user
      const update = {
        currentServerId: server.id,
        lastActiveAt: Date.now(),
      };
      await Set.user(user.id, update);

      // Join the server
      socket.join(`server_${server.id}`);

      // Emit data (only to the user)
      io.to(socket.id).emit('userUpdate', update);
      io.to(socket.id).emit('serverConnect', await Get.server(server.id));

      new Logger('WebSocket').success(
        `User(${user.id}) connected to server(${server.id})`,
      );
    } catch (error) {
      if (!error instanceof StandardizedError) {
        error = new StandardizedError(
          `連接伺服器時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CONNECTSERVER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('serverDisconnect', null);
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        `Error connecting server: ${error.message}`,
      );
    }
  },
  disconnectServer: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};

    try {
      // data = {
      //   serverId:
      // }
      // console.log(data);

      // Validate data
      const jwt = socket.jwt;
      if (!jwt) {
        throw new StandardizedError(
          '無可用的 JWT',
          'ValidationError',
          'DISCONNECTSERVER',
          'TOKEN_MISSING',
          401,
        );
      }
      const sessionId = socket.sessionId;
      if (!sessionId) {
        throw new StandardizedError(
          '無可用的 session ID',
          'ValidationError',
          'DISCONNECTSERVER',
          'SESSION_MISSING',
          401,
        );
      }
      const result = JWT.verifyToken(jwt);
      if (!result.valid) {
        throw new StandardizedError(
          '無效的 token',
          'ValidationError',
          'DISCONNECTSERVER',
          'TOKEN_INVALID',
          401,
        );
      }
      const { serverId } = data;
      if (!serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'DISCONNECTSERVER',
          'DATA_INVALID',
          401,
        );
      }
      const userId = Map.sessionToUser.get(sessionId);
      if (!userId) {
        throw new StandardizedError(
          `無效的 session ID(${sessionId})`,
          'ValidationError',
          'DISCONNECTSERVER',
          'SESSION_EXPIRED',
          401,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new StandardizedError(
          `使用者(${userId})不存在`,
          'ValidationError',
          'DISCONNECTSERVER',
          'USER',
          404,
        );
      }
      const server = servers[serverId];
      if (!server) {
        throw new StandardizedError(
          `伺服器(${serverId})不存在`,
          'ValidationError',
          'DISCONNECTSERVER',
          'SERVER',
          404,
        );
      }

      // Leave prev channel
      if (user.currentChannelId) {
        await channelHandler.disconnectChannel(io, socket, {
          channelId: user.currentChannelId,
        });
      }

      // Update user presence
      const update = {
        currentServerId: null,
        lastActiveAt: Date.now(),
      };
      await Set.user(user.id, update);

      // Leave the server
      socket.leave(`server_${server.id}`);

      // Emit data (only to the user)
      io.to(socket.id).emit('userUpdate', update);
      io.to(socket.id).emit('serverDisconnect', null);

      new Logger('WebSocket').success(
        `User(${user.id}) disconnected from server(${server.id})`,
      );
    } catch (error) {
      if (!error instanceof StandardizedError) {
        error = new StandardizedError(
          `斷開伺服器時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'DISCONNECTSERVER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        `Error disconnecting from server: ${error.message}`,
      );
    }
  },
  createServer: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    let uploadedFilePath = null;

    try {
      // data = {
      //   server: {
      //     ...
      //   }
      // }
      // console.log(data);

      // Validate data
      const jwt = socket.jwt;
      if (!jwt) {
        throw new StandardizedError(
          '無可用的 JWT',
          'ValidationError',
          'CREATESERVER',
          'TOKEN_MISSING',
          401,
        );
      }
      const sessionId = socket.sessionId;
      if (!sessionId) {
        throw new StandardizedError(
          '無可用的 session ID',
          'ValidationError',
          'CREATESERVER',
          'SESSION_MISSING',
          401,
        );
      }
      const result = JWT.verifyToken(jwt);
      if (!result.valid) {
        throw new StandardizedError(
          '無效的 token',
          'ValidationError',
          'CREATESERVER',
          'TOKEN_INVALID',
          401,
        );
      }
      const { server } = data;
      if (!server) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATESERVER',
          'DATA_INVALID',
          401,
        );
      }
      const userId = Map.sessionToUser.get(sessionId);
      if (!userId) {
        throw new StandardizedError(
          `無效的 session ID(${sessionId})`,
          'ValidationError',
          'CREATESERVER',
          'SESSION_EXPIRED',
          401,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new StandardizedError(
          `使用者(${userId})不存在`,
          'ValidationError',
          'CREATESERVER',
          'USER',
          404,
        );
      }
      if (!server.name || server.name.length > 30 || !server.name.trim()) {
        throw new StandardizedError(
          '無效的伺服器名稱',
          'ValidationError',
          'CREATESERVER',
          'NAME',
          400,
        );
      }
      const userOwnedServers = await Get.userOwnedServers(userId);
      if (userOwnedServers.length >= 3) {
        throw new StandardizedError(
          '您已達到可創建伺服器上限',
          'ValidationError',
          'CREATESERVER',
          'LIMIT',
          403,
        );
      }

      // Handle avatar upload if provided
      let avatarPath = null;
      if (server.avatar) {
        const matches = server.avatar.match(/^data:image\/(.*?);base64,/);
        if (!matches) {
          throw new Error('無效的圖片格式');
        }

        const imageType = matches[1];
        if (!['png', 'jpeg', 'gif', 'webp'].includes(imageType)) {
          throw new Error('無效的圖片格式');
        }
        const base64Data = server.avatar.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const buffer = Buffer.from(base64Data, 'base64');

        // Check file size (5MB limit)
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error('圖片大小超過限制');
        }

        // Create file with unique name
        const fileName = `${uuidv4()}.${imageType}`;
        uploadedFilePath = path.join(SERVER_AVATAR_DIR, fileName);

        // Save file
        await fs.writeFile(uploadedFilePath, buffer);
        avatarPath = `/${SERVER_AVATAR_PATH}/${fileName}`;
      }

      // Create Ids
      const serverId = uuidv4();
      const channelId = uuidv4();

      // Create server
      await Set.server(serverId, {
        name: server.name.toString().trim().substring(0, 30),
        description: server.description.toString().substring(0, 200),
        avatarUrl: avatarPath,
        displayId: await Func.generateUniqueDisplayId(),
        lobbyId: channelId,
        ownerId: userId,
        settings: {
          visibility: server.settings.visibility || 'public',
          defaultChannelId: channelId,
        },
        createdAt: Date.now(),
      });

      // Create channel (lobby)
      await Set.channel(channelId, {
        name: '大廳',
        isLobby: true,
        isMain: true,
        serverId: serverId,
        settings: {
          visibility: 'public',
          slowmode: false,
          userLimit: -1,
        },
        createdAt: Date.now(),
      });

      // Create member
      await Set.member(`mb_${userId}-${serverId}`, {
        permissionLevel: 6,
        nickname: user.name,
        serverId: serverId,
        userId: userId,
        createdAt: Date.now(),
      });

      // Create user-server
      await Set.userServer(`us_${userId}-${serverId}`, {
        userId: userId,
        serverId: serverId,
        recent: true,
        owned: true,
        timestamp: Date.now(),
      });

      // Join the server
      await serverHandler.connectServer(io, socket, {
        serverId: serverId,
      });

      new Logger('Server').success(
        `New server(${serverId}) created by user(${userId})`,
      );
    } catch (error) {
      // Clean up uploaded file if error
      if (uploadedFilePath) {
        fs.unlink(uploadedFilePath).catch((err) => {
          new Logger('Server').error(`Error deleting file: ${err.message}`);
        });
      }

      if (!error instanceof StandardizedError) {
        error = new StandardizedError(
          `創建伺服器時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CREATESERVER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('Server').error(`Error creating server: ${error.message}`);
    }
  },
  updateServer: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};

    console.log('updateServer');

    let uploadedFilePath = null;

    try {
      // data = {
      //   server: {
      //     ...
      //   }
      // }
      // console.log(data);

      // Validate data
      const jwt = socket.jwt;
      if (!jwt) {
        throw new StandardizedError(
          '無可用的 JWT',
          'ValidationError',
          'UPDATESERVER',
          'TOKEN_MISSING',
          401,
        );
      }
      const sessionId = socket.sessionId;
      if (!sessionId) {
        throw new StandardizedError(
          '無可用的 session ID',
          'ValidationError',
          'UPDATESERVER',
          'SESSION_MISSING',
          401,
        );
      }
      const result = JWT.verifyToken(jwt);
      if (!result.valid) {
        throw new StandardizedError(
          '無效的 token',
          'ValidationError',
          'UPDATESERVER',
          'TOKEN_INVALID',
          401,
        );
      }
      const { server: editedServer } = data;
      if (!editedServer) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATESERVER',
          'DATA_INVALID',
          401,
        );
      }
      const userId = Map.sessionToUser.get(sessionId);
      if (!userId) {
        throw new StandardizedError(
          `無效的 session ID(${sessionId})`,
          'ValidationError',
          'UPDATESERVER',
          'SESSION_EXPIRED',
          401,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new StandardizedError(
          `使用者(${userId})不存在`,
          'ValidationError',
          'UPDATESERVER',
          'USER',
          404,
        );
      }
      const server = servers[editedServer.id];
      if (!server) {
        throw new StandardizedError(
          `伺服器(${editedServer.id})不存在`,
          'ValidationError',
          'UPDATESERVER',
          'SERVER',
          404,
        );
      }
      const member = members[`mb_${user.id}-${server.id}`];
      if (!member) {
        throw new StandardizedError(
          `使用者(${user.id})不在伺服器(${server.id})中`,
          'ValidationError',
          'UPDATECHANNEL',
          'MEMBER',
          404,
        );
      }
      const userPermission = member.permission;
      if (userPermission < 4) {
        throw new StandardizedError(
          '您沒有權限更新伺服器',
          'ValidationError',
          'UPDATECHANNEL',
          'USER_PERMISSION',
          403,
        );
      }
      if (
        editedServer.name ||
        editedServer.name.length > 30 ||
        !editedServer.name.trim()
      ) {
        throw new StandardizedError(
          '無效的伺服器名稱',
          'ValidationError',
          'UPDATESERVER',
          'NAME',
          400,
        );
      }
      if (editedServer.description && editedServer.description.length > 200) {
        throw new StandardizedError(
          '伺服器描述過長',
          'ValidationError',
          'UPDATESERVER',
          'DESCRIPTION',
          400,
        );
      }

      // FIXME: Unable change server avatar
      let avatarPath = null;
      if (editedServer.avatar) {
        const matches = editedServer.avatar.match(/^data:image\/(.*?);base64,/);
        if (!matches) {
          throw new Error('無效的圖片格式');
        }

        const imageType = matches[1];
        if (!['png', 'jpeg', 'gif', 'webp'].includes(imageType)) {
          throw new Error('無效的圖片格式');
        }
        const base64Data = editedServer.avatar.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const buffer = Buffer.from(base64Data, 'base64');

        // Check file size (5MB limit)
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error('圖片大小超過限制');
        }

        // Create file with unique name
        const fileName = `${uuidv4()}.${imageType}`;
        uploadedFilePath = path.join(SERVER_AVATAR_DIR, fileName);
        avatarPath = `/${SERVER_AVATAR_PATH}/${fileName}`;

        // Delete old avatar if exists and is not default
        if (
          server.avatarUrl &&
          !server.avatarUrl.includes('logo_server_def.png')
        ) {
          try {
            const oldFileName = server.avatarUrl.split('/').pop();
            const oldPath = path.join(SERVER_AVATAR_DIR, oldFileName);
            await fs.unlink(oldPath);
          } catch (error) {
            new Logger('Server').warn(`無法刪除舊頭像: ${error.message}`);
          }
        }

        // Save new file
        await fs.writeFile(uploadedFilePath, buffer);
        editedServer.avatarUrl = avatarPath;
      }

      // Create new server object with only allowed updates
      await Set.server(server.id, {
        ...server,
        ..._.pick(editedServer, [
          'name',
          'slogan',
          'description',
          'iconUrl',
          'announcement',
        ]),
        settings: {
          ...server.settings,
          ..._.pick(editedServer.settings || {}, ['visibility']),
        },
      });

      // Emit updated data to all users in the server
      io.to(`server_${server.id}`).emit('serverUpdate', editedServer);

      new Logger('Server').success(
        `Server(${server.id}) updated by user(${user.id})`,
      );
    } catch (error) {
      // Delete uploaded file if error occurs
      if (uploadedFilePath) {
        fs.unlink(uploadedFilePath).catch(console.error);
      }

      if (!error instanceof StandardizedError) {
        error = new StandardizedError(
          `更新伺服器時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'UPDATESERVER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('Server').error(`Error updating server: ${error.message}`);
    }
  },
  searchServer: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};

    try {
      // Validate data
      const jwt = socket.jwt;
      if (!jwt) {
        throw new StandardizedError(
          '無可用的 JWT',
          'ValidationError',
          'SEARCHSERVER',
          'TOKEN_MISSING',
          401,
        );
      }
      const sessionId = socket.sessionId;
      if (!sessionId) {
        throw new StandardizedError(
          '無可用的 session ID',
          'ValidationError',
          'SEARCHSERVER',
          'SESSION_MISSING',
          401,
        );
      }
      const result = JWT.verifyToken(jwt);
      if (!result.valid) {
        throw new StandardizedError(
          '無效的 token',
          'ValidationError',
          'SEARCHSERVER',
          'TOKEN_INVALID',
          401,
        );
      }
      const { query } = data;
      if (!query || typeof query !== 'string') {
        throw new StandardizedError(
          '無效的搜尋查詢',
          'ValidationError',
          'SEARCHSERVER',
          'QUERY_INVALID',
          400,
        );
      }
      const userId = Map.sessionToUser.get(sessionId);
      if (!userId) {
        throw new StandardizedError(
          `無效的 session ID(${sessionId})`,
          'ValidationError',
          'SEARCHSERVER',
          'SESSION_EXPIRED',
          401,
        );
      }
      const user = users[userId];
      if (!user) {
        throw new StandardizedError(
          `使用者(${userId})不存在`,
          'ValidationError',
          'SEARCHSERVER',
          'USER',
          404,
        );
      }

      const searchResults = Object.values(servers).filter((server) => {
        const queryStr = String(query).trim();
        // Check if query is an exact match to the display ID
        const displayIdStr = String(server.displayId).trim();
        const isExactIdMatch =
          displayIdStr.toLowerCase() === queryStr.toLowerCase();
        // Use calculateSimilarity function to calculate similarity score
        const nameLower = server.name.toLowerCase();
        const queryLower = query.toLowerCase();
        const similarityScore = Func.calculateSimilarity(nameLower, queryLower);

        if (isExactIdMatch) return true;
        if (server.settings.visibility != 'invisible') return true;
        if (similarityScore >= 0.6) return true;
      });

      const maxResults = 20;
      const results = searchResults.slice(0, maxResults);

      // Emit search results to the user
      io.to(socket.id).emit('serverSearch', results);

      new Logger('WebSocket').success(
        `User(${user.id}) searched for servers with query: ${query}`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `搜尋伺服器時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'SEARCHSERVER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error to the user
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        `Error searching servers: ${error.message}`,
      );
    }
  },
};

module.exports = { ...serverHandler };
