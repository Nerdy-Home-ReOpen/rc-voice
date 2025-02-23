/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-expressions */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Socket, io } from 'socket.io-client';
import { useSelector } from 'react-redux';

// Types
import type { Channel, Server, User } from '@/types';

// Utils
import { errorHandler } from '@/utils/errorHandler';

// Redux
import store from '@/redux/store';
import { clearServer, setServer } from '@/redux/serverSlice';
import { clearUser, setUser } from '@/redux/userSlice';
import { clearSessionToken, setSessionToken } from '@/redux/sessionTokenSlice';
import { clearChannel, setChannel } from '@/redux/channelSlice';

// Services
import {
  ipcService,
  SOCKET_IPC_CHANNEL,
  SocketEventData,
} from '@/services/ipc.service';

const WS_URL = 'ws://localhost:4500';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
  connect: () => {},
  disconnect: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context.socket;
};

export const useSocketStatus = () => {
  const context = useContext(SocketContext);
  return {
    isConnected: context.isConnected,
    error: context.error,
    connect: context.connect,
    disconnect: context.disconnect,
  };
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isMainWindow, setIsMainWindow] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Redux
  const user = useSelector((state: { user: User | null }) => state.user);
  const server = useSelector(
    (state: { server: Server | null }) => state.server,
  );
  const channel = useSelector(
    (state: { channel: Channel | null }) => state.channel,
  );
  const sessionId = useSelector(
    (state: { sessionToken: string | null }) => state.sessionToken,
  );

  useEffect(() => {
    const token =
      store.getState().sessionToken ?? localStorage.getItem('sessionToken');
    if (!token) return;
    store.dispatch(setSessionToken(token));
    localStorage.setItem('sessionToken', token);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const socket: Socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: {
        sessionId: sessionId,
      },
    });

    setSocket(socket);

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server with session ID:', sessionId);
    });
    socket.on('error', (error) => {
      setError(error);
      errorHandler.ResponseError(error);
      console.log('Connect server error');
    });
    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    if (!socket || !sessionId) return;

    if (typeof window !== 'undefined') {
      setIsMainWindow(window.location.pathname === '/');
    }

    const handleDisconnect = () => {
      console.log('Socket disconnected, ', sessionId);
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
      if (!user) return;
      store.dispatch(setUser({ ...user, ...data }));
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
      if (!server) return;
      store.dispatch(setServer({ ...server, ...data }));
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
      if (!channel) return;
      store.dispatch(setChannel({ ...channel, ...data }));
    };
    const handleDirectMessage = (data: any) => {
      console.log('Direct message: ', data);
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

    socket.on('disconnect', handleDisconnect);
    socket.on('userConnect', handleUserConnect);
    socket.on('userDisconnect', handleUserDisconnect);
    socket.on('userUpdate', handleUserUpdate);
    socket.on('serverConnect', handleServerConnect);
    socket.on('serverDisconnect', handleServerDisconnect);
    socket.on('serverUpdate', handleServerUpdate);
    socket.on('channelConnect', handleChannelConnect);
    socket.on('channelDisconnect', handleChannelDisconnect);
    socket.on('channelUpdate', handleChannelUpdate);
    socket.on('directMessage', handleDirectMessage);
    socket.on('playSound', handlePlaySound);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('userConnect', handleUserConnect);
      socket.off('userDisconnect', handleUserDisconnect);
      socket.off('userUpdate', handleUserUpdate);
      socket.off('serverConnect', handleServerConnect);
      socket.off('serverDisconnect', handleServerDisconnect);
      socket.off('serverUpdate', handleServerUpdate);
      socket.off('channelConnect', handleChannelConnect);
      socket.off('channelDisconnect', handleChannelDisconnect);
      socket.off('channelUpdate', handleChannelUpdate);
      socket.off('directMessage', handleDirectMessage);
      socket.off('playSound', handlePlaySound);
    };
  }, [socket, sessionId, user, server, channel]);

  const setupSocketListeners = useCallback((newSocket: Socket) => {
    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError(`Connection error: ${err.message}`);
      setIsConnected(false);

      ipcService.sendToMain(SOCKET_IPC_CHANNEL, {
        type: 'error',
        error: err.message,
      });
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Connected to server');

      ipcService.sendToMain(SOCKET_IPC_CHANNEL, {
        type: 'connect',
      });
    });

    newSocket.on('error', (err) => {
      setError(err);
      errorHandler.ResponseError(err);
      console.log('Socket error:', err);

      ipcService.sendToMain(SOCKET_IPC_CHANNEL, {
        type: 'error',
        error: err,
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');

      ipcService.sendToMain(SOCKET_IPC_CHANNEL, {
        type: 'disconnect',
      });
    });

    const socketEvents = ['serverUpdate', 'userUpdate', 'message'];
    socketEvents.forEach((eventName) => {
      newSocket.on(eventName, (data) => {
        ipcService.sendToMain(SOCKET_IPC_CHANNEL, {
          type: eventName,
          payload: data,
        });
      });
    });

    return socketEvents;
  }, []);

  const connect = useCallback(() => {
    if (!isMainWindow || socketRef.current) return;

    try {
      const newSocket: Socket = io(WS_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: false,
      });

      const socketEvents = setupSocketListeners(newSocket);
      socketRef.current = newSocket;
      setSocket(newSocket);
      newSocket.connect();

      return () => {
        socketEvents.forEach((eventName) => {
          newSocket.off(eventName);
        });
        newSocket.disconnect();
        socketRef.current = null;
      };
    } catch (err: unknown) {
      console.error('Socket initialization error:', err);
      setError(
        `Socket initialization error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }, [isMainWindow, setupSocketListeners]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (isMainWindow && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const cleanup = connect();
      return () => {
        cleanup?.();
        isInitializedRef.current = false;
      };
    } else if (!isMainWindow) {
      ipcService.onFromMain(SOCKET_IPC_CHANNEL, (data: SocketEventData) => {
        switch (data.type) {
          case 'connect':
            setIsConnected(true);
            setError(null);
            break;
          case 'disconnect':
            setIsConnected(false);
            break;
          case 'error':
            setError(data.error || null);
            break;
          default:
            break;
        }
      });

      return () => {
        ipcService.removeListener(SOCKET_IPC_CHANNEL);
      };
    }
  }, [isMainWindow, connect]);

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, error, connect, disconnect }}
    >
      {children}
    </SocketContext.Provider>
  );
};
