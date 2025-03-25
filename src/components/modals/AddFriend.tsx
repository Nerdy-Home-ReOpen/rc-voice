import React, { useEffect, useState } from 'react';

// Types
import { PopupType, SocketServerEvent, User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// CSS
import popup from '@/styles/common/popup.module.css';
import setting from '@/styles/popups/editServer.module.css';

// Services
import ipcService from '@/services/ipc.service';

interface AddFriendProps {
  userId: string;
}

const AddFriend: React.FC<AddFriendProps> = React.memo(
  (initialData: AddFriendProps) => {
    // Hooks
    const socket = useSocket();
    const lang = useLanguage();

    // States
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Variables
    const { userId } = initialData;

    // Handlers[]
    const handleSearchUser = (searchQuery: string) => {
      if (!socket) return;
      socket.send.searchUser({ query: searchQuery });
    };

    const handleUserSearch = (user: User | null) => {
      if (!user) return;
      if (user.id === userId) return;
      ipcService.popup.open(PopupType.APPLY_FRIEND);
      ipcService.initialData.onRequest(
        PopupType.APPLY_FRIEND,
        { userId: userId, targetId: user.id },
        () => handleClose(),
      );
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    // Effects
    useEffect(() => {
      if (!socket) return;

      const eventHandlers = {
        [SocketServerEvent.USER_SEARCH]: handleUserSearch,
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

    return (
      <div className={popup['popupContainer']}>
        <div className={popup['popupBody']}>
          <div className={setting['body']}>
            <div className={popup['inputGroup']}>
              <div className={`${popup['inputBox']} ${popup['col']}`}>
                <div className={popup['label']}>
                  {lang.tr.pleaseInputFriendAccount}
                </div>
                <input
                  className={popup['input']}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className={popup['popupFooter']}>
          <button
            className={`${popup['button']} ${
              !searchQuery.trim() ? popup['disabled'] : ''
            }`}
            disabled={!searchQuery.trim()}
            onClick={() => handleSearchUser(searchQuery)}
          >
            {lang.tr.confirm}
          </button>
          <button className={popup['button']} onClick={() => handleClose()}>
            {lang.tr.cancel}
          </button>
        </div>
      </div>
    );
  },
);

AddFriend.displayName = 'AddFriend';

export default AddFriend;
