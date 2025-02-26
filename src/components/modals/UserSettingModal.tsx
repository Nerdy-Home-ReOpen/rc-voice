/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

// Components
import Modal from '@/components/Modal';

// Types
import type { User, ModalTabItem } from '@/types';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';

interface BasicInfoTabProps {
  user: Partial<User>;
  setUser: (user: Partial<User>) => void;
  onLogout: () => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  user,
  setUser,
  onLogout,
}) => {
  // User data
  const userAvatar = user?.avatarUrl ?? '/im/IMLogo.png';
  const userName = user?.name ?? '';
  const userGender = user?.gender ?? 'Male';
  const userCreatedAt = new Date(user?.createdAt ?? 0).toLocaleString();

  return (
    <div className="flex flex-1 p-4">
      <div className="flex-1">
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-2 select-none">
            <label className="w-20 text-right text-black text-sm">
              顯示名稱
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="flex-1 p-1 border rounded text-black text-sm"
            />
          </div>
          <div className="flex items-center gap-4 mb-2">
            <label className="w-20 text-right text-sm text-black select-none">
              ID
            </label>
            <input
              type="text"
              value="27054971"
              className="w-32 p-1 border rounded text-black text-sm"
              disabled
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-4 select-none">
            <label className="w-20 text-right text-sm text-black select-none">
              性別
            </label>
            <select
              value={userGender}
              onChange={(e) =>
                setUser({
                  ...user,
                  gender: e.target.value as 'Male' | 'Female',
                })
              }
              className="p-1 border rounded text-black text-sm"
              disabled
            >
              <option value="Male">男性</option>
              <option value="Female">女性</option>
            </select>
          </div>
          <div className="flex items-center gap-4 select-none">
            <label className="w-20 text-right text-black text-sm">
              創建時間
            </label>
            <label className="w-48 p-1 rounded text-black text-sm">
              {userCreatedAt}
            </label>
          </div>

          <div className="flex justify-center select-none">
            <button
              className="px-6 py-1 mt-5 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={(e) => onLogout()}
            >
              登出
            </button>
          </div>
        </div>
      </div>

      <div className="w-48 flex flex-col items-center select-none">
        <img
          src={userAvatar}
          alt="Icon"
          className="w-32 h-32 border-2 border-gray-300 mb-2 rounded-full object-cover"
        />
        {/* <button className="px-4 py-1 bg-blue-50 hover:bg-blue-100 rounded text-sm">
          更換頭像
        </button> */}
        <input
          id="avatar-upload"
          type="file"
          className="hidden"
          onChange={(e) => {}}
          accept="image/*"
        />
        <label
          htmlFor="avatar-upload"
          className="px-4 py-1 bg-blue-50 hover:bg-blue-100 rounded text-sm cursor-pointer transition-colors text-black"
        >
          更換頭像
        </label>
      </div>
    </div>
  );
};

interface UserSettingModalProps {
  onClose: () => void;
}

const UserSettingModal: React.FC<UserSettingModalProps> = ({ onClose }) => {
  // Redux
  const user = useSelector((state: { user: User }) => state.user);
  const sessionId = useSelector(
    (state: { sessionToken: string }) => state.sessionToken,
  );

  // Socket
  const socket = useSocket();

  // Tabs Control
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

  // User data (temporary)
  const [editedUser, setEditedUser] = useState<Partial<User>>({
    name: user.name,
    gender: user.gender,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });

  // Error Control
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    socket?.emit('updateUser', { sessionId, user: editedUser });
    socket?.on('error', (error: { message: string }) => {
      setError(error.message);
    });
    onClose();
  };
  const handleLogout = () => {
    socket?.emit('disconnectUser', { sessionId });
    onClose();
  };

  const renderContent = () => {
    if (!user) return null;
    switch (activeTabIndex) {
      case 0:
        return (
          <BasicInfoTab
            user={editedUser}
            setUser={setEditedUser}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      title="個人資料設定"
      onClose={onClose}
      onSubmit={handleSubmit}
      tabs={[
        {
          id: '基本資料',
          label: '基本資料',
          onClick: () => setActiveTabIndex(0),
        },
      ]}
      buttons={[
        {
          label: '取消',
          style: 'secondary',
          onClick: onClose,
        },
        {
          label: '確定',
          style: 'primary',
          type: 'submit',
          onClick: () => {},
        },
      ]}
    >
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      {renderContent()}
    </Modal>
  );
};

UserSettingModal.displayName = 'UserSettingModal';

export default UserSettingModal;
