/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import dynamic from 'next/dynamic';

import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CircleX } from 'lucide-react';

// CSS
import styles from '@/styles/home.module.css';

// Types
import type { Presence, Server, User } from '@/types';

// Pages
import AuthPage from '@/pages/AuthPage';
import FriendPage from '@/pages/FriendPage';
import HomePage from '@/pages/HomePage';
import ServerPage from '@/pages/ServerPage';

// Components
import LoadingSpinner from '@/components/common/LoadingSpinner';
import UserSettingModal from '@/modals/UserSettingModal';

// Utils
import { measureLatency } from '@/utils/measureLatency';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';

// Redux
import store from '@/redux/store';
import { clearServer, setServer } from '@/redux/serverSlice';
import { clearUser, setUser } from '@/redux/userSlice';
import { clearSessionToken, setSessionToken } from '@/redux/sessionTokenSlice';

interface HeaderProps {
  selectedId?: number;
  children?: React.ReactNode;
  onSelect?: (tabId: number) => void;
  onClose?: () => void;
}

const Header: React.FC<HeaderProps> = React.memo(
  ({ children, selectedId = 1, onSelect, onClose }) => {
    // Redux
    const user = useSelector((state: { user: User }) => state.user);
    const server = useSelector((state: { server: Server }) => state.server);
    const sessionId = useSelector(
      (state: { sessionToken: string }) => state.sessionToken,
    );

    // Socket
    const socket = useSocket();

    const handleLogout = () => {
      socket?.emit('disconnectUser', { sessionId });
    };

    const handleLeaveServer = () => {
      const serverId = user.presence?.currentServerId;
      socket?.emit('disconnectServer', { serverId, sessionId });
    };

    const handleRequestUserUpdate = () => {
      socket?.emit('requestUserUpdate', { sessionId });
    };

    const handleUpdateStatus = (status: Presence['status']) => {
      socket?.emit('updatePresence', { sessionId, presence: { status } });
    };

    // Fullscreen Control
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    };

    // Menu Control
    const [showMenu, setShowMenu] = useState(false);

    // User Setting Control
    const [showUserSetting, setShowUserSetting] = useState<boolean>(false);

    // Status Dropdown Control
    const [showStatusDropdown, setShowStatusDropdown] =
      useState<boolean>(false);

    // Tab Control
    const MAIN_TABS = [
      user && { id: 1, label: '發現', onClick: handleRequestUserUpdate },
      user && { id: 2, label: '好友' },
      server && { id: 3, label: server.name },
    ].filter((_) => _);

    const userName = user?.name ?? 'RiceCall';
    const userPresenceStatus = user?.presence?.status ?? 'online';

    return (
      <div className={styles['header']}>
        <div className={styles['userStatus']}>
          {showUserSetting && (
            <UserSettingModal onClose={() => setShowUserSetting(false)} />
          )}
          <div className={styles['nameDisplay']}>{userName}</div>
          <div
            className={styles['statusBox']}
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <div
              className={styles['statusDisplay']}
              datatype={userPresenceStatus}
            />
            <div className={styles['statusTriangle']} />
            <div
              className={`${styles['statusDropdown']} ${
                showStatusDropdown ? '' : styles['hidden']
              }`}
            >
              <div
                className={styles['option']}
                datatype="online"
                onClick={() => {
                  handleUpdateStatus('online');
                  setShowStatusDropdown(false);
                }}
              />
              <div
                className={styles['option']}
                datatype="dnd"
                onClick={() => {
                  handleUpdateStatus('dnd');
                  setShowStatusDropdown(false);
                }}
              />
              <div
                className={styles['option']}
                datatype="idle"
                onClick={() => {
                  handleUpdateStatus('idle');
                  setShowStatusDropdown(false);
                }}
              />
              <div
                className={styles['option']}
                datatype="gn"
                onClick={() => {
                  handleUpdateStatus('gn');
                  setShowStatusDropdown(false);
                }}
              />
            </div>
          </div>
        </div>
        {/* Main Tabs */}
        <div className={styles['mainTabs']}>
          {MAIN_TABS.map((Tab) => {
            const TabId = Tab.id;
            const TabLable = Tab.label;

            return (
              <div
                key={`Tabs-${TabId}`}
                className={`${styles['tab']} ${
                  TabId === selectedId ? styles['selected'] : ''
                }`}
                onClick={() => {
                  onSelect?.(TabId);
                  Tab.onClick && Tab.onClick();
                }}
              >
                <div className={styles['tabLable']}>{TabLable}</div>
                <div className={styles['tabBg']}></div>
              </div>
            );
          })}
          {MAIN_TABS.length > 2 && (
            <CircleX
              onClick={() => handleLeaveServer()}
              size={16}
              className={styles['tabClose']}
            />
          )}
        </div>
        {/* Buttons */}
        <div className={styles['buttons']}>
          <div className={styles['gift']} />
          <div className={styles['game']} />
          <div className={styles['notice']} />
          <div className={styles['spliter']} />
          <div
            className={styles['menu']}
            onClick={() => setShowMenu(!showMenu)}
          >
            <div
              className={`${styles['menuDropDown']} ${
                showMenu ? '' : styles['hidden']
              }`}
            >
              <div
                className={`${styles['option']} ${styles['hasImage']}`}
                data-type="system-setting"
                data-key="30066"
              >
                系統設定
              </div>
              <div
                className={`${styles['option']} ${styles['hasImage']}`}
                data-type="message-history"
                data-key="30136"
              >
                訊息紀錄
              </div>
              <div
                className={`${styles['option']} ${styles['hasImage']}`}
                data-type="change-theme"
                data-key="60028"
              >
                更換主題
              </div>
              <div
                className={styles['option']}
                data-type="feed-back"
                data-key="30039"
              >
                意見反饋
              </div>
              <div
                className={`${styles['option']} ${styles['hasImage']} ${styles['hasSubmenu']}`}
                data-type="language-select"
              >
                <span data-key="30374">語言選擇</span>
                <div
                  className={`${styles['menuDropDown']} ${styles['hidden']}`}
                >
                  <div className={styles['option']} data-lang="tw">
                    繁體中文
                  </div>
                  <div className={styles['option']} data-lang="cn">
                    简体中文
                  </div>
                  <div className={styles['option']} data-lang="en">
                    English
                  </div>
                  <div className={styles['option']} data-lang="jp">
                    日本語
                  </div>
                  <div className={styles['option']} data-lang="ru">
                    русский язык
                  </div>
                </div>
              </div>
              <div
                className={styles['option']}
                data-type="logout"
                data-key="30060"
                onClick={() => handleLogout()}
              >
                登出
              </div>
              <div
                className={`${styles['option']} ${styles['hasImage']}`}
                data-type="exit"
                data-key="30061"
              >
                退出
              </div>
            </div>
          </div>
          <div className={styles['minimize']} />
          <div
            className={isFullscreen ? styles['restore'] : styles['maxsize']}
            onClick={handleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          />
          <div className={styles['close']} onClick={onClose} />
        </div>
      </div>
    );
  },
);

Header.displayName = 'Header';

const HomeComponent = () => {
  // Socket Control
  const socket = useSocket();

  // Sound Control
  const joinSoundRef = useRef<HTMLAudioElement | null>(null);
  const leaveSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    joinSoundRef.current = new Audio('/sounds/join.mp3');
    leaveSoundRef.current = new Audio('/sounds/leave.mp3');
  }, []);

  // Redux
  const user = useSelector((state: { user: User }) => state.user);
  const server = useSelector((state: { server: Server }) => state.server);
  const sessionId = useSelector(
    (state: { sessionToken: string }) => state.sessionToken,
  );

  useEffect(() => {
    const token =
      store.getState().sessionToken ?? localStorage.getItem('sessionToken');
    if (!token) return;
    store.dispatch(setSessionToken(token));
    localStorage.setItem('sessionToken', token);
  }, [sessionId]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    console.log('Connect to socket with session Id:', sessionId);
    socket.emit('connectUser', { sessionId });
  }, [sessionId]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    const handleDisconnect = () => {
      console.log('Socket disconnected, ', sessionId);
      socket.emit('disconnectUser', { sessionId });
    };
    const handleForceDisconnect = () => {
      console.log('Socket force disconnected: ', sessionId);
      socket.emit('disconnectUser', { sessionId });
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
    const handleServerConnect = (server: Server) => {
      console.log('Server connected: ', server);
      store.dispatch(setServer(server));
      socket.emit('connectChannel', { sessionId, channelId: server.lobbyId });
    };
    const handleServerDisconnect = () => {
      console.log('Server disconnected');
      store.dispatch(clearServer());
    };
    const handleChannelConnect = () => {
      console.log('Channel connected');
    };
    const handleChannelDisconnect = () => {
      console.log('Channel disconnected');
    };
    const handleUpdateUserPresence = (data: Partial<Presence>) => {
      console.log('User presence update: ', data);
      const presence = user.presence ? { ...user.presence, ...data } : null;
      store.dispatch(setUser({ ...user, presence }));
    };
    const handleServerUpdate = (data: Partial<Server>) => {
      console.log('Server update: ', data);
      store.dispatch(setServer({ ...server, ...data }));
    };
    const handleUserUpdate = (data: Partial<User>) => {
      console.log('User update: ', data);
      store.dispatch(setUser({ ...user, ...data }));
    };
    const handleDirectMessage = (data: any) => {
      console.log('Direct message: ', data);
    };
    const handlePlaySound = (sound: 'join' | 'leave') => {
      switch (sound) {
        case 'join':
          console.log('Play join sound');
          joinSoundRef.current?.play();
          break;
        case 'leave':
          console.log('Play leave sound');
          leaveSoundRef.current?.play();
          break;
      }
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('forceDisconnect', handleForceDisconnect);
    socket.on('userConnect', handleUserConnect);
    socket.on('userDisconnect', handleUserDisconnect);
    socket.on('serverConnect', handleServerConnect);
    socket.on('serverDisconnect', handleServerDisconnect);
    socket.on('channelConnect', handleChannelConnect);
    socket.on('channelDisconnect', handleChannelDisconnect);
    socket.on('userPresenceUpdate', handleUpdateUserPresence);
    socket.on('serverUpdate', handleServerUpdate);
    socket.on('userUpdate', handleUserUpdate);
    socket.on('directMessage', handleDirectMessage);
    socket.on('playSound', handlePlaySound);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('forceDisconnect', handleForceDisconnect);
      socket.off('userConnect', handleUserConnect);
      socket.off('userDisconnect', handleUserDisconnect);
      socket.off('serverConnect', handleServerConnect);
      socket.off('serverDisconnect', handleServerDisconnect);
      socket.off('channelConnect', handleChannelConnect);
      socket.off('channelDisconnect', handleChannelDisconnect);
      socket.off('userPresenceUpdate', handleUpdateUserPresence);
      socket.off('serverUpdate', handleServerUpdate);
      socket.off('userUpdate', handleUserUpdate);
      socket.off('directMessage', handleDirectMessage);
      socket.off('playSound', handlePlaySound);
    };
  }, [sessionId, server, user]);

  // Tab Control
  const [selectedTabId, setSelectedTabId] = useState<number>(1);

  useEffect(() => {
    if (server) setSelectedTabId(3);
    else setSelectedTabId(1);
  }, [server]);

  // Latency Control
  const [latency, setLatency] = useState<string | null>('0');

  // useEffect(() => {
  //   const _ = setInterval(async () => {
  //     const res = await measureLatency();
  //     setLatency(res);
  //   }, 500);
  //   return () => clearInterval(_);
  // }, []);

  const getMainContent = () => {
    if (!socket) return <LoadingSpinner />;
    if (!user) return <AuthPage />;
    switch (selectedTabId) {
      case 1:
        return <HomePage />;
      case 2:
        return <FriendPage />;
      case 3:
        if (!server) return;
        return <ServerPage />;
    }
  };

  return (
    <div className={styles['container']}>
      {/* Top Navigation */}
      <Header
        selectedId={selectedTabId}
        onSelect={(tabId) => setSelectedTabId(tabId)}
      />
      {/* Main Content */}
      <div className={styles['contentWrapper']}>{getMainContent()}</div>
    </div>
  );
};

HomeComponent.displayName = 'HomeComponent';

// use dynamic import to disable SSR
const Home = dynamic(() => Promise.resolve(HomeComponent), {
  ssr: false,
});

export default Home;
