/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';

// Components
import Header from '@/components/Header';

// Types
import { Channel, popupType } from '@/types';

// Modals
import CreateServerModal from '@/components/modals/CreateServerModal';
import EditServerModal from '@/components/modals/EditServerModal';
import AddChannelModal from '@/components/modals/AddChannelModal';
import DeleteChannelModal from '@/components/modals/DeleteChannelModal';
import EditChannelModal from '@/components/modals/EditChannelModal';
import ServerApplication from '@/components/modals/ServerApplicationModal';

// Services
import { ipcService } from '@/services/ipc.service';
import Dialog from '@/components/modals/Dialog';

const Modal = React.memo(() => {
  const [type, setType] = useState<popupType | null>(null);
  const [initialData, setInitialData] = useState<any | null>(null);

  useEffect(() => {
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const newType = params.get('type') as popupType;
      setType(newType);

      if (newType) {
        ipcService.initialData.request(newType, (data) => {
          setInitialData(data);
        });
      }
    }
  }, []);

  const getTitle = (isCategory?: boolean) => {
    switch (type) {
      case popupType.EDIT_USER:
        return { title: '編輯個人資料', button: ['close'] };
      case popupType.CREATE_SERVER:
        return { title: '創建語音群', button: ['close'] };
      case popupType.EDIT_SERVER:
        return { title: '編輯語音群', button: ['close'] };
      case popupType.DELETE_SERVER:
        return { title: '刪除語音群', button: ['close'] };
      case popupType.CREATE_CHANNEL:
        return { title: '創建頻道', button: ['close'] };
      case popupType.EDIT_CHANNEL:
        return {
          title: `編輯${isCategory ? '類別' : '頻道'}`,
          button: ['close'],
        };
      case popupType.DELETE_CHANNEL:
        return { title: '刪除頻道', button: ['close'] };
      case popupType.APPLY_MEMBER:
        return { title: '申請會員', button: ['close'] };
      case popupType.APPLY_FRIEND:
        return { title: '好友請求', button: ['close'] };
      case popupType.DIRECT_MESSAGE:
        return { title: '私訊', button: ['close'] };
      case popupType.ERROR:
        return { title: '錯誤', button: ['close'] };
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

    switch (type) {
      case popupType.EDIT_USER:
        return; // <EditUserModal onClose={() => {}} />;
      case popupType.CREATE_SERVER:
        return <CreateServerModal onClose={() => {}} />;
      case popupType.EDIT_SERVER:
        return <EditServerModal {...initialData} />;
      case popupType.DELETE_SERVER:
        return; // This one doesn't exist :D
      case popupType.CREATE_CHANNEL:
        return <AddChannelModal onClose={() => {}} isRoot={false} />;
      case popupType.EDIT_CHANNEL:
        return <EditChannelModal onClose={() => {}} channel={mockChannel} />;
      case popupType.DELETE_CHANNEL:
        return <DeleteChannelModal onClose={() => {}} channel={mockChannel} />;
      case popupType.APPLY_MEMBER:
        return <ServerApplication onClose={() => {}} server={undefined} />;
      case popupType.APPLY_FRIEND:
        return; // <FriendApplication onClose={() => {}} />;
      case popupType.DIRECT_MESSAGE:
        return; // <DirectMessageModal onClose={() => {}} />;
      case popupType.ERROR:
        return <Dialog {...initialData} />;
      default:
        return <></>;
    }
  };

  const getButtons = () => {
    switch (type) {
      case popupType.EDIT_USER:
        return [];
      case popupType.CREATE_SERVER:
        return [];
      case popupType.EDIT_SERVER:
        return [];
      case popupType.DELETE_SERVER:
        return [];
      case popupType.CREATE_CHANNEL:
        return [];
      case popupType.EDIT_CHANNEL:
        return [];
      case popupType.DELETE_CHANNEL:
        return [];
      case popupType.APPLY_MEMBER:
        return [];
      case popupType.APPLY_FRIEND:
        return [];
      case popupType.DIRECT_MESSAGE:
        return [];
      case popupType.ERROR:
        return [
          {
            type: 'button',
            label: '確定',
            onClick: () => {
              ipcService.popup.submit(initialData.submitTo);
              ipcService.window.close();
            },
          },
        ];
      default:
        return [];
    }
  };

  return (
    <div
      className={`fixed w-full h-full flex-1 flex-col bg-white rounded shadow-lg overflow-hidden transform outline-g`}
    >
      {/* Top Nevigation */}
      <Header title={getTitle()}></Header>
      {/* Main Content */}
      {getMainContent()}
      {/* Bottom */}
      <div className="flex flex-row justify-end items-center bg-gray-50">
        <div className="flex justify-end gap-2 p-4 bg-gray-50">
          {getButtons().map((button, i) => (
            <button
              key={i}
              type={button.type as 'button'}
              onClick={button.onClick}
              className={`px-4 py-2 rounded`}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

Modal.displayName = 'SettingPage';

export default Modal;
