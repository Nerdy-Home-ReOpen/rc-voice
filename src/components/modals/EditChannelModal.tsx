import React, { FormEvent, useState } from 'react';
import { useSelector } from 'react-redux';

// Components
import Modal from '@/components/Modal';

// Types
import { Channel, Visibility } from '@/types';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';

// CSS
import EditChannel from '../../styles/popups/editChannel.module.css';
import Popup from '../../styles/common/popup.module.css';

interface EditChannelModalProps {
  onClose: () => void;
  channel: Channel;
}

const EditChannelModal: React.FC<EditChannelModalProps> = React.memo(
  ({ onClose, channel }) => {
    // Redux
    const sessionId = useSelector(
      (state: { sessionToken: string }) => state.sessionToken,
    );

    // Socket
    const socket = useSocket();

    // Form Control
    const [editedChannel, setEditedChannel] = useState<Partial<Channel>>({
      name: channel?.name,
      settings: {
        ...channel?.settings,
      },
    });

    const handleSubmit = async (e: FormEvent<Element>) => {
      e.preventDefault();
      console.log(editedChannel);
      socket?.emit('updateChannel', {
        sessionId: sessionId,
        channelId: channel.id,
        channel: editedChannel,
      });
      onClose();
    };

    return (
      <form className={Popup['popupContainer']} onSubmit={handleSubmit}>
        <div className={Popup['popupMessageWrapper']}>
          <div className={EditChannel['popupBody']}>
            <div className={Popup['inputBox']}>
              <div className={Popup['title']}>
                {`${channel?.isCategory ? '類別' : '頻道'}`}名稱
              </div>
              <div className={Popup['inputBorder']}>
                <input
                  type="text"
                  value={editedChannel?.name}
                  onChange={(e) =>
                    setEditedChannel((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className={Popup['inputBox']}>
              <div className={Popup['title']}>訪問受限</div>
              <div className={Popup['inputBorder']}>
                <select
                  value={editedChannel?.settings?.visibility}
                  onChange={(e) =>
                    setEditedChannel((prev) => {
                      const settings = prev?.settings ?? channel?.settings;
                      return {
                        ...prev,
                        settings: {
                          ...settings,
                          visibility: e.target.value as Visibility,
                        },
                      };
                    })
                  }
                >
                  <option value="public">任何人可以訪問</option>
                  <option value="private">禁止遊客訪問</option>
                  <option value="readonly">唯讀</option>
                </select>
              </div>
            </div>
          </div>
          <div className={Popup['popupFooter']}>
            <button type="submit" className={Popup['button']}>
              確定
            </button>
            <button type="button" className={Popup['button']} onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </form>
    );
  },
);

EditChannelModal.displayName = 'EditChannelModal';
export default EditChannelModal;
