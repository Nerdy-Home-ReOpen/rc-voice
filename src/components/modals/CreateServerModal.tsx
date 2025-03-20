/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';

// CSS
import popup from '@/styles/common/popup.module.css';
import createServer from '@/styles/popups/createServer.module.css';

// Types
import { User, Server, PopupType, SocketServerEvent } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import { ipcService } from '@/services/ipc.service';

// Utils
import { createDefault } from '@/utils/default';

// Validation
export const validateName = (name: string): string => {
  if (!name?.trim()) return '請輸入群組名稱';
  if (name.length > 30) return '群組名稱不能超過30個字符';
  return '';
};
export const validateDescription = (description: string): string => {
  if (!description?.trim()) return '';
  if (description.length > 200) return '口號不能超過200個字符';
  return '';
};
export const validateSlogan = (slogan: string): string => {
  if (!slogan?.trim()) return '';
  if (slogan.length > 30) return '口號不能超過30個字符';
  return '';
};

interface CreateServerModalProps {
  userId: string;
}

const CreateServerModal: React.FC<CreateServerModalProps> = React.memo(
  (initialData: CreateServerModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // Constant
    const MAX_GROUPS = 3;
    const SERVER_TYPES: { value: Server['type']; name: string }[] = [
      {
        value: 'game',
        name: lang.tr.game,
      },
      {
        value: 'entertainment',
        name: lang.tr.entertainment,
      },
      {
        value: 'other',
        name: lang.tr.other,
      },
    ];

    // States
    const [section, setSection] = useState<number>(0);
    const [errors, setErrors] = useState<{ [key: string]: string }>({
      name: '',
      description: '',
    });

    const [user, setUser] = useState<User>(createDefault.user());
    const [server, setServer] = useState<Server>(createDefault.server());

    // Variables
    const { userId } = initialData;
    const { ownedServers: userOwnedServers = [] } = user;
    const {
      name: serverName,
      avatar: serverAvatar,
      description: serverDescription,
      type: serverType,
    } = server;
    const remainingGroups = MAX_GROUPS - userOwnedServers.length;
    const canCreate = remainingGroups > 0;

    // Handlers
    const handleClose = () => {
      ipcService.window.close();
    };

    const handleCreateServer = (server: Server) => {
      if (!socket) return;
      socket.send.createServer({ server: server, userId: userId });
    };

    const handleOpenErrorDialog = (message: string) => {
      ipcService.popup.open(PopupType.DIALOG_ERROR);
      ipcService.initialData.onRequest(PopupType.DIALOG_ERROR, {
        title: message,
        submitTo: PopupType.DIALOG_ERROR,
      });
    };

    const handleUserUpdate = (data: Partial<User> | null) => {
      if (!data) data = createDefault.user();
      setUser((prev) => ({ ...prev, ...data }));
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
      if (!socket || !userId) return;
      if (refreshRef.current) return;
      socket.send.refreshUser({ userId: userId });
      refreshRef.current = true;
    }, [socket, userId]);

    switch (section) {
      // Server Type Selection Section
      case 0:
        return (
          <div className={popup['popupContainer']}>
            <div className={popup['popupBody']}>
              <div className={createServer['tab']}>
                <div
                  className={`${createServer['item']} ${createServer['active']}`}
                >
                  {lang.tr.selectGroupType}
                </div>
                <div className={`${createServer['item']}`}>
                  {lang.tr.fillInfo}
                </div>
              </div>
              <div className={createServer['body']}>
                <div className={`${createServer['message']}`}>
                  {`${lang.tr.remainingGroup1}${remainingGroups}${lang.tr.remainingGroup2}`}
                </div>
                <label className={createServer['typeLabel']} data-key="60030">
                  {lang.tr.selectGroupTypeDescription}
                </label>
                <div className={createServer['buttonGroup']}>
                  {SERVER_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className={`${createServer['button']} ${
                        serverType === type.value
                          ? createServer['selected']
                          : ''
                      }`}
                      onClick={() =>
                        setServer((prev) => ({
                          ...prev,
                          type: type.value as Server['type'],
                        }))
                      }
                    >
                      {type.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={popup['popupFooter']}>
              <button
                className={`${popup['button']} ${
                  !serverType || !canCreate ? popup['disabled'] : ''
                }`}
                disabled={!serverType || !canCreate}
                onClick={() => setSection(1)}
              >
                {lang.tr.next}
              </button>
              <button className={popup['button']} onClick={() => handleClose()}>
                {lang.tr.cancel}
              </button>
            </div>
          </div>
        );

      // Server Data Input Section
      case 1:
        return (
          <div className={popup['popupContainer']}>
            <div className={popup['popupBody']}>
              <div className={createServer['tab']}>
                <div className={`${createServer['item']}`}>
                  {lang.tr.selectGroupType}
                </div>
                <div
                  className={`${createServer['item']} ${createServer['active']}`}
                >
                  {lang.tr.fillInfo}
                </div>
              </div>
              <div className={createServer['body']}>
                <div className={createServer['avatarWrapper']}>
                  <div
                    className={createServer['avatarPicture']}
                    style={{ backgroundImage: `url(${serverAvatar})` }}
                  />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        handleOpenErrorDialog(lang.tr.canNotReadImage);
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        handleOpenErrorDialog(lang.tr.imageTooLarge);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setServer((prev) => ({
                          ...prev,
                          avatar: reader.result as string,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="avatar-upload"
                    style={{ marginTop: '10px' }}
                    className={popup['button']}
                  >
                    {lang.tr.uploadAvatar}
                  </label>
                </div>
                <div className={createServer['inputGroup']}>
                  <div className={popup['inputBox']}>
                    <div className={popup['label']}>{lang.tr.groupType}</div>
                    <input
                      className={popup['input']}
                      type="text"
                      disabled
                      value={lang.tr[server.type as keyof typeof lang.tr]}
                    />
                  </div>
                  <div className={popup['inputBox']}>
                    <div className={`${popup['label']} ${popup['required']}`}>
                      {lang.tr.groupName}
                    </div>
                    <input
                      className={popup['input']}
                      type="text"
                      value={serverName}
                      onChange={(e) =>
                        setServer((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      onBlur={() =>
                        setErrors((prev) => ({
                          ...prev,
                          name: validateName(serverName),
                        }))
                      }
                      placeholder={lang.tr.groupNamePlaceholder}
                    />
                    {/* {errors.name && <p className="text-red-500">{errors.name}</p>} */}
                  </div>
                  <div className={popup['inputBox']}>
                    <div className={popup['label']}>{lang.tr.groupSlogan}</div>
                    <textarea
                      className={popup['input']}
                      value={serverDescription}
                      onChange={(e) =>
                        setServer((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      onBlur={() =>
                        setErrors((prev) => ({
                          ...prev,
                          description: validateDescription(serverDescription),
                        }))
                      }
                      placeholder={lang.tr.groupSloganPlaceholder}
                    />
                    {/* {errors.description && (
                  <p className="text-red-500">{errors.description}</p>
                )} */}
                  </div>
                </div>
              </div>
            </div>
            <div className={popup['popupFooter']}>
              <button className={popup['button']} onClick={() => setSection(0)}>
                {lang.tr.previous}
              </button>
              <button
                className={`${popup['button']} ${
                  !serverName.trim() || !canCreate ? popup['disabled'] : ''
                }`}
                disabled={!serverName.trim() || !canCreate}
                onClick={() => {
                  handleCreateServer({
                    ...server,
                    ownerId: userId,
                  });
                  handleClose();
                }}
              >
                {lang.tr.confirm}
              </button>
            </div>
          </div>
        );
    }
  },
);

CreateServerModal.displayName = 'CreateServerModal';

export default CreateServerModal;
