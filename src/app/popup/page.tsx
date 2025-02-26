/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';

// Components
import Header from '@/components/Header';

// Types
import { Channel, Visibility } from '@/types';

// Contexts
import { useModal } from '@/context/modalContext';

// Modals
import CreateServerModal from '@/components/modals/CreateServerModal';
import AddChannelModal from '@/components/modals/AddChannelModal';
import DeleteChannelModal from '@/components/modals/DeleteChannelModal';
import EditChannelModal from '@/components/modals/EditChannelModal';

const Modal = React.memo(() => {
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      setType(type);
    }
  }, []);

  const getTitle = (isCategory?: boolean) => {
    if (type === 'edit-channel') {
      return {
        title: `編輯${isCategory ? '類別' : '頻道'}`,
        button: ['close'],
      };
    }
    switch (type) {
      case 'create-server':
        return { title: '創建語音群', button: ['close'] };
      case 'add-channel':
        return { title: '創建頻道', button: ['close'] };
      case 'del-channel':
        return { title: '刪除頻道', button: ['close'] };
      default:
        return undefined;
    }
  };

  const getMainContent = () => {
    const mockChannel: Channel = {
      id: 'default',
      name: '',
      isCategory: false,
      settings: {
        visibility: 'public',
        bitrate: 0,
        slowmode: false,
        userLimit: 0,
      },
      isRoot: false,
      isLobby: false,
      voiceMode: 'free',
      chatMode: 'free',
      order: 0,
      serverId: '',
      createdAt: 0,
    };

    if (type === 'edit-channel') {
      return <EditChannelModal onClose={() => {}} channel={mockChannel} />;
    }

    switch (type) {
      case 'create-server':
        return <CreateServerModal onClose={() => {}} />;
      case 'add-channel':
        return <AddChannelModal onClose={() => {}} isRoot={false} />;
      case 'del-channel':
        return <DeleteChannelModal onClose={() => {}} channel={mockChannel} />;
      default:
        return <></>;
    }
  };

  const getButtons = () => {};

  // if (!isOpen) return null;
  return (
    <div
      className={`fixed w-full h-full flex-1 flex-col bg-white rounded shadow-lg overflow-hidden transform outline-g`}
    >
      {/* Top Nevigation */}
      <Header title={getTitle()} onClose={() => {}}></Header>
      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-y-auto">
        {getMainContent()}
      </div>
      {/* Bottom */}
      <div className="flex flex-row justify-end items-center bg-gray-50">
        {/* {hasButtons && (
            <div className="flex justify-end gap-2 p-4 bg-gray-50">
              {buttons.map((button, i) => (
                <button
                  key={i}
                  type={button.type}
                  onClick={button.onClick}
                  className={`px-4 py-2 rounded ${getButtonStyle(
                    button,
                    false,
                  )}`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          )} */}
      </div>
    </div>
  );
});

Modal.displayName = 'SettingPage';

export default Modal;
