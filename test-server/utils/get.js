const { QuickDB } = require('quick.db');
const db = new QuickDB();

const get = {
  // User
  user: async (userId) => {
    const users = (await db.get('users')) || {};
    const user = users[userId];
    if (!user) return null;
    return {
      ...user,
      members: await get.userMembers(userId),
      badges: await get.userBadges(userId),
      friends: await get.userFriends(userId),
      friendGroups: await get.userFriendGroups(userId),
      friendApplications: await get.userFriendApplications(userId),
      recentServers: await get.userRecentServers(userId),
      ownedServers: await get.userOwnedServers(userId),
      favServers: await get.userFavServers(userId),
    };
  },
  userBadges: async (userId) => {
    const userBadges = (await db.get('userBadges')) || {};
    const badges = (await db.get('badges')) || {};
    return Object.values(userBadges)
      .filter((ub) => ub.userId === userId)
      .map((ub) => badges[ub.badgeId])
      .filter((badge) => badge);
  },
  userMembers: async (userId) => {
    const members = (await db.get('members')) || {};
    const servers = (await db.get('servers')) || {};
    return Object.values(members)
      .filter((member) => member.userId === userId)
      .reduce(
        (acc, member) => ({
          ...acc,
          [member.serverId]: { ...member, server: servers[member.serverId] },
        }),
        {},
      );
  },
  userFriends: async (userId) => {
    const friends = (await db.get('friends')) || {};
    return Object.values(friends).filter(
      (friend) => friend.user1Id === userId || friend.user2Id === userId,
    );
  },
  userFriendGroups: async (userId) => {
    const friendGroups = (await db.get('friendGroups')) || {};
    return Object.values(friendGroups).filter(
      (group) => group.userId === userId,
    );
  },
  userFriendApplications: async (userId) => {
    const friendApplications = (await db.get('friendApplications')) || {};
    return Object.values(friendApplications).filter(
      (app) => app.recieverId === userId,
    );
  },
  userRecentServers: async (userId) => {
    const userServers = (await db.get('userServers')) || {};
    const servers = (await db.get('servers')) || {};
    return Object.values(userServers)
      .filter((us) => us.userId === userId && us.recent)
      .map((us) => servers[us.serverId])
      .filter((server) => server);
  },
  userOwnedServers: async (userId) => {
    const userServers = (await db.get('userServers')) || {};
    const servers = (await db.get('servers')) || {};
    return Object.values(userServers)
      .filter((us) => us.userId === userId && us.owned)
      .map((us) => servers[us.serverId])
      .filter((server) => server);
  },
  userFavServers: async (userId) => {
    const userServers = (await db.get('userServers')) || {};
    const servers = (await db.get('servers')) || {};
    return Object.values(userServers)
      .filter((us) => us.userId === userId && us.favorite)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((us) => servers[us.serverId])
      .filter((server) => server);
  },
  // Server
  server: async (serverId) => {
    const servers = (await db.get('servers')) || {};
    const server = servers[serverId];
    if (!server) return null;
    return {
      ...server,
      users: await get.serverUsers(serverId),
      channels: await get.serverChannels(serverId),
      members: await get.serverMembers(serverId),
      applications: await get.serverApplications(serverId),
    };
  },
  serverChannels: async (serverId) => {
    const channels = (await db.get('channels')) || {};
    return Object.values(channels).filter(
      (channel) => channel.serverId === serverId,
    );
  },
  serverUsers: async (serverId) => {
    const users = (await db.get('users')) || {};
    return Object.values(users).filter(
      (user) => user.currentServerId === serverId,
    );
  },
  serverMembers: async (serverId) => {
    const members = (await db.get('members')) || {};
    const users = (await db.get('users')) || {};
    return Object.values(members)
      .filter((member) => member.serverId === serverId)
      .reduce(
        (acc, member) => ({
          ...acc,
          [member.userId]: { ...member, user: users[member.userId] },
        }),
        {},
      );
  },
  serverApplications: async (serverId) => {
    const serverApplications = (await db.get('serverApplications')) || {};
    return Object.values(serverApplications).filter(
      (app) => app.serverId === serverId,
    );
  },
  // Channel
  channel: async (channelId) => {
    const channels = (await db.get('channels')) || {};
    const channel = channels[channelId];
    if (!channel) return null;
    return {
      ...channel,
      users: await get.channelUsers(channelId),
      messages: await get.channelMessage(channelId),
      subChannel: await get.channelChildren(channelId),
      voicePresences: await get.channelVoicePresences(channelId),
    };
  },
  channelUsers: async (channelId) => {
    const users = (await db.get('users')) || {};
    return Object.values(users).filter(
      (user) => user.currentChannelId === channelId,
    );
  },
  channelMessage: async (channelId) => {
    const messages = (await db.get('messages')) || {};
    const users = (await db.get('users')) || {};
    return Object.values(messages)
      .filter((message) => message.channelId === channelId)
      .map((message) => ({
        ...message,
        sender: users[message.senderId],
      }));
  },
  channelChildren: async (channelId) => {
    const channelRelations = (await db.get('channelRelations')) || {};
    const channels = (await db.get('channels')) || {};
    return Object.values(channelRelations)
      .filter((relation) => relation.parentId === channelId)
      .map((relation) => channels[relation.childId])
      .filter((channel) => channel);
  },
  channelVoicePresences: async (channelId) => {
    const voicePresences = (await db.get('voicePresences')) || {};
    return Object.values(voicePresences).filter(
      (voicePresence) => voicePresence.channelId === channelId,
    );
  },
  // Friend
  friend: async (friendId) => {
    const friends = (await db.get('friends')) || {};
    const users = (await db.get('users')) || {};
    const friend = friends[friendId];
    if (!friend) return null;
    return {
      ...friend,
      user: users[
        friend.user1Id === friendId ? friend.user2Id : friend.user1Id
      ],
      directMessages: await get.friendDriectMessages(friendId),
    };
  },
  friendDriectMessages: async (friendId) => {
    const directMessages = (await db.get('directMessages')) || {};
    return Object.values(directMessages)
      .filter((directMessage) => directMessage.friendId === friendId)
      .map((directMessage) => {
        return {
          ...directMessage,
          sender: users[directMessage.senderId],
        };
      });
  },
  // Message
  message: async (messageId) => {
    const messages = (await db.get('messages')) || {};
    const users = (await db.get('users')) || {};
    const message = messages[messageId];
    if (!message) return null;
    return {
      ...message,
      sender: users[message.senderId],
    };
  },
  // DirectMessage
  directMessages: async (directMessageId) => {
    const directMessages = (await db.get('directMessages')) || {};
    const users = (await db.get('users')) || {};
    const directMessage = directMessages[directMessageId];
    if (!directMessage) return null;
    return {
      ...directMessage,
      sender: users[message.senderId],
    };
  },
};

module.exports = { ...get };
