const { QuickDB } = require("quick.db");
const db = new QuickDB();

const serverList = {
  123456789: {
    id: "123456789",
    name: "543隨你聊",
    announcement: "Example Aassnnouncement",
    icon: "https://preview.redd.it/the-context-behind-the-2015-jsal-pfp-also-the-images-are-in-v0-huyzsah41x8c1.jpg?width=640&crop=smart&auto=webp&s=bffb81c9d6a4a40896acd6e1b72bb82c0a73b03c",
    users: [
      "456",
      "612a7797-f970-4f23-9983-f08d863d9552",
      "a73af1d2-689e-4d7d-9426-3421cce3ade4",
    ],
    channels: [
      "1234567890",
      "1234567891",
      "1234567892",
      "12345678911",
      "12345678912",
      "123456789111",
    ],
    messages: ["123"],
  },
};

const userList = {
  456: {
    id: "456",
    name: "example user",
    gender: "Male",
    permissions: {
      123456789: 4,
    },
  },
  "612a7797-f970-4f23-9983-f08d863d9552": {
    id: "612a7797-f970-4f23-9983-f08d863d9552",
    name: "Whydog",
    account: "Whydog",
    password: "c2hhd255aW4xMDE0MjA3", // shawnyin1014207
    gender: "Male",
    permissions: { 123456789: 1 },
  },
  "a73af1d2-689e-4d7d-9426-3421cce3ade4": {
    id: "a73af1d2-689e-4d7d-9426-3421cce3ade4",
    name: "yeci",
    account: "yeci226",
    password: "c2hhd255aW4xMDE0MjA3",
    gender: "Male",
    permissions: { 123456789: 1 },
  },
};

const messageList = {
  123: {
    id: "123",
    sender: "456",
    content: "example message",
    timestamp: 1738234723000,
  },
};

const channelList = {
  1234567890: {
    id: "1234567890",
    name: "example home",
    permission: "public",
    isLobby: true,
    isCategory: false,
    users: [],
    parentId: null,
  },
  1234567891: {
    id: "1234567891",
    name: "example category",
    permission: "public",
    isLobby: false,
    isCategory: true,
    users: [],
    parentId: null,
  },
  1234567892: {
    id: "1234567892",
    name: "example channel",
    permission: "public",
    isLobby: false,
    isCategory: false,
    users: [],
    parentId: null,
  },
  12345678911: {
    id: "12345678911",
    name: "example sub-channel",
    permission: "private",
    isLobby: false,
    isCategory: false,
    users: [456],
    parentId: "1234567891",
  },
  12345678912: {
    id: "12345678912",
    name: "example sub-category",
    permission: "private",
    isLobby: false,
    isCategory: true,
    users: [],
    parentId: "1234567891",
  },
  123456789111: {
    id: "123456789111",
    name: "example sub-sub-channel",
    permission: "private",
    isLobby: false,
    isCategory: false,
    users: [456],
    parentId: "12345678912",
  },
};

async function main() {
  await db.set("serverList", serverList);
  await db.set("usersList", userList);
  await db.set("messageList", messageList);
  await db.set("channelList", channelList);
  console.log("Database initialized");
}

main();
