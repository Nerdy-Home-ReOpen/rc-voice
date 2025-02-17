/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

// Components
import CreateServerModal from '@/modals/CreateServerModal';
import ServerApplicationModal from '@/modals/ServerApplicationModal';

// Type
import type { Server, User } from '@/types';

// Redux
import { useSelector } from 'react-redux';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';
import { errorHandler } from '@/utils/errorHandler';

// Services
import { API_URL, apiService } from '@/services/api.service';

// ServerCard Component
interface ServerCardProps {
  server: Server;
}

const ServerCard: React.FC<ServerCardProps> = React.memo(({ server }) => {
  // Redux
  const sessionId = useSelector(
    (state: { sessionToken: string }) => state.sessionToken,
  );
  const user = useSelector((state: { user: User }) => state.user);

  // Socket Control
  const socket = useSocket();

  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const userPermission = user.members?.[server.id]?.permissionLevel ?? 0;

  const handleServerSelect = (serverId: string) => {
    if (typeof window === 'undefined') return;

    if (server.settings.visibility === 'invisible' && userPermission < 2) {
      setShowPrivateModal(true);
      return;
    }

    socket?.emit('connectServer', { serverId, sessionId });
    errorHandler.handle = () => {
      console.log('error');
    };
  };

  const serverIcon = server.iconUrl
    ? API_URL + server.iconUrl
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
      <button
        className="flex items-start gap-3 p-3 border border-gray-200 rounded bg-white hover:bg-gray-50 w-full"
        onClick={() => handleServerSelect(server.id)}
      >
        <img src={serverIcon} alt="Server Icon" className="w-14 h-14" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[#4A6B9D] text-start truncate">
            {serverName}
          </h3>
          <p className="text-xs text-gray-500 text-start">
            ID:{serverDisplayId}
          </p>
          <p className="text-xs text-gray-500 text-start truncate mt-2">
            {serverSlogan}
          </p>
        </div>
      </button>
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-8 py-2">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <input
                type="text"
                placeholder="輸入群ID或群名稱"
                className="w-48 h-6 px-2 pr-8 border border-gray-200 rounded text-sm focus:border-blue-500 focus:outline-none select-none"
                onChange={(e) => onSearch(e.target.value)}
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex space-x-4 items-center">
            <button
              className="text-gray-600 hover:text-gray-900 text-sm select-none"
              onClick={() => setShowCreateServer(true)}
            >
              創建語音群
            </button>
          </div>
        </div>
      </header>
    </>
  );
});

Header.displayName = 'Header';

// HomePage Component
const HomePageComponent: React.FC = React.memo(() => {
  // Redux
  const sessionId = useSelector(
    (state: { sessionToken: string }) => state.sessionToken,
  );

  // Socket Control
  const socket = useSocket();

  // State
  const [recommendedServers, setRecommendedServers] = useState<Server[]>([]);
  const [joinedServers, setJoinedServers] = useState<Server[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Fetch server data
    const fetchServerData = () => {
      socket.emit('getServers', { sessionId, searchQuery });
    };

    // Handle server updates
    const handleServerUpdate = (data: {
      recommendedServers: Server[];
      joinedServers: Server[];
    }) => {
      setRecommendedServers(data.recommendedServers ?? []);
      setJoinedServers(data.joinedServers ?? []);
    };

    // Set up event listeners
    socket.on('serversUpdate', handleServerUpdate);

    // Initial fetch
    fetchServerData();

    // Cleanup
    return () => {
      socket.off('serversUpdate', handleServerUpdate);
    };
  }, [socket, sessionId, searchQuery]);

  return (
    <div className="flex flex-1 flex-col">
      <Header onSearch={(query: string) => setSearchQuery(query)} />
      <main className="flex flex-1 min-h-0 bg-gray-100">
        <div className="flex flex-1 flex-col item-center space-y-6 p-8 overflow-y-auto">
          {searchQuery && joinedServers.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">搜尋結果</h2>
              <ServerGrid servers={joinedServers} />
            </section>
          )}
          {!searchQuery && (
            <>
              <section className="mb-6">
                <h2 className="text-lg font-bold mb-3">推薦語音群</h2>
                <ServerGrid servers={recommendedServers} />
              </section>
              <section>
                <h2 className="text-lg font-bold mb-3">最近語音群</h2>
                <ServerGrid servers={joinedServers} />
              </section>
            </>
          )}
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
