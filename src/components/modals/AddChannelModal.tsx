/* eslint-disable @next/next/no-img-element */
import React, { FormEvent, useState } from 'react';
import { useSelector } from 'react-redux';

// Components
import Modal from '@/components/Modal';

// Types
import { Channel, Server } from '@/types';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';

// CSS
import Popup from '../../styles/common/popup.module.css';
import AddChannel from '../../styles/popups/addChannel.module.css';

interface AddChannelModalProps {
  onClose: () => void;
  isRoot: boolean;
}

const AddChannelModal: React.FC<AddChannelModalProps> = React.memo(
  ({ onClose, isRoot }) => {
    // Redux
    const server = useSelector((state: { server: Server }) => state.server);
    const sessionId = useSelector(
      (state: { sessionToken: string }) => state.sessionToken,
    );

    // Socket
    const socket = useSocket();

    // Form Control
    const [newChannel, setNewChannel] = useState<Channel>({
      id: '',
      name: '',
      isLobby: false,
      isCategory: false,
      isRoot,
      serverId: server?.id || '',
      voiceMode: 'free',
      chatMode: 'free',
      order: 0,
      settings: {
        bitrate: 0,
        visibility: 'public',
        slowmode: false,
        userLimit: 0,
      },
      createdAt: 0,
    });

    // Error Control
    const [error, setError] = useState<string>('');

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      console.log(newChannel);
      socket?.emit('createChannel', {
        sessionId,
        serverId: server.id,
        channel: newChannel,
      });
      socket?.on('error', (err: { message: string }) => setError(err.message));
      onClose();
    };

    return (
      <form className={Popup['popupContainer']} onSubmit={handleSubmit}>
        <div className={Popup['popupMessageWrapper']}>
          <div className={AddChannel['popupBody']}>
            <div className={Popup['inputGroup']}>
              <div className={Popup['inputBox']}>
                <div className={Popup['title']}>上級頻道</div>
                <div className={Popup['textBorder']}>
                  <div className={Popup['title']}>123</div>
                </div>
              </div>
            </div>
            <div className={Popup['inputGroup']}>
              <div className={Popup['inputBox']}>
                <div className={Popup['title']}>頻道名稱</div>
                <div className={Popup['inputBorder']}>
                  <input
                    type="text"
                    value={newChannel.name}
                    onChange={(e) =>
                      setNewChannel((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                    className={Popup['inputBorder']}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={Popup['popupFooter']}>
            <button
              type="submit"
              className={`${Popup['button']} ${
                !newChannel.name.trim() ? Popup['disabled'] : ''
              }`}
              disabled={!newChannel.name.trim()}
            >
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

AddChannelModal.displayName = 'AddChannelModal';
export default AddChannelModal;
