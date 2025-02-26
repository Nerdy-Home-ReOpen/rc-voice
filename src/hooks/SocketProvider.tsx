/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { createContext, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';

// Types
import {
  Channel,
  Server,
  User,
  SocketServerEvent,
  SocketClientEvent,
} from '@/types';

// Utils
import { errorHandler } from '@/utils/errorHandler';

// Redux
import store from '@/redux/store';
import { clearServer, setServer } from '@/redux/serverSlice';
import { clearUser, setUser } from '@/redux/userSlice';
import { clearSessionToken } from '@/redux/sessionTokenSlice';
import { clearChannel, setChannel } from '@/redux/channelSlice';

// Services
import { ipcService } from '@/services/ipc.service';

// const WS_URL = 'ws://localhost:4500';

type SocketContextType = {
  event?: Record<SocketClientEvent, (...args: any[]) => void>;
};

const SocketContext = createContext<SocketContextType>({});

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context.event;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  // Redux
  const user = useSelector((state: { user: User | null }) => state.user);
  const server = useSelector(
    (state: { server: Server | null }) => state.server,
  );
  const channel = useSelector(
    (state: { channel: Channel | null }) => state.channel,
  );

  const handleDisconnect = () => {
    console.log('Socket disconnected');
    store.dispatch(clearServer());
    store.dispatch(clearUser());
    store.dispatch(clearSessionToken());
    localStorage.removeItem('sessionToken');
  };
  const handleUserConnect = (user: any) => {
    console.log('User connected: ', user);
    store.dispatch(setUser(user));
  };
  const handleUserDisconnect = () => {
    console.log('User disconnected');
    store.dispatch(clearServer());
    store.dispatch(clearUser());
    store.dispatch(clearSessionToken());
    localStorage.removeItem('sessionToken');
  };
  const handleUserUpdate = (data: Partial<User>) => {
    console.log('User update: ', data);
    const user_ = store.getState().user;
    if (!user_) return;
    store.dispatch(setUser({ ...user_, ...data }));
  };
  const handleServerConnect = (server: Server) => {
    console.log('Server connected: ', server);
    store.dispatch(setServer(server));
  };
  const handleServerDisconnect = () => {
    console.log('Server disconnected');
    store.dispatch(clearServer());
  };
  const handleServerUpdate = (data: Partial<Server>) => {
    console.log('Server update: ', data);
    const server_ = store.getState().server;
    if (!server_) return;
    store.dispatch(setServer({ ...server_, ...data }));
  };
  const handleChannelConnect = (channel: Channel) => {
    store.dispatch(setChannel(channel));
    console.log('Channel connected: ', channel);
  };
  const handleChannelDisconnect = () => {
    console.log('Channel disconnected');
    store.dispatch(clearChannel());
  };
  const handleChannelUpdate = (data: Partial<Channel>) => {
    console.log('Channel update: ', data);
    const channel_ = store.getState().channel;
    if (!channel_) return;
    store.dispatch(setChannel({ ...channel_, ...data }));
  };
  const handlePlaySound = (sound: 'join' | 'leave') => {
    switch (sound) {
      case 'join':
      // console.log('Play join sound');
      // joinSoundRef.current?.play();
      // break;
      case 'leave':
      // console.log('Play leave sound');
      // leaveSoundRef.current?.play();
      // break;
    }
  };

  // Initialize socket event listeners
  // make sure it only runs once
  useEffect(() => {
    if (ipcService.getAvailability()) {
      ipcService.onInitialData((data) => {
        console.log('Initial data:', data);
        store.dispatch(setUser(data.user));
        store.dispatch(setServer(data.server));
        store.dispatch(setChannel(data.channel));
      });

      const eventHandlers = {
        [SocketServerEvent.CONNECT]: () => console.log('Connected to server'),
        [SocketServerEvent.ERROR]: (error: any) =>
          errorHandler.ResponseError(error),
        [SocketServerEvent.DISCONNECT]: handleDisconnect,
        [SocketServerEvent.USER_CONNECT]: handleUserConnect,
        [SocketServerEvent.USER_DISCONNECT]: handleUserDisconnect,
        [SocketServerEvent.USER_UPDATE]: handleUserUpdate,
        [SocketServerEvent.SERVER_CONNECT]: handleServerConnect,
        [SocketServerEvent.SERVER_DISCONNECT]: handleServerDisconnect,
        [SocketServerEvent.SERVER_UPDATE]: handleServerUpdate,
        [SocketServerEvent.CHANNEL_CONNECT]: handleChannelConnect,
        [SocketServerEvent.CHANNEL_DISCONNECT]: handleChannelDisconnect,
        [SocketServerEvent.CHANNEL_UPDATE]: handleChannelUpdate,
        [SocketServerEvent.PLAY_SOUND]: handlePlaySound,
      };

      Object.entries(eventHandlers).forEach(([event, handler]) => {
        ipcService.onSocketEvent(event as SocketServerEvent, handler);
      });

      //cleanup
      return () => {
        Object.keys(eventHandlers).forEach((event) => {
          ipcService.removeListener(event);
        });
      };
    }
  }, []);

  const event = {
    [SocketClientEvent.CONNECT_USER]: () =>
      ipcService.sendSocketEvent(SocketClientEvent.CONNECT_USER, null),
    [SocketClientEvent.DISCONNECT_USER]: () =>
      ipcService.sendSocketEvent(SocketClientEvent.DISCONNECT_USER, null),
    [SocketClientEvent.UPDATE_USER]: (user: Partial<User>) =>
      ipcService.sendSocketEvent(SocketClientEvent.UPDATE_USER, { user }),
    [SocketClientEvent.CONNECT_SERVER]: (serverId: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.CONNECT_SERVER, {
        serverId,
      }),
    [SocketClientEvent.DISCONNECT_SERVER]: (serverId: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.DISCONNECT_SERVER, {
        serverId,
      }),
    [SocketClientEvent.CREATE_SERVER]: (server: Server) =>
      ipcService.sendSocketEvent(SocketClientEvent.CREATE_SERVER, {
        server,
      }),
    [SocketClientEvent.UPDATE_SERVER]: (server: Partial<Server>) =>
      ipcService.sendSocketEvent(SocketClientEvent.UPDATE_SERVER, {
        server,
      }),
    [SocketClientEvent.DELETE_SERVER]: (serverId: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.DELETE_SERVER, {
        serverId,
      }),
    [SocketClientEvent.CONNECT_CHANNEL]: (channelId: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.CONNECT_CHANNEL, {
        channelId,
      }),
    [SocketClientEvent.DISCONNECT_CHANNEL]: (channelId: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.DISCONNECT_CHANNEL, {
        channelId,
      }),
    [SocketClientEvent.CREATE_CHANNEL]: (channel: Channel) =>
      ipcService.sendSocketEvent(SocketClientEvent.CREATE_CHANNEL, {
        channel,
      }),
    [SocketClientEvent.UPDATE_CHANNEL]: (channel: Partial<Channel>) =>
      ipcService.sendSocketEvent(SocketClientEvent.UPDATE_CHANNEL, {
        channel,
      }),
    [SocketClientEvent.DELETE_CHANNEL]: (channelId: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.DELETE_CHANNEL, {
        channelId,
      }),
    [SocketClientEvent.SEND_MESSAGE]: (message: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.SEND_MESSAGE, {
        message,
      }),
    [SocketClientEvent.SEND_DIRECT_MESSAGE]: (message: string) =>
      ipcService.sendSocketEvent(SocketClientEvent.SEND_DIRECT_MESSAGE, {
        message,
      }),
  };

  return (
    <SocketContext.Provider value={{ event }}>
      {children}
    </SocketContext.Provider>
  );
};
