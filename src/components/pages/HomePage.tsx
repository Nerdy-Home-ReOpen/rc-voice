/* eslint-disable @typescript-eslint/no-unused-vars */
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

// CSS
import styles from '@/styles/homePage.module.css';

// Components
import CreateServerModal from '@/components/modals/CreateServerModal';
import ServerApplicationModal from '@/components/modals/ServerApplicationModal';

// Type
import type { Server, User } from '@/types';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';
import { errorHandler } from '@/utils/errorHandler';

// Services
import { API_URL } from '@/services/api.service';

// ServerCard Component
interface ServerCardProps {
  server: Server;
}

const ServerCard: React.FC<ServerCardProps> = React.memo(({ server }) => {
  // Redux
  const user = useSelector((state: { user: User | null }) => state.user);
  const sessionId = useSelector(
    (state: { sessionToken: string | null }) => state.sessionToken,
  );

  // Socket Control
  const socket = useSocket();

  const [showPrivateModal, setShowPrivateModal] = useState(false);

  const handleServerSelect = (serverId: string) => {
    socket?.emit('connectServer', { serverId, sessionId });
  };

  const serverAvatar = server.avatarUrl
    ? API_URL + server.avatarUrl
    : '/logo_server_def.png';
  const serverName = server.name ?? '';
  const serverDisplayId = server.displayId ?? '';
  const serverSlogan = server.slogan ?? '';

  return (
    <>
      {showPrivateModal && (
        <ServerApplicationModal
          server={server}
          onClose={() => setShowPrivateModal(false)}
        />
      )}
      <div
        className={styles['myGroupsRoomItemBox']}
        onClick={() => handleServerSelect(server.id)}
      >
        <div
          className={styles['myGroupsRoomAvatarPicture']}
          style={{
            background: `url(${serverAvatar})`,
            backgroundSize: 'cover',
            backgroundPosition: '0 0',
          }}
        ></div>
        <div className={styles['myGroupsRoomInfo']}>
          <div className={styles['myGroupsRoomName']}>{serverName}</div>
          <div className={styles['myGroupsRoomIDBox']}>
            <div
              className={`${styles['myGroupsRoomIDTitle']} ${
                server.ownerId === user?.id ? styles['IsOwner'] : ''
              }`}
              data-key="10063"
            >
              ID:
            </div>
            <div className={styles['myGroupsRoomID']}>{serverDisplayId}</div>
          </div>
          <div className={styles['myGroupsRoomSlogen']}>{serverSlogan}</div>
        </div>
      </div>
    </>
  );
});

ServerCard.displayName = 'ServerCard';

// ServerGrid Component
interface ServerGridProps {
  servers: Server[];
}

const ServerGrid: React.FC<ServerGridProps> = React.memo(({ servers }) => {
  return (
    <div className={styles['myGroupsRoomItems']}>
      {servers.map(
        (server) => server && <ServerCard key={server?.id} server={server} />,
      )}
    </div>
  );
});

ServerGrid.displayName = 'ServerGrid';

// Header Component
interface HeaderProps {
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = React.memo(({ onSearch }) => {
  // Create Server Modal Control
  const [showCreateServer, setShowCreateServer] = useState(false);

  return (
    <>
      {showCreateServer && (
        <CreateServerModal onClose={() => setShowCreateServer(false)} />
      )}
      <header className={styles['homeHeader']}>
        <div className={styles['left']}>
          <div className={styles['backBtn']} />
          <div className={styles['forwardBtn']} />
          <div className={styles['searchBar']}>
            <input
              type="search"
              placeholder="輸入群ID或群名稱"
              data-placeholder="60021"
              className={styles['searchInput']}
              onChange={(e) => onSearch(e.target.value)}
            />
            <div className={styles['searchIcon']} />
          </div>
        </div>
        <div className={styles['mid']}>
          <button
            className={`${styles['navegateItem']} ${styles['active']}`}
            data-key="60060"
          >
            <div></div>
            主頁
          </button>
          <button className={styles['navegateItem']} data-key="40007">
            <div></div>
            遊戲
          </button>
          <button className={styles['navegateItem']} data-key="30375">
            <div></div>
            秀場
          </button>
        </div>
        <div className={styles['right']}>
          <button
            className={styles['navegateItem']}
            data-key="30014"
            onClick={() => {
              // if (window.electron) {
              //   window.electron.openPopup('create-server');
              // } else {
              //   window.location.href = '/popup?page=create-server';
              // }
              setShowCreateServer(true);
            }}
          >
            <div></div>
            創建語音群
          </button>
          <button className={styles['navegateItem']} data-key="60004">
            <div></div>
            個人專屬
          </button>
        </div>
      </header>
    </>
  );
});

Header.displayName = 'Header';

// HomePage Component
const HomePageComponent: React.FC = React.memo(() => {
  // Redux
  const user = useSelector((state: { user: User | null }) => state.user);

  // State
  const [searchQuery, setSearchQuery] = useState('');

  // Test
  const userServers = user?.servers ?? [];
  const username = user?.name || '用戶';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.updateDiscordPresence({
        details: `正在瀏覽主頁`,
        state: `已加入 ${userServers.length} 個群組`,
        largeImageKey: 'app_icon',
        largeImageText: 'RC Voice',
        smallImageKey: 'home_icon',
        smallImageText: '主頁',
        resetTimer: true,
        buttons: [
          {
            label: '加入我們的Discord伺服器',
            url: 'https://discord.gg/adCWzv6wwS',
          },
        ],
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.electron) {
        window.electron.updateDiscordPresence({});
      }
    };
  }, [username, userServers.length]);

  return (
    <div className={styles['homeWrapper']}>
      <Header onSearch={(query: string) => setSearchQuery(query)} />
      <main className={styles['myGroupsWrapper']}>
        <div className={styles['myGroupsContain']}>
          <div className={styles['myGroupsView']}>
            {/* {searchQuery && joinedServers.length > 0 && (
              <div className={styles['myGroupsItem']}>
                <div className={styles['myGroupsTitle']} data-key="80016">
                  搜尋結果：
                </div>
                <div className={styles['myGroupsRoomItems']}>
                  <ServerGrid servers={joinedServers} />
                </div>
              </div>
            )}
            {!searchQuery && ( */}
            <>
              <div className={styles['myGroupsItem']}>
                <div className={styles['myGroupsTitle']} data-key="60005">
                  最近訪問
                </div>
                <ServerGrid servers={userServers} />
              </div>

              <div className={styles['myGroupsItem']}>
                <div className={styles['myGroupsTitle']} data-key="30283">
                  我的語音群
                </div>
                <ServerGrid servers={userServers} />
              </div>

              <div className={styles['myGroupsItem']}>
                <div className={styles['myGroupsTitle']} data-key="60005">
                  收藏的語音群
                </div>
                <ServerGrid servers={userServers} />
              </div>
            </>
          </div>
        </div>
      </main>
    </div>
  );
});

HomePageComponent.displayName = 'HomePageComponent';

// use dynamic import to disable SSR
const HomePage = dynamic(() => Promise.resolve(HomePageComponent), {
  ssr: false,
});

export default HomePage;
