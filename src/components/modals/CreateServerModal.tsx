/* eslint-disable @next/next/no-img-element */
import React, { FormEvent, useState, Suspense, useRef } from 'react';
import { useSelector } from 'react-redux';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';

// Components
import Modal from '@/components/Modal';

// Types
import { User, Server } from '@/types';

// CSS
import Popup from '../../styles/common/popup.module.css';
import CreateServer from '../../styles/createServer.module.css';

// Validation
export const validateName = (name: string): string => {
  if (!name.trim()) return '請輸入群組名稱';
  if (name.length > 30) return '群組名稱不能超過30個字符';
  return '';
};
export const validateDescription = (description: string): string => {
  if (!description?.trim()) return '';
  if (description.length > 200) return '口號不能超過200個字符';
  return '';
};

interface CreateServerModalProps {
  onClose: () => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = React.memo(
  ({ onClose }) => {
    // Redux
    const [serverType, setServerType] = useState<string | false>(false);
    const user = useSelector((state: { user: User | null }) => state.user);
    const sessionId = useSelector(
      (state: { sessionToken: string | null }) => state.sessionToken,
    );

    // Socket Control
    const socket = useSocket();

    // Form Control
    const [newServer, setNewServer] = useState<Server>({
      id: '',
      name: '',
      avatar: null,
      avatarUrl: null,
      level: 0,
      description: '',
      wealth: 0,
      slogan: '',
      announcement: '',
      displayId: '',
      lobbyId: '',
      ownerId: '',
      settings: {
        allowDirectMessage: true,
        visibility: 'public',
        defaultChannelId: '',
      },
      createdAt: 0,
    });

    // Error Control
    const [errors, setErrors] = useState<{
      general?: string;
      name?: string;
      description?: string;
    }>({});

    // Image Preview
    const [previewImage, setPreviewImage] = useState<string>(
      '/logo_server_def.png',
    );

    const handleChange = (field: keyof Server, value: string) => {
      setNewServer((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      console.log(newServer);
      socket?.emit('createServer', { sessionId, server: newServer });
      socket?.on('error', (error: { message: string }) =>
        setErrors({ general: error.message }),
      );
      onClose();
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || file.size > 5 * 1024 * 1024)
        return alert('請選擇小於5MB的圖片');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
        setNewServer((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    };

    const maxGroups = 3,
      remainingGroups = maxGroups - (user?.ownedServers?.length ?? 0);

    return (
      <div className={Popup['popupContainer']}>
        <div className={Popup['popupMessageWrapper']}>
          <div className={CreateServer['header']}>
            <div className={CreateServer['headerButton']}>
              <span>{serverType ? '填寫資料' : '選擇語音群類型'}</span>
            </div>
          </div>
          <div className={Popup['popupBody']}>
            <Suspense fallback={<div>Loading...</div>}>
              {serverType ? (
                <>
                  <div className={CreateServer['changeAvatarWrapper']}>
                    <div>
                      <img
                        src={previewImage}
                        alt="Avatar"
                        className={CreateServer['changeAvatarPicture']}
                      />
                      <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      <label
                        htmlFor="avatar-upload"
                        style={{ marginTop: '10px' }}
                        className={Popup['button']}
                      >
                        更換頭像
                      </label>
                    </div>
                  </div>
                  <div className={Popup['inputGroup']}>
                    <div className={Popup['inputBox']}>
                      <div className={Popup['title']}>群類型：</div>
                      <div
                        className={`${Popup['inputBorder']} ${Popup['disabled']}`}
                      >
                        <input disabled value={serverType} />
                      </div>
                    </div>
                  </div>
                  <div className={Popup['inputBox']}>
                    <div className={`${Popup['title']} ${Popup['impotant']}`}>
                      群名稱
                    </div>
                    <div className={Popup['inputBorder']}>
                      <input
                        type="text"
                        value={newServer.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="6-30個字元組成，首尾輸入的空格無效，不能包含不雅詞彙。"
                        className={Popup['inputBorder']}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div className={Popup['inputBox']}>
                    <div className={Popup['title']}>口號</div>
                    <div className={Popup['inputBorder']}>
                      <textarea
                        value={newServer.description}
                        onChange={(e) =>
                          handleChange('description', e.target.value)
                        }
                        placeholder="0-30個字元，口號是您建立團隊的目標"
                        className={Popup['inputBorder']}
                      />
                    </div>
                    {errors.description && (
                      <p className="text-red-500">{errors.description}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`${Popup['popupMessage']} ${CreateServer['message']}`}
                  >
                    <p>
                      {errors.general ||
                        `您還可以創建${remainingGroups}個群，創建之後不能刪除或轉讓`}
                    </p>
                  </div>
                  <label className={CreateServer['label']} data-key="60030">
                    請您選擇語音群類型
                  </label>
                  <div className={CreateServer['buttonGroup']}>
                    {['遊戲', '娛樂', '其他'].map((type) => (
                      <div
                        key={type}
                        className={`${CreateServer['button']} ${
                          !remainingGroups ? Popup['disabled'] : ''
                        }`}
                        onClick={() => setServerType(type)}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Suspense>
          </div>
          <div className={Popup['popupFooter']}>
            {serverType && (
              <button
                className={`${Popup['button']} ${
                  !newServer.name.trim() ? Popup['disabled'] : ''
                }`}
                onClick={handleSubmit}
              >
                確認
              </button>
            )}
            <button className={Popup['button']} onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    );
  },
);

CreateServerModal.displayName = 'CreateServerModal';
export default CreateServerModal;
