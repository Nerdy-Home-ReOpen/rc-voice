/* eslint-disable @next/next/no-img-element */
import React, { FormEvent, useState, Suspense } from 'react';
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
  if (description.length > 200) return '群組介紹不能超過200個字符';
  return '';
};

interface FormErrors {
  general?: string;
  name?: string;
  description?: string;
}

interface CreateServerModalProps {
  onClose: () => void;
  handleNextCreate: () => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = React.memo(
  ({ onClose }) => {
    // Next Page
    const [serverType, setShowPage] = useState<string | false>(false);

    // Redux
    const user = useSelector((state: { user: User | null }) => state.user);
    const sessionId = useSelector(
      (state: { sessionToken: string | null }) => state.sessionToken,
    );

    // Socket Control
    const socket = useSocket();

    // Form Control
    const [newServer, setNewSever] = useState<Server>({
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
    const [errors, setErrors] = useState<FormErrors>({});

    const handleSubmit = async (e: FormEvent<Element>) => {
      e.preventDefault();

      console.log('Create Server:', newServer);
      socket?.emit('createServer', {
        sessionId: sessionId,
        server: newServer,
      });
      socket?.on('error', (error: { message: string }) => {
        setErrors({ general: error.message });
      });
      onClose();
    };

    // Image Preview
    const [previewImage, setPreviewImage] = useState<string>(
      '/logo_server_def.png',
    );

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        alert('請選擇一張圖片');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('圖片大小不能超過5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
        setNewSever((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    };

    const handleNextCreate = (e: any) => {
      setShowPage(e.currentTarget.textContent);
    };

    const maxGroups = 3;
    const userOwnedServerCount = user?.ownedServers?.length ?? 0;
    const remainingGroups = maxGroups - userOwnedServerCount;

    const PageComponent: React.FC<{ type: string }> = ({ type }) => {
      return (
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
          <div className={CreateServer['inputGroup']}>
            <div className={CreateServer['inputBox']}>
              <div className={CreateServer['title']}>群組類型</div>
              <div
                className={`${CreateServer['inputBorder']} ${CreateServer['disabled']}`}
              >
                <input disabled value={type}></input>
              </div>
            </div>
            <div className={CreateServer['inputBox']}>
              <div
                className={`${CreateServer['title']} ${CreateServer['impotant']}`}
              >
                群組名稱
              </div>
              <div className={CreateServer['inputBorder']}>
                <input
                  type="text"
                  value={newServer.name}
                  onChange={(e) =>
                    setNewSever((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  // disabled={!canCreateGroup}
                  placeholder="請輸入群組名稱 (最多30字)"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>
            </div>
            <div className={CreateServer['inputBox']}>
              <div className={CreateServer['title']}>群組介紹</div>
              <div className={CreateServer['inputBorder']}>
                <textarea
                  value={newServer.description}
                  onChange={(e) =>
                    setNewSever((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  // disabled={!canCreateGroup}
                  placeholder="請輸入群組介紹 (最多200字)"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      );
    };

    return (
      <div className={Popup['popupContainer']}>
        <div className={Popup['popupMessageWrapper']}>
          <div className={CreateServer['header']}>
            <div className={CreateServer['headerButton']}>
              <span data-key="60029">
                {!serverType ? '選擇語音群類型' : '填寫群組資訊'}
              </span>
            </div>
          </div>
          <div className={Popup['popupBody']}>
            <Suspense fallback={<div>Loading...</div>}>
              {serverType ? (
                <PageComponent type={serverType} />
              ) : (
                <>
                  <div
                    className={`${Popup['popupMessage']} ${CreateServer['message']}`}
                  >
                    <p data-key="30242">
                      {errors.general
                        ? errors.general
                        : `您還可以創建${remainingGroups}個群，創建之後不能刪除或轉讓`}
                    </p>
                  </div>

                  <label className={CreateServer['label']} data-key="60030">
                    請您選擇語音群類型
                  </label>

                  <div
                    className={`${CreateServer['buttonGroup']} ${
                      !remainingGroups ? CreateServer['disabled'] : ''
                    }`}
                  >
                    <div
                      className={CreateServer['button']}
                      onClick={(e) => {
                        handleNextCreate(e);
                      }}
                      data-key="31001"
                    >
                      遊戲
                    </div>
                    <div
                      className={CreateServer['button']}
                      onClick={(e) => {
                        handleNextCreate(e);
                      }}
                      data-key="31002"
                    >
                      娛樂
                    </div>
                    <div
                      className={CreateServer['button']}
                      onClick={(e) => {
                        handleNextCreate(e);
                      }}
                      data-key="31000"
                    >
                      其他
                    </div>
                  </div>
                </>
              )}
            </Suspense>
          </div>
          <div className={Popup['popupFooter']}>
            <div
              className={Popup['button']}
              onClick={(e) => {
                handleSubmit(e);
              }}
              data-key="30024"
            >
              確認
            </div>
            <div className={Popup['button']} data-key="30024">
              取消
            </div>
          </div>
        </div>
      </div>
    );
  },
);

CreateServerModal.displayName = 'CreateServerModal';

export default CreateServerModal;
