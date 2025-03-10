/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';

// CSS
import styles from '@/styles/serverPage.module.css';

// Components
import MarkdownViewer from '@/components/viewers/MarkdownViewer';
import MessageViewer from '@/components/viewers/MessageViewer';
import ChannelViewer from '@/components/viewers/ChannelViewer';
import MessageInputBox from '@/components/MessageInputBox';

// Modals
import ServerSettingModal from '@/components/modals/EditServerModal';
import UserSettingModal from '@/components/modals/UserSettingModal';

// Types
import {
  popupType,
  type User,
  type Server,
  type Message,
  type Permission,
  type Channel,
} from '@/types';

// Socket
import { useSocket } from '@/providers/SocketProvider';

// Services
import { API_URL } from '@/services/api.service';
import { ipcService } from '@/services/ipc.service';
import { useWebRTC } from '@/providers/WebRTCProvider';

const getStoredBoolean = (key: string, defaultValue: boolean): boolean => {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === 'true';
};

const ServerPageComponent: React.FC = () => {
  // Redux
  const user = useSelector((state: { user: User | null }) => state.user);
  const server = useSelector(
    (state: { server: Server | null }) => state.server,
  );
  const channel = useSelector(
    (state: { channel: Channel | null }) => state.channel,
  );

  // Socket
  const socket = useSocket();

  const handleSendMessage = (message: Message): void => {
    socket?.send.message({ message });
  };

  // Call
  const webRTC = useWebRTC();

  // Volume Control
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);
  const volumeSliderRef = useRef<HTMLDivElement>(null);

  const handleCloseVolumeSlider = (event: MouseEvent) => {
    if (volumeSliderRef.current?.contains(event.target as Node))
      setShowVolumeSlider(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleCloseVolumeSlider);
    return () =>
      document.removeEventListener('mousedown', handleCloseVolumeSlider);
  }, []);

  // Sidebar Control
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const maxWidth = window.innerWidth * 0.3;
        const newWidth = Math.max(
          250,
          Math.min(mouseMoveEvent.clientX, maxWidth),
        );
        setSidebarWidth(newWidth);
      }
    },
    [isResizing],
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Notification Control
  const [notification, setNotification] = useState<boolean>(() =>
    getStoredBoolean('notification', true),
  );

  useEffect(() => {
    localStorage.setItem('notification', notification.toString());
  }, [notification]);

  // Mic Control
  const [isMicOn, setIsMicOn] = useState<boolean>(() =>
    getStoredBoolean('mic', false),
  );

  useEffect(() => {
    localStorage.setItem('mic', isMicOn.toString());
  }, [isMicOn]);

  // User Setting Control
  const [showUserSetting, setShowUserSetting] = useState<boolean>(false);

  // Server Setting Control
  const [showServerSetting, setShowServerSetting] = useState<boolean>(false);

  const userMember = user ? server?.members?.[user.id] : null;
  const userPermissionLevel = userMember?.permissionLevel ?? (0 as Permission);
  const serverUsers = server?.users ?? [];
  const serverUserCount = serverUsers.length;
  const serverChannels = server?.channels ?? [];
  const serverAvatar = server?.avatarUrl
    ? API_URL + server.avatarUrl
    : '/logo_server_def.png';
  const serverName = server?.name ?? '';
  const serverDisplayId = server?.displayId ?? '';
  const serverAnnouncement = server?.announcement ?? '';
  const channelMessages = channel?.messages ?? [];

  useEffect(() => {
    ipcService.discord.updatePresence({
      details: `在 ${serverName} 中`,
      state: `與 ${serverUserCount} 位成員聊天`,
      largeImageKey: 'app_icon',
      largeImageText: 'RC Voice',
      smallImageKey: 'home_icon',
      smallImageText: '主頁',
      timestamp: Date.now(),
      buttons: [
        {
          label: '加入我們的Discord伺服器',
          url: 'https://discord.gg/adCWzv6wwS',
        },
      ],
    });
  }, [serverName, serverUserCount]);

  const handleOpenServerSettings = () => {
    ipcService.popup.open(popupType.EDIT_SERVER, 450, 600);
    ipcService.initialData.onRequest(popupType.EDIT_SERVER, {
      server: server,
    });
  };

  return (
    <div className={styles['serverWrapper']}>
      <div className={styles['serverContent']}>
        {showUserSetting && (
          <UserSettingModal onClose={() => setShowUserSetting(false)} />
        )}
        {/* Left Sidebar */}
        <div
          className={styles['sidebar']}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Server image and info */}
          <div className={styles['sidebarHeader']}>
            <div
              className={styles['avatarPicture']}
              style={{
                background: `url(${serverAvatar})`,
                backgroundSize: 'cover',
                backgroundPosition: '0 0',
              }}
            />

            <div className={styles['baseInfoBox']}>
              <div className={styles['container']}>
                <div className={styles['name']}>{serverName} </div>
              </div>
              <div className={styles['container']}>
                <div className={styles['idIcon']} />
                <div className={styles['idText']}>{serverDisplayId}</div>
                <div className={styles['memberIcon']} />
                <div className={styles['memberText']}>{serverUserCount}</div>
              </div>
            </div>
            <div className={styles['optionBox']}>
              <div className={styles['invitation']} />
              <div className={styles['saperator']} />
              <div
                className={styles['setting']}
                onClick={handleOpenServerSettings}
              />
            </div>
          </div>
          {/* Channel List */}
          <ChannelViewer channels={serverChannels} />
        </div>
        {/* Resize Handle */}
        <div className="resizeHandle" onMouseDown={startResizing} />
        {/* Right Content */}
        <div className={styles['mainContent']}>
          {/* Announcement Area */}
          <div className={styles['announcementArea']}>
            <MarkdownViewer markdownText={serverAnnouncement} />
          </div>
          {/* Messages Area */}
          <div className={styles['messageArea']}>
            <MessageViewer messages={channelMessages} />
          </div>
          {/* Input Area */}
          <div className={styles['inputArea']}>
            <MessageInputBox
              onSendMessage={(msg) => {
                if (!user) return;
                handleSendMessage({
                  id: '',
                  type: 'general',
                  content: msg,
                  senderId: user.id,
                  channelId: user.currentChannelId,
                  permissionLevel: userPermissionLevel,
                  timestamp: 0,
                });
              }}
            />
          </div>
          {/* Bottom Controls */}
          <div className={styles['buttonArea']}>
            <div className={styles['buttons']}>
              <div className={styles['voiceModeButton']}>自由發言</div>
            </div>
            <div
              className={`${styles['micButton']} ${
                webRTC.isMute ? '' : styles['active']
              }`}
              onClick={() => webRTC.toggleMute?.()}
            >
              <div className={styles['micIcon']} />
              <div className={styles['micText']}>
                {webRTC.isMute ? '拿麥發言' : '已拿麥'}
              </div>
            </div>
            <div className={styles['buttons']}>
              <div className={styles['bkgModeButton']}>混音</div>
              <div className={styles['saperator']} />
              <div
                className={`${styles['micModeButton']} ${
                  webRTC.isMute ? '' : styles['active']
                }`}
                onClick={() => webRTC.toggleMute?.()}
              />
              <div className={styles['speakerButton']} />
              <div className={styles['recordModeButton']} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ServerPageComponent.displayName = 'ServerPageComponent';

// use dynamic import to disable SSR
const ServerPage = dynamic(() => Promise.resolve(ServerPageComponent), {
  ssr: false,
});

export default ServerPage;
