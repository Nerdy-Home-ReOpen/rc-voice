/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';

// Types
import { User, DirectMessage, SocketServerEvent } from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';
import { useSocket } from '@/providers/SocketProvider';

// Components
import MessageViewer from '@/components/viewers/MessageViewer';
import MessageInputBox from '@/components/MessageInputBox';

// Utils
import { createDefault } from '@/utils/default';

interface DirectMessageModalProps {
  friendId: string;
  userId: string;
}

const DirectMessageModal: React.FC<DirectMessageModalProps> = React.memo(
  (initialData: DirectMessageModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // States
    const [friendAvatar, setFriendAvatar] = useState<User['avatar']>('');
    const [friendName, setFriendName] = useState<User['name']>('');
    const [friendLevel, setFriendLevel] = useState<User['level']>(0);

    // Variables
    const { friendId, userId } = initialData;
    const friendGrade = Math.min(56, Math.ceil(friendLevel / 5)); // 56 is max level

    // Handlers
    const handleSendMessage = (directMessage: DirectMessage) => {
      if (!socket) return;
      socket.send.directMessage({ directMessage });
    };

    const handleUserUpdate = (data: User | null) => {
      if (!data) data = createDefault.user();
      if (data.id === friendId) {
        setFriendAvatar(data.avatar);
        setFriendName(data.name);
        setFriendLevel(data.level);
      }
    };

    // Effects
    useEffect(() => {
      if (!socket) return;

      const eventHandlers = {
        [SocketServerEvent.USER_UPDATE]: handleUserUpdate,
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
      if (!socket) return;
      socket.send.refreshUser({ userId: userId });
      socket.send.refreshUser({ userId: friendId });
    }, [socket]);

    return null;
    // <Modal title={friendName} onClose={onClose} width="600px" height="600px">
    //   <div className="flex h-full">
    //     {/* Side Menu */}
    //     <div className="flex flex-col p-4 w-40 bg-blue-50 text-sm">
    //       {/* <img src={friendAvatar} className="w-24 h-24" /> */}
    //       <div className="flex items-center gap-2">
    //         <div className="">{`${lang.tr.level}: ${friendLevel}`}</div>
    //         {/* <img src={friendGradeUrl} className="select-none" /> */}
    //       </div>
    //     </div>
    //     {/* Main Content */}
    //     <div className="flex flex-col flex-1 overflow-y-auto">
    //       {/* Messages Area */}
    //       <div className="flex flex-[5] p-3">
    //         <MessageViewer messages={friendDirectMessages} />
    //       </div>
    //       {/* Input Area */}
    //       <div className="flex flex-[1] p-3">
    //         <MessageInputBox
    //           onSendMessage={(msg) => {
    //             handleSendMessage({
    //               id: '',
    //               type: 'general',
    //               content: msg,
    //               senderId: userId,
    //               friendId: friendId,
    //               timestamp: 0,
    //             });
    //           }}
    //         />
    //       </div>
    //     </div>
    //   </div>
    // </Modal>
  },
);

DirectMessageModal.displayName = 'DirectMessageModal';

export default DirectMessageModal;
