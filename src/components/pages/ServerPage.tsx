/* eslint-disable react-hooks/exhaustive-deps */
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback, useRef } from 'react';

// CSS
import styles from '@/styles/serverPage.module.css';

// Components
import MarkdownViewer from '@/components/viewers/MarkdownViewer';
import MessageViewer from '@/components/viewers/MessageViewer';
import ChannelViewer from '@/components/viewers/ChannelViewer';
import MessageInputBox from '@/components/MessageInputBox';

// Types
import {
  PopupType,
  User,
  Server,
  Message,
  Channel,
  Member,
  SocketServerEvent,
} from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';
import { useSocket } from '@/providers/SocketProvider';
import { useWebRTC } from '@/providers/WebRTCProvider';

// Services
import { ipcService } from '@/services/ipc.service';
import { apiService } from '@/services/api.service';

// Utils
import { createDefault } from '@/utils/default';

interface ServerPageProps {
  user: User;
  server: Server;
  setServer: (server: Server) => void;
}

const ServerPageComponent: React.FC<ServerPageProps> = React.memo(
  ({ user, server, setServer }) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();
    const webRTC = useWebRTC();

    // Refs
    const refreshed = useRef(false);

    // States
    const [sidebarWidth, setSidebarWidth] = useState<number>(256);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [currentChannel, setCurrentChannel] = useState<Channel>(
      createDefault.channel(),
    );
    const [member, setMember] = useState<Member>(createDefault.member());
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Variables
    const { id: userId, currentChannelId: userCurrentChannelId } = user;
    const {
      id: serverId,
      name: serverName,
      avatarUrl: serverAvatarUrl,
      displayId: serverDisplayId,
      announcement: serverAnnouncement,
      members: serverMembers = [],
    } = server;
    const {
      id: currentChannelId,
      messages: channelMessages = [],
      bitrate: channelBitrate,
      chatMode: channelChatMode,
    } = currentChannel;

    // Handlers
    const handleSendMessage = (message: Message): void => {
      if (!socket) return;
      socket.send.message({ message });
    };

    const handleChannelUpdate = (data: Partial<Channel>): void => {
      if (!data) data = createDefault.channel();
      setCurrentChannel((prev) => ({ ...prev, ...data }));
    };

    const handleOpenServerSettings = (
      userId: User['id'],
      serverId: Server['id'],
    ) => {
      ipcService.popup.open(PopupType.EDIT_SERVER);
      ipcService.initialData.onRequest(PopupType.EDIT_SERVER, {
        serverId: serverId,
        userId: userId,
      });
    };

    const handleOpenApplyMember = (
      userId: User['id'],
      serverId: Server['id'],
    ) => {
      ipcService.popup.open(PopupType.APPLY_MEMBER);
      ipcService.initialData.onRequest(PopupType.APPLY_MEMBER, {
        userId: userId,
        serverId: serverId,
      });
    };

    const handleStartResizing = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    }, []);

    const handleStopResizing = useCallback(() => {
      setIsResizing(false);
    }, []);

    const handleResize = useCallback(
      (e: MouseEvent) => {
        if (!isResizing) return;
        const maxWidth = window.innerWidth * 0.3;
        const newWidth = Math.max(250, Math.min(e.clientX, maxWidth));
        setSidebarWidth(newWidth);
      },
      [isResizing],
    );

    const handleChangeChatMode = (mode: Channel['chatMode']) => {
      if (!socket) return;
      socket.send.updateChannel({
        channel: {
          id: currentChannelId,
          serverId: serverId,
          chatMode: mode,
        },
        userId: userId,
      });

      handleSendMessage({
        id: '',
        type: 'info',
        content:
          mode === 'free'
            ? lang.tr.changeToFreeSpeech
            : lang.tr.changeToForbiddenSpeech,
        senderId: userId,
        recieverId: serverId,
        channelId: currentChannelId,
        timestamp: 0,
      });
    };

    // Effects
    useEffect(() => {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleStopResizing);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleStopResizing);
      };
    }, [handleResize, handleStopResizing]);

    useEffect(() => {
      if (!socket) return;

      const eventHandlers = {
        [SocketServerEvent.CHANNEL_UPDATE]: handleChannelUpdate,
      };
      const unsubscribe: (() => void)[] = [];

      Object.entries(eventHandlers).map(([event, handler]) => {
        const unsub = socket.on[event as SocketServerEvent](handler);
        unsubscribe.push(unsub);
      });

      return () => {
        unsubscribe.forEach((unsub) => unsub());
      };
    }, [socket]);

    useEffect(() => {
      if (!userId || !serverId || !setServer) return;
      if (refreshed.current) return;
      const refresh = async () => {
        refreshed.current = true;
        const server = await apiService.post('/refresh/server', {
          serverId: serverId,
        });
        setServer(server);
        const channel = await apiService.post('/refresh/channel', {
          channelId: userCurrentChannelId,
        });
        setCurrentChannel(channel);
        const member = await apiService.post('/refresh/member', {
          userId: userId,
          serverId: serverId,
        });
        setMember(member);
      };
      refresh();
    }, [userId, serverId, setServer]);

    useEffect(() => {
      ipcService.discord.updatePresence({
        details: `${lang.tr.in} ${serverName}`,
        state: `${lang.tr.with} ${serverMembers.length} `,
        largeImageKey: 'app_icon',
        largeImageText: 'RC Voice',
        smallImageKey: 'home_icon',
        smallImageText: lang.tr.RPCServer,
        timestamp: Date.now(),
        buttons: [
          {
            label: lang.tr.RPCJoinServer,
            url: 'https://discord.gg/adCWzv6wwS',
          },
        ],
      });
    }, [lang, serverName, serverMembers]);

    useEffect(() => {
      if (!webRTC.updateBitrate || !channelBitrate) return;
      webRTC.updateBitrate(channelBitrate);
    }, [webRTC.updateBitrate, channelBitrate]);

    return (
      <div className={styles['serverWrapper']}>
        {/* Main Content */}
        <main className={styles['serverContent']}>
          {/* Left Sidebar */}
          <div
            className={styles['sidebar']}
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className={styles['sidebarHeader']}>
              <div className={styles['avatarBox']}>
                <div
                  className={styles['avatarPicture']}
                  style={{ backgroundImage: `url(${serverAvatarUrl})` }}
                />
              </div>
              <div className={styles['baseInfoBox']}>
                <div className={styles['container']}>
                  <div className={styles['name']}>{serverName} </div>
                </div>
                <div className={styles['container']}>
                  <div className={styles['idIcon']} />
                  <div className={styles['idText']}>{serverDisplayId}</div>
                  <div className={styles['memberIcon']} />
                  <div className={styles['memberText']}>
                    {serverMembers.length}
                  </div>
                </div>
              </div>
              <div className={styles['optionBox']}>
                {(!member || member?.permissionLevel < 2) && (
                  <>
                    <div
                      className={styles['invitation']}
                      onClick={() => {
                        handleOpenApplyMember(userId, serverId);
                      }}
                    />
                    {/* <div className={styles['saperator']} /> */}
                  </>
                )}
                {member && member.permissionLevel > 4 && (
                  <div
                    className={styles['setting']}
                    onClick={() => {
                      handleOpenServerSettings(userId, serverId);
                    }}
                  />
                )}
              </div>
            </div>
            <ChannelViewer
              user={user}
              server={server}
              member={member}
              currentChannel={currentChannel}
            />
          </div>
          {/* Resize Handle */}
          <div
            className="resizeHandle"
            onMouseDown={handleStartResizing}
            onMouseUp={handleStopResizing}
          />
          {/* Right Content */}
          <div className={styles['mainContent']}>
            <div className={styles['announcementArea']}>
              <MarkdownViewer markdownText={serverAnnouncement} />
            </div>
            <div className={styles['messageArea']}>
              <MessageViewer messages={channelMessages} />
            </div>
            <div className={styles['inputArea']}>
              <MessageInputBox
                onSendMessage={(msg) => {
                  handleSendMessage({
                    id: '',
                    type: 'general',
                    content: msg,
                    senderId: userId,
                    recieverId: serverId,
                    channelId: currentChannelId,
                    timestamp: 0,
                  });
                }}
                locked={
                  channelChatMode === 'forbidden' && member.permissionLevel < 3
                }
              />
            </div>
            <div className={styles['buttonArea']}>
              <div className={styles['buttons']}>
                <div
                  className={styles['voiceModeDropdown']}
                  onClick={() =>
                    member &&
                    member.permissionLevel > 2 &&
                    setIsDropdownOpen(!isDropdownOpen)
                  }
                >
                  {channelChatMode === 'free'
                    ? lang.tr.freeSpeech
                    : lang.tr.forbiddenSpeech}
                  {isDropdownOpen && (
                    <div className={styles['dropdownMenu']}>
                      {channelChatMode === 'forbidden' && (
                        <div
                          className={styles['dropdownItem']}
                          onClick={() => {
                            handleChangeChatMode('free');
                            setIsDropdownOpen(false);
                          }}
                        >
                          {lang.tr.freeSpeech}
                        </div>
                      )}
                      {channelChatMode === 'free' && (
                        <div
                          className={styles['dropdownItem']}
                          onClick={() => {
                            handleChangeChatMode('forbidden');
                            setIsDropdownOpen(false);
                          }}
                        >
                          {lang.tr.forbiddenSpeech}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`${styles['micButton']} ${
                  webRTC.isMute ? '' : styles['active']
                }`}
                onClick={() => webRTC.toggleMute?.()}
              >
                <div className={styles['micIcon']} />
                <div className={styles['micText']}>
                  {webRTC.isMute ? lang.tr.takeMic : lang.tr.takenMic}
                </div>
              </div>
              <div className={styles['buttons']}>
                <div className={styles['bkgModeButton']}>{lang.tr.mixing}</div>
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
        </main>
      </div>
    );
  },
);

ServerPageComponent.displayName = 'ServerPageComponent';

// use dynamic import to disable SSR
const ServerPage = dynamic(() => Promise.resolve(ServerPageComponent), {
  ssr: false,
});

export default ServerPage;
